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

// trace 4-point poly face & fill
// fast helper with zero allocations
function fillQuad(
ctx,
x0,
y0,
x1,
y1,
x2,
y2,
x3,
y3,
col
) {
ctx.fillStyle = col;
ctx.beginPath();
ctx.moveTo(x0, y0);
ctx.lineTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.lineTo(x3, y3);
ctx.closePath();
ctx.fill();
}

// trace 3-point tri face & fill
// shades 3d facets without gradients
function fillTri(
ctx,
x0,
y0,
x1,
y1,
x2,
y2,
col
) {
ctx.fillStyle = col;
ctx.beginPath();
ctx.moveTo(x0, y0);
ctx.lineTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.closePath();
ctx.fill();
}

// draw 3d neon geometric construct
// torus, cube, sphere, pyramid, etc.
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
(x * 0.05 + y * 0.07) % 6.28;
const freq =
groupSize >= 6
? 13
: isSelected
? 9
: 5;
const amp =
groupSize >= 6
? 0.08
: isSelected
? 0.07
: 0.035;
const sw = Math.sin(
time * 2.1 + phase
);
const cw = Math.cos(
time * 2.1 + phase
);
const pulse =
1 +
Math.sin(time * freq + phase) * amp;
const r = radius * 1.04 * pulse;
const shape = sig.shape;

ctx.save();
ctx.translate(x, y);
ctx.lineJoin = 'round';
ctx.lineCap = 'round';

