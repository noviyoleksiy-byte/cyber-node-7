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

// store pre-rendered 3d orb sprites
// avoids slow gradients every frame
const chipSprites = new Map();

// get signal object by color id 1..8
// returns cyan if id is out of range
export function getSignal(colorId) {
return (
SIGNALS[colorId - 1] || SIGNALS[0]
);
}

// get board theme object by id
// returns obsidian default if missing
export function getTheme(themeId) {
return (
BOARD_THEMES.find(
(t) => t.id === themeId
) || BOARD_THEMES[0]
);
}

// draw chamfered octagon rect path
// creates modern sci-fi armor bevels
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
// gives each color a unique symbol
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
lineW || Math.max(1.8, r * 0.22);
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

if (shape === 'ring') {
ctx.beginPath();
ctx.arc(
0,
0,
r * 0.45,
0,
Math.PI * 2
);
ctx.stroke();
ctx.beginPath();
ctx.arc(
0,
0,
r * 0.15,
0,
Math.PI * 2
);
ctx.fill();
} else if (shape === 'diamond') {
const s = r * 0.52;
ctx.beginPath();
ctx.moveTo(0, -s);
ctx.lineTo(s, 0);
ctx.lineTo(0, s);
ctx.lineTo(-s, 0);
ctx.closePath();
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
} else if (shape === 'triangle') {
const s = r * 0.52;
ctx.beginPath();
ctx.moveTo(0, -s);
ctx.lineTo(s * 0.92, s * 0.75);
ctx.lineTo(-s * 0.92, s * 0.75);
ctx.closePath();
ctx.stroke();
} else if (shape === 'hex') {
const s = r * 0.5;
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
const outer = r * 0.56;
const inner = r * 0.24;
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
const s = r * 0.55;
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
const s = r * 0.36;
ctx.strokeRect(-s, -s, s * 2, s * 2);
ctx.fillRect(
-s * 0.44,
-s * 0.44,
s * 0.88,
s * 0.88
);
const p = s * 1.48;
ctx.beginPath();
ctx.moveTo(-p, 0);
ctx.lineTo(-s, 0);
ctx.moveTo(s, 0);
ctx.lineTo(p, 0);
ctx.moveTo(0, -p);
ctx.lineTo(0, -s);
ctx.moveTo(0, s);
ctx.lineTo(0, p);
ctx.stroke();
} else if (shape === 'spiral') {
ctx.beginPath();
for (let i = 0; i <= 22; i++) {
const t = i / 22;
const a = t * Math.PI * 3.2;
const rad = t * r * 0.55;
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

// build cached 3d glass orb sprite
// renders halo, collar, dome & gloss
function getChipSprite(colorId) {
const sig = getSignal(colorId);
const key = sig.key + '_' + sig.hex;
if (chipSprites.has(key)) {
return chipSprites.get(key);
}
const sz = 140;
const c =
document.createElement('canvas');
c.width = sz;
c.height = sz;
const cx = c.getContext('2d');
const mid = sz / 2;
const r = 38;
cx.translate(mid, mid);

// draw soft radial neon outer bloom
// baked once into offscreen sprite
const halo = cx.createRadialGradient(
0,
0,
r * 0.45,
0,
0,
r * 1.72
);
halo.addColorStop(0, sig.glow);
halo.addColorStop(
1,
'rgba(0, 0, 0, 0)'
);
cx.fillStyle = halo;
cx.beginPath();
cx.arc(
0,
0,
r * 1.72,
0,
Math.PI * 2
);
cx.fill();

// draw dark titanium outer collar
// adds tactile mechanical housing
cx.fillStyle = '#050912';
cx.beginPath();
cx.arc(
0,
0,
r * 1.06,
0,
Math.PI * 2
);
cx.fill();
cx.strokeStyle =
sig.light || sig.hex;
cx.lineWidth = 1.6;
cx.stroke();

// draw 4 machined collar notches
// places metallic ticks at 90 degrees
cx.strokeStyle = '#ffffff';
cx.lineWidth = 2.2;
for (let i = 0; i < 4; i++) {
const a = (Math.PI / 2) * i;
cx.beginPath();
cx.moveTo(
Math.cos(a) * (r * 0.93),
Math.sin(a) * (r * 0.93)
);
cx.lineTo(
Math.cos(a) * (r * 1.08),
Math.sin(a) * (r * 1.08)
);
cx.stroke();
}

// draw 3d subsurface glass sphere
// blends light core to dark rim
const dome = cx.createRadialGradient(
-r * 0.28,
-r * 0.3,
r * 0.06,
0,
0,
r * 0.95
);
dome.addColorStop(
0,
sig.light || '#ffffff'
);
dome.addColorStop(0.35, sig.hex);
dome.addColorStop(0.84, sig.dark);
dome.addColorStop(1, '#04070e');
cx.fillStyle = dome;
cx.beginPath();
cx.arc(
0,
0,
r * 0.93,
0,
Math.PI * 2
);
cx.fill();

// draw glowing neon inner ring
// frames the central hologram symbol
cx.strokeStyle =
sig.light || '#ffffff';
cx.lineWidth = 2;
cx.beginPath();
cx.arc(
0,
0,
r * 0.76,
0,
Math.PI * 2
);
cx.stroke();

// draw crisp inner hologram emblem
// uses dark shadow and white stroke
drawCoreIcon(
cx,
sig.shape,
0,
1.6,
r * 0.78,
'rgba(0, 0, 0, 0.65)',
3.8
);
drawCoreIcon(
cx,
sig.shape,
0,
0,
r * 0.78,
'#ffffff',
2.5
);

// draw curved top glass highlight
// gives realistic lens reflection
const gloss = cx.createLinearGradient(
0,
-r * 0.88,
0,
-r * 0.08
);
gloss.addColorStop(
0,
'rgba(255, 255, 255, 0.74)'
);
gloss.addColorStop(
1,
'rgba(255, 255, 255, 0)'
);
cx.fillStyle = gloss;
cx.beginPath();
cx.ellipse(
-r * 0.12,
-r * 0.46,
r * 0.46,
r * 0.22,
-0.18,
0,
Math.PI * 2
);
cx.fill();

chipSprites.set(key, c);
return c;
}

// draw single neon signal node at x,y
// blits cached 3d sprite at 60fps
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
const sprite = getChipSprite(colorId);
let pulse = 1;
if (groupSize >= 6) {
pulse =
1 + Math.sin(time * 22) * 0.09;
} else if (groupSize === 5) {
pulse =
1 + Math.sin(time * 9) * 0.04;
} else if (isSelected) {
pulse = 1.12;
}
const r = radius * pulse;
const drawSz = (r / 38) * 140;

ctx.drawImage(
sprite,
x - drawSz * 0.5,
y - drawSz * 0.5,
drawSz,
drawSz
);

// draw rotating reticle when picked
// spins 4 segmented arcs around orb
if (isSelected) {
ctx.save();
ctx.translate(x, y);
ctx.rotate(time * 2.8);
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 2.4;
for (let i = 0; i < 4; i++) {
const a0 =
(Math.PI / 2) * i + 0.18;
const a1 =
(Math.PI / 2) * (i + 1) - 0.18;
ctx.beginPath();
ctx.arc(0, 0, r * 1.24, a0, a1);
ctx.stroke();
}
ctx.restore();
}

// draw live chain count badge on 5..6
// shows player how close to 7 chain
if (groupSize >= 5) {
const bx = x + radius * 0.72;
const by = y - radius * 0.72;
ctx.save();
ctx.fillStyle = '#050914';
ctx.strokeStyle =
sig.light || sig.hex;
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.arc(
bx,
by,
radius * 0.36,
0,
Math.PI * 2
);
ctx.fill();
ctx.stroke();
ctx.fillStyle = '#ffffff';
ctx.font =
'900 ' +
Math.round(radius * 0.44) +
'px system-ui, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(
String(groupSize),
bx,
by + 0.5
);
ctx.restore();
}
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
// caches hardware details for 60fps
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

// fill chamfered radial pcb substrate
// blends center glow into dark armor
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
18
);
ctx.fillStyle = bgGrad;
ctx.fill();

