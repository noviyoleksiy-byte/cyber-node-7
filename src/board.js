import {
DEFAULT_CONFIG,
calcChainReward,
} from './config.js';

// create empty square board matrix
// fills size x size sockets with 0
export function createEmptyGrid(
size = 9
) {
const grid = [];
for (let r = 0; r < size; r++) {
const row = [];
for (let c = 0; c < size; c++) {
row.push(0);
}
grid.push(row);
}
return grid;
}

// clone 2d board matrix deeply
// used for undo snapshots and tests
export function cloneGrid(grid) {
return grid.map((row) =>
row.slice()
);
}

// list all empty sockets on board
// optionally skips preview sockets
export function getEmptySockets(
grid,
skipPreviews = []
) {
const size = grid.length;
const skipSet = new Set(
skipPreviews.map(
(p) => `${p.r},${p.c}`
)
);
const list = [];
for (let r = 0; r < size; r++) {
for (let c = 0; c < size; c++) {
if (
grid[r][c] === 0 &&
!skipSet.has(`${r},${c}`)
) {
list.push({ r, c });
}
}
}
return list;
}

// pick random int in [0, max - 1]
// accepts custom rng for unit tests
export function randInt(
max,
rng = Math.random
) {
return Math.floor(rng() * max);
}

// find shortest path along free wires
// uses bfs over 4-way pcb bus lines
export function findWirePath(
grid,
r0,
c0,
r1,
c1
) {
const size = grid.length;
if (
r0 < 0 ||
c0 < 0 ||
r1 < 0 ||
c1 < 0 ||
r0 >= size ||
c0 >= size ||
r1 >= size ||
c1 >= size
) {
return null;
}
if (r0 === r1 && c0 === c1) {
return null;
}
if (grid[r1][c1] !== 0) {
return null;
}

const visited = createEmptyGrid(size);
const parent = {};
const queue = [{ r: r0, c: c0 }];
visited[r0][c0] = 1;
const dirs = [
[-1, 0],
[1, 0],
[0, -1],
[0, 1],
];

// walk queue level by level
// stops as soon as target socket hit
let head = 0;
while (head < queue.length) {
const cur = queue[head++];
if (cur.r === r1 && cur.c === c1) {
const path = [];
let key = `${r1},${c1}`;
while (key) {
const [pr, pc] = key
.split(',')
.map(Number);
path.push({ r: pr, c: pc });
key = parent[key];
}
path.reverse();
return path;
}

for (let i = 0; i < 4; i++) {
const nr = cur.r + dirs[i][0];
const nc = cur.c + dirs[i][1];
if (
nr >= 0 &&
nc >= 0 &&
nr < size &&
nc < size &&
!visited[nr][nc] &&
grid[nr][nc] === 0
) {
visited[nr][nc] = 1;
parent[`${nr},${nc}`] =
`${cur.r},${cur.c}`;
queue.push({ r: nr, c: nc });
}
}
}
return null;
}

// find all connected color groups
// flood-fills orthogonal bus wires
export function findAllClusters(
grid
) {
const size = grid.length;
const seen = createEmptyGrid(size);
const clusters = [];
const dirs = [
[-1, 0],
[1, 0],
[0, -1],
[0, 1],
];

for (let r = 0; r < size; r++) {
for (let c = 0; c < size; c++) {
const color = grid[r][c];
if (!color || seen[r][c]) {
continue;
}
const cells = [];
const stack = [{ r, c }];
seen[r][c] = 1;

// collect all touching same-color
// forms snake, cross, ring, or branch
while (stack.length > 0) {
const cur = stack.pop();
cells.push(cur);
for (let i = 0; i < 4; i++) {
const nr = cur.r + dirs[i][0];
const nc = cur.c + dirs[i][1];
if (
nr >= 0 &&
nc >= 0 &&
nr < size &&
nc < size &&
!seen[nr][nc] &&
grid[nr][nc] === color
) {
seen[nr][nc] = 1;
stack.push({ r: nr, c: nc });
}
}
}
clusters.push({
color,
size: cells.length,
cells,
});
}
}
return clusters;
}

// build lookup of group size per node
// drives 2-4, 5, and 6-node bus glow
export function getClusterSizeMap(
grid
) {
const size = grid.length;
const map = createEmptyGrid(size);
const list = findAllClusters(grid);
for (
let i = 0;
i < list.length;
i++
) {
const grp = list[i];
for (
let j = 0;
j < grp.cells.length;
j++
) {
const pt = grp.cells[j];
map[pt.r][pt.c] = grp.size;
}
}
return map;
}

