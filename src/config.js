// build stand-with-ukraine banner svg
// matches studio footer design
export const BOTTOM_BANNER_SVG =
'<svg xmlns=' +
'"http://www.w3.org/2000/svg" ' +
'viewBox="0 0 800 110">' +
'<rect width="800" height="110" ' +
'rx="4" fill="#ffd700"/>' +
'<rect width="800" height="74" ' +
'rx="4" fill="#0056b3"/>' +
'<text x="28" y="32" ' +
'font-family="sans-serif" ' +
'font-size="17" fill="#ffffff">' +
'Russia invaded Ukraine, killing ' +
'tens of thousands of civilians ' +
'and displacing millions more.' +
'</text>' +
'<text x="28" y="56" ' +
'font-family="sans-serif" ' +
'font-size="17" fill="#ffffff">' +
"It's a genocide. Please help us " +
'defend freedom, democracy and ' +
"Ukraine's right to exist." +
'</text>' +
'<text x="400" y="96" ' +
'font-family="sans-serif" ' +
'font-size="20" ' +
'font-weight="bold" ' +
'text-anchor="middle" ' +
'fill="#000000">' +
'Help Ukraine Now ➔' +
'</text></svg>';

// list 8 distinct neon signal types
// zero yellow and clear red/pink gap
export const SIGNALS = [
{
id: 1,
key: 'cyan',
hex: '#00f0ff',
light: '#d8feff',
glow: 'rgba(0, 240, 255, 0.55)',
dark: '#042a33',
shape: 'ring',
},
{
id: 2,
key: 'cobalt',
hex: '#3b82f6',
light: '#dbeafe',
glow: 'rgba(59, 130, 246, 0.55)',
dark: '#0a193b',
shape: 'diamond',
},
{
id: 3,
key: 'emerald',
hex: '#00e676',
light: '#d1fae5',
glow: 'rgba(0, 230, 118, 0.55)',
dark: '#042f1a',
shape: 'triangle',
},
{
id: 4,
key: 'violet',
hex: '#a855f7',
light: '#f3e8ff',
glow: 'rgba(168, 85, 247, 0.55)',
dark: '#270942',
shape: 'hex',
},
{
id: 5,
key: 'crimson',
hex: '#ef233c',
light: '#ffe4e6',
glow: 'rgba(239, 35, 60, 0.55)',
dark: '#3b040c',
shape: 'star',
},
{
id: 6,
key: 'orange',
hex: '#f97316',
light: '#ffedd5',
glow: 'rgba(249, 115, 22, 0.55)',
dark: '#3b1504',
shape: 'bolt',
},
{
id: 7,
key: 'orchid',
hex: '#f472b6',
light: '#fdf2f8',
glow: 'rgba(244, 114, 182, 0.55)',
dark: '#380a28',
shape: 'chip',
},
{
id: 8,
key: 'platinum',
hex: '#cbd5e1',
light: '#ffffff',
glow: 'rgba(226, 232, 240, 0.6)',
dark: '#1e293b',
shape: 'spiral',
},
];

// list 4 unlockable pcb board themes
// bought with coins in start menu
export const BOARD_THEMES = [
{
id: 'obsidian',
cost: 0,
bg: '#090d16',
bgInner: '#0f172a',
panel: '#121829',
wire: '#1e293b',
trace: '#152033',
socket: '#090f1d',
rim: '#475569',
accent: '#00f0ff',
},
{
id: 'matrix',
cost: 40,
bg: '#04120b',
bgInner: '#082216',
panel: '#0a2416',
wire: '#14492b',
trace: '#0c301c',
socket: '#05170e',
rim: '#10b981',
accent: '#00e676',
},
{
id: 'synthwave',
cost: 80,
bg: '#130720',
bgInner: '#210c38',
panel: '#240e3a',
wire: '#451a6e',
trace: '#2d104a',
socket: '#150724',
rim: '#c084fc',
accent: '#f472b6',
},
{
id: 'arctic',
cost: 120,
bg: '#08131f',
bgInner: '#102438',
panel: '#102336',
wire: '#1e4263',
trace: '#15304a',
socket: '#0a1826',
rim: '#38bdf8',
accent: '#e0fbfc',
},
];

