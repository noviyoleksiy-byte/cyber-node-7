import {
BOTTOM_BANNER_SVG,
BOARD_THEMES,
DEFAULT_CONFIG,
getLevelSpec,
} from './config.js';
import {
LANG_CODES,
getDict,
} from './i18n.js';
import {
SoundEngine,
} from './sound.js';
import {
createEmptyGrid,
cloneGrid,
getEmptySockets,
findWirePath,
resolveDischarges,
rollNextPreviews,
bouncePreviewIfHit,
spawnFromPreviews,
eraseRandomNodes,
randInt,
} from './board.js';
import {
getSignal,
drawBoardCanvas,
drawFoxHeader,
drawThemePreview,
} from './renderer.js';

// set localStorage key for profile
// stores coins, level, themes & lang
const SAVE_KEY =
'cyber_node_7_save_v1';

// create global sound synth instance
// plays cyber tones and bassline
const sound = new SoundEngine();

// hold live runtime game state
// synced with UI and canvas loops
const app = {
state: 'title',
mode: 'campaign',
level: 1,
freeColors: 7,
freeGrid: 9,
score: 0,
bestScore: 0,
coins: 60,
movesCount: 0,
streak: 0,
lang: 'ru',
unlockedThemes: ['obsidian'],
activeTheme: 'obsidian',
pickerIdx: 0,
cfg: { ...DEFAULT_CONFIG },
spec: null,
goalProgress: {
chains: 0,
score: 0,
rainbow: 0,
colors: {},
},
grid: createEmptyGrid(9),
previews: [],
selected: null,
undoStack: [],
boosterMode: 'none',
pendingAdAction: null,
adTimerId: null,
autoSpawnTimer: null,
movingAnim: null,
bounceArcs: [],
lightningBolts: [],
particles: [],
fox: {
time: 0,
scrollX: 0,
boostTimer: 0,
boostMode: 'color',
boostHex: '#00f0ff',
},
lastTs: 0,
};

// build fixed pool of 60 particles
// avoids garbage collection in loop
for (let i = 0; i < 60; i++) {
app.particles.push({
active: false,
x: 0,
y: 0,
vx: 0,
vy: 0,
life: 0,
maxLife: 1,
size: 3,
hex: '#00f0ff',
});
}

// load saved profile from storage
// keeps coins and unlocked themes
function loadProfile() {
try {
const raw =
localStorage.getItem(SAVE_KEY);
if (!raw) {
return;
}
const data = JSON.parse(raw);
if (typeof data.coins === 'number') {
app.coins = Math.max(0, data.coins);
}
if (
typeof data.bestScore === 'number'
) {
app.bestScore = data.bestScore;
}
if (typeof data.level === 'number') {
app.level = Math.max(1, data.level);
}
if (
typeof data.lang === 'string' &&
LANG_CODES.includes(data.lang)
) {
app.lang = data.lang;
}
if (
Array.isArray(data.unlockedThemes) &&
data.unlockedThemes.length > 0
) {
app.unlockedThemes =
data.unlockedThemes;
}
if (
typeof data.activeTheme === 'string'
) {
app.activeTheme = data.activeTheme;
}
if (typeof data.mode === 'string') {
app.mode = data.mode;
}
if (
typeof data.freeColors === 'number'
) {
app.freeColors = data.freeColors;
}
if (
typeof data.freeGrid === 'number'
) {
app.freeGrid = data.freeGrid;
}
if (
typeof data.soundEnabled === 'boolean'
) {
sound.soundEnabled =
data.soundEnabled;
}
if (
typeof data.musicEnabled === 'boolean'
) {
sound.musicEnabled =
data.musicEnabled;
}
if (
typeof data.soundVol === 'number'
) {
sound.soundVol = data.soundVol;
}
if (
typeof data.musicVol === 'number'
) {
sound.musicVol = data.musicVol;
}
} catch (_e) {
// skip corrupted storage silently
// keeps safe default values active
}
}

// save player profile to storage
// runs after moves, wins & purchases
function saveProfile() {
try {
const payload = {
coins: app.coins,
bestScore: app.bestScore,
level: app.level,
lang: app.lang,
unlockedThemes: app.unlockedThemes,
activeTheme: app.activeTheme,
mode: app.mode,
freeColors: app.freeColors,
freeGrid: app.freeGrid,
soundEnabled: sound.soundEnabled,
musicEnabled: sound.musicEnabled,
soundVol: sound.soundVol,
musicVol: sound.musicVol,
};
localStorage.setItem(
SAVE_KEY,
JSON.stringify(payload)
);
} catch (_e) {
// ignore quota errors in private mode
// game continues in memory
}
}

// find dom element by id shorthand
// keeps UI wiring lines compact
function el(id) {
return document.getElementById(id);
}

// set body data-state attribute
// used by CSS and test snapshots
function setAppState(nextState) {
app.state = nextState;
document.body.dataset.state =
nextState;
}

// spawn burst of pooled particles
// runs on node discharge or laser
function spawnSparks(
x,
y,
hex,
count = 10
) {
let spawned = 0;
for (
let i = 0;
i < app.particles.length;
i++
) {
const pt = app.particles[i];
if (!pt.active) {
const ang =
Math.random() * Math.PI * 2;
const spd = 40 + Math.random() * 130;
pt.active = true;
pt.x = x;
pt.y = y;
pt.vx = Math.cos(ang) * spd;
pt.vy = Math.sin(ang) * spd;
pt.maxLife =
0.35 + Math.random() * 0.25;
pt.life = pt.maxLife;
pt.size = 2.2 + Math.random() * 2.5;
pt.hex = hex;
spawned++;
if (spawned >= count) {
break;
}
}
}
}

