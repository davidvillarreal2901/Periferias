(function(){
/* ============================================================
   PERIFERIAS — Base de datos de cartas
   Cada carta apunta a su imagen en cards/{id}.webp
   MM = (CIM × BLQ_decimal) / MSE   (precalculado en cada carta)
   ============================================================ */

const BANDOS = {
  A: { id: 'A', nombre: 'Sociedades Científicas Coloniales', color: '#b5462f',
       desc: 'Poder institucional centralizado. Fuerte al inicio, frágil ante eventos.',
       fichas: { datos: 3, saber: 1, poder: 1 } },
  B: { id: 'B', nombre: 'Fuerzas Periféricas', color: '#4f8a3d',
       desc: 'Menos recursos, mayor resistencia. Más fuerte en zonas periféricas.',
       fichas: { datos: 1, saber: 3, poder: 2 } },
  C: { id: 'C', nombre: 'Élite Criolla', color: '#c98a2b',
       desc: 'Ambigüedad estratégica. Puede aliarse con A o B según la coyuntura.',
       fichas: { datos: 2, saber: 2, poder: 2 } },
};

// Tipos: personaje | objeto | partidario | evento | energia
// Para personajes: pv, atq, def, blq, mse, cim, mm
const CARDS = [
  // ---------- BANDO A — Personajes (1-6) ----------
  { id:1, tipo:'personaje', bando:'A', nombre:'El Naturalista', sub:'Expedición Botánica',
    pv:12, atq:3, def:4, blq:4, mse:4, cim:3, mm:0.30, coste:{saber:1},
    hab:'Curación situada: Restaura 20 PS a un aliado. Solo en región con casilla L activa.',
    ref:'Chambers — saber local' },
  { id:2, tipo:'personaje', bando:'A', nombre:'El Geógrafo', sub:'Expedición Botánica',
    pv:10, atq:2, def:3, blq:3, mse:4, cim:4, mm:0.00, coste:{},
    hab:'Inscripción móvil: Roba 2 cartas del mazo. Si una es energía, puedes adjuntarla gratis.',
    ref:'Latour — inscripciones móviles' },
  { id:3, tipo:'personaje', bando:'A', nombre:'El Metalurgista', sub:'Real Colegio de Minería',
    pv:12, atq:4, def:3, blq:4, mse:5, cim:5, mm:0.40, coste:{datos:2},
    hab:'Inscripción móvil: Roba 2 cartas del mazo. Si una es energía, puedes adjuntarla gratis.',
    ref:'Latour — inscripciones móviles' },
  { id:4, tipo:'personaje', bando:'A', nombre:'El Tasador de Vetas', sub:'Real Colegio de Minería',
    pv:10, atq:3, def:2, blq:3, mse:4, cim:4, mm:0.00, coste:{poder:1},
    hab:'Extracción acelerada: Roba el doble de energías de tu mazo este turno. No puede atacar ese turno.',
    ref:'MacLeod — extractivismo colonial' },
  { id:5, tipo:'personaje', bando:'A', nombre:'El Anatomista', sub:'Escuela de Cirugía',
    pv:8, atq:5, def:2, blq:5, mse:5, cim:4, mm:0.40, coste:{datos:1},
    hab:'Punto débil: Reduce la DEF del objetivo en 2 durante este combate. No acumulable.',
    ref:'Latour — traducción y redes' },
  { id:6, tipo:'personaje', bando:'A', nombre:'El Alquimista', sub:'Escuela de Cirugía',
    pv:9, atq:4, def:3, blq:4, mse:4, cim:3, mm:0.30, coste:{saber:2},
    hab:'Zona de control: Bloquea una casilla R o L de la región enemiga durante 1 turno.',
    ref:'Latour — centros de cálculo' },

  // ---------- BANDO B — Personajes (7-12) ----------
  { id:7, tipo:'personaje', bando:'B', nombre:'El Inquisidor', sub:'Santo Oficio y Clero',
    pv:10, atq:3, def:4, blq:2, mse:1, cim:1, mm:0.20, coste:{poder:1},
    hab:'Silencio epistémico: Bloquea la habilidad especial de un personaje del Bando A durante 1 turno.',
    ref:'Castro-Gómez — punto cero' },
  { id:8, tipo:'personaje', bando:'B', nombre:'Fraile Doctrinero', sub:'Santo Oficio y Clero',
    pv:15, atq:2, def:3, blq:2, mse:2, cim:2, mm:0.20, coste:{poder:2},
    hab:'Doctrina unificada: Restaura 1 PV a todos los aliados del Bando B en la misma región. 1 vez/partida.',
    ref:'Pakdaman — legitimidad política' },
  { id:9, tipo:'personaje', bando:'B', nombre:'El Gran Mercader', sub:'Consulado de Comercio',
    pv:13, atq:2, def:3, blq:2, mse:2, cim:2, mm:0.20, coste:{}, costeTexto:'Gratis (pasivo)',
    hab:'Red financiera (pasivo): Al inicio de cada turno, gana 1 ficha amarilla si está en región con casilla R activa. Puede canjear 3 amarillas por 2 PC directos.',
    ref:'Pakdaman — economía del desarrollo' },
  { id:10, tipo:'personaje', bando:'B', nombre:'El Arriero', sub:'Consulado de Comercio',
    pv:15, atq:3, def:3, blq:1, mse:1, cim:2, mm:0.20, coste:{poder:1},
    hab:'Traducción forzada: Mueve hasta 3 fichas de recursos de una región a otra. Las amarillas cambian a verdes al cruzar.',
    ref:'Chambers — traducción activa' },
  { id:11, tipo:'personaje', bando:'B', nombre:'El Capitán de Guarnición', sub:'Milicias y Rebeldes',
    pv:15, atq:3, def:6, blq:1, mse:1, cim:1, mm:0.10, coste:{}, costeTexto:'Gratis (reactivo)',
    hab:'Escudo periférico: Absorbe 1 punto de daño de cualquier aliado adyacente en lugar de recibirlo. 1 vez/turno.',
    ref:'MacLeod — resistencia colonial' },
  { id:12, tipo:'personaje', bando:'B', nombre:'Cimarrón/Cazador', sub:'Milicias y Rebeldes',
    pv:15, atq:5, def:2, blq:1.7, mse:1, cim:2, mm:1.40, coste:{saber:1},
    hab:'Saber oculto: Su ATQ no puede ser reducido por habilidades del Bando A. Si gana el combate, roba 1 ficha verde de la región disputada.',
    ref:'Chambers — saber periférico' },

  // ---------- BANDO C — Personajes (13-16) ----------
  { id:13, tipo:'personaje', bando:'C', nombre:'El Criollo Ilustrado', sub:'',
    pv:10, atq:4, def:3, blq:4.8, mse:5, cim:4, mm:0.64, coste:{datos:2},
    hab:'Expropiación epistémica: Un personaje del Bando B no puede usar habilidades este turno; además, robas 1 ficha verde y la conviertes en amarilla.',
    ref:'Castro-Gómez — crítica a la expropiación' },
  { id:14, tipo:'personaje', bando:'C', nombre:'El Filósofo de la Trascendencia', sub:'',
    pv:12, atq:2, def:4, blq:5, mse:5, cim:3, mm:0.30, coste:{poder:1,datos:1},
    hab:'Juicio de inmadurez: Aplica el estado "Infantilizado" a un rival con MSE ≤ 2 durante 2 turnos.',
    ref:'Castro-Gómez — Kant y la clasificación racial' },
  { id:15, tipo:'personaje', bando:'C', nombre:'El Newton de la Sociedad', sub:'',
    pv:10, atq:3, def:3, blq:4.5, mse:5, cim:4, mm:0.40, coste:{}, costeTexto:'Gratis (pasivo)',
    hab:'La mano invisible (pasivo): Si controlas 2 o más regiones, ganas 1 ficha amarilla al inicio del turno.',
    ref:'Castro-Gómez — Newton de la sociedad' },
  { id:16, tipo:'personaje', bando:'C', nombre:'El Geógrafo Imperial', sub:'',
    pv:11, atq:3, def:4, blq:5, mse:5, cim:5, mm:0.50, coste:{datos:2,poder:1},
    hab:'Mapeo del punto cero: Mira las 5 cartas superiores del mazo de cualquier jugador y reordénalas. Reduce en 1 el ATQ de rivales con MSE ≤ 2 hasta el final del turno.',
    ref:'Castro-Gómez — geopolítica del conocimiento' },

  // ---------- Objetos (17-20 A/gris, 25-31 B/C) ----------
  { id:17, tipo:'objeto', bando:'A', nombre:'Informe de Expedición', coste:{}, costeTexto:'Gratis',
    hab:'Roba 2 cartas. Si alguna es energía, puedes adjuntarla gratis sin gastar tu acción de energía. Solo antes de atacar.',
    ref:'Latour — inscripciones móviles' },
  { id:18, tipo:'objeto', bando:'A', nombre:'Catálogo Taxonómico', coste:{datos:1},
    hab:'Busca en tu mazo un personaje básico del Bando A y agrégalo a tu mano. Baraja. No usable si ya tienes 5 personajes en banca.',
    ref:'Basalla — clasificación' },
  { id:19, tipo:'objeto', bando:'A', nombre:'Decreto de la Real Academia', coste:{poder:1},
    hab:'Elige una carta de entrenador del descarte de cualquier jugador y agrégala a tu mano. Solo en turnos pares.',
    ref:'Castro-Gómez — autoridad central' },
  { id:20, tipo:'objeto', bando:'A', nombre:'Protocolo Científico', coste:{datos:2},
    hab:'Cancela completamente el efecto de una carta de evento activa. Luego se descarta.',
    ref:'Pakdaman — protocolos de validación' },
  { id:25, tipo:'objeto', bando:'B', nombre:'Rumor del Mercado', coste:{}, costeTexto:'Gratis',
    hab:'Mira las 3 cartas superiores del mazo rival. Puedes reordenarlas. Solo si controlas ≥1 personaje con MSE ≤ 2.',
    ref:'Chambers — conocimiento informal' },
  { id:26, tipo:'objeto', bando:'B', nombre:'Testimonio Oral', coste:{saber:1},
    hab:'Recupera del descarte 1 Energía Saber Local y adjúntala a un personaje. No usable bajo "silencio epistémico".',
    ref:'Chambers — saberes locales' },
  { id:27, tipo:'objeto', bando:'B', nombre:'Contrabando de Datos', coste:{poder:1},
    hab:'Roba 3 cartas. Al final del turno descarta 1. Solo si el rival tiene más cartas en mano que tú.',
    ref:'Pakdaman — estrategias informales' },
  { id:28, tipo:'objeto', bando:'B', nombre:'Sabotaje a las Vías', coste:{saber:2},
    hab:'El personaje activo rival no puede usar habilidades este turno. Solo afecta a personajes con MSE ≥ 4.',
    ref:'MacLeod — interrupción periférica' },
  { id:29, tipo:'objeto', bando:'C', nombre:'Cuadros de Castas', coste:{poder:1},
    hab:'Aplica una Etiqueta de Casta a 1 personaje del Bando B (Zambo, Mulato, Indio, Mestizo, Tercerón, Saltoatrás).',
    ref:'Castro-Gómez — sociología de las élites' },
  { id:30, tipo:'objeto', bando:'C', nombre:'Paños de la Distancia', coste:{datos:1,poder:1},
    hab:'Si un personaje con BLQ ≤ 2 ataca a uno con BLQ ≥ 4, el ataque rebota (0 daño). El Bando C asigna 1 Etiqueta de Casta adicional.',
    ref:'Castro-Gómez — distinción racial' },
  { id:31, tipo:'objeto', bando:'C', nombre:'Decreto de Limpieza de Sangre', coste:{poder:2},
    hab:'Elige 1 personaje del Bando B con Etiqueta de Casta. No puede evolucionar ni cambiar de región este turno. Bando A también puede jugar esta carta.',
    ref:'Castro-Gómez — endogamia criolla' },

  // ---------- Partidarios (21-24, 32-37) ----------
  { id:21, tipo:'partidario', bando:'A', nombre:'El Cronista Real', coste:{datos:1},
    hab:'Al inicio de tu turno, retira 1 marcador de daño de uno de tus personajes (restaura 1 PV).',
    ref:'Latour — archivo institucional' },
  { id:22, tipo:'partidario', bando:'A', nombre:'El Cónsul de Fomento', coste:{poder:2},
    hab:'Tus personajes con BLQ ≥ 4 reducen en 1 ficha su coste de retirada (mínimo 0).',
    ref:'Castro-Gómez — blanquitud como privilegio' },
  { id:23, tipo:'partidario', bando:'B', nombre:'La Curandera del Pueblo', coste:{saber:1},
    hab:'Al inicio de tu turno, restaura 1 PV a un personaje con Infantilización ≤ 2. Elimina cualquier Etiqueta de Casta activa en ese personaje.',
    ref:'Chambers — saberes comunitarios' },
  { id:24, tipo:'partidario', bando:'B', nombre:'El Escribano Clandestino', coste:{poder:1},
    hab:'1 vez por turno, convierte 1 Energía Datos en 1 Energía Saber Local en cualquiera de tus personajes.',
    ref:'Chambers — resignificación periférica' },
  { id:32, tipo:'partidario', bando:'C', nombre:'El Sabio Ilustrado', coste:{datos:1,poder:1},
    hab:'Mientras esté en juego, el Bando C puede leer las cartas de Evento antes de que se revelen (al inicio de cada turno impar).',
    ref:'Castro-Gómez — élite intermediaria' },
  { id:33, tipo:'partidario', bando:'C', nombre:'La Matrona de las Castas', coste:{poder:2},
    hab:'Mientras esté en juego, las Etiquetas de Casta que el Bando C aplica duran 1 turno adicional.',
    ref:'Castro-Gómez — perpetuación del imaginario' },
  { id:34, tipo:'partidario', bando:'C', nombre:'Real Audiencia', coste:{poder:1},
    hab:'Personajes con BLQ ≥ 4 reducen su ATQ en 1, pero son inmunes a Silencio Epistémico.',
    ref:'Castro-Gómez — protección epistémica' },
  { id:35, tipo:'partidario', bando:'B', nombre:'Territorio en Disputa', coste:{saber:1},
    hab:'Personajes con MSE ≤ 2 generan 1 ficha verde adicional/turno. Personajes con MSE ≥ 4 pierden 1 PV al inicio de cada turno.',
    ref:'MacLeod — periferias como resistencia' },
  { id:36, tipo:'partidario', bando:'C', nombre:'Laboratorio Colonial', coste:{datos:1},
    hab:'Todos los ataques infligen +2 de daño adicional. Personajes con CIM ≠ 4 no pueden activar habilidades de tutela.',
    ref:'Harding — producción del conocimiento' },

  // ---------- Estadio (37) ----------
  { id:37, tipo:'estadio', bando:'C', nombre:'Puerto de Intercambio', coste:{}, costeTexto:'Gratis',
    hab:'Ambos jugadores pueden adjuntar hasta 2 energías/turno. Datos y Saber Local pueden adjuntarse a personajes de cualquier bando.',
    ref:'Latour — nodos de intercambio' },

  // ---------- Eventos (38-49) ----------
  { id:38, tipo:'evento', nombre:'Centralización de Datos', favorece:'A',
    hab:'Quien controle la zona central ve la mano del rival 30s. El Bando A gana 1 carta de premio adicional si controla el centro. El Bando B puede robar 1 carta como resistencia.',
    ref:'Latour — centros de cálculo' },
  { id:39, tipo:'evento', nombre:'Revuelta Epistémica', favorece:'B',
    hab:'Personajes del Bando B con Infantilización ≤ 2 ganan +10 PS temporales hasta el final del turno. El Bando B puede usar habilidades silenciadas.',
    ref:'Chambers — periferia activa' },
  { id:40, tipo:'evento', nombre:'Expedición Botánica', favorece:'colonial',
    hab:'Quien controle el territorio colonial coloca 1 personaje básico desde su mazo a la banca. Si nadie controla, ambos roban 1 carta.',
    ref:'Basalla — fase colonial' },
  { id:41, tipo:'evento', nombre:'Crisis del Paradigma', favorece:'ninguno',
    hab:'Ningún Objeto puede jugarse este turno. Ambos roban 2 cartas adicionales al inicio del siguiente turno.',
    ref:'Pakdaman — colapso del paradigma' },
  { id:42, tipo:'evento', nombre:'Traducción Regional', favorece:'negociable',
    hab:'El Bando A selecciona 1 entrenador de su descarte. El Bando B decide si lo traduce: si acepta, ambos lo usan y ganan 1 carta de premio.',
    ref:'Chambers — traducción activa' },
  { id:43, tipo:'evento', nombre:'Gran Ciencia Desbordada', favorece:'B',
    hab:'Personajes con MSE ≥ 4 reciben 10 PS de daño. Personajes con MSE ≤ 2 obtienen 1 energía gratuita de cualquier tipo.',
    ref:'Price — saturación científica' },
  { id:44, tipo:'evento', nombre:'Punto Cero Cuestionado', favorece:'B',
    hab:'Todos los efectos de tutela (CIM/Infantilización ≥ 4) quedan anulados este turno. El Bando B puede activar habilidades bloqueadas.',
    ref:'Castro-Gómez — punto cero' },
  { id:45, tipo:'evento', nombre:'Espacio Estriado', favorece:'A',
    hab:'Elige una región (no Capital). Convierte toda Energía Verde en Amarilla allí. El Bando B no puede usar la acción de retirada en esa región. Personajes con CIM ≥ 4 infligen +2 daño allí.',
    ref:'Castro-Gómez — territorio estriado' },
  { id:46, tipo:'evento', nombre:'Pantomima de Tarqui', favorece:'B',
    hab:'Mímesis: el Bando B usa una habilidad del Bando A sin coste. Personajes con CIM ≥ 4 no infligen daño este turno. Si el Bando A controla la Capital, el Bando B roba 1 carta.',
    ref:'Safier — ciencia como teatro' },
  { id:47, tipo:'evento', nombre:'Red Imperial Expandida', favorece:'A',
    hab:'Personajes del Bando A con MSE ≥ 4 pueden moverse a cualquier región sin coste. El Bando B puede colocar 1 personaje básico desde la banca.',
    ref:'MacLeod — expansión imperial' },
  { id:48, tipo:'evento', nombre:'El Triunfo del Mapa', favorece:'A',
    hab:'El Bando A mira las 4 primeras cartas de su mazo, descarta 1 y reordena. Personajes del Bando A ganan +2 en Ciencia Imperial al atacar zonas periféricas este turno.',
    ref:'Latour — la ciencia domina la periferia' },
  { id:49, tipo:'evento', nombre:'Limpieza de Sangre', favorece:'C',
    hab:'El costo de aplicar Etiquetas de Casta sobre personajes del Bando B se reduce a la mitad. El Bando C puede anular las habilidades especiales de un criollo/periférico 1 turno.',
    ref:'Castro-Gómez — dispositivo de control' },

  // ---------- Energías (sheets, 50-61) — referencia ----------
  { id:50, tipo:'energia', sub:'poder', nombre:'Poder Político', ficha:'poder' },
  { id:51, tipo:'energia', sub:'poder', nombre:'Poder Político', ficha:'poder' },
  { id:52, tipo:'energia', sub:'poder', nombre:'Poder Político', ficha:'poder' },
  { id:53, tipo:'energia', sub:'poder', nombre:'Poder Político', ficha:'poder' },
  { id:54, tipo:'energia', sub:'saber', nombre:'Saber Local', ficha:'saber' },
  { id:55, tipo:'energia', sub:'saber', nombre:'Saber Local', ficha:'saber' },
  { id:56, tipo:'energia', sub:'saber', nombre:'Saber Local', ficha:'saber' },
  { id:57, tipo:'energia', sub:'saber', nombre:'Saber Local', ficha:'saber' },
  { id:58, tipo:'energia', sub:'datos', nombre:'Datos', ficha:'datos' },
  { id:59, tipo:'energia', sub:'datos', nombre:'Datos', ficha:'datos' },
  { id:60, tipo:'energia', sub:'datos', nombre:'Datos', ficha:'datos' },
  { id:61, tipo:'energia', sub:'datos', nombre:'Datos', ficha:'datos' },
];

const REGIONS = [
  { id:'capital',  nombre:'Capital Científica',     pc:3, bonus:'Ver todas las cartas de Evento', extra:null,           ref:'Latour' },
  { id:'semiA',    nombre:'Semiperiférica A',        pc:2, bonus:'Liga regional propia',            extra:null,           ref:'Basalla — fase 2' },
  { id:'semiB',    nombre:'Semiperiférica B',        pc:2, bonus:'Recursos minerales únicos',       extra:null,           ref:'MacLeod' },
  { id:'autonoma', nombre:'Periferia Autónoma',      pc:2, bonus:'+1 🟢 extra/ronda',               extra:{saber:1},      ref:'Basalla — Japón' },
  { id:'colonial', nombre:'Zona Colonial Extractiva',pc:1, bonus:'Si B la controla, A no roba evento', extra:{datos:2},   ref:'Basalla — fase colonial' },
];

const cardById = id => CARDS.find(c => c.id === id);
const cardImg  = id => `cards/${id}.webp`;

// Orden de prioridad de regiones (de mayor a menor jerarquía).
// El empate hace "retroceder" a la región siguiente en este orden.
const REGION_ORDER = ['capital','semiA','semiB','autonoma','colonial'];
// Devuelve la región a la que se baja desde `regionId`, o null si ya es la última (colonial).
function regionInferior(regionId){
  const i = REGION_ORDER.indexOf(regionId);
  if(i<0 || i>=REGION_ORDER.length-1) return null; // colonial = mínimo, no baja
  return REGION_ORDER[i+1];
}

// Helper: recalcula MM a partir de atributos (por si una habilidad los cambia)
function calcMM(cim, blq, mse){
  const dec = +(blq - Math.floor(blq)).toFixed(4);
  if (mse === 0) return 0;
  return +((cim * dec) / mse).toFixed(2);
}
function mmMultiplier(mm){
  if (mm >= 3.0) return 2;
  if (mm >= 1.5) return 1;
  return 0.5;
}


/* ---- export global (script clásico) ---- */
window.PERI_NS = window.PERI_NS || {};
Object.assign(window.PERI_NS, { BANDOS, CARDS, REGIONS, REGION_ORDER, regionInferior, cardById, cardImg, calcMM, mmMultiplier });

})();