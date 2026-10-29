import {
SIGNALS,
BOARD_THEMES,
} from './config.js';
import {
getClusterSizeMap,
} from './board.js';

// cache purple-fox body svg path
// copied from studio mascot vector
const BODY_SVG_PATH =
'M66,74 C64,58 82,48 108,48 ' +
'C138,48 158,54 168,70 ' +
'C176,82 174,98 158,104 ' +
'L82,104 C68,102 60,90 66,74 Z';

// cache purple-fox sweeping tail path
// stretches back in speed boost pose
const FOX_TAIL_SVG =
'M74,78 C42,82 8,70 2,42 ' +
'C0,20 14,4 34,4 C40,4 44,8 ' +
'44,16 C44,26 36,32 28,42 ' +
'C20,52 28,64 46,70 ' +
'C56,74 64,78 74,78 Z';

const FOX_TIP_SVG =
'M34,4 C40,4 44,8 44,16 ' +
'C44,26 36,32 28,42 ' +
'C20,34 18,20 22,10 ' +
'C24,6 28,4 34,4 Z';

// cache pointed fox snout paths
// matches purple-fox profile head
const FOX_SNOUT_TOP =
'M206,33 Q222,34 233,39 ' +
'Q238,42 233,46 Q222,54 206,59 ' +
'Q200,46 206,33 Z';

const FOX_SNOUT_BOT =
'M208,46 Q222,45 231,47 ' +
'Q234,49 230,52 Q220,58 208,58 ' +
'Q205,52 208,46 Z';

// store offscreen static board cache
// avoids redrawing pcb grid each tick
let boardCache = {
key: '',
canvas: null,
};

// get signal object by color id 1..8
// returns cyan if id is out of range
export function getSignal(colorId) {
return (
SIGNALS[colorId - 1] || SIGNALS[0]
);
}

// get board theme object by id
// returns green pcb default if none
export function getTheme(themeId) {
return (
BOARD_THEMES.find(
(t) => t.id === themeId
) || BOARD_THEMES[0]
);
}

// draw chamfered octagon rect path
// creates microchip package corners
function chamferRectPath(
ctx,
x,
y,
w,
h,
c
) {
ctx.beginPath();
ctx.moveTo(x + c, y);
ctx.lineTo(x + w - c, y);
ctx.lineTo(x + w, y + c);
ctx.lineTo(x + w, y + h - c);
ctx.lineTo(x + w - c, y + h);
ctx.lineTo(x + c, y + h);
ctx.lineTo(x, y + h - c);
ctx.lineTo(x, y + c);
ctx.closePath();
}