// setup new board table for level
// places initial nodes and 3 previews
function setupTable() {
if (app.autoSpawnTimer) {
clearTimeout(app.autoSpawnTimer);
app.autoSpawnTimer = null;
}
app.movingAnim = null;
app.selected = null;
app.boosterMode = 'none';
app.undoStack = [];
app.bounceArcs = [];
app.lightningBolts = [];
app.movesCount = 0;
app.streak = 0;

if (app.mode === 'campaign') {
app.spec = getLevelSpec(app.level);
} else {
app.spec = {
level: app.level,
gridSize: app.freeGrid,
colors: app.freeColors,
startNodes: Math.floor(
app.freeGrid * 1.2
),
isBonus: app.freeColors === 8,
goalType: 'endless',
targetChains: 0,
targetScore: 0,
colorTargets: null,
minComboSize: 0,
levelCoinBonus: 0,
};
}

app.score = 0;
app.goalProgress = {
chains: 0,
score: 0,
rainbow: 0,
colors: {},
};
if (app.spec.colorTargets) {
for (const k of Object.keys(
app.spec.colorTargets
)) {
app.goalProgress.colors[k] = 0;
}
}

const sz = app.spec.gridSize;
app.grid = createEmptyGrid(sz);

// place starting signals on sockets
// avoids accidental 7+ on frame 0
for (
let i = 0;
i < app.spec.startNodes;
i++
) {
const free = getEmptySockets(
app.grid
);
if (free.length === 0) {
break;
}
const pick =
free[randInt(free.length)];
const col =
1 + randInt(app.spec.colors);
app.grid[pick.r][pick.c] = col;
}

app.previews = rollNextPreviews(
app.grid,
app.spec.colors,
app.cfg.spawnPerTurn
);
updateBoosterUI();
updateHudUI();
}

// save snapshot before player move
// powers the 1-step Undo booster
function pushUndoSnapshot() {
app.undoStack.push({
grid: cloneGrid(app.grid),
previews: app.previews.map((p) => ({
...p,
})),
score: app.score,
movesCount: app.movesCount,
streak: app.streak,
goalProgress: JSON.parse(
JSON.stringify(app.goalProgress)
),
});
if (app.undoStack.length > 10) {
app.undoStack.shift();
}
}

// check if current campaign goal met
// returns false in endless free mode
function isGoalCompleted() {
if (
!app.spec ||
app.mode !== 'campaign'
) {
return false;
}
const gt = app.spec.goalType;
if (gt === 'chains') {
return (
app.goalProgress.chains >=
app.spec.targetChains
);
}
if (gt === 'score') {
return (
app.score >= app.spec.targetScore
);
}
if (gt === 'rainbow') {
return (
app.goalProgress.rainbow >=
app.spec.targetChains
);
}
if (gt === 'colors') {
const entries = Object.entries(
app.spec.colorTargets
);
for (const [k, need] of entries) {
const cur =
app.goalProgress.colors[k] || 0;
if (cur < need) {
return false;
}
}
return true;
}
return false;
}

// process discharges on current board
// starts fox skate boost & lightning
function checkAndRunDischarges() {
const res = resolveDischarges(
app.grid,
app.streak + 1,
app.spec ? app.spec.isBonus : false,
app.cfg
);
if (!res.triggered) {
return false;
}

app.streak += 1;
app.score += res.totalPoints;
if (app.score > app.bestScore) {
app.bestScore = app.score;
}
app.coins += res.totalCoins;

// update campaign objective counters
// counts chains, score, rainbow, hue
app.goalProgress.chains +=
res.dischargedGroups.length;
app.goalProgress.score = app.score;

const canvas = el('board-canvas');
const bw = canvas
? canvas.width
: 540;
const sz = app.grid.length;
const step = bw / sz;

for (
let i = 0;
i < res.dischargedGroups.length;
i++
) {
const grp = res.dischargedGroups[i];
const sig = getSignal(grp.color);
if (grp.size >= 9) {
app.goalProgress.rainbow += 1;
}
if (
app.goalProgress.colors &&
app.goalProgress.colors[grp.color] !==
undefined
) {
app.goalProgress.colors[grp.color] +=
1;
}

// add lightning bolts along chain
// connects consecutive cells visually
for (
let j = 0;
j < grp.cells.length;
j++
) {
const pt = grp.cells[j];
const px = (pt.c + 0.5) * step;
const py = (pt.r + 0.5) * step;
spawnSparks(px, py, sig.hex, 6);
if (j > 0) {
const prev = grp.cells[j - 1];
app.lightningBolts.push({
x0: (prev.c + 0.5) * step,
y0: (prev.r + 0.5) * step,
x1: px,
y1: py,
hex: sig.hex,
life: 0.42,
});
}
}
}

// add 10+ resonance arcs across board
// shoots bolts to all same-hue nodes
for (
let i = 0;
i < res.resonanceArcs.length;
i++
) {
const arc = res.resonanceArcs[i];
const sig = getSignal(arc.color);
const x1 = (arc.toC + 0.5) * step;
const y1 = (arc.toR + 0.5) * step;
spawnSparks(x1, y1, '#ffffff', 8);
app.lightningBolts.push({
x0: (arc.fromC + 0.5) * step,
y0: (arc.fromR + 0.5) * step,
x1,
y1,
hex: sig.hex,
life: 0.55,
});
}

// boost purple-fox on cyber-skate
// 4x speed for 1.2s or rainbow warp
const topGroup =
res.dischargedGroups[0];
const topSig = getSignal(
topGroup.color
);
app.fox.boostTimer = 1.25;
app.fox.boostHex = topSig.hex;
app.fox.boostMode = res.hasRainbow
? 'rainbow'
: 'color';

sound.playDischarge(
res.maxChainSize,
res.hasResonance
);
saveProfile();
updateHudUI();

if (isGoalCompleted()) {
setTimeout(() => {
triggerLevelComplete();
}, 320);
}
return true;
}

