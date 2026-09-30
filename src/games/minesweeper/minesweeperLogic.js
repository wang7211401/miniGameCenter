// src/games/minesweeper/minesweeperLogic.js
// 扫雷核心逻辑：纯函数，不依赖 React。
// - 首点安全：首点及其 3x3 邻域无雷（首点必为 0 数字格，自动泛洪展开）
// - 无猜测验证：用约束传播求解器（简单规则 + 子集推理）验证存在全程
//   不靠猜测的通关路径；失败则通过"移雷修复"重试，直到可解。

const key = (r, c) => `${r},${c}`;
const parseKey = (k) => k.split(',').map(Number);

export const NEIGHBORS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function inBounds(rows, cols, r, c) {
  return r >= 0 && c >= 0 && r < rows && c < cols;
}

// 布雷并计算数字（forbidden 内不布雷）
function placeMines(rows, cols, mines, forbidden, rng) {
  const isMine = Array.from({ length: rows }, () => Array(cols).fill(false));
  let placed = 0;
  let guard = 0;
  while (placed < mines && guard++ < 10000) {
    const r = Math.floor(rng() * rows);
    const c = Math.floor(rng() * cols);
    const k = key(r, c);
    if (forbidden.has(k) || isMine[r][c]) continue;
    isMine[r][c] = true;
    placed++;
  }
  if (placed < mines) return null;
  const adj = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isMine[r][c]) continue;
      for (const [dr, dc] of NEIGHBORS) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(rows, cols, nr, nc) && !isMine[nr][nc]) adj[nr][nc]++;
      }
    }
  }
  return { isMine, adj };
}

// 泛洪翻开：从 (r,c) 翻开，0 数字格向邻域扩散。返回新 revealed。
export function floodReveal(revealed, board, r, c) {
  const { rows, cols, adj, isMine } = board;
  if (revealed[r][c] || isMine[r][c]) return revealed;
  const next = revealed.map(row => [...row]);
  const stack = [[r, c]];
  next[r][c] = true;
  while (stack.length) {
    const [cr, cc] = stack.pop();
    if (adj[cr][cc] !== 0) continue;
    for (const [dr, dc] of NEIGHBORS) {
      const nr = cr + dr, nc = cc + dc;
      if (!inBounds(rows, cols, nr, nc)) continue;
      if (next[nr][nc] || isMine[nr][nc]) continue;
      next[nr][nc] = true;
      stack.push([nr, nc]);
    }
  }
  return next;
}

/**
 * 求解器：模拟玩家从 (startR,startC) 开局，只用逻辑推理翻安全格、标雷格。
 * 规则：
 *  1. 数字格隐藏邻数 == 剩余雷数 => 全雷；剩余雷数 == 0 => 全安全
 *  2. 子集推理：约束 A⊂B => B\A 的雷数 = b-a，为 0 全安全、为满全雷
 * 返回 { solved, revealed, flagged, unknown }（unknown 为无法判定的隐藏格）
 */