if (shape === 'ring') {
// 1: 3d tilted neon torus (cyan)
// hollow doughnut with 3d tube ribs
ctx.save();
ctx.rotate(0.36 + sw * 0.14);

ctx.fillStyle = '#031219';
ctx.beginPath();
ctx.ellipse(
0,
0,
r * 1.05,
r * 0.68,
0,
0,
6.28
);
ctx.fill();
ctx.strokeStyle = sig.glow;
ctx.lineWidth = 4.6;
ctx.stroke();
ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2.2;
ctx.stroke();

// upper 3d torus tube highlight rim
// gives curved 3d doughnut volume
ctx.strokeStyle =
sig.light || '#e0ffff';
ctx.lineWidth = 1.3;
ctx.beginPath();
ctx.ellipse(
0,
-r * 0.08,
r * 0.82,
r * 0.46,
0,
0,
6.28
);
ctx.stroke();

// 4 meridian ribs around torus tube
// wraps wireframe around the ring
ctx.strokeStyle = sig.hex;
ctx.lineWidth = 1.2;
ctx.beginPath();
for (let i = 0; i < 4; i++) {
const a =
i * 1.57 + time * 0.9 + phase;
const ca = Math.cos(a);
const sa = Math.sin(a);
ctx.moveTo(
ca * r * 0.4,
sa * r * 0.24
);
ctx.lineTo(
ca * r * 1.03,
sa * r * 0.66
);
}
ctx.stroke();

// deep hollow center hole of torus
// no white dot, pure 3d torus bore
ctx.fillStyle = '#02080d';
ctx.beginPath();
ctx.ellipse(
0,
0,
r * 0.4,
r * 0.23,
0,
0,
6.28
);
ctx.fill();
ctx.strokeStyle = sig.hex;
ctx.lineWidth = 1.8;
ctx.stroke();
ctx.restore();
} else if (shape === 'diamond') {
// 2: 3d neon octahedron (cobalt)
// 8-face bipyramid crystal wireframe
const ty = -r * 1.1;
const by = r * 1.1;
const lx = -r * 0.92;
const ly = -sw * r * 0.08;
const rx = r * 0.92;
const ry = sw * r * 0.08;
const fx = sw * r * 0.34;
const fy = r * 0.32;
const kx = -sw * r * 0.34;
const ky = -r * 0.26;

fillTri(
ctx,
0,
ty,
lx,
ly,
fx,
fy,
'#061533'
);
fillTri(
ctx,
0,
ty,
fx,
fy,
rx,
ry,
'#0f2e6b'
);
fillTri(
ctx,
0,
by,
lx,
ly,
fx,
fy,
'#040e24'
);
fillTri(
ctx,
0,
by,
fx,
fy,
rx,
ry,
'#0a204d'
);

// outer glow + back wireframe axes
// shows 3d depth through octahedron
ctx.strokeStyle = sig.glow;
ctx.lineWidth = 4.4;
ctx.beginPath();
ctx.moveTo(0, ty);
ctx.lineTo(rx, ry);
ctx.lineTo(0, by);
ctx.lineTo(lx, ly);
ctx.closePath();
ctx.stroke();

ctx.strokeStyle =
'rgba(59, 130, 246, 0.45)';
ctx.lineWidth = 1.1;
ctx.beginPath();
ctx.moveTo(lx, ly);
ctx.lineTo(kx, ky);
ctx.lineTo(rx, ry);
ctx.moveTo(0, ty);
ctx.lineTo(kx, ky);
ctx.lineTo(0, by);
ctx.stroke();

// front neon octahedron edges
// sharp cobalt & ice-blue ridges
ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2.2;
ctx.beginPath();
ctx.moveTo(0, ty);
ctx.lineTo(rx, ry);
ctx.lineTo(0, by);
ctx.lineTo(lx, ly);
ctx.closePath();
ctx.moveTo(lx, ly);
ctx.lineTo(fx, fy);
ctx.lineTo(rx, ry);
ctx.moveTo(0, ty);
ctx.lineTo(fx, fy);
ctx.lineTo(0, by);
ctx.stroke();

ctx.strokeStyle =
sig.light || '#dbeafe';
ctx.lineWidth = 1.1;
ctx.beginPath();
ctx.moveTo(0, ty);
ctx.lineTo(fx, fy);
ctx.lineTo(rx, ry);
ctx.stroke();
} else if (shape === 'triangle') {
// 3: 3d neon tetrahedron (emerald)
// 4-vertex 3d delta polyhedron
const ax = sw * r * 0.08;
const ay = -r * 1.08;
const bx = -r * 0.96;
const by = r * 0.56;
const cx = r * 0.96;
const cy = r * 0.56;
const dx = sw * r * 0.34;
const dy = r * 0.14;

fillTri(
ctx,
ax,
ay,
bx,
by,
dx,
dy,
'#042414'
);
fillTri(
ctx,
ax,
ay,
dx,
dy,
cx,
cy,
'#073d22'
);
fillTri(
ctx,
bx,
by,
dx,
dy,
cx,
cy,
'#02140b'
);

ctx.strokeStyle = sig.glow;
ctx.lineWidth = 4.4;
ctx.beginPath();
ctx.moveTo(ax, ay);
ctx.lineTo(cx, cy);
ctx.lineTo(bx, by);
ctx.closePath();
ctx.stroke();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2.2;
ctx.stroke();

// internal 3d tetrahedron ridges
// y-junction meeting at front vertex
ctx.strokeStyle =
sig.light || '#dcfce7';
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.moveTo(ax, ay);
ctx.lineTo(dx, dy);
ctx.moveTo(bx, by);
ctx.lineTo(dx, dy);
ctx.moveTo(cx, cy);
ctx.lineTo(dx, dy);
ctx.stroke();
} else if (shape === 'hex') {
// 4: 3d neon cube / tesseract
// isometric 3d box + inner wire cube
const s = r * 0.98;
const wx = s * 0.866;
const wy = s * 0.5;
const jx = sw * r * 0.14;
const jy = r * 0.06;

// top, left and right 3d cube faces
// distinct violet lighting per plane
fillQuad(
ctx,
0,
-s,
wx,
-wy,
jx,
jy,
-wx,
-wy,
'#2d0c4e'
);
fillQuad(
ctx,
-wx,
-wy,
jx,
jy,
0,
s,
-wx,
wy,
'#160529'
);
fillQuad(
ctx,
jx,
jy,
wx,
-wy,
wx,
wy,
0,
s,
'#3f1170'
);

ctx.strokeStyle = sig.glow;
ctx.lineWidth = 4.4;
ctx.beginPath();
ctx.moveTo(0, -s);
ctx.lineTo(wx, -wy);
ctx.lineTo(wx, wy);
ctx.lineTo(0, s);
ctx.lineTo(-wx, wy);
ctx.lineTo(-wx, -wy);
ctx.closePath();
ctx.stroke();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2.2;
ctx.stroke();

// inner 3d cube edges + tesseract
// suspended sub-cube inside main box
ctx.strokeStyle =
sig.light || '#f3e8ff';
ctx.lineWidth = 1.4;
ctx.beginPath();
ctx.moveTo(-wx, -wy);
ctx.lineTo(jx, jy);
ctx.lineTo(wx, -wy);
ctx.moveTo(jx, jy);
ctx.lineTo(0, s);
const k = 0.45;
ctx.moveTo(0, -s * k);
ctx.lineTo(wx * k, -wy * k);
ctx.lineTo(wx * k, wy * k);
ctx.lineTo(0, s * k);
ctx.lineTo(-wx * k, wy * k);
ctx.lineTo(-wx * k, -wy * k);
ctx.closePath();
ctx.stroke();
} else if (shape === 'star') {
// 5: 3d neon pyramid (crimson red)
// 5-vertex square-base cyber pyramid
const px = sw * r * 0.1;
const py = -r * 1.06;
const lx = -r * 0.98;
const ly = r * 0.36;
const fx = sw * r * 0.28;
const fy = r * 0.84;
const rx = r * 0.98;
const ry = r * 0.36;
const kx = -sw * r * 0.28;
const ky = -r * 0.04;

fillTri(
ctx,
px,
py,
lx,
ly,
fx,
fy,
'#29030a'
);
fillTri(
ctx,
px,
py,
fx,
fy,
rx,
ry,
'#4c0614'
);

ctx.strokeStyle = sig.glow;
ctx.lineWidth = 4.4;
ctx.beginPath();
ctx.moveTo(px, py);
ctx.lineTo(rx, ry);
ctx.lineTo(fx, fy);
ctx.lineTo(lx, ly);
ctx.closePath();
ctx.stroke();

// translucent rear base diamond edges
// shows 4-corner square base in 3d
ctx.strokeStyle =
'rgba(255, 30, 66, 0.48)';
ctx.lineWidth = 1.2;
ctx.beginPath();
ctx.moveTo(lx, ly);
ctx.lineTo(kx, ky);
ctx.lineTo(rx, ry);
ctx.moveTo(px, py);
ctx.lineTo(kx, ky);
ctx.stroke();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2.2;
ctx.beginPath();
ctx.moveTo(px, py);
ctx.lineTo(rx, ry);
ctx.lineTo(fx, fy);
ctx.lineTo(lx, ly);
ctx.closePath();
ctx.stroke();

ctx.strokeStyle =
sig.light || '#ffe4e6';
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.moveTo(px, py);
ctx.lineTo(fx, fy);
ctx.stroke();
} else if (shape === 'bolt') {
// 6: 3d neon holo-sphere (orange)
// globe with rotating 3d meridians
const sr = r * 0.95;
ctx.fillStyle = '#1c0902';
ctx.beginPath();
ctx.arc(0, 0, sr, 0, 6.28);
ctx.fill();
ctx.strokeStyle = sig.glow;
ctx.lineWidth = 4.4;
ctx.stroke();

// equator + 2 rotating 3d meridians
// gives true spherical wireframe
ctx.strokeStyle = sig.hex;
ctx.lineWidth = 1.6;
ctx.beginPath();
ctx.ellipse(
0,
0,
sr,
sr * 0.34,
0.2,
0,
6.28
);
const m1 =
(0.12 + Math.abs(cw) * 0.82) * sr;
ctx.ellipse(
0,
0,
m1,
sr,
0.2,
0,
6.28
);
ctx.stroke();

ctx.strokeStyle =
sig.light || '#ffedd5';
ctx.lineWidth = 1.4;
ctx.beginPath();
const m2 =
(0.12 + Math.abs(sw) * 0.82) * sr;
ctx.ellipse(
0,
0,
m2,
sr,
0.2,
0,
6.28
);
ctx.stroke();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2.2;
ctx.beginPath();
ctx.arc(0, 0, sr, 0, 6.28);
ctx.stroke();
} else if (shape === 'chip') {
// 7: 3d neon hex-prism crystal (pink)
// faceted 3-pane vertical cyber prism
const tx = r * 0.48;
const ty = r * 0.96;
const sx = r * 0.88;
const sy = r * 0.48;
const m1 = (-0.28 + sw * 0.12) * r;
const m2 = (0.28 + sw * 0.12) * r;

fillQuad(
ctx,
-tx,
-ty,
m1,
-sy,
m1,
sy,
-tx,
ty,
'#240519'
);
fillQuad(
ctx,
m1,
-sy,
m2,
-sy,
m2,
sy,
m1,
sy,
'#470b32'
);
fillQuad(
ctx,
m2,
-sy,
tx,
-ty,
tx,
ty,
m2,
sy,
'#300722'
);

ctx.strokeStyle = sig.glow;
ctx.lineWidth = 4.4;
ctx.beginPath();
ctx.moveTo(-tx, -ty);
ctx.lineTo(tx, -ty);
ctx.lineTo(sx, -sy);
ctx.lineTo(sx, sy);
ctx.lineTo(tx, ty);
ctx.lineTo(-tx, ty);
ctx.lineTo(-sx, sy);
ctx.lineTo(-sx, -sy);
ctx.closePath();
ctx.stroke();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2.2;
ctx.stroke();

// internal 3d prism crown & ridges
// vertical facet seams along crystal
ctx.strokeStyle =
sig.light || '#fdf2f8';
ctx.lineWidth = 1.3;
ctx.beginPath();
ctx.moveTo(-sx, -sy);
ctx.lineTo(m1, -sy);
ctx.lineTo(m2, -sy);
ctx.lineTo(sx, -sy);
ctx.moveTo(-sx, sy);
ctx.lineTo(m1, sy);
ctx.lineTo(m2, sy);
ctx.lineTo(sx, sy);
ctx.moveTo(-tx, -ty);
ctx.lineTo(m1, -sy);
ctx.lineTo(m1, sy);
ctx.lineTo(-tx, ty);
ctx.moveTo(tx, -ty);
ctx.lineTo(m2, -sy);
ctx.lineTo(m2, sy);
ctx.lineTo(tx, ty);
ctx.stroke();
} else {
// 8: 3d neon gyroscope (platinum)
// 3 interlocking 3d orbital rings
const gr = r * 0.94;
ctx.fillStyle = '#0a1220';
ctx.beginPath();
ctx.arc(0, 0, gr, 0, 6.28);
ctx.fill();
ctx.strokeStyle = sig.glow;
ctx.lineWidth = 4.2;
ctx.stroke();
ctx.strokeStyle = sig.hex;
ctx.lineWidth = 1.9;
ctx.stroke();

ctx.strokeStyle = '#38bdf8';
ctx.lineWidth = 1.6;
ctx.beginPath();
ctx.ellipse(
0,
0,
gr * 0.94,
gr * 0.34,
time * 1.7 + phase,
0,
6.28
);
ctx.stroke();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = 1.6;
ctx.beginPath();
ctx.ellipse(
0,
0,
gr * 0.8,
gr * 0.3,
-time * 2.1 + phase + 1.05,
0,
6.28
);
ctx.stroke();

ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 1.4;
ctx.beginPath();
ctx.ellipse(
0,
0,
gr * 0.62,
gr * 0.24,
time * 1.3 + 2.1,
0,
6.28
);
ctx.stroke();
}

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