// complete current campaign board
// gives bonus coins & opens modal
function triggerLevelComplete() {
if (app.state !== 'playing') {
return;
}
setAppState('gameover');
const bonus = app.spec
? app.spec.levelCoinBonus *
(app.spec.isBonus ? 2 : 1)
: 10;
app.coins += bonus;
app.fox.boostTimer = 2.0;
app.fox.boostMode = 'rainbow';
app.level += 1;
el('dbg-level').value = String(
app.level
);
saveProfile();
updateHudUI();
sound.playLevelWin();

el('val-lv-score').textContent =
String(app.score);
el('val-lv-coins').textContent =
`+${bonus} 💎`;
el('level-modal').classList.remove(
'hidden'
);
}

// check if all 81 sockets are filled
// prompts overload rescue via ad
function checkBoardOverload() {
const free =
getEmptySockets(app.grid);
if (free.length > 0) {
return false;
}
openAdModal('overload');
return true;
}

// finish node move after wire slide
// checks discharge or spawns 3 nodes
function finishMoveAt(
fromR,
fromC,
toR,
toC,
color
) {
app.grid[toR][toC] = color;
app.movesCount += 1;

// check if player stepped on preview
// bounces holographic ring with arc
const bounced = bouncePreviewIfHit(
app.grid,
app.previews,
toR,
toC
);
if (bounced) {
app.bounceArcs.push({
...bounced,
life: 0.45,
});
sound.playBounce();
}

// check if move formed 7+ chain
// skips spawning 3 nodes on discharge
const didClear =
checkAndRunDischarges();
if (didClear) {
updateHudUI();
return;
}

// reset streak on non-clearing move
// spawns 3 preview signals onto board
app.streak = 0;
const sp = spawnFromPreviews(
app.grid,
app.previews,
app.spec ? app.spec.colors : 7
);
app.previews = sp.nextPreviews;
updateHudUI();

// auto-check if spawned node made 7+
// waits 0.25s pause per gdd rule
const onAutoWait = () => {
app.autoSpawnTimer = null;
const autoCleared =
checkAndRunDischarges();
if (!autoCleared) {
checkBoardOverload();
}
};
app.autoSpawnTimer = setTimeout(
onAutoWait,
250
);
}

// process pointer tap on pcb board
// maps xy to full 1/N square hit-box
function onBoardTap(
clientX,
clientY
) {
if (
app.state !== 'playing' ||
app.movingAnim ||
app.autoSpawnTimer
) {
return;
}
sound.wake();
const canvas = el('board-canvas');
const rect =
canvas.getBoundingClientRect();
if (
rect.width <= 0 ||
rect.height <= 0
) {
return;
}
const sz = app.grid.length;
const c = Math.min(
sz - 1,
Math.max(
0,
Math.floor(
((clientX - rect.left) /
rect.width) *
sz
)
)
);
const r = Math.min(
sz - 1,
Math.max(
0,
Math.floor(
((clientY - rect.top) /
rect.height) *
sz
)
)
);

const cellColor = app.grid[r][c];

// check if laser booster is active
// erases 1 blocking node without turn
if (app.boosterMode === 'laser') {
if (cellColor > 0) {
pushUndoSnapshot();
const sig = getSignal(cellColor);
const step = canvas.width / sz;
spawnSparks(
(c + 0.5) * step,
(r + 0.5) * step,
sig.hex,
14
);
app.grid[r][c] = 0;
app.boosterMode = 'none';
app.selected = null;
sound.playBooster('laser');
updateBoosterUI();
updateHudUI();
}
return;
}

// select or switch own signal node
// highlights node with spinning ring
if (cellColor > 0) {
app.selected = { r, c };
sound.playSelect();
return;
}

// move selected node to empty socket
// uses air jump for teleport or bfs
if (!app.selected) {
return;
}
const { r: r0, c: c0 } = app.selected;
const moveColor = app.grid[r0][c0];
if (!moveColor) {
app.selected = null;
return;
}

if (app.boosterMode === 'teleport') {
pushUndoSnapshot();
app.grid[r0][c0] = 0;
app.selected = null;
app.boosterMode = 'none';
sound.playBooster('teleport');
updateBoosterUI();
app.movingAnim = {
path: [
{ r: r0, c: c0 },
{ r, c },
],
progress: 0,
speed: 7.5,
fromR: r0,
fromC: c0,
toR: r,
toC: c,
color: moveColor,
};
return;
}

const path = findWirePath(
app.grid,
r0,
c0,
r,
c
);
if (!path) {
// play subtle blocked buzz if no wire
// keeps current selection active
sound.playTone(
150,
110,
0.09,
'sawtooth',
0.15
);
return;
}

pushUndoSnapshot();
app.grid[r0][c0] = 0;
app.selected = null;
sound.playStep(path.length);

// animate signal running along wires
// settles in ~140ms for snappy feel
app.movingAnim = {
path,
progress: 0,
speed: 7.2,
fromR: r0,
fromC: c0,
toR: r,
toC: c,
color: moveColor,
};
}