// trace chunky sculpted energy clot
// each signal has bold silhouette
function traceClotShape(
ctx,
shape,
r
) {
ctx.beginPath();
if (shape === 'ring') {
// 8-scallop plasma torus cushion
// rounded ring with 8 soft ridges
const steps = 48;
for (let i = 0; i <= steps; i++) {
const a =
(i / steps) * Math.PI * 2;
const rad =
r *
(0.92 + 0.08 * Math.cos(a * 8));
const px = Math.cos(a) * rad;
const py = Math.sin(a) * rad;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.closePath();
} else if (shape === 'diamond') {
// crisp 3d cut sapphire rhombus
// bold 4-sided diamond crystal
ctx.moveTo(0, -r * 1.1);
ctx.lineTo(r * 0.94, 0);
ctx.lineTo(0, r * 1.1);
ctx.lineTo(-r * 0.94, 0);
ctx.closePath();
} else if (shape === 'triangle') {
// plump 3-lobe delta shield clot
// upward pointing 3-petal plasma
const steps = 36;
for (let i = 0; i <= steps; i++) {
const a =
(i / steps) * Math.PI * 2;
const rad =
r *
(0.82 +
0.26 *
Math.cos(a * 3 - Math.PI / 2));
const px = Math.cos(a) * rad;
const py = Math.sin(a) * rad;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.closePath();
} else if (shape === 'hex') {
// chunky hexagonal plasma prism
// bold 6-sided crystal polygon
for (let i = 0; i < 6; i++) {
const a =
(i * Math.PI) / 3 - Math.PI / 6;
const px = Math.cos(a) * r * 1.02;
const py = Math.sin(a) * r * 1.02;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.closePath();
} else if (shape === 'star') {
// plump 5-lobed ruby starburst
// thick 5-point energy silhouette
const steps = 45;
for (let i = 0; i <= steps; i++) {
const a =
(i / steps) * Math.PI * 2;
const rad =
r *
(0.78 +
0.28 *
Math.cos(a * 5 - Math.PI / 2));
const px = Math.cos(a) * rad;
const py = Math.sin(a) * rad;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.closePath();
} else if (shape === 'bolt') {
// chunky 4-lobe orthogonal cross
// bold + shaped solar plasma clot
const steps = 40;
for (let i = 0; i <= steps; i++) {
const a =
(i / steps) * Math.PI * 2;
const rad =
r *
(0.76 + 0.28 * Math.cos(a * 4));
const px = Math.cos(a) * rad;
const py = Math.sin(a) * rad;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.closePath();
} else if (shape === 'chip') {
// diagonal 4-petal butterfly clot
// bold x-shaped bio-plasma form
const steps = 40;
for (let i = 0; i <= steps; i++) {
const a =
(i / steps) * Math.PI * 2;
const rad =
r *
(0.76 +
0.28 *
Math.cos(a * 4 - Math.PI));
const px = Math.cos(a) * rad;
const py = Math.sin(a) * rad;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.closePath();
} else {
// 6-pointed quantum star crystal
// sculpted 6-ray platinum pulsar
const steps = 48;
for (let i = 0; i <= steps; i++) {
const a =
(i / steps) * Math.PI * 2;
const rad =
r *
(0.78 + 0.25 * Math.cos(a * 6));
const px = Math.cos(a) * rad;
const py = Math.sin(a) * rad;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.closePath();
}
}

// draw pseudo-3d shaped energy clot
// volumetric gem with bevel & gloss
export function drawSignalNode(
ctx,
colorId,
x,
y,
radius,
time,
isSelected = false,
groupSize = 1
) {
const sig = getSignal(colorId);
const phase =
(x * 0.04 + y * 0.06) % 6.28;
const freq =
groupSize >= 6
? 14
: isSelected
? 10
: 5.5;
const amp =
groupSize >= 6
? 0.09
: isSelected
? 0.08
: 0.045;
const pulse =
1 +
Math.sin(time * freq + phase) * amp;

// full readable size on the pcb cell
// pops clearly above golden socket
const r = radius * 1.02 * pulse;

ctx.save();
ctx.translate(x, y);

// gentle idle wobble or active spin
// keeps 3d highlight oriented well
const rot = isSelected
? Math.sin(time * 6) * 0.14
: Math.sin(time * 2.2 + phase) *
0.05;

// layer 1: tight colored outer aura
// subtle energy rim around silhouette
ctx.save();
ctx.rotate(rot);
ctx.fillStyle = sig.glow;
ctx.globalAlpha = isSelected
? 0.55
: 0.28;
traceClotShape(
ctx,
sig.shape,
r * 1.16
);
ctx.fill();
ctx.restore();

// layer 2: dark contact drop shadow
// lifts 3d clot off the green board
ctx.save();
ctx.translate(0, r * 0.16);
ctx.rotate(rot);
ctx.fillStyle = 'rgba(0, 5, 3, 0.84)';
traceClotShape(
ctx,
sig.shape,
r * 1.06
);
ctx.fill();
ctx.restore();

// layer 3: 3d extruded bottom bevel
// physical depth wall under the clot
ctx.save();
ctx.translate(0, r * 0.1);
ctx.rotate(rot);
ctx.fillStyle = sig.dark || '#05101a';
ctx.strokeStyle = '#020805';
ctx.lineWidth = 1.6;
ctx.lineJoin = 'round';
traceClotShape(
ctx,
sig.shape,
r * 1.01
);
ctx.fill();
ctx.stroke();
ctx.restore();

// layer 4: volumetric 3d shaded body
// rich saturated color with 3d depth
ctx.save();
ctx.rotate(rot);
const bodyGrad =
ctx.createRadialGradient(
-r * 0.3,
-r * 0.34,
r * 0.04,
0,
0,
r * 1.06
);
bodyGrad.addColorStop(
0,
sig.light || '#ffffff'
);
bodyGrad.addColorStop(0.34, sig.hex);
bodyGrad.addColorStop(0.74, sig.hex);
bodyGrad.addColorStop(
1,
sig.dark || '#05101a'
);
ctx.fillStyle = bodyGrad;
ctx.strokeStyle =
sig.light || '#ffffff';
ctx.lineWidth = 1.8;
ctx.lineJoin = 'round';
traceClotShape(ctx, sig.shape, r);
ctx.fill();
ctx.stroke();

// layer 5: inner 3d sculpted core
// torus groove or faceted inner gem
if (sig.shape === 'ring') {
ctx.fillStyle = sig.dark || '#042a33';
ctx.beginPath();
ctx.arc(0, 0, r * 0.42, 0, 6.28);
ctx.fill();
ctx.strokeStyle =
sig.light || '#ffffff';
ctx.lineWidth = 1.6;
ctx.stroke();

ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.arc(0, 0, r * 0.18, 0, 6.28);
ctx.fill();
} else {
const coreGrad =
ctx.createRadialGradient(
-r * 0.1,
-r * 0.12,
0,
0,
0,
r * 0.52
);
coreGrad.addColorStop(0, '#ffffff');
coreGrad.addColorStop(
0.42,
sig.light || '#ffffff'
);
coreGrad.addColorStop(1, sig.hex);
ctx.fillStyle = coreGrad;
traceClotShape(
ctx,
sig.shape,
r * 0.48
);
ctx.fill();
ctx.strokeStyle =
'rgba(255, 255, 255, 0.72)';
ctx.lineWidth = 1.1;
ctx.stroke();
}
ctx.restore();

// layer 6: 3d specular gloss glint
// bright top-left reflection bead
ctx.save();
ctx.translate(-r * 0.27, -r * 0.29);
ctx.rotate(-0.55);
ctx.scale(1, 0.52);
ctx.fillStyle =
'rgba(255, 255, 255, 0.92)';
ctx.beginPath();
ctx.arc(0, 0, r * 0.24, 0, 6.28);
ctx.fill();
ctx.restore();

// secondary bottom-right rim glint
// completes 3d refractive look
ctx.fillStyle =
'rgba(255, 255, 255, 0.48)';
ctx.beginPath();
ctx.arc(
r * 0.22,
r * 0.22,
Math.max(1.5, r * 0.085),
0,
6.28
);
ctx.fill();

// draw crisp selection bracket ring
// shows active signal ready to move
if (isSelected) {
ctx.rotate(time * 2.4);
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 2.2;
for (let i = 0; i < 4; i++) {
const a0 =
(Math.PI / 2) * i + 0.22;
const a1 =
(Math.PI / 2) * (i + 1) - 0.22;
ctx.beginPath();
ctx.arc(0, 0, r * 1.24, a0, a1);
ctx.stroke();
}
}
ctx.restore();
}

// convert grid r,c to canvas pixel xy
// centers each socket in 1/N hit-box
export function cellToPx(
r,
c,
size,
boardPx
) {
const step = boardPx / size;
return {
x: (c + 0.5) * step,
y: (r + 0.5) * step,
step,
};
}

// build static offscreen pcb board
// renders green microchip + gold pads
function getBoardCache(
width,
height,
size,
themeId
) {
const key =
width +
'x' +
height +
'_' +
size +
'_' +
themeId;
if (
boardCache.key === key &&
boardCache.canvas
) {
return boardCache.canvas;
}
const c =
document.createElement('canvas');
c.width = width;
c.height = height;
const ctx = c.getContext('2d');
const theme = getTheme(themeId);
const step = width / size;
const goldMain =
theme.wire || '#c89b3c';
const goldHi =
theme.wireHi || '#f5d78e';

// fill radial solder-mask pcb surface
// deep emerald microchip substrate
const bgGrad =
ctx.createRadialGradient(
width * 0.5,
height * 0.5,
width * 0.05,
width * 0.5,
height * 0.5,
width * 0.72
);
bgGrad.addColorStop(
0,
theme.bgInner || theme.panel
);
bgGrad.addColorStop(1, theme.bg);
chamferRectPath(
ctx,
2,
2,
width - 4,
height - 4,
16
);
ctx.fillStyle = bgGrad;
ctx.fill();

// draw microchip grid and smd parts
// gives authentic hardware board feel
ctx.save();
chamferRectPath(
ctx,
5,
5,
width - 10,
height - 10,
14
);
ctx.clip();
ctx.strokeStyle =
'rgba(255, 255, 255, 0.03)';
ctx.lineWidth = 1;
for (
let gx = 0;
gx < width;
gx += 10
) {
ctx.beginPath();
ctx.moveTo(gx, 0);
ctx.lineTo(gx, height);
ctx.stroke();
}
for (
let gy = 0;
gy < height;
gy += 10
) {
ctx.beginPath();
ctx.moveTo(0, gy);
ctx.lineTo(width, gy);
ctx.stroke();
}

// draw secondary 45-deg copper traces
// sits in bays between main sockets
for (let r = 0; r < size - 1; r++) {
for (
let col = 0;
col < size - 1;
col++
) {
const x0 = (col + 0.5) * step;
const y0 = (r + 0.5) * step;
if ((r + col) % 2 === 0) {
const ax = x0 + step * 0.24;
const ay = y0 + step * 0.24;
const bx = x0 + step * 0.76;
const by = y0 + step * 0.76;
ctx.strokeStyle =
'rgba(212, 168, 79, 0.22)';
ctx.lineWidth = 1.6;
ctx.beginPath();
ctx.moveTo(ax, ay);
ctx.lineTo(bx, by);
ctx.stroke();

ctx.fillStyle =
'rgba(212, 168, 79, 0.35)';
ctx.beginPath();
ctx.arc(ax, ay, 2.2, 0, Math.PI * 2);
ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
ctx.fill();
} else if ((r * 3 + col) % 4 === 1) {
const cx = x0 + step * 0.5;
const cy = y0 + step * 0.5;
ctx.fillStyle = goldMain;
ctx.fillRect(cx - 7, cy - 3, 14, 6);
ctx.fillStyle = '#09110d';
ctx.fillRect(cx - 4, cy - 3, 8, 6);
}
}
}
ctx.restore();

// draw gold edge connector fingers
// resembles real pci/microchip pins
const pinCount = 12;
const pinSpan = width * 0.52;
const pinStart =
(width - pinSpan) * 0.5;
const pinStep = pinSpan / pinCount;
ctx.fillStyle = goldMain;
for (let i = 0; i < pinCount; i++) {
const px = pinStart + i * pinStep;
ctx.fillRect(
px,
2,
pinStep * 0.55,
5
);
ctx.fillRect(
px,
height - 7,
pinStep * 0.55,
5
);
ctx.fillRect(
2,
px,
5,
pinStep * 0.55
);
ctx.fillRect(
width - 7,
px,
5,
pinStep * 0.55
);
}

chamferRectPath(
ctx,
2,
2,
width - 4,
height - 4,
16
);
ctx.strokeStyle = theme.rim;
ctx.lineWidth = 2.5;
ctx.stroke();

// draw metallic golden circuit tracks
// dark trench, gold body, shine line
const start = 0.5 * step;
const end = (size - 0.5) * step;

ctx.strokeStyle =
'rgba(0, 0, 0, 0.55)';
ctx.lineWidth = Math.max(
5,
step * 0.12
);
ctx.beginPath();
for (let i = 0; i < size; i++) {
const pos = (i + 0.5) * step;
ctx.moveTo(pos, start);
ctx.lineTo(pos, end);
ctx.moveTo(start, pos);
ctx.lineTo(end, pos);
}
ctx.stroke();

ctx.strokeStyle = goldMain;
ctx.lineWidth = Math.max(
3,
step * 0.075
);
ctx.beginPath();
for (let i = 0; i < size; i++) {
const pos = (i + 0.5) * step;
ctx.moveTo(pos, start);
ctx.lineTo(pos, end);
ctx.moveTo(start, pos);
ctx.lineTo(end, pos);
}
ctx.stroke();

ctx.strokeStyle = goldHi;
ctx.lineWidth = 1.1;
ctx.beginPath();
for (let i = 0; i < size; i++) {
const pos = (i + 0.5) * step;
ctx.moveTo(pos, start);
ctx.lineTo(pos, end);
ctx.moveTo(start, pos);
ctx.lineTo(end, pos);
}
ctx.stroke();

// draw gold annular pcb via pads
// sits at every track intersection
const padR = step * 0.19;
for (let r = 0; r < size; r++) {
for (let col = 0; col < size; col++) {
const x = (col + 0.5) * step;
const y = (r + 0.5) * step;

ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
ctx.beginPath();
ctx.arc(
x,
y,
padR * 1.25,
0,
Math.PI * 2
);
ctx.fill();

ctx.fillStyle = goldMain;
ctx.beginPath();
ctx.arc(x, y, padR, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = goldHi;
ctx.lineWidth = 1.2;
ctx.stroke();

ctx.fillStyle = theme.socket;
ctx.beginPath();
ctx.arc(
x,
y,
padR * 0.52,
0,
Math.PI * 2
);
ctx.fill();
}
}

boardCache = { key, canvas: c };
return c;
}

// draw main pcb intersection board
// draws gold tracks, signals, sparks
export function drawBoardCanvas(
ctx,
width,
height,
state
) {
const {
grid,
previews,
selected,
time,
themeId,
movingAnim,
bounceArcs,
lightningBolts,
particles,
boosterMode,
} = state;
const size = grid.length;
const step = width / size;
const nodeR = step * 0.37;

ctx.clearRect(0, 0, width, height);

// blit cached static microchip board
// zero per-frame cost for pcb tracks
const cached = getBoardCache(
width,
height,
size,
themeId
);
ctx.drawImage(cached, 0, 0);

// draw thin pulsing energy links
// between adjacent matching signals
const sizeMap =
getClusterSizeMap(grid);
const dirs = [
[0, 1],
[1, 0],
];

for (let r = 0; r < size; r++) {
for (let c = 0; c < size; c++) {
const col = grid[r][c];
if (!col) {
continue;
}
const grpSize = sizeMap[r][c];
const sig = getSignal(col);
const x0 = (c + 0.5) * step;
const y0 = (r + 0.5) * step;

for (let d = 0; d < 2; d++) {
const nr = r + dirs[d][0];
const nc = c + dirs[d][1];
if (
nr < size &&
nc < size &&
grid[nr][nc] === col
) {
const x1 = (nc + 0.5) * step;
const y1 = (nr + 0.5) * step;
drawLitBusSegment(
ctx,
x0,
y0,
x1,
y1,
sig,
grpSize,
time,
step,
r * 7 + c
);
}
}
}
}

// draw compact preview shape outlines
// shows where next 3 signals appear
for (
let i = 0;
i < previews.length;
i++
) {
const p = previews[i];
if (grid[p.r][p.c] !== 0) {
continue;
}
const sig = getSignal(p.color);
const x = (p.c + 0.5) * step;
const y = (p.r + 0.5) * step;
const wave =
1 + Math.sin(time * 5 + i) * 0.08;
const pr = nodeR * 0.48 * wave;

ctx.save();
ctx.translate(x, y);
ctx.strokeStyle = sig.hex;
ctx.lineWidth = 1.8;
ctx.globalAlpha = 0.78;
traceClotShape(ctx, sig.shape, pr);
ctx.stroke();
ctx.restore();
}

// draw stationary energy clots
// skips signal currently in transit
for (let r = 0; r < size; r++) {
for (let c = 0; c < size; c++) {
const col = grid[r][c];
if (!col) {
continue;
}
if (
movingAnim &&
movingAnim.toR === r &&
movingAnim.toC === c
) {
continue;
}
const x = (c + 0.5) * step;
const y = (r + 0.5) * step;
const isSel =
selected &&
selected.r === r &&
selected.c === c;
drawSignalNode(
ctx,
col,
x,
y,
nodeR,
time,
isSel,
sizeMap[r][c]
);
}
}

// draw accelerating signal on track
// no line trail, only flying sparks
if (movingAnim) {
const { path, progress, color } =
movingAnim;
const totalSegs = path.length - 1;
const eased =
0.22 * progress +
0.78 * progress * progress;
const exact =
Math.min(0.999, eased) * totalSegs;
const idx = Math.floor(exact);
const frac = exact - idx;
const pA = path[idx];
const pB =
path[Math.min(totalSegs, idx + 1)];
const ax = (pA.c + 0.5) * step;
const ay = (pA.r + 0.5) * step;
const bx = (pB.c + 0.5) * step;
const by = (pB.r + 0.5) * step;
const mx = ax + (bx - ax) * frac;
const my = ay + (by - ay) * frac;

drawSignalNode(
ctx,
color,
mx,
my,
nodeR * 1.06,
time,
false,
1
);
}

// draw preview ring bounce arcs
// curved electric jump to new socket
for (
let i = 0;
i < bounceArcs.length;
i++
) {
const arc = bounceArcs[i];
const sig = getSignal(arc.color);
const x0 = (arc.fromC + 0.5) * step;
const y0 = (arc.fromR + 0.5) * step;
const x1 = (arc.toC + 0.5) * step;
const y1 = (arc.toR + 0.5) * step;
const cx = (x0 + x1) * 0.5;
const cy =
Math.min(y0, y1) - step * 0.9;

ctx.save();
ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2.4;
ctx.setLineDash([5, 4]);
ctx.beginPath();
ctx.moveTo(x0, y0);
ctx.quadraticCurveTo(cx, cy, x1, y1);
ctx.stroke();
ctx.restore();
}

// draw jagged lightning discharges
// includes 7+ chains & 10+ resonance
for (
let i = 0;
i < lightningBolts.length;
i++
) {
const b = lightningBolts[i];
drawJaggedBolt(
ctx,
b.x0,
b.y0,
b.x1,
b.y1,
b.hex,
time + i * 1.7
);
}

// draw flying colored track sparks
// crisp small sparks with white core
for (
let i = 0;
i < particles.length;
i++
) {
const pt = particles[i];
if (!pt.active) {
continue;
}
const alpha = Math.max(
0,
pt.life / pt.maxLife
);
ctx.globalAlpha = alpha;
ctx.fillStyle = pt.hex;
ctx.beginPath();
ctx.arc(
pt.x,
pt.y,
pt.size,
0,
Math.PI * 2
);
ctx.fill();

ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.arc(
pt.x,
pt.y,
pt.size * 0.42,
0,
Math.PI * 2
);
ctx.fill();
}
ctx.globalAlpha = 1;

// draw subtle booster border cue
// highlights board during laser/warp
if (boosterMode !== 'none') {
ctx.save();
ctx.strokeStyle =
boosterMode === 'laser'
? '#ff1e42'
: '#00f0ff';
ctx.lineWidth = 3;
ctx.setLineDash([8, 6]);
chamferRectPath(
ctx,
4,
4,
width - 8,
height - 8,
14
);
ctx.stroke();
ctx.restore();
}
}

// draw crisp pulsing energy filament
// vibrates gently along gold track
function drawLitBusSegment(
ctx,
x0,
y0,
x1,
y1,
sig,
grpSize,
time,
step,
seed
) {
ctx.save();
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

const dx = x1 - x0;
const dy = y1 - y0;
const len = Math.hypot(dx, dy) || 1;
const nx = -dy / len;
const ny = dx / len;
const segs = 7;
const freq = grpSize >= 6 ? 20 : 11;
const amp =
step * (grpSize >= 6 ? 0.05 : 0.028);

// draw thin glowing energy thread
// keeps golden track visible beneath
ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2.6;
ctx.beginPath();
ctx.moveTo(x0, y0);
for (let i = 1; i < segs; i++) {
const t = i / segs;
const bx = x0 + dx * t;
const by = y0 + dy * t;
const w =
Math.sin(
time * freq + i * 1.5 + seed
) * amp;
ctx.lineTo(bx + nx * w, by + ny * w);
}
ctx.lineTo(x1, y1);
ctx.stroke();

ctx.strokeStyle =
sig.light || '#ffffff';
ctx.lineWidth = 1.1;
ctx.stroke();

// draw small energy pulse traveling
// moves between connected signals
const t =
(time * 1.6 + seed * 0.21) % 1;
const px = x0 + dx * t;
const py = y0 + dy * t;
ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.arc(px, py, 2.4, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
}

// draw jagged electric lightning bolt
// used when 7+ or 10+ chain clears
function drawJaggedBolt(
ctx,
x0,
y0,
x1,
y1,
hex,
seed
) {
ctx.save();
const steps = 6;
ctx.strokeStyle = hex;
ctx.lineWidth = 4.5;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.beginPath();
ctx.moveTo(x0, y0);
for (let i = 1; i < steps; i++) {
const t = i / steps;
const bx = x0 + (x1 - x0) * t;
const by = y0 + (y1 - y0) * t;
const off =
Math.sin(seed * 19 + i * 4.2) * 8;
ctx.lineTo(bx + off, by - off);
}
ctx.lineTo(x1, y1);
ctx.stroke();

ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 1.8;
ctx.stroke();
ctx.restore();
}

// draw center purple-fox skate window
// fox rides cyber-skate in center
export function drawFoxHeader(
ctx,
width,
height,
foxState
) {
const {
time,
scrollX,
boostTimer,
boostMode,
boostHex,
} = foxState;
const isBoost = boostTimer > 0;
const isRainbow =
isBoost && boostMode === 'rainbow';

const sky = ctx.createLinearGradient(
0,
0,
0,
height
);
sky.addColorStop(
0,
isRainbow ? '#16062b' : '#040811'
);
sky.addColorStop(
1,
isRainbow ? '#2b0948' : '#0a192f'
);
ctx.fillStyle = sky;
ctx.fillRect(0, 0, width, height);

const horizonY = height * 0.75;
const cityShift =
(scrollX * 0.25) % 36;
ctx.fillStyle =
'rgba(14, 32, 62, 0.72)';
for (
let x = -cityShift;
x < width + 36;
x += 36
) {
const bh =
12 +
((Math.abs(Math.round(x)) * 7) %
16);
ctx.fillRect(
x,
horizonY - bh,
22,
bh
);
}

ctx.strokeStyle = isRainbow
? 'rgba(244, 114, 182, 0.45)'
: 'rgba(0, 240, 255, 0.28)';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(0, horizonY);
ctx.lineTo(width, horizonY);
ctx.moveTo(0, horizonY + 10);
ctx.lineTo(width, horizonY + 10);

const gridStep = 28;
const shift = scrollX % gridStep;
for (
let x = -shift;
x < width + gridStep;
x += gridStep
) {
ctx.moveTo(x, horizonY);
ctx.lineTo(x - 14, height);
}
ctx.stroke();

const skyBand = Math.max(
14,
Math.floor(horizonY - 10)
);
for (let i = 0; i < 12; i++) {
const speedMul =
1 + (i % 3) * 0.45;
const sx =
width -
((scrollX * speedMul + i * 47) %
(width + 30));
const sy = 6 + ((i * 17) % skyBand);
ctx.fillStyle =
i % 3 === 0
? '#00f0ff'
: i % 3 === 1
? '#f472b6'
: '#c4b5fd';
if (isRainbow) {
ctx.fillRect(sx, sy, 14, 2);
} else if (isBoost) {
ctx.fillRect(sx, sy, 8, 2);
} else {
ctx.fillRect(sx, sy, 2, 2);
}
}

const foxX = width * 0.56;
const freq = isBoost ? 14 : 4.5;
const hoverBob =
Math.sin(time * freq) *
(isBoost ? 1.6 : 2.6);
const foxY = height * 0.52 + hoverBob;

if (isBoost) {
drawSkateTrail(
ctx,
foxX - 24,
foxY + 18,
foxX - 10,
time,
isRainbow,
boostHex
);
} else {
const idleG =
ctx.createLinearGradient(
foxX - 54,
foxY + 18,
foxX - 22,
foxY + 18
);
idleG.addColorStop(
0,
'rgba(0, 240, 255, 0)'
);
idleG.addColorStop(
1,
'rgba(0, 240, 255, 0.72)'
);
ctx.fillStyle = idleG;
ctx.beginPath();
ctx.moveTo(foxX - 22, foxY + 14);
ctx.lineTo(
foxX - 50 - Math.sin(time * 25) * 5,
foxY + 18
);
ctx.lineTo(foxX - 22, foxY + 22);
ctx.closePath();
ctx.fill();
}

ctx.save();
ctx.translate(foxX, foxY);
const scale = 0.46;
ctx.scale(scale, scale);
if (isBoost) {
ctx.rotate(0.08);
}
ctx.translate(-140, -82);

drawCyberSkate(
ctx,
time,
isBoost,
isRainbow,
boostHex
);

drawProfileFoxOnSkate(
ctx,
time,
isBoost,
isRainbow
);
ctx.restore();
}

// draw long neon or rainbow trail
// strictly zero yellow in bands
function drawSkateTrail(
ctx,
nozzleX,
nozzleY,
length,
time,
isRainbow,
boostHex
) {
ctx.save();
const startX = Math.max(
2,
nozzleX - length
);
if (isRainbow) {
const bands = [
'#ff1e42',
'#ff6d00',
'#00ff66',
'#00f0ff',
'#3b82f6',
'#a855f7',
];
const bandH = 3.0;
for (
let i = 0;
i < bands.length;
i++
) {
ctx.strokeStyle = bands[i];
ctx.lineWidth = bandH;
ctx.beginPath();
const by =
nozzleY -
((bands.length - 1) * bandH) * 0.5 +
i * bandH;
ctx.moveTo(nozzleX, by);
for (
let x = nozzleX;
x >= startX;
x -= 12
) {
const wave =
Math.sin(
time * 24 + (nozzleX - x) * 0.06
) * 3.0;
ctx.lineTo(x, by + wave);
}
ctx.stroke();
}
} else {
const g = ctx.createLinearGradient(
startX,
nozzleY,
nozzleX,
nozzleY
);
g.addColorStop(0, 'rgba(0,0,0,0)');
g.addColorStop(0.4, boostHex);
g.addColorStop(1, '#ffffff');
ctx.fillStyle = g;
ctx.beginPath();
ctx.moveTo(nozzleX, nozzleY - 7);
ctx.lineTo(
startX,
nozzleY + Math.sin(time * 28) * 3.5
);
ctx.lineTo(nozzleX, nozzleY + 7);
ctx.closePath();
ctx.fill();
}
ctx.restore();
}

// draw hovering cyber-skate deck
// glowing neon rim and jet nozzle
function drawCyberSkate(
ctx,
time,
isBoost,
isRainbow,
boostHex
) {
const glowCol = isRainbow
? '#f472b6'
: isBoost
? boostHex
: '#00f0ff';

const underG =
ctx.createRadialGradient(
126,
146,
4,
126,
146,
64
);
underG.addColorStop(0, glowCol);
underG.addColorStop(
1,
'rgba(0, 0, 0, 0)'
);
ctx.fillStyle = underG;
ctx.beginPath();
ctx.ellipse(
126,
148,
62,
11,
0,
0,
Math.PI * 2
);
ctx.fill();

ctx.fillStyle = '#334155';
ctx.beginPath();
ctx.moveTo(56, 132);
ctx.lineTo(72, 130);
ctx.lineTo(72, 144);
ctx.lineTo(56, 142);
ctx.closePath();
ctx.fill();

ctx.fillStyle = '#0f172a';
ctx.strokeStyle = glowCol;
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(68, 136);
ctx.lineTo(186, 136);
ctx.quadraticCurveTo(
204,
136,
212,
126
);
ctx.lineTo(194, 144);
ctx.lineTo(66, 144);
ctx.closePath();
ctx.fill();
ctx.stroke();

ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.ellipse(
94,
145,
11,
3,
0,
0,
Math.PI * 2
);
ctx.ellipse(
164,
145,
11,
3,
0,
0,
Math.PI * 2
);
ctx.fill();
}

// draw purple-fox standing on skate
// includes cyber visor & ear antenna
function drawProfileFoxOnSkate(
ctx,
time,
isBoost,
isRainbow
) {
ctx.save();
ctx.translate(74, 78);
const tailAng = isBoost
? -22 + Math.sin(time * 26) * 5
: Math.sin(time * 4) * 5;
ctx.rotate((tailAng * Math.PI) / 180);
ctx.translate(-74, -78);

const tailGrad =
ctx.createLinearGradient(
2,
78,
64,
4
);
tailGrad.addColorStop(0, '#4c1d95');
tailGrad.addColorStop(
0.55,
'#3b82f6'
);
tailGrad.addColorStop(
1,
isRainbow ? '#00f0ff' : '#f5f3ff'
);
ctx.fillStyle = tailGrad;
ctx.fill(new Path2D(FOX_TAIL_SVG));
ctx.fillStyle = isRainbow
? '#00f0ff'
: '#f5f3ff';
ctx.fill(new Path2D(FOX_TIP_SVG));
ctx.restore();

const crouchY = isBoost ? 5 : 0;
const legRects = [
[80, 100 + crouchY, '#5b21b6'],
[100, 102 + crouchY, '#4c1d95'],
[134, 102 + crouchY, '#5b21b6'],
[154, 100 + crouchY, '#4c1d95'],
];
for (let i = 0; i < 4; i++) {
const [lx, ly, col] = legRects[i];
ctx.fillStyle = col;
ctx.beginPath();
ctx.roundRect(
lx,
ly,
14,
30 - crouchY,
6
);
ctx.fill();
ctx.fillStyle = '#f5f3ff';
ctx.beginPath();
ctx.roundRect(lx + 2, 122, 10, 16, 4);
ctx.fill();
}

ctx.save();
ctx.translate(0, crouchY);
const bodyGrad =
ctx.createLinearGradient(
66,
48,
172,
104
);
bodyGrad.addColorStop(0, '#a855f7');
bodyGrad.addColorStop(
0.55,
'#7c3aed'
);
bodyGrad.addColorStop(1, '#4c1d95');
ctx.fillStyle = bodyGrad;
ctx.fill(new Path2D(BODY_SVG_PATH));

ctx.fillStyle =
'rgba(245, 243, 255, 0.9)';
ctx.beginPath();
ctx.ellipse(
112,
98,
34,
13,
0,
0,
Math.PI * 2
);
ctx.fill();

ctx.fillStyle = '#4c1d95';
ctx.beginPath();
ctx.moveTo(172, 36);
ctx.lineTo(160, 6);
ctx.lineTo(190, 32);
ctx.closePath();
ctx.fill();

ctx.fillStyle = '#22d3ee';
ctx.beginPath();
ctx.moveTo(172, 30);
ctx.lineTo(165, 14);
ctx.lineTo(182, 28);
ctx.closePath();
ctx.fill();

ctx.strokeStyle = '#94a3b8';
ctx.lineWidth = 2.4;
ctx.beginPath();
ctx.moveTo(178, 26);
ctx.lineTo(170, -8);
ctx.stroke();

const blinkOn =
isRainbow ||
isBoost ||
Math.sin(time * 7) > 0;
ctx.fillStyle = isRainbow
? '#00ff66'
: blinkOn
? '#f472b6'
: '#00f0ff';
ctx.beginPath();
ctx.arc(
170,
-8,
isBoost ? 5.5 : 4,
0,
Math.PI * 2
);
ctx.fill();

ctx.fillStyle = '#7c3aed';
ctx.beginPath();
ctx.moveTo(198, 32);
ctx.lineTo(212, 4);
ctx.lineTo(182, 30);
ctx.closePath();
ctx.fill();

ctx.fillStyle = '#22d3ee';
ctx.beginPath();
ctx.moveTo(197, 26);
ctx.lineTo(207, 10);
ctx.lineTo(188, 26);
ctx.closePath();
ctx.fill();

const headGrad =
ctx.createLinearGradient(
156,
24,
232,
76
);
headGrad.addColorStop(0, '#c4b5fd');
headGrad.addColorStop(1, '#8b5cf6');
ctx.fillStyle = headGrad;
ctx.beginPath();
ctx.ellipse(
186,
50,
30,
26,
0,
0,
Math.PI * 2
);
ctx.fill();

ctx.fill(new Path2D(FOX_SNOUT_TOP));
ctx.fillStyle = '#f5f3ff';
ctx.fill(new Path2D(FOX_SNOUT_BOT));

ctx.fillStyle = '#0b0712';
ctx.beginPath();
ctx.arc(233, 43, 2.6, 0, Math.PI * 2);
ctx.fill();

ctx.fillStyle = isRainbow
? '#f472b6'
: isBoost
? '#ffffff'
: '#00f0ff';
ctx.strokeStyle = '#0f172a';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(176, 38);
ctx.lineTo(212, 37);
ctx.lineTo(207, 49);
ctx.lineTo(180, 48);
ctx.closePath();
ctx.fill();
ctx.stroke();

ctx.fillStyle = '#ffffff';
ctx.fillRect(184, 40, 14, 2.5);
ctx.restore();
}

// draw mini pcb preview in menu modal
// shows green pcb, gold tracks, nodes
export function drawThemePreview(
ctx,
width,
height,
themeId,
time
) {
const theme = getTheme(themeId);
ctx.fillStyle = theme.bg;
ctx.fillRect(0, 0, width, height);

ctx.strokeStyle = theme.rim;
ctx.lineWidth = 2;
ctx.strokeRect(
2,
2,
width - 4,
height - 4
);

const cols = 5;
const rows = 3;
const stepX = width / cols;
const stepY = height / rows;

ctx.strokeStyle = theme.wire;
ctx.lineWidth = 2.5;
ctx.beginPath();
for (let c = 0; c < cols; c++) {
const x = (c + 0.5) * stepX;
ctx.moveTo(x, stepY * 0.5);
ctx.lineTo(x, height - stepY * 0.5);
}
for (let r = 0; r < rows; r++) {
const y = (r + 0.5) * stepY;
ctx.moveTo(stepX * 0.5, y);
ctx.lineTo(width - stepX * 0.5, y);
}
ctx.stroke();

const sampleY = height * 0.5;
const sig1 = getSignal(1);
drawLitBusSegment(
ctx,
stepX * 0.5,
sampleY,
stepX * 3.5,
sampleY,
sig1,
5,
time,
stepX,
1
);

for (let c = 0; c < cols; c++) {
const x = (c + 0.5) * stepX;
if (c < 4) {
drawSignalNode(
ctx,
(c % 4) + 1,
x,
sampleY,
Math.min(stepX, stepY) * 0.3,
time,
false,
4
);
} else {
ctx.fillStyle = theme.wire;
ctx.beginPath();
ctx.arc(
x,
sampleY,
6,
0,
Math.PI * 2
);
ctx.fill();
ctx.fillStyle = theme.socket;
ctx.beginPath();
ctx.arc(
x,
sampleY,
3,
0,
Math.PI * 2
);
ctx.fill();
}
}
}