// check and clear clusters of 7+
// triggers 10+ color resonance wipe
export function resolveDischarges(
grid,
streak = 1,
isBonusLevel = false,
cfg = DEFAULT_CONFIG
) {
const minC = cfg.minCluster || 7;
const resMin =
cfg.resonanceMin || 10;
const all = findAllClusters(grid);
const active = all.filter(
(g) => g.size >= minC
);
if (active.length === 0) {
return {
triggered: false,
totalPoints: 0,
totalCoins: 0,
maxChainSize: 0,
hasResonance: false,
hasRainbow: false,
dischargedGroups: [],
resonanceArcs: [],
};
}

// mark main chain sockets for removal
// tracks which colors hit 10+ combo
const toClear = createEmptyGrid(
grid.length
);
const resColors = new Set();
let maxChainSize = 0;

for (
let i = 0;
i < active.length;
i++
) {
const grp = active[i];
if (grp.size > maxChainSize) {
maxChainSize = grp.size;
}
if (grp.size >= resMin) {
resColors.add(grp.color);
}
for (
let j = 0;
j < grp.cells.length;
j++
) {
const pt = grp.cells[j];
toClear[pt.r][pt.c] = 1;
}
}

// find extra sockets burned by 10+
// arcs lightning from chain to extras
const extraByColor = {};
const resonanceArcs = [];
const size = grid.length;

if (resColors.size > 0) {
for (let r = 0; r < size; r++) {
for (let c = 0; c < size; c++) {
const col = grid[r][c];
if (
col > 0 &&
resColors.has(col) &&
!toClear[r][c]
) {
toClear[r][c] = 2;
if (!extraByColor[col]) {
extraByColor[col] = [];
}
extraByColor[col].push({ r, c });
}
}
}
}

// calculate points and coins earned
// sums each discharged chain reward
let totalPoints = 0;
let totalCoins = 0;
const dischargedGroups = [];
const usedResColor = new Set();

for (
let i = 0;
i < active.length;
i++
) {
const grp = active[i];
let extraList = [];
if (
grp.size >= resMin &&
!usedResColor.has(grp.color)
) {
usedResColor.add(grp.color);
extraList =
extraByColor[grp.color] || [];
const anchor = grp.cells[0];
for (
let k = 0;
k < extraList.length;
k++
) {
resonanceArcs.push({
fromR: anchor.r,
fromC: anchor.c,
toR: extraList[k].r,
toC: extraList[k].c,
color: grp.color,
});
}
}
const rw = calcChainReward(
grp.size,
extraList.length,
streak,
isBonusLevel,
cfg
);
totalPoints += rw.points;
totalCoins += rw.coins;
dischargedGroups.push({
color: grp.color,
size: grp.size,
cells: grp.cells,
extraCells: extraList,
points: rw.points,
coins: rw.coins,
isResonance: grp.size >= resMin,
isRainbow: grp.size >= 9,
});
}

// clear all burned nodes from board
// mutates grid in place after math
for (let r = 0; r < size; r++) {
for (let c = 0; c < size; c++) {
if (toClear[r][c]) {
grid[r][c] = 0;
}
}
}

return {
triggered: true,
totalPoints,
totalCoins,
maxChainSize,
hasResonance: resColors.size > 0,
hasRainbow: maxChainSize >= 9,
dischargedGroups,
resonanceArcs,
};
}

// generate 3 preview target rings
// places rings on free intersections
export function rollNextPreviews(
grid,
colorCount,
count = 3,
rng = Math.random
) {
const empty = getEmptySockets(grid);
const previews = [];
const maxPick = Math.min(
count,
empty.length
);
for (let i = 0; i < maxPick; i++) {
const idx = randInt(
empty.length,
rng
);
const spot = empty.splice(idx, 1)[0];
const color =
1 + randInt(colorCount, rng);
previews.push({
r: spot.r,
c: spot.c,
color,
});
}
return previews;
}

// bounce preview ring if stepped on
// moves ring to another free socket
export function bouncePreviewIfHit(
grid,
previews,
targetR,
targetC,
rng = Math.random
) {
const hitIdx = previews.findIndex(
(p) =>
p.r === targetR && p.c === targetC
);
if (hitIdx === -1) {
return null;
}
const hitRing = previews[hitIdx];
const others = previews.filter(
(_, i) => i !== hitIdx
);
const free = getEmptySockets(
grid,
others
).filter(
(s) =>
s.r !== targetR || s.c !== targetC
);
if (free.length === 0) {
previews.splice(hitIdx, 1);
return null;
}
const pick =
free[randInt(free.length, rng)];
previews[hitIdx] = {
r: pick.r,
c: pick.c,
color: hitRing.color,
};
return {
fromR: targetR,
fromC: targetC,
toR: pick.r,
toC: pick.c,
color: hitRing.color,
};
}

// spawn preview signals onto board
// fills 3 preview sockets with nodes
export function spawnFromPreviews(
grid,
previews,
colorCount,
rng = Math.random
) {
const spawned = [];
for (
let i = 0;
i < previews.length;
i++
) {
const p = previews[i];
if (grid[p.r][p.c] === 0) {
grid[p.r][p.c] = p.color;
spawned.push({
r: p.r,
c: p.c,
color: p.color,
});
} else {
const free = getEmptySockets(grid);
if (free.length > 0) {
const s =
free[randInt(free.length, rng)];
grid[s.r][s.c] = p.color;
spawned.push({
r: s.r,
c: s.c,
color: p.color,
});
}
}
}
const nextPreviews = rollNextPreviews(
grid,
colorCount,
DEFAULT_CONFIG.spawnPerTurn,
rng
);
return {
spawned,
nextPreviews,
};
}

// erase up to N random nodes on board
// used by overload rescue ad prompt
export function eraseRandomNodes(
grid,
count = 10,
rng = Math.random
) {
const size = grid.length;
const occupied = [];
for (let r = 0; r < size; r++) {
for (let c = 0; c < size; c++) {
if (grid[r][c] > 0) {
occupied.push({
r,
c,
color: grid[r][c],
});
}
}
}
const removed = [];
const limit = Math.min(
count,
occupied.length
);
for (let i = 0; i < limit; i++) {
const idx = randInt(
occupied.length,
rng
);
const item = occupied.splice(
idx,
1
)[0];
grid[item.r][item.c] = 0;
removed.push(item);
}
return removed;
}
