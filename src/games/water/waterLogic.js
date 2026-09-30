// src/games/water/waterLogic.js
// 颜色倒水：倒水规则、胜利判定、锁定管、DFS 求解器（含记忆化）。
// 关卡可解性保证：generateLevel 随机打乱后用求解器验证，不可解自动重排。

const key = (r) => r.join(',');

// tubes: 数组的数组，[底, ..., 顶]，元素为颜色编号（>=1）
export function tubeComplete(tube, capacity) {
  return tube.length === capacity && tube.every(c => c === tube[0]);
}

export function isWon(tubes, capacity) {
  return tubes.every(t => t.length === 0 || tubeComplete(t, capacity));
}

// 源管顶部连续同色段
export function topRun(tube) {
  if (!tube.length) return { color: 0, count: 0 };
  const color = tube[tube.length - 1];
  let count = 1;
  for (let i = tube.length - 2; i >= 0; i--) {
    if (tube[i] === color) count++;
    else break;
  }
  return { color, count };
}

// from 是否允许操作（锁定管不可）
export function canSelect(from, lockedSet) {
  return !lockedSet.has(from);
}

/**
 * 能否从 from 倒向 to。
 * 规则：目标为空或顶色相同且未满；锁定管不可作为源或目标。
 * 剪枝：不把"整管同色"倒进空管（无意义移动）。
 */
export function canPour(tubes, from, to, capacity, lockedSet) {
  if (from === to) return false;
  if (lockedSet.has(from) || lockedSet.has(to)) return false;
  const src = tubes[from];
  const dst = tubes[to];
  if (!src.length || dst.length >= capacity) return false;
  const run = topRun(src);
  if (dst.length === 0) {
    // 源管本身已单色满管时倒向空管无意义
    if (run.count === src.length) return false;
    return true;
  }
  return dst[dst.length - 1] === run.color;
}

// 执行倒水（返回新 tubes），一次搬运顶部连续同色段（受目标剩余空间限制）
export function pour(tubes, from, to, capacity) {
  const next = tubes.map(t => [...t]);
  const src = next[from];
  const dst = next[to];
  const run = topRun(src);
  const space = capacity - dst.length;
  const move = Math.min(run.count, space);
  for (let i = 0; i < move; i++) {
    dst.push(src.pop());
  }
  return next;
}

// 所有合法移动 [from, to]
export function legalMoves(tubes, capacity, lockedSet) {
  const moves = [];
  for (let f = 0; f < tubes.length; f++) {
    if (lockedSet.has(f) || !tubes[f].length) continue;
    if (tubeComplete(tubes[f], capacity)) continue; // 已完成无需再动
    for (let t = 0; t < tubes.length; t++) {
      if (canPour(tubes, f, t, capacity, lockedSet)) moves.push([f, t]);
    }
  }
  return moves;
}

// 状态规范化（管序无关），用于记忆化
function stateKey(tubes, capacity) {
  return tubes
    .map(t => key(t) || '_')
    .sort()
    .join('|');
}

/**
 * DFS 求解器：返回从 tubes 到胜利的操作序列 [[from,to],...]，无解返回 null。
 * nodeBudget 控制搜索规模上限。
 */
export function solve(tubes, capacity, lockedSet, nodeBudget = 60000) {
  const seen = new Set();
  let nodes = 0;
  const path = [];

  function dfs(cur, lastMove) {
    if (isWon(cur, capacity)) return true;
    if (++nodes > nodeBudget) return false;
    const sk = stateKey(cur, capacity);
    if (seen.has(sk)) return false;
    seen.add(sk);
    let moves = legalMoves(cur, capacity, lockedSet);
    // 剪枝：禁止立即回退上一步（倒回去又倒回来）
    if (lastMove) {
      const [lf, lt] = lastMove;
      moves = moves.filter(([f, t]) => !(f === lt && t === lf));
    }
    // 启发排序：优先"能完成某管"或"合并同色"的移动
    moves.sort((a, b) => score(cur, b, capacity, lockedSet) - score(cur, a, capacity, lockedSet));
    for (const [f, t] of moves) {
      path.push([f, t]);
      if (dfs(pour(cur, f, t, capacity), [f, t])) return true;
      path.pop();
    }
    return false;
  }

  function score(cur, [f, t], capacity, lockedSet) {
    let s = 0;
    const src = cur[f];
    const dst = cur[t];
    const run = topRun(src);
    const space = capacity - dst.length;
    const move = Math.min(run.count, space);
    // 完成后目标管
    if (dst.length + move === capacity && (dst.length === 0 || dst[dst.length - 1] === run.color)) s += 10;
    // 清空源管
    if (move === src.length) s += 6;
    // 合并同色（目标非空）
    if (dst.length > 0) s += 3;
    // 避免把单色段倒进空管造成来回
    if (dst.length === 0 && run.count === src.length) s -= 20;
    return s;
  }

  return dfs(tubes.map(t => [...t])) ? path.map(m => [...m]) : null;
}

// mulberry32 确定性 PRNG
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 从完成态反向倒水打乱：每步都是某个合法正向倒水的逆操作，
 * 因此结果必然可解（逆序重放即可）。用于空管少、随机打乱难以可解的中高关卡。
 */
