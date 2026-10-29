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

// store pre-rendered plasma sprites
// avoids slow gradients every frame
const signalSprites = new Map();

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

// draw inner shape icon inside node
// gives each signal a unique glyph
function drawCoreIcon(
ctx,
shape,
x,
y,
r,
colorStr = '#ffffff',
lineW = 0
) {
ctx.save();
ctx.translate(x, y);
ctx.strokeStyle = colorStr;
ctx.fillStyle = colorStr;
ctx.lineWidth =
lineW || Math.max(1.8, r * 0.2);
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

if (shape === 'ring') {
ctx.beginPath();
ctx.arc(
0,
0,
r * 0.42,
0,
Math.PI * 2
);
ctx.stroke();
ctx.beginPath();
ctx.arc(
0,
0,
r * 0.14,
0,
Math.PI * 2
);
ctx.fill();
} else if (shape === 'diamond') {
const s = r * 0.48;
ctx.beginPath();
ctx.moveTo(0, -s);
ctx.lineTo(s, 0);
ctx.lineTo(0, s);
ctx.lineTo(-s, 0);
ctx.closePath();
ctx.stroke();
} else if (shape === 'triangle') {
const s = r * 0.48;
ctx.beginPath();
ctx.moveTo(0, -s);
ctx.lineTo(s * 0.92, s * 0.75);
ctx.lineTo(-s * 0.92, s * 0.75);
ctx.closePath();
ctx.stroke();
} else if (shape === 'hex') {
const s = r * 0.46;
ctx.beginPath();
for (let i = 0; i < 6; i++) {
const a = (i * Math.PI) / 3;
const px = Math.cos(a) * s;
const py = Math.sin(a) * s;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.closePath();
ctx.stroke();
} else if (shape === 'star') {
const outer = r * 0.52;
const inner = r * 0.22;
ctx.beginPath();
for (let i = 0; i < 8; i++) {
const a = (i * Math.PI) / 4;
const rad =
i % 2 === 0 ? outer : inner;
const px = Math.cos(a) * rad;
const py = Math.sin(a) * rad;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.closePath();
ctx.fill();
} else if (shape === 'bolt') {
const s = r * 0.52;
ctx.beginPath();
ctx.moveTo(s * 0.2, -s);
ctx.lineTo(-s * 0.45, s * 0.05);
ctx.lineTo(s * 0.05, s * 0.05);
ctx.lineTo(-s * 0.2, s);
ctx.lineTo(s * 0.45, -s * 0.05);
ctx.lineTo(-s * 0.05, -s * 0.05);
ctx.closePath();
ctx.fill();
} else if (shape === 'chip') {
const s = r * 0.34;
ctx.strokeRect(-s, -s, s * 2, s * 2);
ctx.fillRect(
-s * 0.4,
-s * 0.4,
s * 0.8,
s * 0.8
);
} else if (shape === 'spiral') {
ctx.beginPath();
for (let i = 0; i <= 20; i++) {
const t = i / 20;
const a = t * Math.PI * 3.1;
const rad = t * r * 0.5;
const px = Math.cos(a) * rad;
const py = Math.sin(a) * rad;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.stroke();
}
ctx.restore();
}

// build cached plasma signal sprite
// bakes radial energy aura & core
function getSignalSprite(colorId) {
const sig = getSignal(colorId);
const key = sig.key + '_' + sig.hex;
if (signalSprites.has(key)) {
return signalSprites.get(key);
}
const sz = 148;
const c =
document.createElement('canvas');
c.width = sz;
c.height = sz;
const cx = c.getContext('2d');
const mid = sz / 2;
const r = 36;
cx.translate(mid, mid);

// draw wide soft plasma energy field
// gives pure glowing signal presence
const field = cx.createRadialGradient(
0,
0,
r * 0.1,
0,
0,
r * 1.95
);
field.addColorStop(0, '#ffffff');
field.addColorStop(
0.22,
sig.light || sig.hex
);
field.addColorStop(0.5, sig.hex);
field.addColorStop(0.78, sig.glow);
field.addColorStop(
1,
'rgba(0, 0, 0, 0)'
);
cx.fillStyle = field;
cx.beginPath();
cx.arc(
0,
0,
r * 1.95,
0,
Math.PI * 2
);
cx.fill();

// draw concentrated plasma nucleus
// hot white center fading to neon hue
const core = cx.createRadialGradient(
0,
0,
0,
0,
0,
r * 0.78
);
core.addColorStop(0, '#ffffff');
core.addColorStop(
0.42,
sig.light || '#ffffff'
);
core.addColorStop(0.82, sig.hex);
core.addColorStop(
1,
'rgba(0, 0, 0, 0)'
);
cx.fillStyle = core;
cx.beginPath();
cx.arc(
0,
0,
r * 0.78,
0,
Math.PI * 2
);
cx.fill();

// draw high-contrast signal glyph
// makes color readable at a glance
drawCoreIcon(
cx,
sig.shape,
0,
0,
r * 0.72,
sig.dark || '#04120a',
3.8
);
drawCoreIcon(
cx,
sig.shape,
0,
0,
r * 0.72,
'#ffffff',
2.0
);

signalSprites.set(key, c);
return c;
}

// draw pulsating energy signal node
// animates live plasma rings & sparks
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
const sprite =
getSignalSprite(colorId);
const phase =
(x * 0.03 + y * 0.05) % 6.28;
const speed =
groupSize >= 6
? 18
: groupSize === 5
? 11
: isSelected
? 13
: 6.5;
const amp =
groupSize >= 6
? 0.13
: isSelected
? 0.11
: 0.07;
const pulse =
1 +
Math.sin(time * speed + phase) *
amp;
const r = radius * pulse;
const drawSz = (r / 36) * 148;

// blit cached glowing plasma core
// fast 60fps base without shadowblur
ctx.drawImage(
sprite,
x - drawSz * 0.5,
y - drawSz * 0.5,
drawSz,
drawSz
);

// draw live undulating plasma corona
// two counter-rotating electric rings
ctx.save();
ctx.translate(x, y);
for (let ring = 0; ring < 2; ring++) {
const dir = ring === 0 ? 1 : -1;
const rot =
time * (2.2 + ring * 1.1) * dir +
phase;
ctx.strokeStyle =
ring === 0
? sig.light || '#ffffff'
: sig.hex;
ctx.lineWidth =
ring === 0 ? 2.0 : 1.5;
ctx.beginPath();
const steps = 20;
for (let i = 0; i <= steps; i++) {
const a =
(i / steps) * Math.PI * 2;
const wave =
Math.sin(
a * (3 + ring) + rot * 2.5
) *
radius *
0.11;
const rad =
r * (0.68 + ring * 0.16) + wave;
const px = Math.cos(a) * rad;
const py = Math.sin(a) * rad;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.closePath();
ctx.stroke();
}

// draw 3 orbiting energy micro-sparks
// circles around active signal core
ctx.fillStyle = '#ffffff';
for (let s = 0; s < 3; s++) {
const ang =
time * 3.8 +
phase +
(s * Math.PI * 2) / 3;
const dist =
r *
(0.84 +
Math.sin(time * 8 + s) * 0.08);
const sx = Math.cos(ang) * dist;
const sy = Math.sin(ang) * dist;
ctx.beginPath();
ctx.arc(sx, sy, 1.9, 0, Math.PI * 2);
ctx.fill();
}

// draw expanding pulse wave if picked
// shows active signal ready to travel
if (isSelected) {
const sonar = (time * 1.8) % 1;
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 2.4 * (1 - sonar);
ctx.beginPath();
ctx.arc(
0,
0,
radius * (0.85 + sonar * 0.75),
0,
Math.PI * 2
);
ctx.stroke();
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
// draw tiny smd capacitor component
// dark body with two gold solder ends
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

// draw metallic gold outer board rim
// frames the microchip substrate
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

// draw outer dark solder mask ring
// separates pad from green substrate
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

// draw metallic gold solder ring
// with bright specular inner rim
ctx.fillStyle = goldMain;
ctx.beginPath();
ctx.arc(x, y, padR, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = goldHi;
ctx.lineWidth = 1.2;
ctx.stroke();

// draw drilled dark via center hole
// authentic circuit board contact
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
const nodeR = step * 0.36;

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

// draw pulsating energy links between
// adjacent signals of the same color
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

// draw pulsing target preview rings
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
Math.sin(time * 6 + i) * 0.06;
const pr = nodeR * (0.7 + wave);

ctx.save();
ctx.fillStyle = sig.glow;
ctx.beginPath();
ctx.arc(
x,
y,
pr * 0.85,
0,
Math.PI * 2
);
ctx.fill();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2;
ctx.setLineDash([4, 4]);
ctx.beginPath();
ctx.arc(
x,
y,
pr,
time * 2.2,
time * 2.2 + Math.PI * 2
);
ctx.stroke();
ctx.restore();
}

// draw stationary pulsating signals
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

// draw signal racing along gold track
// leaves plasma trail and sparks
if (movingAnim) {
const { path, progress, color } =
movingAnim;
const totalSegs = path.length - 1;
const exact =
Math.min(0.999, progress) * totalSegs;
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

const sig = getSignal(color);
ctx.save();
ctx.strokeStyle = sig.glow;
ctx.lineWidth = step * 0.24;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.beginPath();
for (let i = 0; i <= idx; i++) {
const px = (path[i].c + 0.5) * step;
const py = (path[i].r + 0.5) * step;
if (i === 0) {
ctx.moveTo(px, py);
} else {
ctx.lineTo(px, py);
}
}
ctx.lineTo(mx, my);
ctx.stroke();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = step * 0.1;
ctx.stroke();

ctx.strokeStyle = '#ffffff';
ctx.lineWidth = step * 0.04;
ctx.stroke();
ctx.restore();

drawSignalNode(
ctx,
color,
mx,
my,
nodeR * 1.12,
time,
false,
6
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
ctx.lineWidth = 2.8;
ctx.setLineDash([6, 4]);
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

// draw active spark particles
// pooled array with bright white core
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
pt.size * 0.45,
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

// draw pulsating energy link on track
// oscillates plasma wave + 2 pulses
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

const pulse =
1 +
Math.sin(time * 12 + seed) * 0.18;
const baseW =
step *
(grpSize >= 6 ? 0.22 : 0.16) *
pulse;

// draw glowing plasma channel aura
// wraps around the golden pcb track
ctx.strokeStyle = sig.glow;
ctx.lineWidth = baseW * 1.65;
ctx.beginPath();
ctx.moveTo(x0, y0);
ctx.lineTo(x1, y1);
ctx.stroke();

// draw undulating electric sine wave
// vibrates between connected signals
const dx = x1 - x0;
const dy = y1 - y0;
const len = Math.hypot(dx, dy) || 1;
const nx = -dy / len;
const ny = dx / len;
const segs = 8;
const freq = grpSize >= 6 ? 26 : 14;
const amp =
step * (grpSize >= 6 ? 0.08 : 0.045);

ctx.strokeStyle = sig.hex;
ctx.lineWidth = Math.max(
2.6,
step * 0.065
);
ctx.beginPath();
ctx.moveTo(x0, y0);
for (let i = 1; i < segs; i++) {
const t = i / segs;
const bx = x0 + dx * t;
const by = y0 + dy * t;
const w =
Math.sin(
time * freq + i * 1.4 + seed
) * amp;
ctx.lineTo(bx + nx * w, by + ny * w);
}
ctx.lineTo(x1, y1);
ctx.stroke();

ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 1.4;
ctx.stroke();

// draw surging energy packets on link
// travels continuously along trace
for (let p = 0; p < 2; p++) {
const t =
(time * (1.8 + p * 0.6) +
seed * 0.17 +
p * 0.5) %
1;
const px = x0 + dx * t;
const py = y0 + dy * t;
ctx.fillStyle =
sig.light || '#ffffff';
ctx.beginPath();
ctx.arc(
px,
py,
step * 0.065,
0,
Math.PI * 2
);
ctx.fill();
}
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
ctx.lineWidth = 5;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.beginPath();
ctx.moveTo(x0, y0);
for (let i = 1; i < steps; i++) {
const t = i / steps;
const bx = x0 + (x1 - x0) * t;
const by = y0 + (y1 - y0) * t;
const off =
Math.sin(seed * 19 + i * 4.2) * 9;
ctx.lineTo(bx + off, by - off);
}
ctx.lineTo(x1, y1);
ctx.stroke();

ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 2;
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

// fill dark cyber night sky backdrop
// deeper contrast during warp boost
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

// draw scrolling cyber horizon grid
// moves right to left under the skate
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

// draw scrolling neon stars & dots
// stretches into warp streaks on 9+
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

// center fox inside dedicated window
// leaves room on left for jet trail
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
