// src/games/pixel/pixelLogic.js
// 像素填色核心逻辑：关卡生成（模板缩放 / 程序化风景）、验证、对局操作
import { TEMPLATES } from './templates';

// ---------- 随机数 ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to255 = x => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${to255(f(0))}${to255(f(8))}${to255(f(4))}`.toUpperCase();
}

function charToNum(ch) {
  const code = ch.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48 + 1; // '0'-'9' -> 1-10
  return code - 97 + 11; // 'a'-'n' -> 11-24
}

// 备用扩展色（模板颜色数不足时补充）
const EXTRA_HEX = ['#9B59B6', '#1ABC9C', '#E67E22', '#34495E', '#F1C40F', '#E84393', '#00CEC9', '#6C5CE7', '#FD79A8', '#55EFC4', '#B33939', '#218C74'];

// 兜底：确保 1..C 每个颜色都出现在画布上（将最多色的小区域改色）
function ensureAllColors(target, size, C, rng) {
  for (let color = 1; color <= C; color++) {
    if (target.some(v => v === color)) continue;
    const counts = {};
    target.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    const mode = +Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    const cells = target.map((v, i) => (v === mode ? i : -1)).filter(i => i >= 0);
    let idx = cells[Math.floor(rng() * cells.length)];
    const patch = 1 + Math.floor(rng() * 3);
    for (let p = 0; p < patch && idx >= 0; p++) {
      target[idx] = color;
      const nb = [idx - size, idx + size, idx - 1, idx + 1].filter(
        i => i >= 0 && i < size * size && target[i] === mode
      );
      idx = nb.length ? nb[Math.floor(rng() * nb.length)] : -1;
    }
  }
}

// ---------- 程序化风景生成（颜色数 > 12 时使用，保证精确色数） ----------
function genScenery(size, C, rng) {
  const skyBands = C - 6; // 太阳/云/远山/近山/草地×2
  const skyRows = Math.max(skyBands, Math.floor(size * 0.55));
  const palette = [];
  // 天空渐变：顶部偏紫 -> 地平线偏橙
  for (let i = 0; i < skyBands; i++) {
    const t = skyBands === 1 ? 0 : i / (skyBands - 1);
    const h = 250 - t * 220; // 250 -> 30
    palette.push(hslToHex((h + 360) % 360, 70, 78 - t * 18));
  }
  palette.push(hslToHex(48, 100, 62)); // 太阳
  palette.push(hslToHex(210, 30, 92)); // 云
  palette.push(hslToHex(265, 25, 52)); // 远山
  palette.push(hslToHex(255, 30, 34)); // 近山
  palette.push(hslToHex(95, 45, 52)); // 草地
  palette.push(hslToHex(100, 50, 36)); // 深草地
  const SUN = skyBands + 1, CLOUD = skyBands + 2, M1 = skyBands + 3, M2 = skyBands + 4, G1 = skyBands + 5, G2 = skyBands + 6;

  const target = new Array(size * size).fill(0);
  // 天空条带
  for (let r = 0; r < size; r++) {
    const band = Math.min(skyBands - 1, Math.floor((r / Math.max(1, skyRows)) * skyBands));
    for (let c = 0; c < size; c++) target[r * size + c] = band + 1;
  }
  // 云（2-3 朵，限制在山脉最低轮廓之上，避免被完全覆盖）
  const cloudBottom = Math.floor(skyRows - size * 0.08) - 2;
  const clouds = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < clouds; i++) {
    const cr = 1 + Math.floor(rng() * Math.max(1, cloudBottom - 1));
    const cc = 1 + Math.floor(rng() * (size - 4));
    const w = 2 + Math.floor(rng() * 3);
    for (let dc = 0; dc < w; dc++) for (let dr = 0; dr < 2; dr++) {
      const r = cr + dr, c = cc + dc;
      if (r < skyRows && c < size) target[r * size + c] = CLOUD;
    }
  }
  // 太阳
  const sr = 1 + Math.floor(rng() * Math.max(1, Math.floor(skyRows / 2)));
  const sc = 1 + Math.floor(rng() * (size - 3));
  const rad = Math.max(1, Math.round(size * 0.08));
  for (let r = sr - rad; r <= sr + rad; r++) for (let c = sc - rad; c <= sc + rad; c++) {
    if (r >= 0 && r < skyRows && c >= 0 && c < size && (r - sr) ** 2 + (c - sc) ** 2 <= rad * rad + 0.5) {
      target[r * size + c] = SUN;
    }
  }
  // 山脉（两层，随机轮廓；记录远山最高点防止被近山完全覆盖）
  let m1PeakRow = skyRows, m1PeakCol = 0;
  const drawMountain = (color, base, amp, trackPeak) => {
    let hgt = base + rng() * amp;
    for (let c = 0; c < size; c++) {
      hgt += (rng() - 0.5) * 1.6;
      hgt = Math.max(base * 0.5, Math.min(base + amp, hgt));
      const top = Math.floor(skyRows - hgt);
      if (trackPeak && top < m1PeakRow) { m1PeakRow = top; m1PeakCol = c; }
      for (let r = top; r < skyRows; r++) {
        if (r >= 0) target[r * size + c] = color;
      }
    }
  };
  drawMountain(M1, size * 0.16, size * 0.12, true);
  drawMountain(M2, size * 0.08, size * 0.1, false);
  // 保证远山可见：在最高点补两格
  if (m1PeakRow >= 0 && m1PeakRow < skyRows) {
    target[m1PeakRow * size + m1PeakCol] = M1;
    if (m1PeakRow > 0) target[(m1PeakRow - 1) * size + m1PeakCol] = M1;
  }
  // 草地
  const g1 = skyRows + Math.floor((size - skyRows) / 2);
  for (let r = skyRows; r < size; r++) for (let c = 0; c < size; c++) {
    target[r * size + c] = r < g1 ? G1 : G2;
  }
  ensureAllColors(target, size, C, rng);
  return { target, palette, name: '风景' };
}

