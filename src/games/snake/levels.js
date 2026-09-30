// src/games/snake/levels.js
// 贪吃蛇 100 关：确定性生成（种子 PRNG）+ BFS 连通校验。
// 保证：障碍不封死蛇的可行区域、目标食物数可达、钥匙/门布局可解。

export const LEVEL_COUNT = 100;

// mulberry32：轻量确定性 PRNG
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

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// 各难度段参数（1-10 教学 / 11-20 固定障碍 / 21-30 限步 / 31-40 小图多障碍 /
// 41-50 限时 / 51-60 穿墙 / 61-70 移动障碍 / 71-80 毒食物 / 81-90 钥匙门 / 91-100 综合）
function bandParams(id) {
  if (id <= 10) {
    const i = id;
    return {
      size: 10, obstacleCount: 0,
      target: clamp(3 + Math.floor((i - 1) / 3), 3, 5),
      speed: 320 - i * 8,
      timeLimit: 0, stepLimit: 0,
      wrap: false, movers: 0, poison: 0, keyDoor: false,
    };
  }
  if (id <= 20) {
    const i = id - 10;
    return {
      size: 12, obstacleCount: 2 + Math.floor((i - 1) / 2),
      target: clamp(5 + Math.floor((i - 1) / 3), 5, 8),
      speed: 300 - i * 6,
      timeLimit: 0, stepLimit: 0,
      wrap: false, movers: 0, poison: 0, keyDoor: false,
    };
  }
  if (id <= 30) {
    const i = id - 20;
    const target = clamp(6 + Math.floor((i - 1) / 3), 6, 10);
    return {
      size: 12, obstacleCount: 4 + Math.floor((i - 1) / 4),
      target,
      speed: 280 - i * 5,
      timeLimit: 0, stepLimit: target * 8,
      wrap: false, movers: 0, poison: 0, keyDoor: false,
    };
  }
  if (id <= 40) {
    const i = id - 30;
    return {
      size: 10, obstacleCount: 6 + Math.floor((i - 1) / 3),
      target: clamp(8 + Math.floor((i - 1) / 3), 8, 12),
      speed: 260 - i * 5,
      timeLimit: 0, stepLimit: 0,
      wrap: false, movers: 0, poison: 0, keyDoor: false,
    };
  }
  if (id <= 50) {
    const i = id - 40;
    return {
      size: 13, obstacleCount: 5 + Math.floor((i - 1) / 3),
      target: clamp(10 + Math.floor((i - 1) / 4), 10, 15),
      speed: 250 - i * 5,
      timeLimit: 60 + (i - 1) * 3, stepLimit: 0,
      wrap: false, movers: 0, poison: 0, keyDoor: false,
    };
  }
  if (id <= 60) {
    const i = id - 50;
    return {
      size: 13, obstacleCount: 8 + Math.floor((i - 1) / 2),
      target: clamp(12 + Math.floor((i - 1) / 3), 12, 18),
      speed: 240 - i * 5,
      timeLimit: 90, stepLimit: 0,
      wrap: true, movers: 0, poison: 0, keyDoor: false,
    };
  }
  if (id <= 70) {
    const i = id - 60;
    return {
      size: 14, obstacleCount: 6 + Math.floor((i - 1) / 3),
      target: clamp(15 + Math.floor((i - 1) / 3), 15, 20),
      speed: 200 - i * 4,
      timeLimit: 90, stepLimit: 0,
      wrap: false, movers: 1 + Math.floor((i - 1) / 4), poison: 0, keyDoor: false,
    };
  }
  if (id <= 80) {
    const i = id - 70;
    return {
      size: 14, obstacleCount: 8 + Math.floor((i - 1) / 4),
      target: clamp(20 + Math.floor((i - 1) / 4), 20, 25),
      speed: 190 - i * 4,
      timeLimit: 100, stepLimit: 0,
      wrap: false, movers: 1 + Math.floor((i - 1) / 5),
      poison: 2 + Math.floor((i - 1) / 4), keyDoor: false,
    };
  }
  if (id <= 90) {
    const i = id - 80;
    return {
      size: 14, obstacleCount: 8 + Math.floor((i - 1) / 4),
      target: clamp(25 + Math.floor((i - 1) / 4), 25, 30),
      speed: 180 - i * 3,
      timeLimit: 120, stepLimit: 0,
      wrap: false, movers: 1 + Math.floor((i - 1) / 5),
      poison: 1 + Math.floor((i - 1) / 5), keyDoor: true,
    };
  }
  const i = id - 90;
  const target = clamp(25 + Math.floor((i - 1) / 4), 25, 30);
  return {
    size: 11, obstacleCount: 6 + Math.floor((i - 1) / 3),
    target,
    speed: 160 - i * 3,
    timeLimit: 70 + (i - 1) * 2, stepLimit: target * 6,
    wrap: false, movers: 2 + Math.floor((i - 1) / 5),
    poison: 2 + Math.floor((i - 1) / 5), keyDoor: true,
  };
}