// draw subtle carbon micro-grid lines
// adds modern sci-fi surface texture
ctx.save();
chamferRectPath(
ctx,
5,
5,
width - 10,
height - 10,
15
);
ctx.clip();
ctx.strokeStyle =
'rgba(148, 163, 184, 0.035)';
ctx.lineWidth = 1;
for (
let gx = 0;
gx < width;
gx += 12
) {
ctx.beginPath();
ctx.moveTo(gx, 0);
ctx.lineTo(gx, height);
ctx.stroke();
}
for (
let gy = 0;
gy < height;
gy += 12
) {
ctx.beginPath();
ctx.moveTo(0, gy);
ctx.lineTo(width, gy);
ctx.stroke();
}

// draw etched 45-deg pcb sub-traces
// gives authentic motherboard look
ctx.strokeStyle =
theme.trace || theme.wire;
ctx.lineWidth = 1.4;
for (let r = 0; r < size - 1; r++) {
for (
let col = 0;
col < size - 1;
col++
) {
if ((r + col) % 2 === 0) {
const x0 =
(col + 0.72) * step;
const y0 =
(r + 0.72) * step;
const x1 =
(col + 1.28) * step;
const y1 =
(r + 1.28) * step;
ctx.beginPath();
ctx.moveTo(x0, y0);
ctx.lineTo(x1, y1);
ctx.stroke();
ctx.fillStyle = theme.wire;
ctx.beginPath();
ctx.arc(x0, y0, 2.2, 0, Math.PI * 2);
ctx.arc(x1, y1, 2.2, 0, Math.PI * 2);
ctx.fill();
}
}
}
ctx.restore();