// run undo 1 step back on the board
// restores previous grid & previews
function executeUndo() {
if (app.undoStack.length === 0) {
return;
}
const snap = app.undoStack.pop();
app.grid = snap.grid;
app.previews = snap.previews;
app.score = snap.score;
app.movesCount = snap.movesCount;
app.streak = snap.streak;
app.goalProgress = snap.goalProgress;
app.selected = null;
app.boosterMode = 'none';
sound.playBooster('undo');
updateBoosterUI();
updateHudUI();
}

// trigger booster button press
// deducts coins or offers 3s video ad
function onBoosterClick(kind) {
if (
app.state !== 'playing' ||
app.movingAnim
) {
return;
}
sound.wake();

// toggle off if already armed
// refunds nothing since paid on arm
if (
(kind === 'laser' &&
app.boosterMode === 'laser') ||
(kind === 'teleport' &&
app.boosterMode === 'teleport')
) {
app.boosterMode = 'none';
updateBoosterUI();
return;
}

if (
kind === 'undo' &&
app.undoStack.length === 0
) {
sound.playTone(
160,
120,
0.08,
'sine',
0.14
);
return;
}

let hasNodes = false;
for (
let r = 0;
r < app.grid.length;
r++
) {
for (
let c = 0;
c < app.grid.length;
c++
) {
if (app.grid[r][c] > 0) {
hasNodes = true;
}
}
}
if (!hasNodes && kind !== 'undo') {
return;
}

const cost =
kind === 'undo'
? app.cfg.undoCost
: kind === 'laser'
? app.cfg.laserCost
: app.cfg.teleportCost;

if (app.coins >= cost) {
app.coins -= cost;
saveProfile();
activateBoosterReward(kind);
} else {
openAdModal(kind);
}
}

// grant booster after payment or ad
// runs undo or arms laser/teleport
function activateBoosterReward(kind) {
if (kind === 'undo') {
executeUndo();
} else if (kind === 'laser') {
app.boosterMode = 'laser';
sound.playSelect();
} else if (kind === 'teleport') {
app.boosterMode = 'teleport';
sound.playSelect();
}
updateBoosterUI();
updateHudUI();
}

// open rewarded video or rescue modal
// serves both boosters and overload
function openAdModal(actionKind) {
app.pendingAdAction = actionKind;
const dict = getDict(app.lang);
const modal = el('ad-modal');
const promptEl = el('txt-ad-prompt');
const payBtn = el('btn-pay-rescue');
const countEl = el('ad-countdown');
const actionsEl = el('ad-actions');

countEl.classList.add('hidden');
actionsEl.classList.remove('hidden');

if (actionKind === 'overload') {
promptEl.textContent =
dict.overloadPrompt;
const c = app.cfg.rescueCost;
payBtn.textContent =
`${dict.payCoins} (${c} 💎)`;
if (app.coins >= c) {
payBtn.classList.remove('hidden');
} else {
payBtn.classList.add('hidden');
}
} else {
promptEl.textContent =
dict.boosterAdPrompt;
payBtn.classList.add('hidden');
}
modal.classList.remove('hidden');
}

// start 3-second simulated video ad
// grants booster or erases 10 nodes
function startAdCountdown() {
const dict = getDict(app.lang);
const countEl = el('ad-countdown');
const actionsEl = el('ad-actions');
const promptEl = el('txt-ad-prompt');

actionsEl.classList.add('hidden');
countEl.classList.remove('hidden');
promptEl.textContent =
dict.adWatching;

let left = 3;
countEl.textContent = `${left}s`;
if (app.adTimerId) {
clearInterval(app.adTimerId);
}
app.adTimerId = setInterval(() => {
left -= 1;
if (left > 0) {
countEl.textContent = `${left}s`;
return;
}
clearInterval(app.adTimerId);
app.adTimerId = null;
el('ad-modal').classList.add(
'hidden'
);
const act = app.pendingAdAction;
app.pendingAdAction = null;
if (act === 'overload') {
performOverloadRescue();
} else if (act) {
activateBoosterReward(act);
}
}, 1000);
}

// erase 10 random nodes to save game
// called after 50 coins or 3s video
function performOverloadRescue() {
const removed = eraseRandomNodes(
app.grid,
app.cfg.rescueClearCount
);
const canvas = el('board-canvas');
const step =
(canvas ? canvas.width : 540) /
app.grid.length;
for (
let i = 0;
i < removed.length;
i++
) {
const it = removed[i];
const sig = getSignal(it.color);
spawnSparks(
(it.c + 0.5) * step,
(it.r + 0.5) * step,
sig.hex,
8
);
}
app.previews = rollNextPreviews(
app.grid,
app.spec ? app.spec.colors : 7,
app.cfg.spawnPerTurn
);
sound.playBooster('laser');
updateHudUI();
}

