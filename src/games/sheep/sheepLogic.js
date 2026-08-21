// src/games/sheep/sheepLogic.js

// 生成关卡：返回 { layers: [grid, ...], totalCards }
export function generateLevel(layers, rows, cols, numTypes) {
  // 确保总卡片数是3的倍数
  let totalCards = 0;
  const layerGrids = [];
  // 先分配每种类型的数量（尽量平均）
  const typeCounts = Array(numTypes).fill(0);
  // 预估总卡片数：每层随机填充60%~80%
  const totalSlots = layers * rows * cols;
  const fillRate = 0.6 + Math.random() * 0.25; // 0.6~0.85
  let estimated = Math.floor(totalSlots * fillRate);
  // 调整为3的倍数
  estimated = Math.floor(estimated / 3) * 3;
  // 分配类型
  let remaining = estimated;
  let idx = 0;
  while (remaining > 0) {
    typeCounts[idx % numTypes] += 3;
    remaining -= 3;
    idx++;
  }
  // 构建卡片池
  const pool = [];
  typeCounts.forEach((count, type) => {
    for (let i = 0; i < count; i++) pool.push(type + 1);
  });
  shuffle(pool);

  // 逐层填充
  let poolIdx = 0;
  const grids = [];
  for (let l = 0; l < layers; l++) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    // 生成该层要填充的位置（随机选取）
    const positions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions.push([r, c]);
      }
    }
    shuffle(positions);
    // 每层填充数量按比例递减（下层多，上层少）
    const layerRatio = 1 - (l / layers) * 0.4; // 底层80%，顶层60%
    const count = Math.min(positions.length, Math.floor(pool.length / layers * layerRatio));
    for (let i = 0; i < count && poolIdx < pool.length; i++) {
      const [r, c] = positions[i];
      grid[r][c] = pool[poolIdx++];
    }
    grids.push(grid);
  }
  // 如果卡片没用完，追加到底层
  while (poolIdx < pool.length) {
    const [r, c] = findEmptySlot(grids[0]);
    if (r === -1) break;
    grids[0][r][c] = pool[poolIdx++];
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
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === 0) return [r, c];
    }
  }
  return [-1, -1];
}

// 检测卡片是否被遮挡（被上层任何卡片覆盖）
export function isCardBlocked(grids, layer, row, col) {
  for (let l = layer + 1; l < grids.length; l++) {
    if (grids[l] && grids[l][row] && grids[l][row][col] !== 0) {
      return true;
    }
  }
  return false;
}

// 获取所有可点击的卡片（未被遮挡且未被移除）
export function getAvailableCards(grids, removedSet) {
  const available = [];
  for (let l = grids.length - 1; l >= 0; l--) {
    const grid = grids[l];
    if (!grid) continue;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        const key = `${l},${r},${c}`;
        if (grid[r][c] !== 0 && !removedSet.has(key) && !isCardBlocked(grids, l, r, c)) {
          available.push({ layer: l, row: r, col: c, type: grid[r][c], key });
        }
      }
    }
  }
  return available;
}

// 检查是否胜利
export function checkWin(removedSet, totalCards) {
  return removedSet.size === totalCards;
}

// 计算总卡片数
export function countTotalCards(grids) {
  let count = 0;
  grids.forEach(grid => {
    grid.forEach(row => {
      row.forEach(val => { if (val !== 0) count++; });
    });
  });
  return count;
}