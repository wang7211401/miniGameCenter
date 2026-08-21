// src/games/sheep/levels.js
export const levels = Array.from({ length: 50 }, (_, i) => {
  let layers, rows, cols, numTypes;
  if (i < 15) { layers = 3; rows = 4; cols = 4; numTypes = 4; }
  else if (i < 30) { layers = 4; rows = 5; cols = 5; numTypes = 6; }
  else if (i < 45) { layers = 5; rows = 6; cols = 6; numTypes = 8; }
  else { layers = 6; rows = 7; cols = 7; numTypes = 10; }
  return { id: i + 1, layers, rows, cols, numTypes };
});