// update booster buttons and hint bar
// shows active state and coin prices
function updateBoosterUI() {
const dict = getDict(app.lang);
const hint = el('booster-hint');
el('btn-laser').classList.toggle(
'active',
app.boosterMode === 'laser'
);
el('btn-teleport').classList.toggle(
'active',
app.boosterMode === 'teleport'
);
if (app.boosterMode === 'laser') {
hint.textContent = dict.hintLaser;
hint.classList.remove('hidden');
} else if (
app.boosterMode === 'teleport'
) {
hint.textContent = dict.hintTeleport;
hint.classList.remove('hidden');
} else {
hint.classList.add('hidden');
}
el('price-undo').textContent =
`💎 ${app.cfg.undoCost}`;
el('price-laser').textContent =
`💎 ${app.cfg.laserCost}`;
el('price-teleport').textContent =
`💎 ${app.cfg.teleportCost}`;
}

// sync all top HUD counters and goal
// formats numbers with tabular-nums
function updateHudUI() {
const dict = getDict(app.lang);
el('hud-coins').textContent =
`💎 ${app.coins}`;
el('menu-coins').textContent =
`💎 ${app.coins}`;
el('dbg-coins').value = String(
app.coins
);
el('hud-score').textContent = String(
app.score
);
el('hud-best').textContent =
`${dict.best}: ${app.bestScore}`;
el('hud-moves').textContent =
`${dict.moves}: ${app.movesCount}`;

if (app.mode === 'campaign') {
el('hud-level').textContent =
`${dict.levelShort} ${app.level}`;
const isB =
app.spec && app.spec.isBonus;
el('hud-bonus').textContent =
dict.bonusTag;
el('hud-bonus').classList.toggle(
'hidden',
!isB
);
} else {
const fc = app.freeColors;
el('hud-level').textContent =
`${dict.modeFree} (${fc})`;
el('hud-bonus').classList.add(
'hidden'
);
}

// format goal readout & color dots
// adapts to Type A, B, C or Endless
const goalTxt = el('hud-goal-text');
const dotsWrap = el('hud-goal-dots');
dotsWrap.innerHTML = '';

if (
!app.spec ||
app.mode !== 'campaign'
) {
const ch = app.goalProgress.chains;
goalTxt.textContent =
`${dict.goalChains} ${ch}`;
return;
}

const gt = app.spec.goalType;
if (gt === 'chains') {
goalTxt.textContent =
`${dict.goalChains} ` +
`${app.goalProgress.chains}/` +
`${app.spec.targetChains}`;
} else if (gt === 'score') {
const ts = app.spec.targetScore;
goalTxt.textContent =
`${dict.goalScore} ` +
`${app.score}/${ts}`;
} else if (gt === 'rainbow') {
goalTxt.textContent =
`${dict.goalRainbow} ` +
`${app.goalProgress.rainbow}/` +
`${app.spec.targetChains}`;
} else if (gt === 'colors') {
goalTxt.textContent = dict.goalColors;
const entries = Object.entries(
app.spec.colorTargets
);
for (const [k, need] of entries) {
const sig = getSignal(Number(k));
const done =
app.goalProgress.colors[k] || 0;
const item =
document.createElement('span');
item.className = 'color-goal-item';
const dot =
document.createElement('span');
dot.className = 'color-dot';
dot.style.backgroundColor = sig.hex;
const txt =
document.createElement('span');
txt.textContent = `${done}/${need}`;
item.appendChild(dot);
item.appendChild(txt);
dotsWrap.appendChild(item);
}
}
}

// update theme carousel in start menu
// shows theme name, lock cost & state
function updateThemePickerUI() {
const dict = getDict(app.lang);
const costs = [
0,
app.cfg.themeCost2,
app.cfg.themeCost3,
app.cfg.themeCost4,
];
const theme =
BOARD_THEMES[app.pickerIdx] ||
BOARD_THEMES[0];
const cost =
costs[app.pickerIdx] ?? theme.cost;
const isOwned =
cost === 0 ||
app.unlockedThemes.includes(theme.id);
const isCurrent =
app.activeTheme === theme.id;

el('btn-theme-prev').disabled =
app.pickerIdx <= 0;
el('btn-theme-next').disabled =
app.pickerIdx >=
BOARD_THEMES.length - 1;
el('txt-theme-name').textContent =
dict[`theme_${theme.id}`] || theme.id;

const buyBtn = el('btn-theme-buy');
if (isCurrent) {
buyBtn.textContent = dict.selected;
buyBtn.disabled = true;
} else if (isOwned) {
buyBtn.textContent = dict.free;
buyBtn.disabled = false;
} else {
buyBtn.textContent =
`${dict.buy} (${cost} 💎)`;
buyBtn.disabled = app.coins < cost;
}
}

// sync mode tabs in menu and drawer
// highlights active mode everywhere
function syncModeTabsUI() {
const isFree = app.mode === 'free';
el('tab-campaign').classList.toggle(
'active',
!isFree
);
el('tab-free').classList.toggle(
'active',
isFree
);
el(
'set-tab-campaign'
).classList.toggle('active', !isFree);
el('set-tab-free').classList.toggle(
'active',
isFree
);
el('free-net-panel').classList.toggle(
'hidden',
!isFree
);
}

