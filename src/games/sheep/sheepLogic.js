/**
 * Sheep Game Logic
 * 
 * Core Concept: To ensure levels are always solvable, we use a "Reverse Construction" method.
 * 1. Create a pool of cards where every type exists in multiples of 3.
 * 2. Place them on the board randomly.
 * 3. The "removal" simulation in the game is just checking if a card is on top (no higher layer cards covering it) and not yet removed.
 */

export function generateLevel(layers, rows, cols, numTypes) {
  const totalSlots = layers * rows * cols;
  const targetFillRate = 0.65;
  let estimatedCards = Math.floor(totalSlots * targetFillRate);
  estimatedCards = Math.floor(estimatedCards / 3) * 3;
  if (estimatedCards > totalSlots) {
    estimatedCards = Math.floor(totalSlots / 3) * 3;
  }

  // ---------- 修复后的池构建 ----------
  // 保证每种类型至少出现 3 张（一个三元组）
  const minPerType = 3;
  const baseCards = numTypes * minPerType; // 基础总张数

  // 如果估算卡片数小于基础需求，直接提升到基础需求（并调整为 3 的倍数）
  if (estimatedCards < baseCards) {
    estimatedCards = Math.ceil(baseCards / 3) * 3;
    if (estimatedCards > totalSlots) {
      estimatedCards = Math.floor(totalSlots / 3) * 3;
    }
  }

  // 剩余卡片必须是 3 的倍数（用于分配额外的三元组）
  let remaining = estimatedCards - baseCards;
  if (remaining < 0) remaining = 0;
  // 保证 remaining 是 3 的倍数，如果不是则微调 estimatedCards
  if (remaining % 3 !== 0) {
    const diff = remaining % 3;
    estimatedCards += (3 - diff);
    if (estimatedCards > totalSlots) {
      estimatedCards = Math.floor(totalSlots / 3) * 3;
      remaining = estimatedCards - baseCards;
      if (remaining < 0) remaining = 0;
    }
  }

  // 每个类型的额外三元组数量
  const remainingTriplets = remaining / 3;
  const baseTripletsPerType = Math.floor(remainingTriplets / numTypes);
  const extraTriplets = remainingTriplets % numTypes;

  const pool = [];
  for (let t = 1; t <= numTypes; t++) {
    let count = 3; // 基础三元组
    count += 3 * baseTripletsPerType;
    if (t <= extraTriplets) count += 3; // 多分配一个三元组
    for (let i = 0; i < count; i++) {
      pool.push(t);
    }
  }

  // 此时 pool.length 应等于 estimatedCards，且每种类型数量都是 3 的倍数
  shuffle(pool);

  // ---------- 以下分配逻辑与原代码相同 ----------
  const grids = Array.from({ length: layers }, () =>
    Array.from({ length: rows }, () => Array(cols).fill(0))
  );

  let poolIndex = 0;
  for (let l = 0; l < layers; l++) {
    const positions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions.push({ r, c });
      }
    }
    shuffle(positions);
    const maxPerLayer = Math.floor(positions.length * 0.8);
    const cardsToPlace = Math.min(pool.length - poolIndex, maxPerLayer);
    for (let i = 0; i < cardsToPlace; i++) {
      if (poolIndex >= pool.length) break;
      const { r, c } = positions[i];
      grids[l][r][c] = pool[poolIndex++];
    }
  }

  while (poolIndex < pool.length) {
    const pos = findEmptySlot(grids[0]);
    if (!pos) break;
    grids[0][pos.r][pos.c] = pool[poolIndex++];
  }

  return grids;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function findEmptySlot(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const positions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 0) positions.push({ r, c });
    }
  }
  if (positions.length === 0) return null;
  return positions[Math.floor(Math.random() * positions.length)];
}

/**
 * Checks if a card is blocked.
 * A card is blocked if there is a card on a higher layer (larger index) at the same position
 * that has NOT been removed yet.
 */
export function isCardBlocked(grids, layer, row, col, removedSet) {
  for (let l = layer + 1; l < grids.length; l++) {
    const grid = grids[l];
    if (!grid) break;
    
    // Check if this cell has a card
    if (grid[row] && grid[row][col] !== 0) {
      const key = `${l},${row},${col}`;
      // If the covering card is still present, this card is blocked
      if (!removedSet.has(key)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Gets all clickable cards.
 */
export function getAvailableCards(grids, removedSet) {
  const available = [];
  const layers = grids.length;
  
  // Iterate all layers
  for (let l = 0; l < layers; l++) {
    const grid = grids[l];
    if (!grid) continue;
    
    const rows = grid.length;
    const cols = grid[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        if (val === 0) continue; // Empty slot
        
        const key = `${l},${r},${c}`;
        if (removedSet.has(key)) continue; // Already removed
        
        // Check if blocked by higher layers
        if (isCardBlocked(grids, l, r, c, removedSet)) {
          continue;
        }
        
        available.push({
          layer: l,
          row: r,
          col: c,
          type: val,
          key
        });
      }
    }
  }
  return available;
}

export function checkWin(removedSet, totalCards) {
  return removedSet.size === totalCards;
}

export function countTotalCards(grids) {
  let count = 0;
  grids.forEach(grid => {
    grid.forEach(row => {
      row.forEach(val => { if (val !== 0) count++; });
    });
  });
  return count;
}