// set default game tuning values
// editable live inside debug drawer
export const DEFAULT_CONFIG = {
minCluster: 7,
spawnPerTurn: 3,
baseScore7: 70,
linearStep: 25,
quadStep: 10,
resonanceMin: 10,
resonanceBonus: 20,
undoCost: 15,
laserCost: 25,
teleportCost: 30,
rescueCost: 50,
rescueClearCount: 10,
themeCost2: 40,
themeCost3: 80,
themeCost4: 120,
bottomUrl:
'https://stand-with-ukraine.pp.ua',
bottomImg: '',
};

// get streak multiplier from count
// scales 1x -> 1.5x -> 2x -> 3x
export function getStreakMult(
streak
) {
if (streak <= 1) {
return 1.0;
}
if (streak === 2) {
return 1.5;
}
if (streak === 3) {
return 2.0;
}
return 3.0;
}

// compute score and coins for chain
// follows gdd progressive math
export function calcChainReward(
count,
extraBurned,
streak,
isBonusLevel,
cfg = DEFAULT_CONFIG
) {
const n = Math.max(
cfg.minCluster,
count
);
const d = n - cfg.minCluster;
let rawChain =
cfg.baseScore7 +
d * cfg.linearStep +
d * d * cfg.quadStep;
if (n === 12) {
rawChain = 450;
}
const mult = getStreakMult(streak);
const chainPts = Math.round(
rawChain * mult
);
const extraPts =
extraBurned * cfg.resonanceBonus;
const totalPoints =
chainPts + extraPts;

// pick coin reward by chain size
// doubles on every 5th bonus level
let coins = 1;
if (n === 8) {
coins = 2;
} else if (n === 9) {
coins = 4;
} else if (n >= 10) {
coins = Math.min(
15,
6 + (n - 10) * 2
);
}
if (isBonusLevel) {
coins *= 2;
}
return {
points: totalPoints,
chainPoints: chainPts,
resonancePoints: extraPts,
coins,
mult,
};
}

// build campaign level spec by index
// sets grid size, colors, and goal
export function getLevelSpec(level) {
const lv = Math.max(1, level);
const isBonus = lv % 5 === 0;

// pick grid size and color count
// ramps quickly from 4 to 7-8 colors
let gridSize = 9;
let colors = 7;
let startNodes = 10;

if (isBonus) {
gridSize = 9;
colors = 8;
startNodes = 12;
} else if (lv === 1) {
gridSize = 7;
colors = 4;
startNodes = 8;
} else if (lv === 2 || lv === 3) {
gridSize = 8;
colors = 5;
startNodes = 9;
} else if (lv === 4 || lv === 6) {
gridSize = 9;
colors = 6;
startNodes = 11;
} else {
gridSize = 9;
colors = 7;
startNodes = Math.min(
16,
11 + Math.floor(lv / 4)
);
}

// pick goal type A, B, or C
// bonus levels use short fast goals
if (isBonus) {
return {
level: lv,
gridSize,
colors,
startNodes,
isBonus: true,
goalType: 'chains',
targetChains: 2,
targetScore: 0,
colorTargets: null,
minComboSize: 0,
levelCoinBonus: 20,
};
}

const mod = lv % 3;
if (mod === 1) {
const chains =
lv === 1
? 2
: Math.min(
6,
2 + Math.floor(lv / 3)
);
return {
level: lv,
gridSize,
colors,
startNodes,
isBonus: false,
goalType: 'chains',
targetChains: chains,
targetScore: 0,
colorTargets: null,
minComboSize: 0,
levelCoinBonus: 8 + lv * 2,
};
}

if (mod === 2) {
const scoreGoal =
200 + Math.floor(lv * 85);
return {
level: lv,
gridSize,
colors,
startNodes,
isBonus: false,
goalType: 'score',
targetChains: 0,
targetScore: scoreGoal,
colorTargets: null,
minComboSize: 0,
levelCoinBonus: 10 + lv * 2,
};
}

// type C: color chains or 9+ rainbow
// alternates between color and size
if (lv >= 9 && lv % 6 === 3) {
return {
level: lv,
gridSize,
colors,
startNodes,
isBonus: false,
goalType: 'rainbow',
targetChains: 1,
targetScore: 0,
colorTargets: null,
minComboSize: 9,
levelCoinBonus: 14 + lv * 2,
};
}

const c1 = ((lv - 1) % colors) + 1;
const c2 = (lv % colors) + 1;
return {
level: lv,
gridSize,
colors,
startNodes,
isBonus: false,
goalType: 'colors',
targetChains: 2,
targetScore: 0,
colorTargets: {
[c1]: 1,
[c2]: 1,
},
minComboSize: 0,
levelCoinBonus: 12 + lv * 2,
};
}