// draw metallic outer armor border
// adds double bevel and edge leds
chamferRectPath(
ctx,
2,
2,
width - 4,
height - 4,
18
);
ctx.strokeStyle = theme.rim;
ctx.lineWidth = 2.4;
ctx.stroke();

chamferRectPath(
ctx,
7,
7,
width - 14,
height - 14,
14
);
ctx.strokeStyle =
'rgba(255, 255, 255, 0.08)';
ctx.lineWidth = 1;
ctx.stroke();

// draw glowing edge status bars
// accents top, bottom, left, right
const barLen = 48;
ctx.fillStyle = theme.accent;
ctx.fillRect(
width * 0.5 - barLen * 0.5,
1.5,
barLen,
2.5
);
ctx.fillRect(
width * 0.5 - barLen * 0.5,
height - 4,
barLen,
2.5
);
ctx.fillRect(
1.5,
height * 0.5 - barLen * 0.5,
2.5,
barLen
);
ctx.fillRect(
width - 4,
height * 0.5 - barLen * 0.5,
2.5,
barLen
);

// draw recessed dual-rail trenches
// connects orthogonal intersections
const start = 0.5 * step;
const end = (size - 0.5) * step;
ctx.strokeStyle = '#03060c';
ctx.lineWidth = Math.max(
5,
step * 0.13
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

ctx.strokeStyle = theme.wire;
ctx.lineWidth = Math.max(
2.2,
step * 0.06
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

// draw machined multi-ring sockets
// sits at every line intersection
const sockR = step * 0.21;
for (let r = 0; r < size; r++) {
for (let col = 0; col < size; col++) {
const x = (col + 0.5) * step;
const y = (r + 0.5) * step;

ctx.fillStyle = '#040811';
ctx.beginPath();
ctx.arc(
x,
y,
sockR * 1.24,
0,
Math.PI * 2
);
ctx.fill();
ctx.strokeStyle = theme.rim;
ctx.lineWidth = 1.3;
ctx.stroke();

ctx.fillStyle = theme.socket;
ctx.beginPath();
ctx.arc(
x,
y,
sockR * 0.78,
0,
Math.PI * 2
);
ctx.fill();

ctx.fillStyle =
'rgba(148, 163, 184, 0.35)';
ctx.beginPath();
ctx.arc(
x,
y,
sockR * 0.24,
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
// renders bus wires, sockets & sparks
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

// blit cached static pcb hardware
// zero per-frame cost for board grid
const cached = getBoardCache(
width,
height,
size,
themeId
);
ctx.drawImage(cached, 0, 0);

// draw lit neon bus bars between
// adjacent nodes of the same color
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
r + c
);
}
}
}
}

