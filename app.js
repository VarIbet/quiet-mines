(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const board = $('board'), message = $('message'), buttons = [...document.querySelectorAll('[data-level]')];
  const read = (key) => {try {return localStorage.getItem('quiet-mines.' + key);} catch {return null;}};
  const write = (key, value) => {try {localStorage.setItem('quiet-mines.' + key, value);} catch { /* Private or restricted storage: game still works. */ }};
  let level = 'easy', game, flagMode = false, timer = null, started = 0, elapsed = 0, focusIndex = 0, cellButtons = [];
  let pressTimer = null, pressIndex = -1, suppressClick = -1, pressPoint = null;
  const pad = n => String(n).padStart(3, '0');
  function stopClock() {if (timer !== null) {clearInterval(timer); timer = null;}}
  function updateClock() {elapsed = Math.floor((performance.now() - started) / 1000); $('timer').textContent = pad(elapsed);}
  function cancelPress() {clearTimeout(pressTimer); pressTimer = null; pressIndex = -1;}
  function showBest() {const best = read('best.' + level); $('best').textContent = best !== null && Number.isFinite(Number(best)) ? best + ' s' : '—';}
  function reset(next = level) {
    stopClock(); cancelPress(); suppressClick = -1; level = next;
    const cfg = Mines.LEVELS[level]; game = new Mines.Game(cfg.rows, cfg.cols, cfg.mines);
    elapsed = 0; focusIndex = 0; $('timer').textContent = '000';
    board.style.gridTemplateColumns = `repeat(${cfg.cols}, var(--size))`;
    board.setAttribute('aria-rowcount', cfg.rows); board.setAttribute('aria-colcount', cfg.cols);
    board.replaceChildren(); cellButtons = [];
    for (let r = 0; r < cfg.rows; r++) {
      const row = document.createElement('div'); row.className = 'row'; row.setAttribute('role', 'row');
      for (let c = 0; c < cfg.cols; c++) {
        const index = r * cfg.cols + c, cell = document.createElement('button');
        cell.className = 'cell'; cell.type = 'button'; cell.dataset.index = index; cell.tabIndex = index ? -1 : 0;
        cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-rowindex', r + 1); cell.setAttribute('aria-colindex', c + 1);
        row.append(cell); cellButtons.push(cell);
      }
      board.append(row);
    }
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === level)));
    $('board-info').textContent = `${cfg.rows} × ${cfg.cols} / ${cfg.mines} MINES`;
    board.parentElement.scrollLeft = 0; showBest(); render();
  }
  function render() {
    const ended = game.status === 'lost' || game.status === 'won';
    game.cells.forEach((cell, i) => {
      const b = cellButtons[i], showMine = ended && cell.mine && !cell.flag, wrong = ended && cell.flag && !cell.mine;
      b.className = ['cell', cell.open && 'open', cell.flag && 'flag', showMine && 'mine', wrong && 'wrong', game.exploded === i && 'exploded', ended && 'ended'].filter(Boolean).join(' ');
      b.textContent = wrong ? '×' : cell.flag ? '⚑' : showMine ? '✹' : cell.open && cell.count ? cell.count : '';
      b.dataset.count = cell.open && !cell.mine ? cell.count : '';
      b.setAttribute('aria-label', `${Math.floor(i / game.cols) + 1} 行 ${i % game.cols + 1} 列，${wrong ? '错误标记' : cell.flag ? '已插旗' : showMine ? '地雷' : cell.open ? cell.count ? '附近 ' + cell.count + ' 颗雷' : '空白' : '未翻开'}`);
    });
    $('mines').textContent = pad(game.mineCount - game.flags);
    $('symbol').textContent = game.status === 'won' ? '✓' : game.status === 'lost' ? '✧' : '✳';
    message.className = 'game-message' + (game.status === 'won' ? ' win' : game.status === 'lost' ? ' loss' : '');
    message.textContent = game.status === 'won' ? `漂亮！用 ${elapsed} 秒，排除了所有不确定。` : game.status === 'lost' ? '差一点点。深呼吸，再来一局。' : game.status === 'ready' ? '从任意一格开始，第一步总是安全的。' : flagMode ? '插旗模式已开启，点击格子即可标记。' : '不急，数字会告诉你下一步。';
  }
  function act(index, flag = false) {
    const before = game.status;
    if (flag) game.toggleFlag(index); else game.reveal(index);
    if (before === 'ready' && game.status !== 'ready') {started = performance.now(); timer = setInterval(updateClock, 200);}
    if ((game.status === 'won' || game.status === 'lost') && before !== 'won' && before !== 'lost') {
      updateClock(); stopClock();
      if (game.status === 'won') {
        const best = read('best.' + level);
        if (best === null || !Number.isFinite(Number(best)) || elapsed < Number(best)) write('best.' + level, elapsed);
        showBest();
      }
    }
    render();
  }
  function indexOf(target) {const cell = target.closest('.cell'); return cell && board.contains(cell) ? Number(cell.dataset.index) : null;}
  function focus(index) {cellButtons[focusIndex].tabIndex = -1; focusIndex = index; cellButtons[index].tabIndex = 0; cellButtons[index].focus();}
  board.addEventListener('focusin', e => {const index = indexOf(e.target); if (index !== null) {cellButtons[focusIndex].tabIndex = -1; focusIndex = index; cellButtons[index].tabIndex = 0;}});
  board.addEventListener('click', e => {
    const index = indexOf(e.target); if (index === null) return;
    if (suppressClick === index) {suppressClick = -1; return;}
    cancelPress(); act(index, flagMode && !game.cells[index].open);
  });
  board.addEventListener('contextmenu', e => {e.preventDefault(); const index = indexOf(e.target); if (index !== null && suppressClick !== index) act(index, true); cancelPress();});
  board.addEventListener('pointerdown', e => {
    suppressClick = -1;
    if (e.pointerType === 'mouse' || e.button !== 0) return;
    const index = indexOf(e.target); if (index === null) return;
    cancelPress(); pressIndex = index; pressPoint = [e.clientX, e.clientY];
    pressTimer = setTimeout(() => {if (pressIndex === index) {act(index, true); suppressClick = index; pressTimer = null;}}, 450);
  });
  board.addEventListener('pointermove', e => {if (pressPoint && Math.hypot(e.clientX - pressPoint[0], e.clientY - pressPoint[1]) > 10) cancelPress();});
  board.addEventListener('pointerup', cancelPress); board.addEventListener('pointercancel', cancelPress); board.addEventListener('pointerleave', cancelPress);
  board.addEventListener('keydown', e => {
    const index = indexOf(e.target); if (index === null) return;
    const r = Math.floor(index / game.cols), c = index % game.cols;
    const destinations = {ArrowLeft: r * game.cols + Math.max(0, c - 1), ArrowRight: r * game.cols + Math.min(game.cols - 1, c + 1), ArrowUp: Math.max(0, r - 1) * game.cols + c, ArrowDown: Math.min(game.rows - 1, r + 1) * game.cols + c};
    if (e.key in destinations) {e.preventDefault(); focus(destinations[e.key]);}
    else if (e.key.toLowerCase() === 'f') {e.preventDefault(); act(index, true);}
    else if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); act(index, flagMode && !game.cells[index].open);}
  });
  buttons.forEach(b => b.addEventListener('click', () => reset(b.dataset.level)));
  $('restart').addEventListener('click', () => reset());
  $('flag-mode').addEventListener('click', () => {flagMode = !flagMode; $('flag-mode').setAttribute('aria-pressed', String(flagMode)); $('mode-state').textContent = flagMode ? '开' : '关'; render();});
  $('help').addEventListener('click', () => $('help-dialog').showModal());
  document.addEventListener('keydown', e => {if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey && !$('help-dialog').open) {e.preventDefault(); reset();}});
  const media = matchMedia('(prefers-color-scheme: dark)'); let theme = read('theme');
  function setTheme(value) {document.documentElement.dataset.theme = value; $('theme').setAttribute('aria-label', value === 'dark' ? '切换浅色模式' : '切换深色模式'); document.querySelector('meta[name="theme-color"]').content = value === 'dark' ? '#181e1b' : '#f5f4ef';}
  setTheme(theme || (media.matches ? 'dark' : 'light'));
  $('theme').addEventListener('click', () => {theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; write('theme', theme); setTheme(theme);});
  media.addEventListener('change', e => {if (!theme) setTheme(e.matches ? 'dark' : 'light');});
  reset();
})();