// apply selected language to all DOM
// updates buttons, modals and labels
function applyLanguageUI() {
const dict = getDict(app.lang);
document.documentElement.lang =
app.lang;
el('txt-menu-title').textContent =
dict.title;
el('tab-campaign').textContent =
dict.modeCampaign;
el('tab-free').textContent =
dict.modeFree;
el('set-tab-campaign').textContent =
dict.modeCampaign;
el('set-tab-free').textContent =
dict.modeFree;
el('lbl-free-colors').textContent =
dict.colorsLabel;
el('lbl-free-grid').textContent =
dict.gridLabel;
el('btn-start').textContent =
dict.play;
el('txt-level-done').textContent =
dict.levelDone;
el('lbl-lv-score').textContent =
`${dict.score}:`;
el('lbl-lv-coins').textContent =
`${dict.coins}:`;
el('btn-next-level').textContent =
dict.nextLevel;
el('btn-watch-ad').textContent =
dict.watchAd;
el('btn-skip-ad').textContent =
dict.no;
el('txt-over-title').textContent =
dict.gameOver;
el('lbl-over-score').textContent =
`${dict.score}:`;
el('lbl-over-best').textContent =
`${dict.best}:`;
el('btn-restart').textContent =
dict.tryAgain;
el('btn-over-menu').textContent =
dict.toMenu;
el('txt-settings-title').textContent =
dict.settings;
el('txt-lang-label').textContent =
dict.langLabel;
el('btn-sound').textContent =
sound.soundEnabled
? dict.soundOn
: dict.soundOff;
el('txt-sound-vol').textContent =
dict.soundVol;
el('btn-music').textContent =
sound.musicEnabled
? dict.musicOn
: dict.musicOff;
el('txt-music-vol').textContent =
dict.musicVol;
el(
'btn-settings-restart'
).textContent = dict.restart;
el('btn-settings-menu').textContent =
dict.toMenu;
el('btn-open-debug').textContent =
dict.debugBtn;
el('txt-btn-undo').textContent =
dict.undo;
el('txt-btn-laser').textContent =
dict.laser;
el('txt-btn-teleport').textContent =
dict.teleport;

const langBtns =
document.querySelectorAll(
'.lang-btn'
);
langBtns.forEach((b) => {
b.classList.toggle(
'active',
b.dataset.lang === app.lang
);
});

syncModeTabsUI();
updateThemePickerUI();
updateBoosterUI();
updateHudUI();
}

// update bottom banner link and image
// uses custom url or default svg
function applyBottomBanner() {
const link = el('bottom-ad-link');
const img = el('bottom-ad-img');
link.href =
app.cfg.bottomUrl ||
'https://stand-with-ukraine.pp.ua';
if (app.cfg.bottomImg) {
img.src = app.cfg.bottomImg;
} else {
img.src =
'data:image/svg+xml;utf8,' +
encodeURIComponent(BOTTOM_BANNER_SVG);
}
}

// start active gameplay from menu
// hides overlays and begins loop
function startGameNow() {
sound.wake();
sound.startMusic();
el('menu-modal').classList.add(
'hidden'
);
el('level-modal').classList.add(
'hidden'
);
el('over-modal').classList.add(
'hidden'
);
el('ad-modal').classList.add(
'hidden'
);
el('settings-drawer').classList.add(
'hidden'
);
el('debug-drawer').classList.add(
'hidden'
);
if (
document.activeElement &&
document.activeElement.blur
) {
document.activeElement.blur();
}
setAppState('playing');
setupTable();
}

