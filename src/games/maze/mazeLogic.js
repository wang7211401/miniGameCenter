// src/games/maze/mazeLogic.js
// 迷宫：DFS 回溯生成完美迷宫（天然连通），钥匙/门沿唯一通路按序布放
// （构造性保证可解），生成后用状态空间 Dijkstra 校验并求最短步数 par。
// 元素规则：陷阱踏入 +2 步惩罚；传送门成对，进入即传送；迷雾仅影响 UI 视野。

// 墙位掩码：N=1 E=2 S=4 W=8
export const N = 1, E = 2, S = 4, W = 8;
export const DIRS = [
  { dr: -1, dc: 0, wall: N, opp: S },
  { dr: 0, dc: 1, wall: E, opp: W },
  { dr: 1, dc: 0, wall: S, opp: N },
  { dr: 0, dc: -1, wall: W, opp: E },
];

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

// DFS 回溯生成完美迷宫：返回每格墙掩码（初始全墙）
function carveMaze(size, rng) {
  const walls = Array.from({ length: size * size }, () => 15);
  const visited = new Set();
  const stack = [0]; // (0,0)
  visited.add(0);
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const r = Math.floor(cur / size), c = cur % size;
    const options = [];
    for (const d of DIRS) {
      const nr = r + d.dr, nc = c + d.dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const nk = nr * size + nc;
      if (!visited.has(nk)) options.push({ nk, d });
    }
    if (!options.length) { stack.pop(); continue; }
    const { nk, d } = options[Math.floor(rng() * options.length)];
    walls[cur] &= ~d.wall;
    walls[nk] &= ~d.opp;
    visited.add(nk);
    stack.push(nk);
  }
  return walls;
}

// 唯一通路（完美迷宫中任意两点路径唯一）：BFS 父指针回溯
function findPath(walls, size, from, to) {
  const prev = new Map([[from, -1]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === to) break;
    const r = Math.floor(cur / size), c = cur % size;
    for (const d of DIRS) {
      if (walls[cur] & d.wall) continue;
      const nr = r + d.dr, nc = c + d.dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const nk = nr * size + nc;
      if (prev.has(nk)) continue;
      prev.set(nk, cur);
      queue.push(nk);
    }
  }
  if (!prev.has(to)) return null;
  const path = [];
  let cur = to;
  while (cur !== -1) {
    path.push(cur);
    cur = prev.get(cur);
  }
  return path.reverse();
}

// 状态空间 Dijkstra：(cell, keyMask) -> 到终点最短步数；不可达返回 null
// doors: [{cell, key}] keys: [cell] traps: [cell] portals: [{a,b}]
export function shortestSteps(data) {
  const { size, walls, start, end, doors, traps, portals } = data;
  const keyCount = doors.length;
  const doorAt = new Map(); // cell -> keyIdx
  doors.forEach((d, i) => doorAt.set(d.cell, i));
  const keyAt = new Map(); // cell -> keyIdx
  (data.keys || []).forEach((k, i) => keyAt.set(k.cell, k.id != null ? k.id : i));
  const trapSet = new Set(traps.map(t => t.cell));
  const portalAt = new Map();
  (portals || []).forEach((p, i) => {
    portalAt.set(p.a, { to: p.b, pair: i });
    portalAt.set(p.b, { to: p.a, pair: i });
  });

  const stateCount = size * size * (1 << keyCount);
  const dist = new Array(stateCount).fill(Infinity);
  const startMask = keyAt.has(start) ? 1 << keyAt.get(start) : 0;
  const startState = start * (1 << keyCount) + startMask;
  dist[startState] = 0;
  // 小顶堆（简单实现：状态数不大，用排序插入）
  const heap = [{ s: startState, d: 0 }];
  while (heap.length) {
    let bi = 0;
    for (let i = 1; i < heap.length; i++) if (heap[i].d < heap[bi].d) bi = i;
    const { s, d } = heap.splice(bi, 1)[0];
    if (d > dist[s]) continue;
    const cell = Math.floor(s / (1 << keyCount));
    const mask = s % (1 << keyCount);
    if (cell === end) return d;
    const r = Math.floor(cell / size), c = cell % size;
    for (const dir of DIRS) {
      if (walls[cell] & dir.wall) continue;
      const nr = r + dir.dr, nc = c + dir.dc;
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const nk = nr * size + nc;
      let nmask = mask;
      if (doorAt.has(nk)) {
        const ki = doorAt.get(nk);
        if (!(mask & (1 << ki))) continue; // 无钥匙不可通过
      }
      if (keyAt.has(nk)) nmask |= 1 << keyAt.get(nk);
      let nd = d + 1;
      if (trapSet.has(nk)) nd += 2;
      const tp = portalAt.get(nk);
      const dest = tp ? tp.to : nk;
      const ns = dest * (1 << keyCount) + nmask;
      if (nd < dist[ns]) {
        dist[ns] = nd;
        heap.push({ s: ns, d: nd });
      }
    }
  }
  return null;
}

/**
 * 生成一整关可玩数据。
 * 返回 { size, walls, start, end, keys, doors, traps, portals, stars, par, stepLimit, timeLimit, fog }
 * 校验：起点可达终点（含钥匙门序）；限步不足时自动放宽为 par*1.3。
 */
