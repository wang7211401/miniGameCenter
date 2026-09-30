// src/games/snake/snakeLogic.js
// 贪吃蛇纯逻辑：不依赖 React，便于单独测试。

export const DIRS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

// 禁止 180° 掉头
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

const key = (r, c) => `${r},${c}`;

export function parseKey(k) {
  const [r, c] = k.split(',').map(Number);
  return { r, c };
}

// 障碍集合（含未开锁的门）
export function buildObstacleSet(level, hasKey) {
  const set = new Set();
  (level.obstacles || []).forEach(([r, c]) => set.add(key(r, c)));
  if (level.door && !hasKey) set.add(key(level.door.r, level.door.c));
  return set;
}

// 在空格中随机放置一个目标物；找不到返回 null
function pickFreeCell(size, occupied, rng) {
  const free = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!occupied.has(key(r, c))) free.push({ r, c });
    }
  }
  if (!free.length) return null;
  return free[Math.floor(rng() * free.length)];
}

// 初始状态
export function createInitialState(level, rng) {
  const size = level.size;
  const mid = Math.floor(size / 2);
  // 蛇长 3，头在 (mid, 2) 朝右
  const snake = [
    { r: mid, c: 2 },
    { r: mid, c: 1 },
    { r: mid, c: 0 },
  ];
  const obstacles = buildObstacleSet(level, false);
  const occupied = new Set(obstacles);
  snake.forEach(s => occupied.add(key(s.r, s.c)));
  (level.movers || []).forEach(m => occupied.add(key(m.r, m.c)));
  if (level.key) occupied.add(key(level.key.r, level.key.c));

  const food = pickFreeCell(size, occupied, rng);
  if (food) occupied.add(key(food.r, food.c));

  // 毒食物：与蛇身/障碍/食物/钥匙不重合
  const poisons = [];
  for (let i = 0; i < (level.poison || 0); i++) {
    const p = pickFreeCell(size, occupied, rng);
    if (!p) break;
    occupied.add(key(p.r, p.c));
    poisons.push(p);
  }

  return {
    size,
    snake,
    dir: 'right',
    pendingDir: 'right',
    food,
    poisons,
    movers: (level.movers || []).map(m => ({ ...m })),
    obstacles,
    door: level.door || null,
    keyPos: level.key || null,
    hasKey: false,
    eaten: 0,
    steps: 0,
    alive: true,
    won: false,
  };
}

// 移动障碍巡逻：撞墙或撞固定障碍则反向
function stepMovers(movers, obstacles, size, wrap) {
  return movers.map(m => {
    let nr = m.r + m.dr;
    let nc = m.c + m.dc;
    let dr = m.dr;
    let dc = m.dc;
    let blocked = false;
    if (wrap) {
      nr = (nr + size) % size;
      nc = (nc + size) % size;
      blocked = obstacles.has(key(nr, nc));
    } else {
      blocked =
        nr < 0 || nc < 0 || nr >= size || nc >= size ||
        obstacles.has(key(nr, nc));
    }
    if (blocked) {
      dr = -dr;
      dc = -dc;
      nr = m.r + dr;
      nc = m.c + dc;
      if (wrap) {
        nr = (nr + size) % size;
        nc = (nc + size) % size;
      }
      // 反向仍被挡住（例如两侧夹死）：原地不动
      if (nr < 0 || nc < 0 || nr >= size || nc >= size || obstacles.has(key(nr, nc))) {
        return { ...m, dr, dc };
      }
    }
    return { r: nr, c: nc, dr, dc };
  });
}

/**
 * 推进一个 tick。
 * 返回 { state, events }，events 含 ateFood / atePoison / gotKey / dead / won。
 * 不修改传入 state（返回浅层新对象 + 新数组）。
 */