// wire all UI buttons and inputs
// runs once when page loads
function bindEvents() {
// build 3 language buttons in drawer
// switches dictionary on tap
const langGrid = el('lang-grid');
LANG_CODES.forEach((code) => {
const btn =
document.createElement('button');
btn.type = 'button';
btn.className = 'lang-btn';
btn.dataset.lang = code;
const up = code.toUpperCase();
btn.textContent =
code === 'uk' ? 'UA' : up;
btn.addEventListener('click', () => {
app.lang = code;
saveProfile();
applyLanguageUI();
});
langGrid.appendChild(btn);
});

// switch between campaign & free net
// works in menu and settings drawer
const setMode = (m, restartNow) => {
app.mode = m;
syncModeTabsUI();
saveProfile();
if (restartNow) {
setupTable();
} else {
updateHudUI();
}
};

el('tab-campaign').addEventListener(
'click',
() => setMode('campaign', false)
);
el('tab-free').addEventListener(
'click',
() => setMode('free', false)
);
el(
'set-tab-campaign'
).addEventListener('click', () =>
setMode('campaign', true)
);
el('set-tab-free').addEventListener(
'click',
() => setMode('free', true)
);

// wire free-net color count chips
// supports 4 to 8 signal colors
document
.querySelectorAll(
'#free-colors-row .chip-btn'
)
.forEach((btn) => {
btn.addEventListener('click', () => {
app.freeColors = Number(
btn.dataset.colors
);
document
.querySelectorAll(
'#free-colors-row .chip-btn'
)
.forEach((b) =>
b.classList.toggle(
'active',
b === btn
)
);
saveProfile();
});
});

// wire free-net board size chips
// supports 7x7, 8x8, and 9x9 grids
document
.querySelectorAll(
'#free-grid-row .chip-btn'
)
.forEach((btn) => {
btn.addEventListener('click', () => {
app.freeGrid = Number(
btn.dataset.grid
);
document
.querySelectorAll(
'#free-grid-row .chip-btn'
)
.forEach((b) =>
b.classList.toggle(
'active',
b === btn
)
);
saveProfile();
});
});

// navigate board themes in start menu
// unlocks or selects chosen pcb theme
el('btn-theme-prev').addEventListener(
'click',
() => {
if (app.pickerIdx > 0) {
app.pickerIdx--;
updateThemePickerUI();
}
}
);

el('btn-theme-next').addEventListener(
'click',
() => {
if (
app.pickerIdx <
BOARD_THEMES.length - 1
) {
app.pickerIdx++;
updateThemePickerUI();
}
}
);

el('btn-theme-buy').addEventListener(
'click',
() => {
const costs = [
0,
app.cfg.themeCost2,
app.cfg.themeCost3,
app.cfg.themeCost4,
];
const theme =
BOARD_THEMES[app.pickerIdx];
const cost =
costs[app.pickerIdx] ?? theme.cost;
const isOwned =
cost === 0 ||
app.unlockedThemes.includes(theme.id);
if (isOwned) {
app.activeTheme = theme.id;
saveProfile();
updateThemePickerUI();
} else if (app.coins >= cost) {
app.coins -= cost;
app.unlockedThemes.push(theme.id);
app.activeTheme = theme.id;
sound.playLevelWin();
saveProfile();
updateThemePickerUI();
updateHudUI();
}
}
);

// wire primary start & restart btns
// transitions state to playing
el('btn-start').addEventListener(
'click',
startGameNow
);
el('btn-next-level').addEventListener(
'click',
startGameNow
);
el('btn-restart').addEventListener(
'click',
startGameNow
);
el(
'btn-settings-restart'
).addEventListener(
'click',
startGameNow
);

// wire return-to-menu buttons
// opens title & theme shop modal
const openMenuModal = () => {
setAppState('title');
el('over-modal').classList.add(
'hidden'
);
el('settings-drawer').classList.add(
'hidden'
);
el('menu-modal').classList.remove(
'hidden'
);
updateThemePickerUI();
};
el('btn-over-menu').addEventListener(
'click',
openMenuModal
);
const sMenu = el('btn-settings-menu');
sMenu.addEventListener(
'click',
openMenuModal
);

// wire settings drawer controls
// manages audio and language options
el('btn-settings').addEventListener(
'click',
() => {
el(
'settings-drawer'
).classList.remove('hidden');
}
);

el(
'btn-close-settings'
).addEventListener('click', () => {
el('settings-drawer').classList.add(
'hidden'
);
});

el('btn-sound').addEventListener(
'click',
() => {
sound.soundEnabled =
!sound.soundEnabled;
saveProfile();
applyLanguageUI();
}
);

el('in-sound-vol').addEventListener(
'input',
(e) => {
const v = Number(e.target.value);
sound.soundVol = v / 100;
el('val-sound-vol').textContent =
`${v}%`;
saveProfile();
}
);

el('btn-music').addEventListener(
'click',
() => {
sound.musicEnabled =
!sound.musicEnabled;
if (sound.musicEnabled) {
sound.startMusic();
} else {
sound.stopMusic();
}
saveProfile();
applyLanguageUI();
}
);

el('in-music-vol').addEventListener(
'input',
(e) => {
const v = Number(e.target.value);
sound.musicVol = v / 100;
el('val-music-vol').textContent =
`${v}%`;
saveProfile();
}
);

// wire debug drawer inputs
// edits coins, level, costs & banner
el('btn-open-debug').addEventListener(
'click',
() => {
el('dbg-coins').value = String(
app.coins
);
el('dbg-level').value = String(
app.level
);
el('debug-drawer').classList.remove(
'hidden'
);
}
);

const closeDbg = el(
'btn-close-debug'
);
closeDbg.addEventListener(
'click',
() => {
el('debug-drawer').classList.add(
'hidden'
);
}
);

el('dbg-coins').addEventListener(
'input',
(e) => {
app.coins = Math.max(
0,
Number(e.target.value) || 0
);
saveProfile();
updateHudUI();
updateThemePickerUI();
}
);

el('dbg-level').addEventListener(
'change',
(e) => {
app.level = Math.max(
1,
Number(e.target.value) || 1
);
saveProfile();
setupTable();
}
);

const minClust = el(
'dbg-min-cluster'
);
minClust.addEventListener(
'input',
(e) => {
app.cfg.minCluster = Math.max(
3,
Number(e.target.value) || 7
);
}
);

el('dbg-resonance').addEventListener(
'input',
(e) => {
app.cfg.resonanceMin = Math.max(
5,
Number(e.target.value) || 10
);
}
);

el('dbg-cost-undo').addEventListener(
'input',
(e) => {
app.cfg.undoCost = Math.max(
0,
Number(e.target.value) || 0
);
updateBoosterUI();
}
);

el('dbg-cost-laser').addEventListener(
'input',
(e) => {
app.cfg.laserCost = Math.max(
0,
Number(e.target.value) || 0
);
updateBoosterUI();
}
);

el(
'dbg-cost-teleport'
).addEventListener('input', (e) => {
app.cfg.teleportCost = Math.max(
0,
Number(e.target.value) || 0
);
updateBoosterUI();
});

el('dbg-bottom-url').addEventListener(
'input',
(e) => {
app.cfg.bottomUrl =
e.target.value.trim();
applyBottomBanner();
}
);

el('dbg-bottom-img').addEventListener(
'input',
(e) => {
app.cfg.bottomImg =
e.target.value.trim();
applyBottomBanner();
}
);

// wire 3 bottom booster buttons
// undo, laser pulse, and teleport
el('btn-undo').addEventListener(
'click',
() => onBoosterClick('undo')
);
el('btn-laser').addEventListener(
'click',
() => onBoosterClick('laser')
);
el('btn-teleport').addEventListener(
'click',
() => onBoosterClick('teleport')
);

// wire ad modal buttons
// watch 3s video, pay coins, or skip
el('btn-watch-ad').addEventListener(
'click',
startAdCountdown
);

el('btn-pay-rescue').addEventListener(
'click',
() => {
if (app.coins >= app.cfg.rescueCost) {
app.coins -= app.cfg.rescueCost;
saveProfile();
el('ad-modal').classList.add(
'hidden'
);
performOverloadRescue();
}
}
);

el('btn-skip-ad').addEventListener(
'click',
() => {
if (app.adTimerId) {
clearInterval(app.adTimerId);
app.adTimerId = null;
}
el('ad-modal').classList.add(
'hidden'
);
if (
app.pendingAdAction === 'overload'
) {
setAppState('gameover');
sound.playGameOver();
el('val-over-score').textContent =
String(app.score);
el('val-over-best').textContent =
String(app.bestScore);
el('over-modal').classList.remove(
'hidden'
);
}
app.pendingAdAction = null;
}
);

// wire pointerdown on board canvas
// supports touch and mouse clicks
const bCanvas = el('board-canvas');
bCanvas.addEventListener(
'pointerdown',
(e) => {
e.preventDefault();
onBoardTap(e.clientX, e.clientY);
}
);

// wire keyboard shortcuts for game
// Enter or Space starts from menu
window.addEventListener(
'keydown',
(e) => {
if (
e.key === 'Enter' ||
e.key === ' '
) {
if (
app.state === 'title' ||
app.state === 'gameover'
) {
e.preventDefault();
startGameNow();
}
}
}
);
}

