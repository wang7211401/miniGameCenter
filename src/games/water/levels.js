// src/games/water/levels.js
// 颜色倒水 100 关配置：管数 = 颜色数 + 1（固定 1 根空管），容量 4（91-100 升到 5）。
// 步数限制 = 求解器最少步数 + slack（slack=0 表示不限步）；最少步数在开局生成时计算。
// 布局与可解性由 waterLogic.generateLevel 用求解器验证，失败自动重排。

export const LEVEL_COUNT = 100;

// 段内 1..10 从 start 递减插值到 end
const interp = (i, start, end) => start - Math.round(((i - 1) * (start - end)) / 9);

function bandParams(id) {
  if (id <= 10) {
    const i = id;
    return {
      colorCount: 5, capacity: 4, slack: 0, hints: interp(i, 3, 1),
      lockedTubes: 0, hiddenLayers: 0,
      swaps: 2 + i * 3, // 教学关：颜色分布由简单到交错（随机交换次数递增）
    };
  }
  if (id <= 20) {
    const i = id - 10;
    return { colorCount: 5, capacity: 4, slack: interp(i, 15, 8), hints: interp(i, 2, 0), lockedTubes: 0, hiddenLayers: 0, swaps: 0 };
  }
  if (id <= 30) {
    const i = id - 20;
    return { colorCount: 6, capacity: 4, slack: 0, hints: interp(i, 2, 0), lockedTubes: 0, hiddenLayers: 0, swaps: 0 };
  }
  if (id <= 40) {
    const i = id - 30;
    return { colorCount: 6, capacity: 4, slack: interp(i, 12, 6), hints: interp(i, 2, 0), lockedTubes: 0, hiddenLayers: 0, swaps: 0 };
  }
  if (id <= 50) {
    return { colorCount: 7, capacity: 4, slack: 0, hints: interp(id - 40, 1, 0), lockedTubes: 0, hiddenLayers: 0, swaps: 0 };
  }
  if (id <= 60) {
    return { colorCount: 8, capacity: 4, slack: 0, hints: interp(id - 50, 1, 0), lockedTubes: 0, hiddenLayers: 0, swaps: 0 };
  }
  if (id <= 70) {
    return { colorCount: 9, capacity: 4, slack: 0, hints: interp(id - 60, 1, 0), lockedTubes: 0, hiddenLayers: 0, swaps: 0 };
  }
  if (id <= 80) {
    return { colorCount: 10, capacity: 4, slack: 0, hints: interp(id - 70, 1, 0), lockedTubes: 0, hiddenLayers: 0, swaps: 0 };
  }
  if (id <= 90) {
    const i = id - 80;
    return { colorCount: 10, capacity: 4, slack: interp(i, 10, 4), hints: interp(i, 1, 0), lockedTubes: 0, hiddenLayers: 0, swaps: 0 };
  }
  const i = id - 90; // 91-100：容量 4→5、步数余量 +3→+1、锁定管 0→2、隐藏层 0→2
  return {
    colorCount: 10,
    capacity: i <= 5 ? 4 : 5,
    slack: interp(i, 3, 1),
    hints: interp(i, 1, 0),
    lockedTubes: i <= 3 ? 0 : i <= 6 ? 1 : 2,
    hiddenLayers: i <= 3 ? 0 : i <= 6 ? 1 : 2,
    swaps: 0,
  };
}

export const levels = Array.from({ length: LEVEL_COUNT }, (_, idx) => {
  const id = idx + 1;
  const p = bandParams(id);
  return {
    id,
    name: `第 ${id} 关`,
    tubeCount: p.colorCount + 1, // 颜色管 + 1 根空管
    emptyCount: 1,
    ...p,
  };
});

export function getLevelConfig(id) {
  return levels.find(l => l.id === id) || levels[0];
}
