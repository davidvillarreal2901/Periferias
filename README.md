# PERIFERIAS — Juego de Cartas Coleccionables

Juego web sobre **ciencia, poder y conocimiento colonial**. Mezcla mecánicas de
Pokémon TCG (cartas, energías, evolución), Risk (control territorial) y Monopoly
(compra de cartas de entrenador con fichas de recursos).

Fundamentado en estudios sociales de la ciencia: Basalla, Latour, MacLeod,
Castro-Gómez, Harding, Pakdaman, Chambers, Price.

## Cómo jugar

1. Elige 2 o 3 jugadores y asigna un bando a cada uno:
   - **Bando A — Sociedades Científicas Coloniales** (3🟡 1🟢 1🔴): fuerte al inicio, frágil ante eventos.
   - **Bando B — Fuerzas Periféricas** (1🟡 3🟢 2🔴): resistente, fuerte en la periferia.
   - **Bando C — Élite Criolla** (2🟡 2🟢 2🔴): ambigua, solo en partidas de 3.
2. **Arrastra** cartas de la mano o la banca a una región del tablero.
3. Si una carta queda **sola** en una región durante una ronda completa, reclama
   su recompensa (botón **Resolver ronda**).
4. Si dos o más cartas comparten región, **combaten** al resolver la ronda.
5. Compra **cartas de entrenador** con tus fichas (🟡🟢🔴) en la tienda.
6. Gana quien tome 6 cartas de premio, elimine al rival, o lo deje sin mazo.

### Combate determinístico
```
ATQ > DEF   → impacto: −1 PV × Modificador MM
ATQ = DEF   → choque epistémico: ambos retroceden
ATQ < DEF   → bloqueo + contraataque

MM = (CIM × parte_decimal(BLQ)) / MSE
MM ≥ 3.0  → ×2 (explota debilidad teórica)
MM 1.5–2.9 → ×1
MM < 1.5  → ×0.5 (mín. 1 daño)
```
Quien tenga mayor MM ataca primero.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube **todo el contenido de esta carpeta**
   (incluye `index.html`, `css/`, `js/`, `cards/`, `assets/`, `.nojekyll`).
2. En el repo: **Settings → Pages → Source: Deploy from a branch → main → /(root)**.
3. Tu juego estará en `https://TU-USUARIO.github.io/TU-REPO/`.

> El archivo `.nojekyll` evita que GitHub Pages ignore carpetas. No lo borres.

## Estructura
```
index.html        Página principal
css/style.css     Estilos (estética cartográfica) + animaciones de arrastre
js/cards.js       Base de datos de las 61 cartas (stats, MM, costes)
js/engine.js      Motor: mazos, turnos, combate, recompensas, victoria, premios
js/effects.js     Efectos automatizados de los 12 eventos y los entrenadores
js/ui.js          Interfaz + drag & drop con tarjeta fantasma animada
cards/*.webp      Las 61 cartas (optimizadas desde los SVG originales)
assets/tablero.webp  Mapa del tablero
```

### Efectos automatizados
- **Eventos** (turnos impares): aplican su efecto real al revelarse — daño por MSE,
  robo de cartas, anulación de tutela, bloqueo de objetos (Crisis del Paradigma), etc.
- **Entrenadores**: al comprarlos en la tienda ejecutan su efecto. Los que necesitan
  un objetivo (Sabotaje, Cuadros de Castas, Testimonio Oral, Limpieza de Sangre) entran
  en *modo selección*: haz clic en un personaje del tablero para aplicarlos.
- **Combate**: al derribar a un rival, el atacante **toma 1 carta de premio**
  (gana al llegar a 6). Los flags de eventos/partidarios (Laboratorio Colonial +2 daño,
  Pantomima de Tarqui, etc.) modifican el daño automáticamente.
- **Fin de turno**: los estados temporales (Silencio, Infantilizado…) y los buffs
  caducan solos.

El código es **modular** (módulos ES): edita `cards.js` para stats, `engine.js` para
reglas base, y `effects.js` para el comportamiento de cada carta concreta.
