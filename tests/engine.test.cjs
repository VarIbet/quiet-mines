const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Game, LEVELS} = require('../engine.js');
function rng(seed) {return () => {seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296;};}
function fixture(mines) {
  const game = new Game(5, 5, mines.length);
  mines.forEach(i => {game.cells[i].mine = true;});
  game.cells.forEach((c, i) => {c.count = game.neighbors(i).filter(n => game.cells[n].mine).length;});
  game.status = 'playing'; return game;
}
test('first click and its neighbors are safe at corners, edges and center across every level', () => {
  for (const cfg of Object.values(LEVELS)) for (const first of [0, cfg.cols - 1, cfg.cols, Math.floor(cfg.rows / 2) * cfg.cols + Math.floor(cfg.cols / 2), cfg.rows * cfg.cols - 1]) for (let seed = 0; seed < 20; seed++) {
    const g = new Game(cfg.rows, cfg.cols, cfg.mines, rng(seed)); g.reveal(first);
    assert.notEqual(g.status, 'lost'); assert.equal(g.cells.filter(c => c.mine).length, cfg.mines);
    for (const i of [first, ...g.neighbors(first)]) assert.equal(g.cells[i].mine, false);
    g.cells.forEach((c, i) => assert.equal(c.count, g.neighbors(i).filter(n => g.cells[n].mine).length));
  }
});
test('neighbor lookup does not wrap at board edges', () => {const g = new Game(9, 9, 10); assert.deepEqual(g.neighbors(0), [1, 9, 10]); assert.equal(g.neighbors(8).length, 3); assert.equal(g.neighbors(40).length, 8);});
test('flags cannot exceed mine count, and flagged first click does not start the game', () => {
  const g = new Game(9, 9, 10); for (let i = 0; i < 10; i++) assert.equal(g.toggleFlag(i), true);
  assert.equal(g.toggleFlag(10), false); assert.equal(g.reveal(0), false); assert.equal(g.status, 'ready');
  g.toggleFlag(0); assert.equal(g.flags, 9); g.reveal(0); assert.notEqual(g.status, 'ready');
});
test('flood fill opens safe area, wins and auto-flags remaining mines', () => {
  const g = fixture([0]); g.reveal(24); assert.equal(g.status, 'won'); assert.equal(g.openCount, 24); assert.equal(g.flags, 1); assert.equal(g.cells[0].flag, true);
});
test('mine hit loses and ended games reject changes', () => {
  const g = fixture([0, 1]); g.reveal(0); assert.equal(g.status, 'lost'); assert.equal(g.exploded, 0);
  const count = g.openCount; assert.equal(g.reveal(24), false); assert.equal(g.toggleFlag(1), false); assert.equal(g.openCount, count);
});
test('correct chord clears neighbors; incorrect flags can cause a loss', () => {
  const g = fixture([0, 4, 20, 24]); g.reveal(6); assert.equal(g.cells[6].count, 1);
  assert.equal(g.chord(6), false); g.toggleFlag(0); assert.equal(g.chord(6), true); assert.notEqual(g.status, 'lost'); assert.equal(g.cells[1].open, true);
  const bad = fixture([0, 4, 20, 24]); bad.reveal(6); bad.toggleFlag(1); bad.chord(6); assert.equal(bad.status, 'lost');
});
test('opening a number never automatically opens adjacent mines', () => {const g = fixture([0, 4, 20, 24]); g.reveal(6); assert.equal(g.openCount, 1); assert.equal(g.status, 'playing'); assert.equal(g.toggleFlag(6), false);});
test('invalid board settings are rejected', () => {for (const args of [[2, 9, 1], [9, 9, 73], [9, 9, 0], [9.5, 9, 10]]) assert.throws(() => new Game(...args), RangeError);});
