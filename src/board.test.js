import test from 'node:test';
import assert from 'node:assert';
import {
calcChainReward,
getLevelSpec,
} from './config.js';
import {
createEmptyGrid,
findWirePath,
findAllClusters,
resolveDischarges,
bouncePreviewIfHit,
eraseRandomNodes,
} from './board.js';

// test bfs pathfinding on pcb wires
// checks open route and blocked route
test('bfs wire pathfinding', () => {
const g = createEmptyGrid(7);
g[0][0] = 1;
const p1 = findWirePath(
g,
0,
0,
0,
3
);
assert.equal(p1.length, 4);

// block direct row and check detour
// signal must go around occupied node
g[0][1] = 2;
const p2 = findWirePath(
g,
0,
0,
0,
2
);
assert.equal(p2.length, 5);

// seal start node completely
// bfs must return null when trapped
g[1][0] = 3;
const p3 = findWirePath(
g,
0,
0,
2,
2
);
assert.equal(p3, null);
});

// test 7+ cluster and 10+ resonance
// checks snake shape and full wipe
test('7+ chain & 10+ wipe', () => {
const g = createEmptyGrid(9);
const snake = [
[1, 1],
[1, 2],
[1, 3],
[2, 3],
[3, 3],
[3, 4],
[4, 4],
];
for (const [r, c] of snake) {
g[r][c] = 2;
}
const clusters = findAllClusters(g);
assert.equal(clusters.length, 1);
assert.equal(clusters[0].size, 7);

const res = resolveDischarges(
g,
1,
false
);
assert.equal(res.triggered, true);
assert.equal(res.totalPoints, 70);
assert.equal(res.totalCoins, 1);
assert.equal(g[1][1], 0);
});

// test 10+ resonance extra node burn
// burns isolated nodes of same color
test('10+ color resonance', () => {
const g = createEmptyGrid(9);
for (let c = 0; c < 9; c++) {
g[0][c] = 4;
}
g[1][0] = 4;
g[8][8] = 4;
g[7][7] = 4;
g[5][5] = 1;

const res = resolveDischarges(
g,
1,
false
);
assert.equal(res.triggered, true);
assert.equal(res.hasResonance, true);
assert.equal(res.maxChainSize, 10);
assert.equal(
res.totalPoints,
235 + 2 * 20
);
assert.equal(g[8][8], 0);
assert.equal(g[7][7], 0);
assert.equal(g[5][5], 1);
});

// test preview ring bounce on step
// relocates ring to free intersection
test('preview ring bounce', () => {
const g = createEmptyGrid(7);
const previews = [
{ r: 2, c: 2, color: 3 },
{ r: 4, c: 4, color: 1 },
];
const arc = bouncePreviewIfHit(
g,
previews,
2,
2,
() => 0
);
assert.ok(arc);
assert.equal(arc.fromR, 2);
assert.equal(arc.fromC, 2);
assert.notEqual(
`${previews[0].r},${previews[0].c}`,
'2,2'
);
});

// test scoring math and bonus levels
// verifies gdd numbers for 7,8,9,10
test('scoring and campaign', () => {
const r7 = calcChainReward(
7,
0,
1,
false
);
assert.equal(r7.points, 70);
const r8 = calcChainReward(
8,
0,
1,
false
);
assert.equal(r8.points, 105);
const r9 = calcChainReward(
9,
0,
1,
false
);
assert.equal(r9.points, 160);
const r10 = calcChainReward(
10,
0,
1,
false
);
assert.equal(r10.points, 235);
const lv5 = getLevelSpec(5);
assert.equal(lv5.isBonus, true);
assert.equal(lv5.colors, 8);

const g = createEmptyGrid(9);
for (let i = 0; i < 15; i++) {
g[Math.floor(i / 9)][i % 9] = 1;
}
const del = eraseRandomNodes(g, 10);
assert.equal(del.length, 10);
});