// run 60fps animation & render loop
// updates fox header, board & menu
function tick(ts) {
if (!app.lastTs) {
app.lastTs = ts;
}
const rawDt =
(ts - app.lastTs) / 1000;
app.lastTs = ts;
const dt = Math.min(
0.05,
Math.max(0, rawDt)
);

app.fox.time += dt;
if (app.fox.boostTimer > 0) {
app.fox.boostTimer = Math.max(
0,
app.fox.boostTimer - dt
);
}
const speedMul =
app.fox.boostTimer > 0
? app.fox.boostMode === 'rainbow'
? 6.0
: 4.0
: 1.0;
app.fox.scrollX += dt * 55 * speedMul;

// advance sliding wire move animation
// triggers finishMoveAt on arrival
if (app.movingAnim) {
app.movingAnim.progress +=
dt * app.movingAnim.speed;
if (app.movingAnim.progress >= 1) {
const done = app.movingAnim;
app.movingAnim = null;
finishMoveAt(
done.fromR,
done.fromC,
done.toR,
done.toC,
done.color
);
}
}

// decay preview bounce electric arcs
// removes finished arcs from list
for (
let i = app.bounceArcs.length - 1;
i >= 0;
i--
) {
app.bounceArcs[i].life -= dt;
if (app.bounceArcs[i].life <= 0) {
app.bounceArcs.splice(i, 1);
}
}

// decay discharge lightning bolts
// keeps bright flash for ~0.45s
for (
let i = app.lightningBolts.length - 1;
i >= 0;
i--
) {
app.lightningBolts[i].life -= dt;
if (app.lightningBolts[i].life <= 0) {
app.lightningBolts.splice(i, 1);
}
}

// update pooled spark particles
// moves and fades active sparks
for (
let i = 0;
i < app.particles.length;
i++
) {
const pt = app.particles[i];
if (!pt.active) {
continue;
}
pt.x += pt.vx * dt;
pt.y += pt.vy * dt;
pt.life -= dt;
if (pt.life <= 0) {
pt.active = false;
}
}

// draw top panoramic fox skate window
// renders moving stars, fox & trails
const foxCanvas = el('fox-canvas');
if (foxCanvas) {
const fCtx =
foxCanvas.getContext('2d');
drawFoxHeader(
fCtx,
foxCanvas.width,
foxCanvas.height,
app.fox
);
}

// draw main pcb intersection board
// renders wires, nodes & discharges
const bCanvas = el('board-canvas');
if (bCanvas) {
const bCtx =
bCanvas.getContext('2d');
drawBoardCanvas(
bCtx,
bCanvas.width,
bCanvas.height,
{
grid: app.grid,
previews: app.previews,
selected: app.selected,
time: app.fox.time,
themeId: app.activeTheme,
movingAnim: app.movingAnim,
bounceArcs: app.bounceArcs,
lightningBolts: app.lightningBolts,
particles: app.particles,
boosterMode: app.boosterMode,
}
);
}

// draw theme preview in start modal
// animates only while menu is open
if (app.state === 'title') {
const prevCanvas = el(
'theme-preview-canvas'
);
if (prevCanvas) {
const pCtx =
prevCanvas.getContext('2d');
const th =
BOARD_THEMES[app.pickerIdx] ||
BOARD_THEMES[0];
drawThemePreview(
pCtx,
prevCanvas.width,
prevCanvas.height,
th.id,
app.fox.time
);
}
}

requestAnimationFrame(tick);
}

// boot game, load save & check query
// skips title menu if ?autostart=1
function boot() {
loadProfile();
const idx = BOARD_THEMES.findIndex(
(t) => t.id === app.activeTheme
);
app.pickerIdx = idx >= 0 ? idx : 0;

bindEvents();
applyBottomBanner();
setupTable();
applyLanguageUI();

const params = new URLSearchParams(
window.location.search
);
if (params.get('autostart') === '1') {
startGameNow();
} else {
setAppState('title');
}
requestAnimationFrame(tick);
}

boot();