export function generateMaze(level, seed) {
  const size = level.size;
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = mulberry32((seed + attempt * 7919) >>> 0);
    const walls = carveMaze(size, rng);
    const start = 0;
    const end = size * size - 1;
    const path = findPath(walls, size, start, end);
    if (!path || path.length < level.keys + 4) continue;

    const used = new Set([start, end]);
    // 钥匙/门：沿唯一通路按序布放，门在对应钥匙之后 => 构造性可解
    const keys = [];
    const doors = [];
    for (let i = 0; i < level.keys; i++) {
      const keyPos = Math.floor(((i + 1) / (level.keys + 1)) * (path.length - 2)) + 1;
      const doorPos = Math.floor(((i + 1.5) / (level.keys + 1)) * (path.length - 2)) + 1;
      if (doorPos >= path.length - 1 || keyPos >= doorPos) continue;
      const kc = path[keyPos];
      const dc = path[doorPos];
      if (used.has(kc) || used.has(dc)) continue;
      keys.push({ cell: kc, id: i });
      doors.push({ cell: dc, key: i });
      used.add(kc); used.add(dc);
    }
    if (keys.length < level.keys) continue;

    // 星星：随机空格（优先死路）
    const deadEnds = [];
    for (let i = 0; i < size * size; i++) {
      if (used.has(i)) continue;
      const w = walls[i];
      let open = 0;
      for (const bit of [N, E, S, W]) if (!(w & bit)) open++;
      if (open === 1) deadEnds.push(i);
    }
    const stars = [];
    const starPool = shuffleArr(deadEnds.slice(), rng);
    for (const cell of starPool) {
      if (stars.length >= level.stars) break;
      if (used.has(cell)) continue;
      stars.push({ cell });
      used.add(cell);
    }
    if (stars.length < level.stars) continue;

    // 陷阱：随机非特殊格（允许在通路上，只增加成本）
    const traps = [];
    let guard = 0;
    while (traps.length < level.traps && guard++ < 400) {
      const cell = Math.floor(rng() * size * size);
      if (used.has(cell)) continue;
      used.add(cell);
      traps.push({ cell });
    }
    if (traps.length < level.traps) continue;

    // 传送门：成对，距离远
    const portals = [];
    guard = 0;
    while (portals.length < level.portals && guard++ < 400) {
      const a = Math.floor(rng() * size * size);
      const b = Math.floor(rng() * size * size);
      if (used.has(a) || used.has(b)) continue;
      const ar = Math.floor(a / size), ac = a % size;
      const br = Math.floor(b / size), bc = b % size;
      if (Math.abs(ar - br) + Math.abs(ac - bc) < size) continue;
      portals.push({ a, b });
      used.add(a); used.add(b);
    }
    if (portals.length < level.portals) continue;

    const data = { size, walls, start, end, keys, doors, traps, portals, stars };
    let par = shortestSteps(data);
    if (par === null) continue; // 理论上不会发生，防御性重生成

    // 每扇门都必须真正卡住通路（防止传送门绕过某扇门使对应钥匙失去意义）：
    // 缺少任意一把钥匙时终点应不可达，否则本布局重生成
    for (let i = 0; i < doors.length; i++) {
      const withoutI = shortestSteps({ ...data, keys: keys.filter(k => k.id !== i) });
      if (withoutI !== null) {
        par = null;
        break;
      }
    }
    if (par === null) continue;

    let stepLimit = level.stepLimit;
    if (stepLimit > 0 && stepLimit <= par) stepLimit = Math.ceil(par * 1.3);

    return {
      ...data,
      par,
      stepLimit,
      timeLimit: level.timeLimit,
      fog: level.fog,
      id: level.id,
    };
  }
  throw new Error(`迷宫第 ${level.id} 关生成失败`);
}

function shuffleArr(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- 对局移动 ----------

export function createPlayState(maze) {
  return {
    cell: maze.start,
    keyMask: 0,
    steps: 0,
    collectedStars: new Set(),
    hitTrap: false, // 本步踩陷阱标记（UI 反馈）
    teleported: false,
    won: false,
  };
}

// 朝方向移动一步。返回新状态（不可移动则原样返回）。
export function movePlayer(maze, state, dirIndex) {
  if (state.won) return state;
  const { size, walls, start, end, doors, traps, portals, stars, keys } = maze;
  const dir = DIRS[dirIndex];
  const cell = state.cell;
  if (walls[cell] & dir.wall) return state;
  const r = Math.floor(cell / size), c = cell % size;
  const nr = r + dir.dr, nc = c + dir.dc;
  if (nr < 0 || nc < 0 || nr >= size || nc >= size) return state;
  let target = nr * size + nc;

  // 门检查
  const door = doors.find(d => d.cell === target);
  if (door && !(state.keyMask & (1 << door.key))) return state;

  let keyMask = state.keyMask;
  const key = keys.find(k => k.cell === target);
  if (key) keyMask |= 1 << key.id;

  let steps = state.steps + 1;
  let hitTrap = false;
  if (traps.some(t => t.cell === target)) { steps += 2; hitTrap = true; }

  let teleported = false;
  const portal = portals.find(p => p.a === target || p.b === target);
  if (portal) {
    target = portal.a === target ? portal.b : portal.a;
    teleported = true;
  }

  const collectedStars = state.collectedStars.has(target)
    ? state.collectedStars
    : new Set(state.collectedStars);
  if (stars.some(s => s.cell === target)) collectedStars.add(target);

  return {
    ...state,
    cell: target,
    keyMask,
    steps,
    collectedStars,
    hitTrap,
    teleported,
    won: target === end,
  };
}

// 星级：步数 + 星星收集
export function computeStars(maze, state, seconds) {
  let s = 1;
  if (state.steps <= Math.ceil(maze.par * 1.3)) s++;
  const parTime = maze.timeLimit > 0 ? maze.timeLimit : maze.par * 2;
  if (seconds <= parTime * 0.7) s++;
  // 全部星星收集保底 2 星
  if (maze.stars.length > 0 && state.collectedStars.size === maze.stars.length && s < 2) s = 2;
  return Math.min(3, s);
}
