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
light: '#e0ffff',
glow: 'rgba(0, 240, 255, 0.62)',
dark: '#042a33',
shape: 'ring',
},
{
id: 2,
key: 'cobalt',
hex: '#3b82f6',
light: '#dbeafe',
glow: 'rgba(59, 130, 246, 0.62)',
dark: '#0a193b',
shape: 'diamond',
},
{
id: 3,
key: 'emerald',
hex: '#00ff66',
light: '#dcfce7',
glow: 'rgba(0, 255, 102, 0.62)',
dark: '#042f1a',
shape: 'triangle',
},
{
id: 4,
key: 'violet',
hex: '#a855f7',
light: '#f3e8ff',
glow: 'rgba(168, 85, 247, 0.62)',
dark: '#270942',
shape: 'hex',
},
{
id: 5,
key: 'crimson',
hex: '#ff1e42',
light: '#ffe4e6',
glow: 'rgba(255, 30, 66, 0.62)',
dark: '#3b040c',
shape: 'star',
},
{
id: 6,
key: 'orange',
hex: '#ff6d00',
light: '#ffedd5',
glow: 'rgba(255, 109, 0, 0.62)',
dark: '#3b1504',
shape: 'bolt',
},
{
id: 7,
key: 'orchid',
hex: '#f472b6',
light: '#fdf2f8',
glow: 'rgba(244, 114, 182, 0.62)',
dark: '#380a28',
shape: 'chip',
},
{
id: 8,
key: 'platinum',
hex: '#e2e8f0',
light: '#ffffff',
glow: 'rgba(226, 232, 240, 0.65)',
dark: '#1e293b',
shape: 'spiral',
},
];

// list 4 unlockable pcb board themes
// default is green pcb + gold traces
export const BOARD_THEMES = [
{
id: 'obsidian',
cost: 0,
bg: '#062312',
bgInner: '#0c381e',
panel: '#082c17',
wire: '#c89b3c',
wireHi: '#f5d78e',
trace: '#144d2b',
socket: '#051a0d',
rim: '#d4a84f',
accent: '#00f0ff',
},
{
id: 'matrix',
cost: 40,
bg: '#080c14',
bgInner: '#101828',
panel: '#0d1422',
wire: '#c79538',
wireHi: '#f3cf7a',
trace: '#1c283d',
socket: '#060a10',
rim: '#d4a64a',
accent: '#00e676',
},
{
id: 'synthwave',
cost: 80,
bg: '#160724',
bgInner: '#260d3d',
panel: '#240e3a',
wire: '#d4945a',
wireHi: '#f7CBA4',
trace: '#381557',
socket: '#12051d',
rim: '#e0a96d',
accent: '#f472b6',
},
{
id: 'arctic',
cost: 120,
bg: '#071929',
bgInner: '#0e2942',
panel: '#102336',
wire: '#c9a24b',
wireHi: '#f7dca0',
trace: '#173c5e',
socket: '#061320',
rim: '#d6b25e',
accent: '#00f0ff',
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
