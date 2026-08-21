// src/games/match/levels.js
export const levels = Array.from({ length: 50 }, (_, i) => {
  const steps = Math.max(15, 40 - i * 0.5);
  const target = Math.floor(10 + i * 3);
  return {
    id: i + 1,
    rows: 8,
    cols: 8,
    numTypes: 4 + Math.floor(i / 10), // 4~8种
    targetScore: target,
    maxSteps: Math.floor(steps),
  };
});