// ---------- 模板缩放生成 ----------
function genFromTemplate(size, C, rng) {
  const eligible = TEMPLATES.filter(t => t.palette.length <= C);
  const maxLen = Math.max(...eligible.map(t => t.palette.length));
  const pool = eligible.filter(t => t.palette.length === maxLen);
  const tpl = pool[Math.floor(rng() * pool.length)];
  const flip = rng() < 0.5;
  const h = tpl.grid.length, w = tpl.grid[0].length;
  const target = new Array(size * size);
  for (let r = 0; r < size; r++) {
    const sr = Math.min(h - 1, Math.floor((r * h) / size));
    for (let c = 0; c < size; c++) {
      const scRaw = Math.min(w - 1, Math.floor((c * w) / size));
      const sc = flip ? w - 1 - scRaw : scRaw;
      target[r * size + c] = charToNum(tpl.grid[sr][sc]);
    }
  }
  // 调色板扩展到 C 色
  const palette = tpl.palette.slice();
  let extra = 0;
  while (palette.length < C) {
    let hex = EXTRA_HEX[extra % EXTRA_HEX.length];
    if (palette.includes(hex)) hex = hslToHex(Math.floor(rng() * 360), 60, 55);
    palette.push(hex);
    extra++;
  }
  // 补齐未出现的颜色：将最多色的一块小区域改色，保证数字与调色板一一对应
  ensureAllColors(target, size, C, rng);
  return { target, palette, name: tpl.name };
}

// ---------- 生成 + 验证 ----------
export function generateLevel(level, seed) {
  const rng = mulberry32(seed);
  const size = level.size, C = level.colors;
  const gen = C > 12 ? genScenery(size, C, rng) : genFromTemplate(size, C, rng);
  const board = {
    size, colors: C,
    target: gen.target, palette: gen.palette, name: gen.name,
    hints: level.hints || 0, timeLimit: level.timeLimit || 0,
    errorStats: !!level.errorStats, accuracy: !!level.accuracy,
  };
  if (!validateBoard(board)) throw new Error(`第 ${level.id} 关生成验证失败`);
  return board;
}