function reverseShuffle(tubes, lockedSet, capacity, rng, steps) {
  const n = tubes.length;
  for (let s = 0; s < steps; s++) {
    const aCand = [];
    for (let i = 0; i < n; i++) if (!lockedSet.has(i) && tubes[i].length) aCand.push(i);
    if (!aCand.length) return;
    const A = aCand[Math.floor(rng() * aCand.length)];
    const run = topRun(tubes[A]);
    // 逆操作合法性：正向 B→A 要求 A 顶为 x 或空。
    // 若 A 全为 x（移走后变空）可整段移；否则只能移 run-1 段，保留顶色。
    const maxN = run.count === tubes[A].length ? run.count : run.count - 1;
    if (maxN < 1) continue;
    const bCand = [];
    const bAny = [];
    for (let i = 0; i < n; i++) {
      if (i === A || lockedSet.has(i)) continue;
      const space = capacity - tubes[i].length;
      if (space <= 0) continue;
      bAny.push(i);
      const top = tubes[i].length ? tubes[i][tubes[i].length - 1] : 0;
      if (top !== run.color) bCand.push(i); // 优先移向异色/空管，增加交错
    }
    const poolB = bCand.length ? bCand : bAny;
    if (!poolB.length) continue;
    const B = poolB[Math.floor(rng() * poolB.length)];
    const space = capacity - tubes[B].length;
    const cnt = 1 + Math.floor(rng() * Math.min(maxN, space));
    for (let k = 0; k < cnt; k++) tubes[B].push(tubes[A].pop());
  }
}

/**
 * 生成一局可解的水管布局。
 * 返回 { tubes, lockedSet, hiddenTubes, solution, optimal, stepLimit }
 * - lockedTubes 根颜色管开局即完成并锁定（不可操作）
 * - hiddenTubes：随机选若干非锁定管，底部 hiddenLayers 层在 UI 隐藏
 * - swaps > 0：从"按色集中"的简单布局出发做 swaps 次随机交换（教学关由简单到交错）
 * - swaps = 0：反向倒水打乱，保证可解
 * - 求解器计算最少步数；stepLimit = 最少步数 + slack（slack=0 表示不限步）
 * - 开局即有完成管 / 求解器超预算 => 重排（最多 200 次）
 */
export function generateLevel(level, seed) {
  const { colorCount, capacity, emptyCount, lockedTubes = 0, slack = 0, swaps = 0 } = level;
  for (let attempt = 0; attempt < 200; attempt++) {
    // 每次尝试用独立种子，避免单一 PRNG 流连续撞上不可解分布
    const rng = mulberry32((seed + attempt * 7919) >>> 0);
    // 选锁定颜色（开局即完成）
    const colorList = Array.from({ length: colorCount }, (_, i) => i + 1);
    shuffle(colorList, rng);
    const lockedColors = new Set(colorList.slice(0, lockedTubes));

    const tubes = [];
    const lockedSet = new Set();
    // 锁定管放前面
    for (const c of lockedColors) {
      tubes.push(Array(capacity).fill(c));
      lockedSet.add(tubes.length - 1);
    }

    if (swaps > 0) {
      // 教学关：pool 天然按色集中，做 swaps 次两两交换得到"简单→交错"分布
      const pool = [];
      for (const c of colorList.slice(lockedTubes)) {
        for (let i = 0; i < capacity; i++) pool.push(c);
      }
      for (let s = 0; s < swaps; s++) {
        const i = Math.floor(rng() * pool.length);
        const j = Math.floor(rng() * pool.length);
        if (pool[i] !== pool[j]) [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const shuffleTubeCount = colorCount - lockedTubes;
      for (let i = 0; i < shuffleTubeCount; i++) {
        tubes.push(pool.slice(i * capacity, (i + 1) * capacity));
      }
      for (let i = 0; i < emptyCount; i++) tubes.push([]);
    } else {
      // 中高关卡：从完成态反向打乱
      for (const c of colorList.slice(lockedTubes)) tubes.push(Array(capacity).fill(c));
      for (let i = 0; i < emptyCount; i++) tubes.push([]);
      reverseShuffle(tubes, lockedSet, capacity, rng, colorCount * capacity * 2);
    }

    // 开局不应有"已完成的杂乱外管"以外的完成管（锁定管除外）
    let badStart = false;
    tubes.forEach((t, idx) => {
      if (!lockedSet.has(idx) && tubeComplete(t, capacity)) badStart = true;
    });
    if (badStart) continue;

    const solution = solve(tubes, capacity, lockedSet, 300000);
    if (!solution) continue;
    const optimal = solution.length;
    const stepLimit = slack > 0 ? optimal + slack : 0;

    // 隐藏层：随机挑 2 根未锁定且非空的管
    const hiddenTubes = new Set();
    if (level.hiddenLayers > 0) {
      const candidates = tubes
        .map((t, i) => ({ t, i }))
        .filter(({ t, i }) => !lockedSet.has(i) && t.length >= level.hiddenLayers + 1);
      shuffle(candidates, rng);
      const hiddenCount = Math.min(2, candidates.length);
      for (let i = 0; i < hiddenCount; i++) hiddenTubes.add(candidates[i].i);
    }

    return { tubes, lockedSet, hiddenTubes, solution, optimal, stepLimit };
  }
  throw new Error(`倒水第 ${level.id} 关生成失败`);
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 提示：给定当前局面，返回建议操作 [from, to] 或 null
export function hint(tubes, capacity, lockedSet) {
  const sol = solve(tubes, capacity, lockedSet, 40000);
  return sol && sol.length ? sol[0] : null;
}

// 颜色调色板（12 色）
export const PALETTE = [
  '#E53935', '#1E88E5', '#43A047', '#FDD835',
  '#8E24AA', '#FB8C00', '#00ACC1', '#D81B60',
  '#7CB342', '#6D4C41', '#546E7A', '#F4511E',
];