// draw clear incoming spawn reticles
// shows target lock + mini 3d shape
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
1 + Math.sin(time * 6 + i) * 0.1;
const br = nodeR * 0.82 * wave;
const cr = br * 0.45;

// dark contrast well over gold pad
// makes spawn beacon pop on tracks
ctx.fillStyle =
'rgba(2, 6, 12, 0.88)';
ctx.beginPath();
ctx.arc(
x,
y,
nodeR * 0.74,
0,
Math.PI * 2
);
ctx.fill();

// pulsing neon target-lock brackets
// frames intersection where it spawns
ctx.save();
ctx.translate(x, y);
ctx.strokeStyle = sig.glow;
ctx.lineWidth = 4.2;
ctx.beginPath();
ctx.arc(
0,
0,
nodeR * 0.66 * wave,
0,
Math.PI * 2
);
ctx.stroke();

ctx.strokeStyle = sig.hex;
ctx.lineWidth = 2.2;
ctx.beginPath();
ctx.moveTo(-br, -cr);
ctx.lineTo(-br, -br);
ctx.lineTo(-cr, -br);
ctx.moveTo(cr, -br);
ctx.lineTo(br, -br);
ctx.lineTo(br, -cr);
ctx.moveTo(br, cr);
ctx.lineTo(br, br);
ctx.lineTo(cr, br);
ctx.moveTo(-cr, br);
ctx.lineTo(-br, br);
ctx.lineTo(-br, cr);
ctx.stroke();
ctx.restore();

// miniature 3d holo-construct inside
// shows exact incoming shape & color
drawSignalNode(
ctx,
p.color,
x,
y,
nodeR * 0.52 * wave,
time,
false,
1
);
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
0.72 * progress +
0.28 * progress * progress;
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
