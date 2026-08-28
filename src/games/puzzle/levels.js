// src/games/puzzle/levels.js

// 关卡配置
// 请将图片文件放在 assets 目录，或替换为网络图片地址
export const levels = [
  {
    id: 1,
    name: '初级 · 3×3',
    gridSize: 3,
    image: require('./assets/puzzle1.jpg'), // 替换为你的图片
  },
  {
    id: 2,
    name: '中级 · 4×4',
    gridSize: 4,
    image: require('./assets/puzzle2.jpg'), // 替换为你的图片
  },
  {
    id: 3,
    name: '高级 · 5×5',
    gridSize: 5,
    image: require('./assets/puzzle3.jpg'), // 替换为你的图片
  },
];