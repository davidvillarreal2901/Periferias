(function(){
const { CARDS, BANDOS, REGIONS, REGION_ORDER, regionInferior, cardById, calcMM, mmMultiplier } = window.PERI_NS;
/* ============================================================
   PERIFERIAS — Motor de juego
   ============================================================ */

const FICHA_EMOJI = { datos:'🟡', saber:'🟢', poder:'🔴' };

let _uid = 0;
const uid = () => `i${++_uid}`;

// Construye una instancia jugable a partir de la carta base
function instancia(cardId, owner){
  const base = cardById(cardId);
  const inst = {
    iid: uid(), cardId, owner, tipo: base.tipo, nombre: base.nombre,
    sub: base.sub || '', bando: base.bando || null,
  };
  if (base.tipo === 'personaje'){
    Object.assign(inst, {
      pvMax: base.pv, pv: base.pv, atq: base.atq, def: base.def,
      blq: base.blq, mse: base.mse, cim: base.cim, mm: base.mm,
      coste: base.coste, hab: base.hab, ref: base.ref,
      energias: [], estados: {}, region: null, turnosEnJuego: 0,
    });
  } else {
    Object.assign(inst, { coste: base.coste || {}, hab: base.hab, ref: base.ref });
  }
  return inst;
}

// Construye un mazo de personajes para un bando (3 copias de cada personaje del bando)
function mazoBando(bandoId){
  const personajes = CARDS.filter(c => c.tipo==='personaje' && c.bando===bandoId);
  const deck = [];
  personajes.forEach(p => { for(let i=0;i<3;i++) deck.push(p.id); });
  return shuffle(deck);
}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

function nuevoJugador(idx, bandoId){
  const b = BANDOS[bandoId];
  const mazoIds = mazoBando(bandoId);
  return {
    idx, bando: bandoId, nombre: b.nombre,
    fichas: { ...b.fichas },
    pc: 0,                       // puntos de control acumulados
    premios: 6,                  // cartas de premio restantes por tomar (gana al llegar a 0)
    mazo: mazoIds,               // ids restantes por robar
    mano: [],                    // instancias en mano
    banca: [],                   // instancias en banca
    activas: {},                 // region -> [instancias]
    vivo: true,
  };
}

function crearEstado(bandos){
  const jugadores = bandos.map((b,i)=>nuevoJugador(i,b));
  // mano inicial: 5 cartas
  jugadores.forEach(j=>{ for(let k=0;k<5;k++) robar(j); });
  // eventos
  const eventosMazo = shuffle(CARDS.filter(c=>c.tipo==='evento').map(c=>c.id));
  return {
    jugadores,
    turno: 0,            // contador global de turnos jugados
    activo: 0,           // índice del jugador activo
    fase: 'setup',       // setup | turno | fin
    eventosMazo,
    eventoActivo: null,
    eventoUsados: [],
    log: [],
    ganador: null,
  };
}

function robar(jug){
  if(jug.mazo.length===0) return null;
  const id = jug.mazo.shift();
  const inst = instancia(id, jug.idx);
  jug.mano.push(inst);
  return inst;
}

function regionFichaExtra(regionId){
  return REGIONS.find(r=>r.id===regionId)?.extra || null;
}

// --- Combate determinístico ---
// Devuelve {orden:[...], eventos:[...textos...]}
function resolverCombateRegion(estado, regionId){
  const eventos = [];
  // reunir personajes activos en la región que NO hayan combatido ya en esta pasada
  let combatientes = [];
  estado.jugadores.forEach(j=>{
    (j.activas[regionId]||[]).forEach(p=>{ if(!p._yaCombatio) combatientes.push(p); });
  });
  if(combatientes.length < 2) return { eventos, huboCombate:false };

  // ordenar por MM desc (iniciativa)
  combatientes.sort((a,b)=> b.mm - a.mm);
  eventos.push({t:'init', txt:`Iniciativa por MM: ${combatientes.map(c=>`${c.nombre}(${c.mm})`).join(' → ')}`});

  // marcar como ya combatidas para que no vuelvan a pelear si bajan de región
  combatientes.forEach(p=> p._yaCombatio = true);

  // cada combatiente ataca al rival de mayor MM que no sea aliado
  combatientes.forEach(atk=>{
    if(atk.pv<=0) return;
    const objetivo = combatientes.find(d=> d.owner!==atk.owner && d.pv>0);
    if(!objetivo) return;
    eventos.push(...intercambio(atk, objetivo, regionId, estado));
  });

  // limpiar muertos y acreditar premio al atacante que lo derribó
  estado.jugadores.forEach(j=>{
    const arr = j.activas[regionId]||[];
    j.activas[regionId] = arr.filter(p=>{
      if(p.pv<=0){
        eventos.push({t:'muerte', txt:`💀 ${p.nombre} (${BANDOS[p.bando].nombre.split(' ')[0]}) cae en ${nombreRegion(regionId)}.`});
        if(p._matadoPor!=null){
          const winner = estado.jugadores[p._matadoPor];
          if(winner){ winner.premios = Math.max(0, winner.premios-1);
            eventos.push({t:'reward', txt:`🎴 J${winner.idx+1} toma 1 carta de premio (le quedan ${winner.premios}).`}); }
        }
        return false;
      }
      return true;
    });
  });

  // aplicar retroceso por empate (choque epistémico) a la región inferior
  const inf = regionInferior(regionId);
  if(inf){
    estado.jugadores.forEach(j=>{
      const arr = j.activas[regionId]||[];
      const quedan = [];
      arr.forEach(p=>{
        if(p._retrocede){
          p._retrocede=false; p.region=inf;
          (j.activas[inf]=j.activas[inf]||[]).push(p);
        } else quedan.push(p);
      });
      j.activas[regionId]=quedan;
    });
  } else {
    // región mínima: limpiar marca sin mover
    estado.jugadores.forEach(j=>(j.activas[regionId]||[]).forEach(p=>p._retrocede=false));
  }
  return { eventos, huboCombate:true };
}

function intercambio(atk, def, regionId, estado){
  const ev = [];
  const flags = estado?.flags || {};
  const mult = mmMultiplier(atk.mm);
  const cimBloqueado = flags.cimSinDanio && atk.cim>=4;   // Pantomima de Tarqui
  if(atk.atq > def.def && !cimBloqueado){
    let dmg = Math.max(1, Math.round(1 * mult));
    if(atk.mm>=3.0) dmg = Math.max(dmg, 2);
    if(flags.laboratorioColonial) dmg += 2;               // +2 daño global
    if(flags.cimBonusPeriferia && atk.bando==='A' && regionId!=='capital') dmg += 1;
    def.pv -= dmg;
    if(def.pv<=0) def._matadoPor = atk.owner;             // acreditar premio
    ev.push({t:'hit', txt:`⚔️ ${atk.nombre} impacta a ${def.nombre}: −${dmg} PV (×${mult}). Quedan ${Math.max(0,def.pv)} PV.`});
  } else if(cimBloqueado){
    ev.push({t:'block', txt:`${atk.nombre} (CIM≥4) no inflige daño este turno (Pantomima de Tarqui).`});
  } else if(atk.atq === def.def){
    // Choque epistémico: nadie pierde PV, ambos retroceden a la región inferior (si existe)
    atk._retrocede = true;
    def._retrocede = true;
    const inf = regionInferior(regionId);
    if(inf){
      ev.push({t:'choque', txt:`✶ Choque epistémico entre ${atk.nombre} y ${def.nombre}: nadie pierde PV; ambos bajan a ${nombreRegion(inf)}.`});
    } else {
      ev.push({t:'choque', txt:`✶ Choque epistémico en ${nombreRegion(regionId)} (mínimo): nadie pierde PV y nadie baja de región.`});
      atk._retrocede = false; def._retrocede = false;
    }
  } else {
    // bloqueado, contraataque
    const cmult = mmMultiplier(def.mm);
    if(def.atq > atk.def){
      let dmg = Math.max(1, Math.round(1*cmult));
      atk.pv -= dmg;
      ev.push({t:'contra', txt:`🛡️ ${def.nombre} bloquea y contraataca a ${atk.nombre}: −${dmg} PV.`});
    } else {
      ev.push({t:'block', txt:`🛡️ ${def.nombre} bloquea el ataque de ${atk.nombre}.`});
    }
  }
  return ev;
}

function nombreRegion(id){ return REGIONS.find(r=>r.id===id)?.nombre || id; }

// Reclamar recompensas: regiones controladas por una sola carta
function reclamarRecompensas(estado){
  const ev = [];
  REGIONS.forEach(r=>{
    const ocupantes = [];
    estado.jugadores.forEach(j=>{ (j.activas[r.id]||[]).forEach(p=>ocupantes.push({p,j})); });
    if(ocupantes.length===1){
      // Una sola carta controla la región al cerrar la ronda -> recompensa
      const {p,j} = ocupantes[0];
      j.pc += r.pc;
      if(r.extra){ for(const k in r.extra) j.fichas[k]+=r.extra[k]; }
      const extraTxt = r.extra ? ` y ${Object.entries(r.extra).map(([k,v])=>`+${v}${FICHA_EMOJI[k]}`).join(' ')}` : '';
      ev.push({t:'reward', txt:`🏛️ J${j.idx+1} (${BANDOS[p.bando].nombre.split(' ')[0]}) controla ${r.nombre}: +${r.pc} PC${extraTxt}. Total: ${j.pc} PC.`});
    } else if(ocupantes.length>=2){
      ev.push({t:'sys', txt:`${r.nombre} en disputa (${ocupantes.length} cartas): nadie obtiene su recompensa.`});
    }
  });
  return ev;
}

// Reinicia la marca _yaCombatio antes de una nueva resolución global de combate
function reiniciarCombate(estado){
  estado.jugadores.forEach(j=>{ for(const r in j.activas) (j.activas[r]||[]).forEach(p=> p._yaCombatio=false); });
}

// Marca, al inicio de cada ronda, qué cartas están solas en su región
function marcarControl(estado){
  estado.jugadores.forEach(j=>{ for(const r in j.activas) (j.activas[r]||[]).forEach(p=> p._soloDesdeInicio=null); });
  REGIONS.forEach(r=>{
    const ocup=[];
    estado.jugadores.forEach(j=>(j.activas[r.id]||[]).forEach(p=>ocup.push(p)));
    if(ocup.length===1) ocup[0]._soloDesdeInicio = r.id;
  });
}

// Comprobar condiciones de victoria/eliminación
function comprobarFin(estado){
  estado.jugadores.forEach(j=>{
    const sinCartas = j.banca.length===0 && Object.values(j.activas).every(a=>a.length===0) && j.mano.filter(c=>c.tipo==='personaje').length===0 && j.mazo.length===0;
    if(sinCartas) j.vivo=false;
    if(j.premios<=0) { estado.ganador = j.idx; }
  });
  const vivos = estado.jugadores.filter(j=>j.vivo);
  if(vivos.length===1 && estado.jugadores.length>1){ estado.ganador = vivos[0].idx; }
  if(estado.ganador!==null) estado.fase='fin';
  return estado.ganador;
}

function puedePagar(jug, coste){
  for(const k in coste){ if((jug.fichas[k]||0) < coste[k]) return false; }
  return true;
}
function pagar(jug, coste){
  for(const k in coste){ jug.fichas[k]-=coste[k]; }
}


/* ---- export global ---- */
Object.assign(window.PERI_NS, {
  FICHA_EMOJI, REGIONS, shuffle, nuevoJugador, crearEstado, robar,
  regionFichaExtra, resolverCombateRegion, nombreRegion, reclamarRecompensas, marcarControl, reiniciarCombate,
  comprobarFin, puedePagar, pagar, calcMM, mmMultiplier, cardById, BANDOS
});

})();