// draw double-contour preview rings
// shows where next 3 signals spawn
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
Math.sin(time * 5 + i) * 0.05;
const pr = nodeR * (0.74 + wave);

ctx.save();
ctx.fillStyle = sig.glow;
ctx.beginPath();
ctx.arc(
x,
y,
pr * 0.9,
0,
Math.PI * 2
);
ctx.fill();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(x, y, pr, 0, Math.PI * 2);
ctx.stroke();

ctx.strokeStyle =
sig.light || '#ffffff';
ctx.setLineDash([4, 4]);
ctx.beginPath();
ctx.arc(
x,
y,
pr * 0.6,
time * 2,
time * 2 + Math.PI * 2
);
ctx.stroke();
ctx.restore();
}

// draw stationary energy nodes
// skips node sliding along a wire
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

// draw moving signal sliding on wire
// traces bfs path with neon tail
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
ctx.lineWidth = step * 0.22;
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

ctx.strokeStyle = '#ffffff';
ctx.lineWidth = step * 0.06;
ctx.stroke();
ctx.restore();

drawSignalNode(
ctx,
color,
mx,
my,
nodeR * 1.08,
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
// pooled array with zero allocation
for (
let i = 0;
i < particles.length;
i++
) {
const pt = particles[i];
if (!pt.active) {
continue;
}
ctx.fillStyle = pt.hex;
ctx.globalAlpha = Math.max(
0,
pt.life / pt.maxLife
);
ctx.beginPath();
ctx.arc(
pt.x,
pt.y,
pt.size,
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
? '#ef233c'
: '#00f0ff';
ctx.lineWidth = 3;
ctx.setLineDash([8, 6]);
chamferRectPath(
ctx,
4,
4,
width - 8,
height - 8,
16
);
ctx.stroke();
ctx.restore();
}
}

// draw lit bus wire between 2 nodes
// renders triple-layer plasma conduit
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

let widthMul = 0.14;
if (grpSize === 5) {
widthMul = 0.18;
} else if (grpSize >= 6) {
widthMul =
0.22 + Math.sin(time * 24) * 0.04;
}

// draw outer colored neon bus glow
// merges touching nodes into circuit
ctx.strokeStyle = sig.glow;
ctx.lineWidth =
step * (widthMul + 0.14);
ctx.beginPath();
ctx.moveTo(x0, y0);
ctx.lineTo(x1, y1);
ctx.stroke();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = step * widthMul;
ctx.beginPath();
ctx.moveTo(x0, y0);
ctx.lineTo(x1, y1);
ctx.stroke();

ctx.strokeStyle =
sig.light || '#ffffff';
ctx.lineWidth = Math.max(
1.8,
step * 0.045
);
ctx.beginPath();
ctx.moveTo(x0, y0);
ctx.lineTo(x1, y1);
ctx.stroke();

// animate running current wave for 5
// bright energy packet travels wire
if (grpSize === 5) {
const t =
(time * 2.4 + seed * 0.25) % 1;
const wx = x0 + (x1 - x0) * t;
const wy = y0 + (y1 - y0) * t;
ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.arc(
wx,
wy,
step * 0.08,
0,
Math.PI * 2
);
ctx.fill();
}

// animate rapid pre-discharge sparks
// warns player group has 6 of 7 nodes
if (grpSize >= 6) {
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 2;
ctx.beginPath();
const midX = (x0 + x1) * 0.5;
const midY = (y0 + y1) * 0.5;
const jx =
Math.sin(time * 38 + seed * 3) *
step *
0.12;
const jy =
Math.cos(time * 34 + seed * 5) *
step *
0.12;
ctx.moveTo(x0, y0);
ctx.lineTo(midX + jx, midY + jy);
ctx.lineTo(x1, y1);
ctx.stroke();
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

// draw top panoramic purple-fox bar
// fox rides cyber-skate with trails
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
isRainbow ? '#16062b' : '#050811'
);
sky.addColorStop(
1,
isRainbow ? '#2b0948' : '#0d182e'
);
ctx.fillStyle = sky;
ctx.fillRect(0, 0, width, height);

// draw scrolling cyber horizon grid
// moves right to left toward the fox
const horizonY = height * 0.74;

// draw distant cyber city silhouette
// adds parallax depth above horizon
const cityShift =
(scrollX * 0.25) % 44;
ctx.fillStyle =
'rgba(15, 29, 58, 0.72)';
for (
let x = -cityShift;
x < width + 44;
x += 44
) {
const bh =
16 +
((Math.abs(Math.round(x)) * 7) %
18);
ctx.fillRect(
x,
horizonY - bh,
28,
bh
);
}

ctx.strokeStyle = isRainbow
? 'rgba(244, 114, 182, 0.45)'
: 'rgba(0, 240, 255, 0.25)';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(0, horizonY);
ctx.lineTo(width, horizonY);
ctx.moveTo(0, horizonY + 11);
ctx.lineTo(width, horizonY + 11);

const gridStep = 34;
const shift = scrollX % gridStep;
for (
let x = -shift;
x < width + gridStep;
x += gridStep
) {
ctx.moveTo(x, horizonY);
ctx.lineTo(x - 18, height);
}
ctx.stroke();

// draw scrolling neon stars & dots
// stretches into warp streaks on 9+
const skyBand = Math.max(
16,
Math.floor(horizonY - 12)
);
for (let i = 0; i < 18; i++) {
const speedMul =
1 + (i % 3) * 0.45;
const sx =
width -
((scrollX * speedMul + i * 67) %
(width + 40));
const sy = 8 + ((i * 19) % skyBand);
ctx.fillStyle =
i % 3 === 0
? '#00f0ff'
: i % 3 === 1
? '#f472b6'
: '#c4b5fd';
if (isRainbow) {
ctx.fillRect(sx, sy, 18, 2);
} else if (isBoost) {
ctx.fillRect(sx, sy, 9, 2);
} else {
ctx.fillRect(sx, sy, 2.5, 2.5);
}
}

// position fox on right-center stage
// leaves left side open for trail
const foxX = width * 0.64;
const freq = isBoost ? 14 : 4.5;
const hoverBob =
Math.sin(time * freq) *
(isBoost ? 1.8 : 3);
const foxY = height * 0.52 + hoverBob;

// draw colored or rainbow skate trail
// shoots left from rear jet thruster
if (isBoost) {
drawSkateTrail(
ctx,
foxX - 28,
foxY + 19,
foxX - 20,
time,
isRainbow,
boostHex
);
} else {
// draw calm idle thruster exhaust
// short cyan flame behind nozzle
const idleG =
ctx.createLinearGradient(
foxX - 64,
foxY + 19,
foxX - 24,
foxY + 19
);
idleG.addColorStop(
0,
'rgba(0, 240, 255, 0)'
);
idleG.addColorStop(
1,
'rgba(0, 240, 255, 0.7)'
);
ctx.fillStyle = idleG;
ctx.beginPath();
ctx.moveTo(foxX - 24, foxY + 15);
ctx.lineTo(
foxX - 58 - Math.sin(time * 25) * 6,
foxY + 19
);
ctx.lineTo(foxX - 24, foxY + 23);
ctx.closePath();
ctx.fill();
}

// draw purple-fox in full profile
// stands on neon hoverboard deck
ctx.save();
ctx.translate(foxX, foxY);
const scale = 0.48;
ctx.scale(scale, scale);
if (isBoost) {
ctx.rotate(0.09);
}
ctx.translate(-140, -82);

// draw neon hoverboard under paws
// includes jet nozzle and bottom glow
drawCyberSkate(
ctx,
time,
isBoost,
isRainbow,
boostHex
);

// draw purple-fox tail, legs & body
// uses canonical studio vector rig
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
4,
nozzleX - length
);
if (isRainbow) {
const bands = [
'#ef233c',
'#f97316',
'#00e676',
'#00f0ff',
'#3b82f6',
'#a855f7',
];
const bandH = 3.4;
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
x -= 16
) {
const wave =
Math.sin(
time * 24 + (nozzleX - x) * 0.05
) * 3.5;
ctx.lineTo(x, by + wave);
}
ctx.stroke();
}