export function validateBoard(board) {
  const { size, colors, target, palette } = board;
  if (target.length !== size * size) return false;
  if (palette.length !== colors) return false;
  for (const v of target) {
    if (!Number.isInteger(v) || v < 1 || v > colors) return false; // 无无效数字
  }
  for (let c = 1; c <= colors; c++) {
    if (!target.includes(c)) return false; // 每个调色板颜色都被使用，一一对应
  }
  return true;
}

// ---------- 对局操作 ----------
export function createPlayState(board) {
  return {
    filled: new Array(board.size * board.size).fill(false),
    selected: 1, errors: 0, correct: 0,
    hintsLeft: board.hints, hintsUsed: 0,
    filledCount: 0, won: false, lastWrongIdx: -1,
  };
}

export function selectColor(state, color) {
  return { ...state, selected: color, lastWrongIdx: -1 };
}

function checkWon(state, total) {
  return state.filledCount >= total;
}

export function fillCell(board, state, idx) {
  if (state.won || idx < 0 || idx >= board.size * board.size || state.filled[idx]) return state;
  if (board.target[idx] === state.selected) {
    const filled = state.filled.slice();
    filled[idx] = true;
    const next = { ...state, filled, filledCount: state.filledCount + 1, correct: state.correct + 1, lastWrongIdx: -1 };
    next.won = checkWon(next, board.size * board.size);
    return next;
  }
  return { ...state, errors: state.errors + 1, lastWrongIdx: idx };
}

// 长按连续填：泛洪填充与目标格同数字的连通区域
export function floodFill(board, state, idx) {
  if (state.won || idx < 0 || state.filled[idx]) return state;
  const num = board.target[idx];
  if (num !== state.selected) return { ...state, errors: state.errors + 1, lastWrongIdx: idx };
  const size = board.size, total = size * size;
  const visited = new Array(total).fill(false);
  const queue = [idx];
  visited[idx] = true;
  const filled = state.filled.slice();
  let count = 0;
  while (queue.length) {
    const cur = queue.pop();
    if (!filled[cur] && board.target[cur] === num) {
      filled[cur] = true; count++;
    }
    const r = Math.floor(cur / size), c = cur % size;
    const nbs = [];
    if (r > 0) nbs.push(cur - size);
    if (r < size - 1) nbs.push(cur + size);
    if (c > 0) nbs.push(cur - 1);
    if (c < size - 1) nbs.push(cur + 1);
    for (const n of nbs) {
      if (!visited[n] && board.target[n] === num && !filled[n]) { visited[n] = true; queue.push(n); }
    }
  }
  const next = { ...state, filled, filledCount: state.filledCount + count, correct: state.correct + count, lastWrongIdx: -1 };
  next.won = checkWon(next, total);
  return next;
}

// 提示：自动正确填充一个未完成格
export function useHint(board, state) {
  if (state.won || state.hintsLeft <= 0) return state;
  const idx = state.filled.findIndex(f => !f);
  if (idx < 0) return state;
  const filled = state.filled.slice();
  filled[idx] = true;
  const next = {
    ...state, filled,
    filledCount: state.filledCount + 1,
    hintsLeft: state.hintsLeft - 1, hintsUsed: state.hintsUsed + 1,
    lastWrongIdx: -1,
  };
  next.won = checkWon(next, board.size * board.size);
  return next;
}

// ---------- 评星 ----------
export function computeStars(board, state, seconds) {
  const total = state.correct + state.errors;
  const acc = total > 0 ? state.correct / total : 1;
  if (board.accuracy) {
    // 精确度评星
    if (acc >= 0.95 && state.hintsUsed === 0) return 3;
    if (acc >= 0.85) return 2;
    return 1;
  }
  let stars = 3;
  if (state.hintsUsed > 0) stars--;
  if (board.timeLimit > 0 && seconds > board.timeLimit * 0.75) stars--;
  if (state.errors > board.size * board.size * 0.15) stars--;
  return Math.max(1, stars);
}
