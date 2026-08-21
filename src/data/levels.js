// src/data/levels.js
export const GAME_LEVELS = {
  sudoku: { total: 10, name: '数独' },
  sokoban: { total: 10, name: '推箱子' },
  link: { total: 10, name: '连连看' },
  sheep: { total: 10, name: '羊了个羊' },
  tetris: { total: 10, name: '俄罗斯方块' },
  match: { total: 10, name: '消消乐' },
};

// 还可以为每个游戏定义每关的具体数据（如数独的空格数，推箱子地图索引等），后续扩展
// 例如：
// export const SUDOKU_LEVELS = [ ... ];
// 但暂时先保持简单。