export function solveBoard(board, startR, startC) {
  const { rows, cols, adj, isMine } = board;
  let revealed = Array.from({ length: rows }, () => Array(cols).fill(false));
  const flagged = new Set();
  revealed = floodReveal(revealed, board, startR, startC);

  let progress = true;
  let guard = 0;
  while (progress && guard++ < 2000) {
    progress = false;
    // 收集约束：每个已翻开数字格 -> 未翻未标邻格集合与剩余雷数
    const constraints = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!revealed[r][c] || adj[r][c] === 0) continue;
        const hidden = [];
        let flags = 0;
        for (const [dr, dc] of NEIGHBORS) {
          const nr = r + dr, nc = c + dc;
          if (!inBounds(rows, cols, nr, nc)) continue;
          const k = key(nr, nc);
          if (flagged.has(k)) flags++;
          else if (!revealed[nr][nc]) hidden.push(k);
        }
        const need = adj[r][c] - flags;
        if (hidden.length === 0) continue;
        constraints.push({ set: hidden, need });
      }
    }

    const toReveal = new Set();
    const toFlag = new Set();

    // 规则 1
    for (const con of constraints) {
      if (con.need === 0) con.set.forEach(k => toReveal.add(k));
      else if (con.need === con.set.length) con.set.forEach(k => toFlag.add(k));
    }

    // 规则 2：子集推理（去重后的约束集合两两比较）
    const uniq = [];
    const seenKey = new Set();
    for (const con of constraints) {
      const sk = [...con.set].sort().join('|');
      const uk = `${sk}#${con.need}`;
      if (seenKey.has(uk)) continue;
      seenKey.add(uk);
      uniq.push({ set: new Set(con.set), need: con.need });
    }
    for (let i = 0; i < uniq.length; i++) {
      for (let j = 0; j < uniq.length; j++) {
        if (i === j) continue;
        const A = uniq[i], B = uniq[j];
        if (A.set.size >= B.set.size) continue;
        let isSubset = true;
        for (const k of A.set) {
          if (!B.set.has(k)) { isSubset = false; break; }
        }
        if (!isSubset) continue;
        const diff = [...B.set].filter(k => !A.set.has(k));
        const diffNeed = B.need - A.need;
        if (diffNeed === 0) diff.forEach(k => toReveal.add(k));
        else if (diffNeed === diff.length) diff.forEach(k => toFlag.add(k));
      }
    }

    // 应用推理结果（安全格泛洪翻开）
    for (const k of toReveal) {
      const [r, c] = parseKey(k);
      if (!revealed[r][c]) {
        revealed = floodReveal(revealed, board, r, c);
        progress = true;
      }
    }
    for (const k of toFlag) {
      if (!flagged.has(k)) {
        flagged.add(k);
        progress = true;
      }
    }
  }

  let revealedSafe = 0;
  let unknown = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (revealed[r][c]) revealedSafe++;
      else if (!flagged.has(key(r, c))) unknown.push(key(r, c));
    }
  }
  const totalSafe = rows * cols - countMines(board);
  return { solved: revealedSafe === totalSafe, revealed, flagged, unknown };
}

function countMines(board) {
  let n = 0;
  board.isMine.forEach(row => row.forEach(v => { if (v) n++; }));
  return n;
}

// 移雷修复：把未知区里的一个雷挪到未知区里的一个安全格，改变数字分布
function repairOnce(board, unknown, forbidden, rng) {
  if (unknown.length < 2) return false;
  const mineKeys = unknown.filter(k => {
    const [r, c] = parseKey(k);
    return board.isMine[r][c];
  });
  const safeKeys = unknown.filter(k => {
    const [r, c] = parseKey(k);
    return !board.isMine[r][c] && !forbidden.has(k);
  });
  if (!mineKeys.length || !safeKeys.length) return false;
  const mk = mineKeys[Math.floor(rng() * mineKeys.length)];
  const sk = safeKeys[Math.floor(rng() * safeKeys.length)];
  const [mr, mc] = parseKey(mk);
  const [sr, sc] = parseKey(sk);
  board.isMine[mr][mc] = false;
  board.isMine[sr][sc] = true;
  // 重算数字
  const { rows, cols } = { rows: board.rows, cols: board.cols };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board.isMine[r][c]) { board.adj[r][c] = 0; continue; }
      let n = 0;
      for (const [dr, dc] of NEIGHBORS) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(rows, cols, nr, nc) && board.isMine[nr][nc]) n++;
      }
      board.adj[r][c] = n;
    }
  }
  return true;
}

/**
 * 生成可解雷区。
 * forcedStart: 玩家首点坐标（可选）；给定则以它为安全起点，否则随机选起点。
 * 返回 { board: {rows, cols, isMine, adj}, start: {r, c} }
 * 保证：start 的 3x3 无雷（firstSafe 时）；solveBoard 从 start 开局可无猜测通关。
 */
