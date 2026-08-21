// src/games/tetris/levels.js
export const levels = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  targetScore: (i + 1) * 200,
  initialSpeed: Math.max(100, 800 - i * 25),
}));