export function step(state, level, rng) {
  if (!state.alive || state.won) return { state, events: {} };

  const size = state.size;
  const dir = state.pendingDir;
  const [dr, dc] = DIRS[dir];
  let nr = state.snake[0].r + dr;
  let nc = state.snake[0].c + dc;

  if (level.wrap) {
    nr = (nr + size) % size;
    nc = (nc + size) % size;
  } else if (nr < 0 || nc < 0 || nr >= size || nc >= size) {
    return { state: { ...state, alive: false, dir }, events: { dead: 'wall' } };
  }

  // 移动障碍先走一步，再判断碰撞（避免"同帧追上"的不公平）
  const movers = stepMovers(state.movers, state.obstacles, size, level.wrap);
  const moverSet = new Set(movers.map(m => key(m.r, m.c)));

  if (state.obstacles.has(key(nr, nc))) {
    return { state: { ...state, alive: false, movers, dir }, events: { dead: 'obstacle' } };
  }
  if (moverSet.has(key(nr, nc))) {
    return { state: { ...state, alive: false, movers, dir }, events: { dead: 'mover' } };
  }

  const eating = state.food && state.food.r === nr && state.food.c === nc;
  // 尾巴这一帧会移走（除非吃到食物），撞尾巴应放行
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (body.some(s => s.r === nr && s.c === nc)) {
    return { state: { ...state, alive: false, movers, dir }, events: { dead: 'self' } };
  }

  const newSnake = [{ r: nr, c: nc }, ...body];
  const events = {};
  let { food, poisons, keyPos, hasKey, obstacles, door, eaten, timePenalty } = state;
  timePenalty = 0;

  if (eating) {
    eaten += 1;
    events.ateFood = true;
    // 新食物不能落在蛇身 / 障碍 / 移动障碍 / 毒食物 / 钥匙上
    const occupied = new Set(obstacles);
    newSnake.forEach(s => occupied.add(key(s.r, s.c)));
    moverSet.forEach(k => occupied.add(k));
    poisons.forEach(p => occupied.add(key(p.r, p.c)));
    if (keyPos && !hasKey) occupied.add(key(keyPos.r, keyPos.c));
    food = pickFreeCell(size, occupied, rng);
    if (!food) {
      // 棋盘被填满：直接判胜
      events.won = true;
      return {
        state: { ...state, snake: newSnake, food: null, eaten, movers, steps: state.steps + 1, won: true, dir },
        events,
      };
    }
  }

  // 毒食物：吃到扣长度（至少保留 3 节）并扣时间
  const pi = poisons.findIndex(p => p.r === nr && p.c === nc);
  if (pi >= 0) {
    poisons = poisons.filter((_, i) => i !== pi);
    events.atePoison = true;
    if (newSnake.length > 3) newSnake.pop();
    if (newSnake.length > 3) newSnake.pop();
    timePenalty = 5;
  }

  // 钥匙与门
  if (!hasKey && keyPos && keyPos.r === nr && keyPos.c === nc) {
    hasKey = true;
    events.gotKey = true;
    if (door) {
      obstacles = new Set(obstacles);
      obstacles.delete(key(door.r, door.c));
      door = null;
    }
  }

  const won = eaten >= level.target;
  events.won = won;

  return {
    state: {
      ...state,
      snake: newSnake,
      dir,
      food,
      poisons,
      keyPos: hasKey ? null : keyPos,
      hasKey,
      obstacles,
      door,
      movers,
      eaten,
      steps: state.steps + 1,
      timePenalty,
      won,
    },
    events,
  };
}

// 星级：按剩余时间/步数余量与毒食物扣分综合
export function computeStars(level, state, timeLeft, stepsLeft) {
  let score = 0;
  if (level.timeLimit > 0 && timeLeft > level.timeLimit * 0.35) score++;
  if (level.stepLimit > 0 && stepsLeft > level.stepLimit * 0.3) score++;
  if (state.poisons.length === (level.poison || 0)) score++; // 全程没踩毒
  return Math.max(1, Math.min(3, score + 1));
}