// draw holographic sparks in trail
// glitters across full rainbow ribbon
ctx.fillStyle = '#ffffff';
for (let s = 0; s < 10; s++) {
const sx =
nozzleX -
((time * 260 + s * 37) %
Math.max(20, length));
const sy =
nozzleY +
Math.sin(time * 17 + s * 2.3) * 10;
ctx.fillRect(sx, sy, 4, 2);
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
ctx.moveTo(nozzleX, nozzleY - 8);
ctx.lineTo(
startX,
nozzleY + Math.sin(time * 28) * 4
);
ctx.lineTo(nozzleX, nozzleY + 8);
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

// draw under-board hover glow cushion
// pulses against the cyber grid below
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

// draw rear jet thruster nozzle
// attached to back of hoverboard
ctx.fillStyle = '#334155';
ctx.beginPath();
ctx.moveTo(56, 132);
ctx.lineTo(72, 130);
ctx.lineTo(72, 144);
ctx.lineTo(56, 142);
ctx.closePath();
ctx.fill();

// draw sleek angled hoverboard deck
// metallic dark body with neon trim
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

// draw anti-grav hover pads below
// two glowing emitter pods on board
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
// draw sweeping tail in the wind
// rotates back when speed boosting
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

// draw 4 legs planted on skate deck
// bends knees in speed boost stance
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

// draw fox torso and white belly
// leans forward during boost rush
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

// draw pointed ears and cyber antenna
// antenna tip blinks or flashes on 9+
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

// draw thin cyber antenna next to ear
// blinks neon orchid/cyan at the tip
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
? '#00e676'
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

// draw fox head and pointed snout
// matches studio purple-fox profile
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

// draw glowing neon cyber-visor
// flashes bright orchid/cyan in warp
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
// lets user inspect theme before buy
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
ctx.lineWidth = 2;
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

// draw sample connected 4-node bus
// shows theme wire & socket contrast
const sampleY = height * 0.5;
ctx.strokeStyle = theme.accent;
ctx.lineWidth = 5;
ctx.beginPath();
ctx.moveTo(stepX * 0.5, sampleY);
ctx.lineTo(stepX * 3.5, sampleY);
ctx.stroke();

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
ctx.fillStyle = theme.socket;
ctx.beginPath();
ctx.arc(
x,
sampleY,
7,
0,
Math.PI * 2
);
ctx.fill();
ctx.strokeStyle = theme.rim;
ctx.lineWidth = 1.5;
ctx.stroke();
}
}
}
