// src/games/sudoku/levels.js
export const levels = Array.from({ length: 200 }, (_, i) => {
  let difficulty;
  if (i < 40) difficulty = 'easy';      // 1-40
  else if (i < 100) difficulty = 'medium'; // 41-100
  else if (i < 160) difficulty = 'hard';   // 101-160
  else difficulty = 'expert';              // 161-200
  return { id: i + 1, difficulty };
});