export function generateBoard(level, rng, forcedStart) {
  const { rows, cols, mines, firstSafe } = level;
  let attempts = 0;
  const maxAttempts = forcedStart ? 40 : 60;
  while (attempts++ < maxAttempts) {
    const startR = forcedStart ? forcedStart.r : Math.floor(rng() * rows);
    const startC = forcedStart ? forcedStart.c : Math.floor(rng() * cols);
    const forbidden = new Set();
    if (firstSafe) {
      for (let r = startR - 1; r <= startR + 1; r++) {
        for (let c = startC - 1; c <= startC + 1; c++) {
          if (inBounds(rows, cols, r, c)) forbidden.add(key(r, c));
        }
      }
    } else {
      forbidden.add(key(startR, startC));
    }
    const placed = placeMines(rows, cols, mines, forbidden, rng);
    if (!placed) continue;
    let board = { rows, cols, isMine: placed.isMine, adj: placed.adj };

    // 求解 + 修复循环
    let solvable = false;
    for (let fix = 0; fix < 80; fix++) {
      const sim = solveBoard(board, startR, startC);
      if (sim.solved) { solvable = true; break; }
      if (!level.noGuess) { solvable = true; break; } // 允许猜测的关卡不强制
      // 移雷修复
      if (!repairOnce(board, sim.unknown, forbidden, rng)) break;
    }
    if (solvable) return { board, start: { r: startR, c: startC } };
  }
  throw new Error(`扫雷第 ${level.id} 关生成失败`);
}

// ---------- 对局状态操作 ----------

export function createGameState(level, generated) {
  const { rows, cols } = level;
  return {
    revealed: Array.from({ length: rows }, () => Array(cols).fill(false)),
    flagged: Array.from({ length: rows }, () => Array(cols).fill(false)),
    flagsUsed: 0,
    started: false,
    status: 'playing', // playing / won / lost
  };
}

// 翻开一个格子。返回 { state, hitMine, revealedCount }
export function revealCell(state, level, board, r, c) {
  if (state.status !== 'playing') return { state, hitMine: false, revealedCount: 0 };
  if (state.revealed[r][c] || state.flagged[r][c]) return { state, hitMine: false, revealedCount: 0 };
  if (board.isMine[r][c]) {
    const next = { ...state, status: 'lost' };
    next.revealed = state.revealed.map((row, ri) =>
      row.map((v, ci) => (board.isMine[ri][ci] || v ? true : v)));
    return { state: next, hitMine: true, revealedCount: 1 };
  }
  const revealed = floodReveal(state.revealed, board, r, c);
  const revealedCount = revealed.flat().filter(Boolean).length -
    state.revealed.flat().filter(Boolean).length;
  const next = { ...state, revealed, started: true };
  if (revealed.flat().filter(Boolean).length === level.rows * level.cols - level.mines) {
    next.status = 'won';
  }
  return { state: next, hitMine: false, revealedCount };
}

// 插旗/取消旗。flagLimit>0 时旗数上限为 flagLimit，否则为雷数。
export function toggleFlag(state, level, r, c) {
  if (state.status !== 'playing') return state;
  if (state.revealed[r][c]) return state;
  const maxFlags = level.flagLimit > 0 ? level.flagLimit : level.mines;
  const flagged = state.flagged.map(row => [...row]);
  if (!flagged[r][c] && state.flagsUsed >= maxFlags) return state; // 旗子用尽
  flagged[r][c] = !flagged[r][c];
  return {
    ...state,
    flagged,
    flagsUsed: state.flagsUsed + (flagged[r][c] ? 1 : -1),
    started: true,
  };
}

// 双击/快击展开：已翻数字格周围旗数==数字时，翻开其余邻格
export function chordCell(state, level, board, r, c) {
  if (state.status !== 'playing') return { state, hitMine: false };
  if (!state.revealed[r][c] || board.adj[r][c] === 0) return { state, hitMine: false };
  let flags = 0;
  const targets = [];
  for (const [dr, dc] of NEIGHBORS) {
    const nr = r + dr, nc = c + dc;
    if (!inBounds(level.rows, level.cols, nr, nc)) continue;
    if (state.flagged[nr][nc]) flags++;
    else if (!state.revealed[nr][nc]) targets.push([nr, nc]);
  }
  if (flags !== board.adj[r][c] || targets.length === 0) return { state, hitMine: false };
  let cur = state;
  let hitMine = false;
  for (const [tr, tc] of targets) {
    const res = revealCell(cur, level, board, tr, tc);
    cur = res.state;
    if (res.hitMine) { hitMine = true; break; }
  }
  return { state: cur, hitMine };
}

// 星级：用时占限时（或基准时间）比例
export function computeStars(level, seconds) {
  const par = level.timeLimit > 0 ? level.timeLimit : level.mines * 4;
  const ratio = seconds / par;
  if (ratio <= 0.4) return 3;
  if (ratio <= 0.7) return 2;
  return 1;
}
