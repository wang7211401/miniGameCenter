// src/games/sheep/sheepLogic.js

/**
 * 核心思想：先构造一个完全可消除的“解法序列”，再根据这个序列反推卡片布局。
 * 1. 确定每种类型的三元组数量，生成一个有序的三元组列表。
 * 2. 将这些三元组随机打乱，形成一个“消除顺序”。
 * 3. 按照消除顺序，逆序将卡片放置在棋盘上（先放的卡片在下层，后被覆盖）。
 *    这样保证一定存在一种消除顺序（即放置的逆序）。
 * 4. 为了增加难度，在放置时适当随机偏移位置，让布局看起来随机。
 */

export function generateLevel(layers, rows, cols, numTypes) {
  // 计算总卡片数：至少保证每个类型有 3 张，且总数不超过 80% 的格子
  const totalSlots = layers * rows * cols;
  const maxCards = Math.floor(totalSlots * 0.75);
  // 每种类型至少一组三元组
  let minTotal = numTypes * 3;
  // 按 3 的倍数向上取整
  let totalCards = Math.ceil(minTotal / 3) * 3;
  if (totalCards > maxCards) {
    // 如果空间不足，减少类型数
    throw new Error('棋盘太小，无法容纳所有类型');
  }
  // 尽量多用一些卡片，但不超过 maxCards
  const extraTriplets = Math.min(Math.floor((maxCards - totalCards) / 3), 10); // 最多额外 10 组
  totalCards += extraTriplets * 3;

  // 1. 构建三元组池：每种类型生成 count/3 个三元组
  const tripletsPerType = Array(numTypes).fill(3); // 基础每组 3 张
  let remaining = totalCards - numTypes * 3;
  let idx = 0;
  while (remaining > 0) {
    tripletsPerType[idx % numTypes] += 3;
    remaining -= 3;
    idx++;
  }

  // 生成卡片池（每个类型出现次数为 tripletsPerType[i]）
  const pool = [];
  for (let t = 1; t <= numTypes; t++) {
    const count = tripletsPerType[t - 1];
    for (let i = 0; i < count; i++) {
      pool.push(t);
    }
  }
  // pool.length === totalCards

  // 2. 将 pool 随机打乱，作为“消除顺序”（我们之后要逆序放置）
  shuffle(pool);

  // 3. 创建空棋盘
  const grids = Array.from({ length: layers }, () =>
    Array.from({ length: rows }, () => Array(cols).fill(0))
  );

  // 4. 逆序放置卡片：从 pool 的最后一个开始放，先放最底层（layer=0）
  //    我们将卡片尽量均匀分布在所有层，但为了形成堆叠，上层卡片少一些。
  const totalLayers = layers;
  const positions = [];
  for (let l = 0; l < totalLayers; l++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions.push({ l, r, c });
      }
    }
  }
  shuffle(positions); // 随机打乱所有位置，使得卡片散布在不同位置

  // 但我们希望上层卡片少，下层多，因此按层分组分配位置。
  // 每层先限制在自身容量内，避免补到底层时丢失卡片。
  const layerSlots = Array.from({ length: totalLayers }, (_, l) => {
    const ratio = 1 - l / (totalLayers * 1.2); // 0.8 ~ 0.1
    return Math.min(
      rows * cols,
      Math.floor(totalSlots * ratio * 0.8 / totalLayers)
    );
  });

  // 修正使总和等于 totalCards，优先填充下层的剩余容量。
  let sum = layerSlots.reduce((a, b) => a + b, 0);
  if (sum < totalCards) {
    let remaining = totalCards - sum;
    for (let l = 0; l < totalLayers && remaining > 0; l++) {
      const capacity = rows * cols - layerSlots[l];
      const added = Math.min(capacity, remaining);
      layerSlots[l] += added;
      remaining -= added;
    }
  } else if (sum > totalCards) {
    // 从最上层削减
    for (let l = totalLayers - 1; l >= 0 && sum > totalCards; l--) {
      const diff = Math.min(layerSlots[l], sum - totalCards);
      layerSlots[l] -= diff;
      sum -= diff;
    }
  }

  const allocatedCards = layerSlots.reduce((a, b) => a + b, 0);
  if (allocatedCards !== totalCards) {
    throw new Error('关卡卡片分配失败，实际卡片数不是预期值');
  }

  // 现在按层填充卡片
  let poolIndex = 0;
  for (let l = 0; l < totalLayers; l++) {
    const slotsForLayer = layerSlots[l];
    // 获取该层所有位置并打乱
    const layerPos = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        layerPos.push({ r, c });
      }
    }
    shuffle(layerPos);
    // 取前 slotsForLayer 个位置填充
    for (let i = 0; i < Math.min(slotsForLayer, layerPos.length); i++) {
      if (poolIndex >= pool.length) break;
      const { r, c } = layerPos[i];
      grids[l][r][c] = pool[poolIndex];
      poolIndex++;
    }
  }

  // 兜底填充剩余卡片，理论上不会进入，因为上面已经校验了分配总数。
  while (poolIndex < pool.length) {
    let placed = false;
    for (let l = 0; l < totalLayers && !placed; l++) {
      const empty = findEmptySlot(grids[l]);
      if (empty) {
        grids[l][empty.r][empty.c] = pool[poolIndex++];
        placed = true;
      }
    }
    if (!placed) throw new Error('关卡卡片放置失败');
  }

  const typeCounts = new Map();
  grids.forEach(grid => grid.forEach(row => row.forEach(value => {
    if (value !== 0) typeCounts.set(value, (typeCounts.get(value) || 0) + 1);
  })));
  if ([...typeCounts.values()].some(count => count % 3 !== 0)) {
    throw new Error('关卡中存在无法组成三张的卡片');
  }

  // 返回棋盘
  return grids;
}

// ---- 辅助函数 ----
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function findEmptySlot(grid) {
  const positions = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === 0) positions.push({ r, c });
    }
  }
  if (positions.length === 0) return null;
  return positions[Math.floor(Math.random() * positions.length)];
}

// ---- 核心逻辑：判断卡片是否被遮挡 ----
export function isCardBlocked(grids, layer, row, col, removedSet) {
  for (let l = layer + 1; l < grids.length; l++) {
    const grid = grids[l];
    if (!grid) break;
    if (grid[row] && grid[row][col] !== 0) {
      const key = `${l},${row},${col}`;
      if (!removedSet.has(key)) {
        return true;
      }
    }
  }
  return false;
}

// ---- 获取当前可用卡片（缓存友好） ----
export function getAvailableCards(grids, removedSet) {
  const available = [];
  for (let l = 0; l < grids.length; l++) {
    const grid = grids[l];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        const val = grid[r][c];
        if (val === 0) continue;
        const key = `${l},${r},${c}`;
        if (removedSet.has(key)) continue;
        if (!isCardBlocked(grids, l, r, c, removedSet)) {
          available.push({ layer: l, row: r, col: c, type: val, key });
        }
      }
    }
  }
  return available;
}

export function countTotalCards(grids) {
  let count = 0;
  grids.forEach(grid => grid.forEach(row => row.forEach(v => { if (v !== 0) count++; })));
  return count;
}