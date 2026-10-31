/* Pure game rules, shared by the browser and Node.js tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Mines = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LEVELS = {easy: {rows: 9, cols: 9, mines: 10}, medium: {rows: 16, cols: 16, mines: 40}, hard: {rows: 16, cols: 30, mines: 99}};
  class Game {
    constructor(rows, cols, mines, random = Math.random) {
      if (![rows, cols, mines].every(Number.isInteger) || rows < 3 || cols < 3 || mines < 1 || mines > rows * cols - 9) throw new RangeError('Invalid board dimensions or mine count');
      this.rows = rows; this.cols = cols; this.mineCount = mines; this.random = random;
      this.cells = Array.from({length: rows * cols}, () => ({mine: false, open: false, flag: false, count: 0}));
      this.status = 'ready'; this.openCount = 0; this.flags = 0; this.exploded = -1;
    }
    neighbors(index) {
      const r = Math.floor(index / this.cols), c = index % this.cols, result = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        if (r + dr >= 0 && r + dr < this.rows && c + dc >= 0 && c + dc < this.cols) result.push((r + dr) * this.cols + c + dc);
      }
      return result;
    }
    plant(first) {
      const excluded = new Set([first, ...this.neighbors(first)]);
      const pool = this.cells.map((_, i) => i).filter(i => !excluded.has(i));
      for (let i = 0; i < this.mineCount; i++) {
        const j = i + Math.floor(this.random() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
        this.cells[pool[i]].mine = true;
      }
      this.cells.forEach((cell, i) => {cell.count = this.neighbors(i).filter(n => this.cells[n].mine).length;});
      this.status = 'playing';
    }
    toggleFlag(index) {
      const cell = this.cells[index];
      if (!cell || cell.open || this.status === 'won' || this.status === 'lost') return false;
      if (!cell.flag && this.flags >= this.mineCount) return false;
      cell.flag = !cell.flag; this.flags += cell.flag ? 1 : -1; return true;
    }
    reveal(index) {
      const cell = this.cells[index];
      if (!cell || cell.flag || this.status === 'won' || this.status === 'lost') return false;
      if (cell.open) return this.chord(index);
      if (this.status === 'ready') this.plant(index);
      this.openMany([index]); return true;
    }
    openMany(indices) {
      const queue = [...indices];
      while (queue.length && this.status === 'playing') {
        const i = queue.pop(), cell = this.cells[i];
        if (cell.open || cell.flag) continue;
        cell.open = true;
        if (cell.mine) {this.exploded = i; this.status = 'lost'; return;}
        this.openCount++;
        if (!cell.count) queue.push(...this.neighbors(i).filter(n => !this.cells[n].open && !this.cells[n].flag));
      }
      if (this.openCount === this.cells.length - this.mineCount) {
        this.status = 'won';
        this.cells.forEach(c => {if (c.mine) c.flag = true;});
        this.flags = this.mineCount;
      }
    }
    chord(index) {
      const cell = this.cells[index];
      if (!cell || !cell.open || !cell.count || this.status !== 'playing') return false;
      const adjacent = this.neighbors(index);
      if (adjacent.filter(i => this.cells[i].flag).length !== cell.count) return false;
      this.openMany(adjacent.filter(i => !this.cells[i].open && !this.cells[i].flag)); return true;
    }
  }
  return {Game, LEVELS};
});
