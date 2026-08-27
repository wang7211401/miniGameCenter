// src/games/sheep/levels.js

/**
 * 根据关卡 ID 动态生成难度参数
 * 支持无限扩展，但这里我们固定生成 50 关
 */
function getLevelConfig(levelId) {
  const baseLayers = 4;
  const baseRows = 4;
  const baseCols = 4;
  const baseTypes = 4;

  const tier = Math.floor((levelId - 1) / 15);
  const progress = (levelId - 1) % 15;

  let layers = baseLayers + tier * 2;
  let rows = baseRows + Math.floor(tier / 2);
  let cols = baseCols + Math.floor(tier / 2);
  let numTypes = baseTypes + tier;

  layers = Math.min(layers, 20);
  rows = Math.min(rows, 8);
  cols = Math.min(cols, 8);
  numTypes = Math.min(numTypes, 12);

  // 前 5 关稍微降低难度
  if (progress < 5) {
    layers = Math.max(layers - 1, 3);
    numTypes = Math.max(numTypes - 1, 3);
  }

  return { layers, rows, cols, numTypes };
}

// 生成 50 个关卡配置，保留总关卡数
export const levels = Array.from({ length: 50 }, (_, i) => {
  const id = i + 1;
  const { layers, rows, cols, numTypes } = getLevelConfig(id);
  return { id, layers, rows, cols, numTypes };
});

// 如果你需要，还可以导出总关卡数
export const TOTAL_LEVELS = levels.length;

// 如果需要支持无限关卡，可以保留这个函数以供外部调用
export { getLevelConfig };
