(function(){
const { REGIONS, BANDOS, cardById, FICHA_EMOJI, robar, nombreRegion } = window.PERI_NS;
/* ============================================================
   PERIFERIAS — Efectos automatizados de eventos y entrenadores
   Cada efecto recibe (estado, ctx) y devuelve un array de mensajes {t,txt}
   ctx = { jugadorActivo, helpers } con utilidades del motor
   ============================================================ */

const F = FICHA_EMOJI;
const log = (txt, t='evt') => ({ t, txt });

/* Utilidades compartidas */
function todosPersonajes(estado){
  const out = [];
  estado.jugadores.forEach(j=>{
    j.banca.forEach(p=>{ if(p.tipo==='personaje') out.push({p,j}); });
    for(const r in j.activas) (j.activas[r]||[]).forEach(p=>out.push({p,j,region:r}));
  });
  return out;
}
function activosDe(estado, bando){
  const out=[];
  estado.jugadores.filter(j=>j.bando===bando).forEach(j=>{
    for(const r in j.activas) (j.activas[r]||[]).forEach(p=>out.push({p,j,region:r}));
  });
  return out;
}
function controlador(estado, regionId){
  const ocup=[];
  estado.jugadores.forEach(j=>(j.activas[regionId]||[]).forEach(p=>ocup.push({p,j})));
  return ocup.length===1 ? ocup[0] : null;
}
function aplicarEstado(p, estadoNombre, turnos){
  p.estados[estadoNombre] = turnos;
}

/* ============================================================
   EVENTOS  (id 38–49)
   ============================================================ */
const EVENT_FX = {
  38(estado){ // Centralización de datos — favorece A
    const msgs=[]; const ctrl=controlador(estado,'capital');
    if(ctrl && ctrl.j.bando==='A'){ ctrl.j.premios=Math.max(0,ctrl.j.premios-1); msgs.push(log(`Centralización: ${BANDOS.A.nombre.split(' ')[0]} controla la Capital y toma 1 carta de premio.`,'reward')); }
    const b = estado.jugadores.find(j=>j.bando==='B');
    if(b){ robar(b); msgs.push(log('Bando B roba 1 carta como resistencia.','play')); }
    return msgs;
  },
  39(estado){ // Revuelta epistémica — favorece B
    const msgs=[]; let n=0;
    activosDe(estado,'B').forEach(({p})=>{ if((p.estados.Infantilizado||0)<=2){ p.pv+=10; p._buffRevuelta=(p._buffRevuelta||0)+10; n++; } });
    msgs.push(log(`Revuelta epistémica: ${n} personaje(s) del Bando B ganan +10 PV temporales y liberan habilidades silenciadas.`,'reward'));
    activosDe(estado,'B').forEach(({p})=>{ if(p.estados['Silencio epistémico']) delete p.estados['Silencio epistémico']; });
    return msgs;
  },
  40(estado){ // Expedición botánica — controlador zona colonial
    const ctrl=controlador(estado,'colonial');
    if(ctrl){ const c=robar(ctrl.j); return [log(`Expedición botánica: ${BANDOS[ctrl.j.bando].nombre.split(' ')[0]} controla la zona colonial y roba ${c?c.nombre:'(mazo vacío)'} a la banca.`,'play')]; }
    estado.jugadores.forEach(j=>robar(j));
    return [log('Expedición botánica: nadie controla la zona colonial; ambos roban 1 carta.','play')];
  },
  41(estado){ // Crisis del paradigma — ninguno
    estado.flags = estado.flags||{}; estado.flags.crisisParadigma = 2; // bloquea objetos este turno
    estado.flags.robarExtraProximo = 2;
    return [log('Crisis del paradigma: ningún Objeto puede jugarse este turno. Ambos robarán +2 cartas el próximo turno.','warn')];
  },
  42(estado){ return [log('Traducción regional: el Bando A puede recuperar 1 entrenador del descarte; si el Bando B lo "traduce", ambos ganan 1 premio (negociación manual).','sys')]; },
  43(estado){ // Gran ciencia desbordada — favorece B
    const msgs=[]; let dmg=0,buf=0;
    todosPersonajes(estado).forEach(({p})=>{
      if(p.mse>=4){ p.pv-=10; dmg++; }
      else if(p.mse<=2){ p._energiaGratis=(p._energiaGratis||0)+1; buf++; }
    });
    msgs.push(log(`Gran ciencia desbordada: ${dmg} personaje(s) con MSE≥4 reciben 10 de daño; ${buf} con MSE≤2 obtienen 1 energía gratuita.`,'combat'));
    return msgs;
  },
  44(estado){ // Punto cero cuestionado — favorece B
    estado.flags=estado.flags||{}; estado.flags.tutelaAnulada=1;
    activosDe(estado,'B').forEach(({p})=>{ Object.keys(p.estados).forEach(k=>{ if(k.includes('Silencio')||k==='Infantilizado') delete p.estados[k]; }); });
    return [log('Punto cero cuestionado: efectos de tutela (CIM/Infantilización ≥4) anulados este turno; el Bando B libera habilidades bloqueadas.','reward')];
  },
  45(estado){ estado.flags=estado.flags||{}; estado.flags.espacioEstriado=1; return [log('Espacio estriado: en una región (no Capital) la energía verde se vuelve amarilla y los CIM≥4 infligen +2 allí.','sys')]; },
  46(estado){ // Pantomima de Tarqui — favorece B
    const msgs=[log('Pantomima de Tarqui: el Bando B puede imitar 1 habilidad del Bando A sin coste; los CIM≥4 no infligen daño este turno.','sys')];
    estado.flags=estado.flags||{}; estado.flags.cimSinDanio=1;
    if(controlador(estado,'capital')?.j.bando==='A'){ const b=estado.jugadores.find(j=>j.bando==='B'); if(b){robar(b); msgs.push(log('El Bando A controla la Capital: el Bando B roba 1 carta.','play'));} }
    return msgs;
  },
  47(estado){ // Red imperial expandida — favorece A
    estado.flags=estado.flags||{}; estado.flags.movimientoLibreA=1;
    return [log('Red imperial expandida: personajes del Bando A con MSE≥4 se mueven libremente; el Bando B coloca 1 básico desde la banca.','sys')];
  },
  48(estado){ estado.flags=estado.flags||{}; estado.flags.cimBonusPeriferia=1; return [log('El Triunfo del Mapa: el Bando A reordena su mazo y gana +2 CIM al atacar zonas periféricas este turno.','sys')]; },
  49(estado){ estado.flags=estado.flags||{}; estado.flags.castaBarata=1; return [log('Limpieza de Sangre: aplicar Etiquetas de Casta al Bando B cuesta la mitad; el Bando C puede anular habilidades de un criollo/periférico.','sys')]; },
};

/* ============================================================
   ENTRENADORES (objetos, partidarios, estadios)
   Devuelven mensajes; algunos requieren un objetivo (targetIid)
   ============================================================ */
const TRAINER_FX = {
  // ----- Objetos Bando A -----
  17(estado,{jug}){ const a=robar(jug),b=robar(jug); return [log(`Informe de Expedición: robas ${[a,b].filter(Boolean).map(c=>c.nombre).join(' y ')||'(nada)'}.`,'play')]; },
  18(estado,{jug}){ return [log('Catálogo Taxonómico: busca un personaje básico del Bando A en tu mazo (selección manual).','sys')]; },
  19(estado,{jug}){ return [log('Decreto de la Real Academia: recupera 1 entrenador del descarte (turnos pares).','sys')]; },
  20(estado){ estado.eventoActivo=null; estado.flags=estado.flags||{}; estado.flags.crisisParadigma=0; return [log('Protocolo Científico: el evento activo queda cancelado.','reward')]; },
  // ----- Objetos Bando B -----
  25(estado,{jug}){ return [log('Rumor del Mercado: miras y reordenas las 3 cartas superiores del mazo rival.','sys')]; },
  26(estado,{jug,target}){ if(target){ target._energiaGratis=(target._energiaGratis||0)+1; return [log(`Testimonio Oral: ${target.nombre} recupera 1 Energía Saber Local.`,'play')]; } return [log('Testimonio Oral: elige un personaje objetivo.','warn')]; },
  27(estado,{jug}){ [0,1,2].forEach(()=>robar(jug)); jug._descartarFin=(jug._descartarFin||0)+1; return [log('Contrabando de Datos: robas 3 cartas (descartarás 1 al final del turno).','play')]; },
  28(estado,{target}){ if(target){ aplicarEstado(target,'Silencio epistémico',1); return [log(`Sabotaje a las Vías: ${target.nombre} no puede usar habilidades este turno.`,'combat')]; } return [log('Sabotaje a las Vías: elige un personaje con MSE≥4.','warn')]; },
  // ----- Objetos Bando C -----
  29(estado,{target}){ if(target){ aplicarEstado(target,'Etiqueta de Casta',99); target.atq=Math.max(0,target.atq-1); return [log(`Cuadros de Castas: ${target.nombre} recibe Etiqueta de Casta (−1 ATQ permanente).`,'combat')]; } return [log('Cuadros de Castas: elige un personaje del Bando B.','warn')]; },
  30(estado){ estado.flags=estado.flags||{}; estado.flags.panosDistancia=1; return [log('Paños de la Distancia: ataques de BLQ≤2 contra BLQ≥4 rebotan este turno.','sys')]; },
  31(estado,{target}){ if(target){ aplicarEstado(target,'Bloqueo',1); return [log(`Decreto de Limpieza de Sangre: ${target.nombre} no puede evolucionar ni moverse este turno.`,'combat')]; } return [log('Decreto: elige un personaje del Bando B con Etiqueta de Casta.','warn')]; },
  // ----- Partidarios (efectos pasivos: se registran como activos) -----
  21(estado,{jug}){ jug.partidario=21; const t=primerHerido(jug); if(t){t.pv=Math.min(t.pvMax,t.pv+1);} return [log('El Cronista Real (partidario): al inicio de tu turno restauras 1 PV a un personaje.','play')]; },
  22(estado,{jug}){ jug.partidario=22; return [log('El Cónsul de Fomento (partidario): tus personajes BLQ≥4 reducen su coste de retirada.','play')]; },
  23(estado,{jug}){ jug.partidario=23; return [log('La Curandera del Pueblo (partidario): cura y limpia Etiquetas de Casta cada turno.','play')]; },
  24(estado,{jug}){ jug.partidario=24; return [log('El Escribano Clandestino (partidario): 1 vez/turno conviertes Datos en Saber Local.','play')]; },
  32(estado,{jug}){ jug.partidario=32; return [log('El Sabio Ilustrado (partidario): el Bando C puede leer los eventos antes de revelarse.','play')]; },
  33(estado,{jug}){ jug.partidario=33; return [log('La Matrona de las Castas (partidario): las Etiquetas de Casta duran 1 turno más.','play')]; },
  34(estado,{jug}){ jug.partidario=34; return [log('Real Audiencia (partidario): BLQ≥4 pierden 1 ATQ pero son inmunes a Silencio.','play')]; },
  35(estado,{jug}){ jug.partidario=35; return [log('Territorio en Disputa (partidario): MSE≤2 generan +1 verde; MSE≥4 pierden 1 PV/turno.','play')]; },
  36(estado,{jug}){ jug.partidario=36; estado.flags=estado.flags||{}; estado.flags.laboratorioColonial=1; return [log('Laboratorio Colonial (partidario): todos los ataques infligen +2 de daño.','play')]; },
  // ----- Estadio -----
  37(estado){ estado.estadio=37; return [log('Puerto de Intercambio (estadio): ambos jugadores pueden adjuntar hasta 2 energías/turno.','play')]; },
};

function primerHerido(jug){
  for(const r in jug.activas){ const t=(jug.activas[r]||[]).find(p=>p.pv<p.pvMax); if(t) return t; }
  return jug.banca.find(p=>p.tipo==='personaje'&&p.pv<p.pvMax)||null;
}

/* Aplicadores públicos */
function aplicarEvento(estado, id){
  const fx = EVENT_FX[id];
  if(!fx) return [];
  return fx(estado) || [];
}
function aplicarEntrenador(estado, id, jug, target){
  const fx = TRAINER_FX[id];
  if(!fx) return [log('Esta carta no tiene efecto automatizado.','sys')];
  return fx(estado, { jug, target }) || [];
}

/* Limpieza al final del turno: caduca estados y buffs temporales */
function finDeTurnoLimpieza(estado){
  const msgs=[];
  todosPersonajes(estado).forEach(({p})=>{
    // revertir buff de revuelta
    if(p._buffRevuelta){ p.pv=Math.max(1,p.pv-p._buffRevuelta); p._buffRevuelta=0; }
    // decrementar estados temporales
    for(const k in p.estados){ if(p.estados[k]<99){ p.estados[k]--; if(p.estados[k]<=0) delete p.estados[k]; } }
  });
  if(estado.flags){ // flags de 1 turno se limpian
    ['cimSinDanio','tutelaAnulada','espacioEstriado','movimientoLibreA','cimBonusPeriferia','castaBarata','panosDistancia'].forEach(f=>{ if(estado.flags[f]) estado.flags[f]=0; });
    if(estado.flags.crisisParadigma>0) estado.flags.crisisParadigma--;
  }
  return msgs;
}


/* ---- export global ---- */
Object.assign(window.PERI_NS, { EVENT_FX, TRAINER_FX, aplicarEvento, aplicarEntrenador, finDeTurnoLimpieza });

})();