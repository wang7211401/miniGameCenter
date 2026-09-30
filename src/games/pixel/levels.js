// src/games/pixel/levels.js
// 像素填色 100 关配置：难度按 1-100 递增
const BANDS = [
  { from: 1, to: 10, size: 5, colors: 2, hints: 0, timeLimit: 0 },
  { from: 11, to: 20, size: 6, colors: 3, hints: 0, timeLimit: 0 },
  { from: 21, to: 30, size: 8, colors: 4, hints: 0, timeLimit: 0 },
  { from: 31, to: 40, size: 10, colors: 5, hints: 0, timeLimit: 0 },
  { from: 41, to: 50, size: 12, colors: 6, hints: 3, timeLimit: 0 },
  { from: 51, to: 60, size: 14, colors: 8, hints: 0, timeLimit: 600 },
  { from: 61, to: 70, size: 16, colors: 10, hints: 0, timeLimit: 0 },
  { from: 71, to: 80, size: 20, colors: 12, hints: 2, timeLimit: 0 },
  { from: 81, to: 90, size: 24, colors: 16, hints: 0, timeLimit: 720 },
  { from: 91, to: 100, size: 32, colors: 20, hints: 1, timeLimit: 720 },
];

export const levels = [];
for (let id = 1; id <= 100; id++) {
  const band = BANDS.find(b => id >= b.from && id <= b.to);
  // 91-100 关颜色数 20→24 递增
  const colors = id >= 91 ? 20 + Math.min(4, Math.floor((id - 91) / 2)) : band.colors;
  levels.push({
    id,
    size: band.size,
    colors,
    showProgress: id >= 11, // 显示完成度
    longPress: id >= 21, // 长按连续填
    zoom: id >= 31, // 支持缩放
    hints: band.hints, // 提示次数
    timeLimit: band.timeLimit, // 限时（秒），0=不限时
    errorStats: id >= 61, // 错误统计
    accuracy: id >= 91, // 精确度评星
  });
}

export function getLevelConfig(id) {
  const i = Math.min(100, Math.max(1, parseInt(id, 10) || 1));
  return levels[i - 1];
}