// BFS：返回从起点出发、绕过 blocked 集合可达的所有格子索引
function reachable(size, blocked, startR, startC) {
  const start = startR * size + startC;
  if (blocked.has(start)) return new Set();
  const seen = new Set([start]);
  const queue = [[startR, startC]];
  while (queue.length) {
    const [r, c] = queue.shift();
    const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const k = nr * size + nc;
      if (blocked.has(k) || seen.has(k)) continue;
      seen.add(k);
      queue.push([nr, nc]);
    }
  }
  return seen;
}

function generateObstacles(size, count, rng, startCells) {
  const set = new Set();
  let guard = 0;
  while (set.size < count && guard++ < 800) {
    const r = Math.floor(rng() * size);
    const c = Math.floor(rng() * size);
    const k = r * size + c;
    if (startCells.has(k)) continue;
    set.add(k);
  }
  return set;
}

// 移动障碍：优先选最空旷的行，沿水平方向巡逻
function generateMovers(size, obstacles, count, rng, mid) {
  const movers = [];
  const usedRows = new Set([mid]);
  for (let i = 0; i < count; i++) {
    let bestRow = -1;
    let bestFree = 0;
    for (let r = 0; r < size; r++) {
      if (usedRows.has(r)) continue;
      let free = 0;
      for (let c = 0; c < size; c++) {
        if (!obstacles.has(r * size + c)) free++;
      }
      if (free > bestFree) {
        bestFree = free;
        bestRow = r;
      }
    }
    if (bestRow < 0 || bestFree < 5) break;
    usedRows.add(bestRow);
    let placed = false;
    for (let t = 0; t < 60 && !placed; t++) {
      const c = Math.floor(rng() * size);
      if (obstacles.has(bestRow * size + c)) continue;
      movers.push({ r: bestRow, c, dr: 0, dc: rng() < 0.5 ? 1 : -1 });
      placed = true;
    }
  }
  return movers;
}

function buildLevel(id) {
  const p = bandParams(id);
  const size = p.size;
  const mid = Math.floor(size / 2);
  // 蛇出生区：第 mid 行的 0~3 列（头在 c=2，朝右）
  const startCells = new Set([mid * size, mid * size + 1, mid * size + 2, mid * size + 3]);

  for (let attempt = 0; attempt < 800; attempt++) {
    const rng = mulberry32(id * 1000003 + attempt * 7919 + 17);
    const obstacles = generateObstacles(size, p.obstacleCount, rng, startCells);

    // 蛇头 (mid,2) 除身体 (mid,1) 外至少保留 2 个自由出口，防止出生即困死
    const exits = [[mid - 1, 2], [mid + 1, 2], [mid, 3]].filter(
      ([r, c]) => r >= 0 && c >= 0 && r < size && c < size && !obstacles.has(r * size + c)
    );
    if (exits.length < 2) continue;

    let door = null;
    let key = null;
    if (p.keyDoor) {
      const doorIdx = Math.floor(rng() * size * size);
      if (obstacles.has(doorIdx) || startCells.has(doorIdx)) continue;
      door = { r: Math.floor(doorIdx / size), c: doorIdx % size };
    }

    const blockedOpen = obstacles;
    const blockedClosed = door
      ? new Set([...obstacles, door.r * size + door.c])
      : obstacles;

    const reachOpen = reachable(size, blockedOpen, mid, 2);
    const reachClosed = door
      ? reachable(size, blockedClosed, mid, 2)
      : reachOpen;

    const freeCount = size * size - obstacles.size - (door ? 1 : 0);
    // 可行区域不被封死：可达格数需覆盖目标 + 蛇身余量，且占自由格 55% 以上
    if (reachOpen.size < p.target + 14) continue;
    if (reachOpen.size < freeCount * 0.55) continue;
    if (!door && reachClosed.size < p.target + 14) continue;

    if (door) {
      // 门必须真的封锁了某些格子，否则没有意义
      if (reachOpen.size <= reachClosed.size) continue;
      // 关门状态下也要有足够空间吃一半以上目标
      if (reachClosed.size < Math.ceil(p.target / 2) + 8) continue;
      // 钥匙放在关门可达区内
      const closedList = [...reachClosed];
      const keyIdx = closedList[Math.floor(rng() * closedList.length)];
      if (startCells.has(keyIdx)) continue;
      key = { r: Math.floor(keyIdx / size), c: keyIdx % size };
    }

    const movers = p.movers > 0 ? generateMovers(size, obstacles, p.movers, rng, mid) : [];
    if (p.movers > 0 && movers.length === 0) continue;

    return {
      id,
      name: `第 ${id} 关`,
      size,
      obstacles: [...obstacles].map(k => [Math.floor(k / size), k % size]),
      target: p.target,
      speed: p.speed,
      timeLimit: p.timeLimit,
      stepLimit: p.stepLimit,
      wrap: p.wrap,
      movers,
      poison: p.poison,
      key,
      door,
    };
  }
  throw new Error(`贪吃蛇第 ${id} 关生成失败`);
}

export const levels = Array.from({ length: LEVEL_COUNT }, (_, i) => buildLevel(i + 1));

export function getLevelConfig(id) {
  return levels.find(l => l.id === id) || levels[0];
}
