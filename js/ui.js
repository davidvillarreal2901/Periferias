(function(){
const E = window.PERI_NS;
const FX = window.PERI_NS;
const { CARDS, BANDOS, REGIONS, cardImg, cardById } = window.PERI_NS;
/* ============================================================
   PERIFERIAS — Controlador de UI + Drag & Drop
   ============================================================ */

const FICHA = E.FICHA_EMOJI;
let estado = null;
let dragData = null;      // { iid, from } durante el arrastre
let ghost = null;         // elemento fantasma que sigue al cursor

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => { const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; };

/* ---------- Arranque ---------- */
window.addEventListener('DOMContentLoaded', () => {
  $('#btn-start').addEventListener('click', startGame);
  document.querySelectorAll('input[name=numj]').forEach(r=>r.addEventListener('change', renderBandoPickers));
  renderBandoPickers();
});

function renderBandoPickers(){
  const n = +document.querySelector('input[name=numj]:checked').value;
  const wrap = $('#bando-pickers'); wrap.innerHTML='';
  const opts = n===3 ? ['A','B','C'] : ['A','B'];
  for(let i=0;i<n;i++){
    const row = el('div','picker-row');
    row.innerHTML = `<label>Jugador ${i+1}</label>`;
    const sel = el('select'); sel.dataset.j=i;
    ['A','B','C'].forEach(b=>{
      const o=el('option'); o.value=b; o.textContent=`Bando ${b} — ${BANDOS[b].nombre}`;
      if(b===opts[i]) o.selected=true; sel.appendChild(o);
    });
    row.appendChild(sel); wrap.appendChild(row);
  }
}

function startGame(){
  const n = +document.querySelector('input[name=numj]:checked').value;
  const bandos = [...document.querySelectorAll('#bando-pickers select')].slice(0,n).map(s=>s.value);
  estado = E.crearEstado(bandos);
  estado.fase='setup';            // fase de colocación inicial
  estado.turno=0;
  estado.activo=0;
  estado.setupColocadas={};       // idxJugador -> instancia colocada
  $('#setup').style.display='none';
  $('#game').style.display='flex';
  render();
  log(`Fase inicial: cada jugador coloca UNA carta en la región que desee. Se compararán por MM para decidir quién tiene el turno dominante (no se quita vida).`,'sys');
  log(`Coloca tu carta, ${jugActivo().nombre}.`,'sys');
}

const jugActivo = () => estado.jugadores[estado.activo];

/* ---------- Fase de setup: comparar MM y arrancar turno 1 ---------- */
function avanzarSetup(){
  // ¿colocaron todos?
  const total = estado.jugadores.length;
  const colocados = Object.keys(estado.setupColocadas).length;
  if(colocados < total){
    // pasar al siguiente jugador que aún no coloca
    let next = estado.activo;
    for(let i=0;i<total;i++){
      next = (next+1)%total;
      if(estado.setupColocadas[next]===undefined) break;
    }
    estado.activo = next;
    render();
    log(`Coloca tu carta, ${jugActivo().nombre}.`,'sys');
    return;
  }
  // todos colocaron: comparar MM
  const ranking = Object.entries(estado.setupColocadas)
    .map(([idx,inst])=>({idx:+idx, inst}))
    .sort((a,b)=> b.inst.mm - a.inst.mm);
  const detalle = ranking.map(r=>`J${r.idx+1} ${r.inst.nombre} (MM ${r.inst.mm})`).join(' · ');
  log(`Comparación de MM inicial: ${detalle}. Solo define el orden; no se pierde vida.`,'evt');
  const dominante = ranking[0];
  estado.dominanteIdx = dominante.idx;
  log(`🏛️ J${dominante.idx+1} (${dominante.inst.nombre}) tiene el turno dominante y comienza.`,'reward');
  // arrancar turno 1
  estado.fase='turno';
  estado.turno=1;
  estado.activo=dominante.idx;
  // marcar inicio de ronda para el conteo de control
  marcarInicioRonda();
  tirarEvento();
  render();
  log(`— Turno 1 · Juega ${jugActivo().nombre} —`,'sys');
}

function marcarInicioRonda(){
  E.marcarControl(estado);
}

/* ---------- Eventos de ronda ---------- */
function tirarEvento(){
  if(estado.turno % 2 === 1){ // turnos impares revelan evento
    if(estado.eventosMazo.length===0) estado.eventosMazo = E.shuffle(CARDS.filter(c=>c.tipo==='evento').map(c=>c.id));
    const id = estado.eventosMazo.shift();
    estado.eventoActivo = id;
    const c = cardById(id);
    log(`🎴 EVENTO: ${c.nombre} — ${c.hab}`,'evt');
    // aplicar efecto mecánico automatizado
    const msgs = FX.aplicarEvento(estado, id);
    msgs.forEach(m=> log(m.txt, m.t));
    E.comprobarFin(estado);
    if(estado.ganador!==null){ endGame(); }
  }
}

/* ===========================================================
   RENDER
   =========================================================== */
function render(){
  renderTopbar();
  renderRegions();
  renderHand();
  renderBanca();
  renderEvento();
}

function renderTopbar(){
  const t = $('#topbar');
  t.innerHTML='';
  estado.jugadores.forEach(j=>{
    const card = el('div','player-chip'+(j.idx===estado.activo?' active':'')+(j.vivo?'':' dead'));
    card.style.setProperty('--bcol', BANDOS[j.bando].color);
    card.innerHTML = `
      <div class="pc-name">J${j.idx+1} · Bando ${j.bando}</div>
      <div class="pc-fichas">${FICHA.datos}${j.fichas.datos} ${FICHA.saber}${j.fichas.saber} ${FICHA.poder}${j.fichas.poder}</div>
      <div class="pc-score"><span class="pc-big">${j.pc}</span> PC · 🎴 ${j.premios} premios · 🃏 ${j.mazo.length}</div>`;
    t.appendChild(card);
  });
  if(estado.fase==='setup'){
    $('#turn-indicator').innerHTML = `<b style="color:var(--bandoC)">FASE INICIAL</b> · Coloca UNA carta para disputar el turno dominante · Activo: <b style="color:${BANDOS[jugActivo().bando].color}">J${estado.activo+1}</b>`;
  } else {
    $('#turn-indicator').innerHTML = `Turno <b>${estado.turno}</b> · ${estado.turno%2===1?'IMPAR (evento)':'PAR (movimiento)'} · Activo: <b style="color:${BANDOS[jugActivo().bando].color}">J${estado.activo+1}</b>`;
  }
}

function renderEvento(){
  const box = $('#evento-box');
  if(estado.eventoActivo){
    const c = cardById(estado.eventoActivo);
    box.innerHTML = `<img src="${cardImg(c.id)}" alt="${c.nombre}"><div class="evt-text"><b>${c.nombre}</b><p>${c.hab}</p><small>${c.ref}</small></div>`;
  } else box.innerHTML = `<div class="evt-empty">Sin evento activo (turno par)</div>`;
}

function renderRegions(){
  const map = $('#regions');
  map.innerHTML='';
  REGIONS.forEach(r=>{
    const zone = el('div','region');
    zone.dataset.region = r.id;
    const ocupantes = [];
    estado.jugadores.forEach(j=> (j.activas[r.id]||[]).forEach(p=>ocupantes.push(p)));
    // estado de control: 1 sola carta = controlada; 2+ = disputada
    let badge='';
    if(ocupantes.length===1){
      const c=BANDOS[ocupantes[0].bando].color;
      badge=`<span class="region-ctrl" style="--c:${c}">● Controlada · +${r.pc} PC al cierre</span>`;
      zone.classList.add('controlada');
    } else if(ocupantes.length>=2){
      badge=`<span class="region-ctrl disputa">⚔ En disputa</span>`;
      zone.classList.add('disputa');
    }
    zone.innerHTML = `<div class="region-head">
        <span class="region-name">${r.nombre}</span>
        <span class="region-reward">+${r.pc}PC${r.extra?' '+Object.entries(r.extra).map(([k,v])=>`+${v}${FICHA[k]}`).join(''):''}</span>
      </div>
      <div class="region-bonus">${r.bonus}</div>
      ${badge}
      <div class="region-cards" data-region="${r.id}"></div>`;
    const slot = zone.querySelector('.region-cards');
    ocupantes.forEach(p=> slot.appendChild(renderMiniCard(p, 'region')) );
    // drop target
    attachDrop(slot, r.id, 'region');
    map.appendChild(zone);
  });
}

function renderHand(){
  const hand = $('#hand');
  hand.innerHTML='';
  const j = jugActivo();
  j.mano.forEach(p=> hand.appendChild(renderMiniCard(p,'mano')) );
  $('#hand-count').textContent = j.mano.length;
}

function renderBanca(){
  const b = $('#banca');
  b.innerHTML='';
  const j = jugActivo();
  j.banca.forEach(p=> b.appendChild(renderMiniCard(p,'banca')) );
  $('#banca-count').textContent = j.banca.length;
  attachDrop(b, null, 'banca');
}

/* ---------- Mini carta ---------- */
function renderMiniCard(inst, zona){
  const c = cardById(inst.cardId);
  const card = el('div', 'mini-card tipo-'+inst.tipo);
  card.dataset.iid = inst.iid;
  card.dataset.zona = zona;
  if(inst.bando) card.style.setProperty('--bcol', BANDOS[inst.bando].color);
  let stats='';
  if(inst.tipo==='personaje'){
    const pvpct = Math.max(0, inst.pv/inst.pvMax*100);
    stats = `<div class="mc-stats">
        <span class="mc-atq">⚔${inst.atq}</span><span class="mc-def">🛡${inst.def}</span><span class="mc-mm">MM ${inst.mm}</span>
      </div>
      <div class="mc-pv"><div class="mc-pv-bar" style="width:${pvpct}%"></div><span>${inst.pv}/${inst.pvMax}</span></div>`;
  }
  const cost = formatCoste(c.coste, c.costeTexto);
  card.innerHTML = `<img class="mc-img" src="${cardImg(inst.cardId)}" loading="lazy" alt="${inst.nombre}">
     <div class="mc-overlay">
        <div class="mc-name">${inst.nombre}</div>
        ${stats}
        ${cost?`<div class="mc-cost">${cost}</div>`:''}
     </div>`;
  // arrastre solo de cartas del jugador activo y solo personajes
  const own = inst.owner===estado.activo;
  if(own && (inst.tipo==='personaje')){
    card.draggable=false;
    card.classList.add('draggable');
    attachDrag(card, inst, zona);
  }
  // click: si hay un entrenador esperando objetivo, lo aplica; si no, muestra detalle
  card.addEventListener('click', (e)=>{
    if(dragData) return;
    if(pendingTrainer && inst.tipo==='personaje'){ resolverTarget(inst); return; }
    showDetail(inst);
  });
  return card;
}

function formatCoste(coste, txt){
  if(txt) return `<i>${txt}</i>`;
  if(!coste || !Object.keys(coste).length) return '';
  return Object.entries(coste).map(([k,v])=>`${v}${FICHA[k]}`).join(' ');
}

/* ===========================================================
   DRAG & DROP  (puntero, con fantasma animado)
   =========================================================== */
function attachDrag(node, inst, fromZona){
  node.addEventListener('pointerdown', e=>{
    if(e.button!==0) return;
    e.preventDefault();
    const own = inst.owner===estado.activo;
    if(!own) return;
    startDrag(e, node, inst, fromZona);
  });
}

function startDrag(e, node, inst, fromZona){
  dragData = { iid:inst.iid, inst, from:fromZona };
  node.classList.add('dragging-src');
  // crear fantasma
  ghost = node.cloneNode(true);
  ghost.classList.add('ghost-card');
  ghost.classList.remove('dragging-src');
  document.body.appendChild(ghost);
  moveGhost(e.clientX, e.clientY);
  document.body.classList.add('is-dragging');

  const onMove = ev=>{
    moveGhost(ev.clientX, ev.clientY);
    highlightDropUnder(ev.clientX, ev.clientY);
  };
  const onUp = ev=>{
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    finishDrag(ev.clientX, ev.clientY, node);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function moveGhost(x,y){
  if(!ghost) return;
  ghost.style.left = x+'px';
  ghost.style.top  = y+'px';
}

function elementUnder(x,y){
  if(ghost) ghost.style.display='none';
  const t = document.elementFromPoint(x,y);
  if(ghost) ghost.style.display='';
  return t;
}

function highlightDropUnder(x,y){
  document.querySelectorAll('.drop-hot').forEach(n=>n.classList.remove('drop-hot'));
  const t = elementUnder(x,y);
  const dz = t?.closest('[data-droptype]');
  if(dz) dz.classList.add('drop-hot');
}

function finishDrag(x,y, srcNode){
  document.querySelectorAll('.drop-hot').forEach(n=>n.classList.remove('drop-hot'));
  document.body.classList.remove('is-dragging');
  srcNode.classList.remove('dragging-src');
  const t = elementUnder(x,y);
  const dz = t?.closest('[data-droptype]');
  // animación de soltar
  if(ghost){
    ghost.classList.add('ghost-drop');
    const g = ghost; ghost=null;
    setTimeout(()=>g.remove(), 220);
  }
  if(dz){
    const dtype = dz.dataset.droptype;
    const region = dz.dataset.region || null;
    handleDrop(dragData, dtype, region);
  }
  dragData = null;
}

function attachDrop(node, region, type){
  node.dataset.droptype = type;
  if(region) node.dataset.region = region;
}

/* ---------- Lógica de soltar ---------- */
function handleDrop(drag, dtype, region){
  if(!drag) return;
  const j = jugActivo();
  const inst = findInst(j, drag.iid);
  if(!inst) return;

  // ----- FASE SETUP: solo una carta por jugador, a una región -----
  if(estado.fase==='setup'){
    if(dtype!=='region'){ log('En la fase inicial debes colocar tu carta en una región.','warn'); return; }
    if(estado.setupColocadas[estado.activo]!==undefined){ log('Ya colocaste tu carta inicial.','warn'); return; }
    if(inst.tipo!=='personaje'){ log('Solo puedes colocar un personaje.','warn'); return; }
    removeFrom(j, inst.iid);
    inst.region=region;
    (j.activas[region]=j.activas[region]||[]).push(inst);
    estado.setupColocadas[estado.activo]=inst;
    log(`${jugActivo().nombre} coloca ${inst.nombre} en ${E.nombreRegion(region)} (MM ${inst.mm}).`,'play');
    render();
    avanzarSetup();
    return;
  }

  // mano/banca -> región : jugar carta a una región
  if(dtype==='region'){
    if(drag.from==='mano' || drag.from==='banca'){
      playToRegion(j, inst, drag.from, region);
    } else if(drag.from==='region'){
      moveBetweenRegions(j, inst, region);
    }
  }
  // región -> banca : retirar
  else if(dtype==='banca'){
    if(drag.from==='region'){ retirarABanca(j, inst); }
    else if(drag.from==='mano'){ manoABanca(j, inst); }
  }
  render();
}

function findInst(j, iid){
  let f = j.mano.find(c=>c.iid===iid); if(f) return f;
  f = j.banca.find(c=>c.iid===iid); if(f) return f;
  for(const r in j.activas){ f=(j.activas[r]||[]).find(c=>c.iid===iid); if(f) return f; }
  return null;
}

function removeFrom(j, iid){
  j.mano = j.mano.filter(c=>c.iid!==iid);
  j.banca = j.banca.filter(c=>c.iid!==iid);
  for(const r in j.activas) j.activas[r] = (j.activas[r]||[]).filter(c=>c.iid!==iid);
}

function playToRegion(j, inst, from, region){
  // en turnos pares solo 1 cambio de región; lo controlamos con flag
  if(from==='mano'){
    // pagar coste de despliegue
    if(!E.puedePagar(j, inst.coste||{})){
      log(`No tienes fichas para desplegar ${inst.nombre} (${formatCosteText(inst.coste)}).`,'warn'); return;
    }
    E.pagar(j, inst.coste||{});
  }
  removeFrom(j, inst.iid);
  inst.region = region;
  (j.activas[region] = j.activas[region]||[]).push(inst);
  log(`${inst.nombre} desplegado en ${E.nombreRegion(region)}.`,'play');
}

function moveBetweenRegions(j, inst, region){
  if(estado.turno%2===0){
    if(j._movioEstaRonda){ log('En turnos pares solo se permite 1 cambio de región.','warn'); return; }
    j._movioEstaRonda=true;
  }
  removeFrom(j, inst.iid);
  inst.region=region;
  (j.activas[region]=j.activas[region]||[]).push(inst);
  log(`${inst.nombre} se mueve a ${E.nombreRegion(region)}.`,'move');
}

function retirarABanca(j, inst){
  removeFrom(j, inst.iid);
  inst.region=null;
  j.banca.push(inst);
  log(`${inst.nombre} se retira a la banca.`,'move');
}
function manoABanca(j, inst){
  if(j.banca.length>=5){ log('La banca está llena (máx. 5).','warn'); return; }
  removeFrom(j, inst.iid);
  j.banca.push(inst);
  log(`${inst.nombre} colocado en la banca.`,'play');
}

function formatCosteText(coste){
  if(!coste||!Object.keys(coste).length) return 'gratis';
  return Object.entries(coste).map(([k,v])=>`${v}${FICHA[k]}`).join(' ');
}

/* ===========================================================
   ACCIONES DE TURNO
   =========================================================== */
window.PERI = {
  robar(){ if(bloqueoSetup())return; const j=jugActivo(); const c=E.robar(j); if(c) log(`Robaste ${c.nombre}.`,'play'); else log('Mazo vacío.','warn'); render(); },
  combate(){ if(bloqueoSetup())return; resolverRonda(); },
  finTurno(){ if(bloqueoSetup())return; finalizarTurno(); },
  comprar(){ if(bloqueoSetup())return; openShop(); },
  reset(){ if(confirm('¿Reiniciar la partida?')) location.reload(); },
};

function bloqueoSetup(){
  if(estado.fase==='setup'){ log('Primero completa la fase inicial: cada jugador coloca UNA carta.','warn'); return true; }
  return false;
}

// Botón "Resolver combate ahora": solo resuelve enfrentamientos en regiones disputadas
function resolverRonda(){
  let any=false;
  E.reiniciarCombate(estado);
  REGIONS.forEach(r=>{
    const res = E.resolverCombateRegion(estado, r.id);
    res.eventos.forEach(e=> log(e.txt, e.t==='muerte'?'kill':'combat'));
    if(res.huboCombate) any=true;
  });
  if(!any) log('No hay regiones en disputa ahora mismo.','sys');
  // recalcular quién quedó solo tras el combate (para el control sostenido)
  E.marcarControl(estado);
  E.comprobarFin(estado);
  if(estado.ganador!==null){ endGame(); return; }
  render();
}

// Cierre de ronda automático: resuelve combates pendientes y acredita PC de región
function cerrarRonda(){
  // 1) resolver combates en regiones disputadas
  E.reiniciarCombate(estado);
  REGIONS.forEach(r=>{
    const res = E.resolverCombateRegion(estado, r.id);
    res.eventos.forEach(e=> log(e.txt, e.t==='muerte'?'kill':'combat'));
  });
  // 2) acreditar PC a quien controle cada región en solitario toda la ronda
  const msgs = E.reclamarRecompensas(estado);
  if(msgs.length) msgs.forEach(e=> log(e.txt, e.t));
  else log('Ninguna región fue controlada en solitario esta ronda.','sys');
  E.comprobarFin(estado);
}

function finalizarTurno(){
  const prev = jugActivo();
  prev._movioEstaRonda=false;
  // limpieza de estados/buffs temporales al cerrar el turno
  FX.finDeTurnoLimpieza(estado).forEach(m=>log(m.txt,m.t));
  // descarte pendiente (Contrabando de Datos)
  if(prev._descartarFin>0 && prev.mano.length){ const d=prev.mano.pop(); log(`${prev.nombre} descarta ${d.nombre} (Contrabando de Datos).`,'play'); prev._descartarFin=0; }
  // siguiente jugador vivo
  let next = estado.activo;
  for(let i=0;i<estado.jugadores.length;i++){
    next = (next+1)%estado.jugadores.length;
    if(estado.jugadores[next].vivo) break;
  }
  // determinar si arranca una nueva ronda (volvemos al jugador dominante)
  const dominante = estado.dominanteIdx ?? 0;
  const nuevaRonda = (next === dominante);

  // ----- CIERRE DE RONDA AUTOMÁTICO -----
  if(nuevaRonda){
    log(`▣ Fin de la ronda ${estado.turno}: resolviendo combates y repartiendo recompensas…`,'sys');
    cerrarRonda();                       // combate + PC automáticos
    if(estado.ganador!==null){ endGame(); return; }
    estado.turno++;
  }
  estado.activo = next;
  if(estado.turno%2===0) estado.eventoActivo=null;
  // al inicio de una nueva ronda, marcar qué cartas están solas (para el control sostenido)
  if(nuevaRonda) marcarInicioRonda();
  // robar al inicio del turno
  const j = jugActivo();
  if(j.mazo.length===0){ log(`${j.nombre} no puede robar: mazo vacío. ¡Pierde por desgaste!`,'kill'); j.vivo=false; E.comprobarFin(estado); if(estado.ganador!==null){endGame();return;} }
  else {
    E.robar(j);
    // robo extra por Crisis del Paradigma
    if(estado.flags?.robarExtraProximo>0){ E.robar(j); E.robar(j); estado.flags.robarExtraProximo--; log(`${j.nombre} roba +2 cartas (Crisis del Paradigma).`,'play'); }
  }
  tirarEvento();
  render();
  log(`— Turno ${estado.turno} · Juega ${j.nombre} —`,'sys');
}

/* ---------- Tienda de entrenadores ---------- */
function openShop(){
  const modal=$('#shop'); modal.style.display='flex';
  const list=$('#shop-list'); list.innerHTML='';
  const entrenadores = CARDS.filter(c=>['objeto','partidario','estadio'].includes(c.tipo));
  const j = jugActivo();
  entrenadores.forEach(c=>{
    const item=el('div','shop-item');
    const can = E.puedePagar(j, c.coste||{});
    item.innerHTML=`<img src="${cardImg(c.id)}" alt="${c.nombre}">
      <div class="shop-info"><b>${c.nombre}</b><small>${c.tipo} · Bando ${c.bando||'-'}</small>
      <p>${c.hab}</p>
      <span class="shop-cost">${formatCosteText(c.coste)}</span></div>
      <button ${can?'':'disabled'} data-buy="${c.id}">Comprar</button>`;
    item.querySelector('button').addEventListener('click',()=>buy(c.id));
    list.appendChild(item);
  });
}
window.closeShop=()=>{ $('#shop').style.display='none'; };

function buy(id){
  const j=jugActivo(); const c=cardById(id);
  if(!E.puedePagar(j,c.coste||{})){ log('Fichas insuficientes.','warn'); return; }
  // Crisis del Paradigma bloquea Objetos
  if(c.tipo==='objeto' && estado.flags?.crisisParadigma>0){
    log('Crisis del Paradigma activa: no puedes jugar Objetos este turno.','warn'); return;
  }
  // ¿requiere objetivo?
  const necesitaTarget = [26,28,29,31].includes(id);
  if(necesitaTarget){
    pendingTrainer = id;
    closeShop();
    log(`Selecciona un personaje objetivo para ${c.nombre} (haz clic en una carta en el tablero).`,'sys');
    document.body.classList.add('targeting');
    return;
  }
  E.pagar(j,c.coste||{});
  const msgs = FX.aplicarEntrenador(estado, id, j, null);
  log(`🛒 ${j.nombre} compró ${c.nombre} (${c.tipo}).`,'shop');
  msgs.forEach(m=>log(m.txt,m.t));
  closeShop(); render();
}

let pendingTrainer = null;
function resolverTarget(inst){
  const j=jugActivo(); const c=cardById(pendingTrainer);
  E.pagar(j, c.coste||{});
  const msgs = FX.aplicarEntrenador(estado, pendingTrainer, j, inst);
  log(`🛒 ${j.nombre} usó ${c.nombre} sobre ${inst.nombre}.`,'shop');
  msgs.forEach(m=>log(m.txt,m.t));
  pendingTrainer=null;
  document.body.classList.remove('targeting');
  render();
}

/* ---------- Detalle de carta ---------- */
function showDetail(inst){
  const c = cardById(inst.cardId);
  const modal=$('#detail'); modal.style.display='flex';
  $('#detail-img').src = cardImg(inst.cardId);
  let body = `<h2>${c.nombre}</h2><p class="d-sub">${c.sub||c.tipo}${inst.bando?' · Bando '+inst.bando:''}</p>`;
  if(inst.tipo==='personaje'){
    body += `<div class="d-grid">
      <span>PV</span><b>${inst.pv}/${inst.pvMax}</b>
      <span>ATQ</span><b>${inst.atq}</b>
      <span>DEF</span><b>${inst.def}</b>
      <span>BLQ</span><b>${inst.blq}</b>
      <span>MSE</span><b>${inst.mse}</b>
      <span>CIM</span><b>${inst.cim}</b>
      <span>MM</span><b>${inst.mm} (×${E.mmMultiplier(inst.mm)})</b>
    </div>`;
  }
  body += `<p class="d-hab"><b>Habilidad:</b> ${c.hab||'—'}</p><p class="d-ref">${c.ref||''}</p>`;
  $('#detail-body').innerHTML = body;
}
window.closeDetail=()=>{ $('#detail').style.display='none'; };

/* ---------- Fin ---------- */
function endGame(){
  const g = estado.jugadores[estado.ganador];
  $('#win-overlay').style.display='flex';
  $('#win-text').innerHTML = `<h1>Victoria</h1><h2 style="color:${BANDOS[g.bando].color}">J${g.idx+1} · ${g.nombre}</h2><p>consolida el control del sistema-mundo del conocimiento.</p>`;
}

/* ---------- Log ---------- */
function log(txt, cls=''){
  const l=$('#log');
  const line=el('div','log-line '+cls, txt);
  l.prepend(line);
  estado.log.unshift(txt);
}

})();