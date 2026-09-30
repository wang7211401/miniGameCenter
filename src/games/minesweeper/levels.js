// src/games/minesweeper/levels.js
// 扫雷 100 关配置：rows/cols/mines/timeLimit/flagLimit/firstSafe/noGuess
// 难度按 1-100 递增，每关参数由 bandParams 确定性计算。

export const LEVEL_COUNT = 100;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function bandParams(id) {
  // 1-10: 5x5, 3-5 雷, 无限时, 首点安全, 无猜测
  if (id <= 10) {
    const i = id;
    return {
      rows: 5, cols: 5,
      mines: clamp(3 + Math.floor((i - 1) / 3), 3, 5),
      timeLimit: 0, flagLimit: 0,
      firstSafe: true, noGuess: true,
    };
  }
  // 11-20: 6x6, 5-8 雷
  if (id <= 20) {
    const i = id - 10;
    return {
      rows: 6, cols: 6,
      mines: clamp(5 + Math.floor((i - 1) / 3), 5, 8),
      timeLimit: 0, flagLimit: 0,
      firstSafe: true, noGuess: true,
    };
  }
  // 21-30: 8x8, 10-12 雷, 加入限时
  if (id <= 30) {
    const i = id - 20;
    return {
      rows: 8, cols: 8,
      mines: clamp(10 + Math.floor((i - 1) / 4), 10, 12),
      timeLimit: 120, flagLimit: 0,
      firstSafe: true, noGuess: true,
    };
  }
  // 31-40: 9x9, 12-15 雷
  if (id <= 40) {
    const i = id - 30;
    return {
      rows: 9, cols: 9,
      mines: clamp(12 + Math.floor((i - 1) / 3), 12, 15),
      timeLimit: 150, flagLimit: 0,
      firstSafe: true, noGuess: true,
    };
  }
  // 41-50: 10x10, 15-18 雷
  if (id <= 50) {
    const i = id - 40;
    return {
      rows: 10, cols: 10,
      mines: clamp(15 + Math.floor((i - 1) / 3), 15, 18),
      timeLimit: 180, flagLimit: 0,
      firstSafe: true, noGuess: true,
    };
  }
  // 51-60: 12x12, 20-25 雷
  if (id <= 60) {
    const i = id - 50;
    return {
      rows: 12, cols: 12,
      mines: clamp(20 + Math.floor((i - 1) / 2), 20, 25),
      timeLimit: 240, flagLimit: 0,
      firstSafe: true, noGuess: true,
    };
  }
  // 61-70: 12x12, 25-30 雷, 限时更短
  if (id <= 70) {
    const i = id - 60;
    return {
      rows: 12, cols: 12,
      mines: clamp(25 + Math.floor((i - 1) / 3), 25, 30),
      timeLimit: clamp(200 - i * 5, 150, 195), flagLimit: 0,
      firstSafe: true, noGuess: true,
    };
  }
  // 71-80: 14x14, 30-40 雷
  if (id <= 80) {
    const i = id - 70;
    return {
      rows: 14, cols: 14,
      mines: clamp(30 + Math.floor((i - 1) / 2), 30, 40),
      timeLimit: 300, flagLimit: 0,
      firstSafe: true, noGuess: true,
    };
  }
  // 81-90: 16x16, 40-50 雷
  if (id <= 90) {
    const i = id - 80;
    return {
      rows: 16, cols: 16,
      mines: clamp(40 + Math.floor((i - 1) / 2), 40, 50),
      timeLimit: 420, flagLimit: 0,
      firstSafe: true, noGuess: true,
    };
  }
  // 91-100: 16x16, 50-60 雷, 限时 + 限旗
  const i = id - 90;
  return {
    rows: 16, cols: 16,
    mines: clamp(50 + Math.floor((i - 1) / 2), 50, 60),
    timeLimit: clamp(360 - i * 4, 320, 356),
    flagLimit: clamp(60 - i, 50, 59),
    firstSafe: true, noGuess: true,
  };
}

export const levels = Array.from({ length: LEVEL_COUNT }, (_, idx) => {
  const id = idx + 1;
  const p = bandParams(id);
  return { id, name: `第 ${id} 关`, ...p };
});

export function getLevelConfig(id) {
  return levels.find(l => l.id === id) || levels[0];
}
