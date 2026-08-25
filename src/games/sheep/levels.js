// src/games/sheep/levels.js
export const levels = Array.from({ length: 50 }, (_, i) => {
  let layers, rows, cols, numTypes;
  if (i < 15) { layers = 5; rows = 4; cols = 4; numTypes = 4; }
  else if (i < 30) { layers = 7; rows = 5; cols = 5; numTypes = 6; }
  else if (i < 45) { layers = 9; rows = 6; cols = 6; numTypes = 8; }
  else if (i < 60) { layers = 10; rows = 6; cols = 6; numTypes = 8; } 
  else if (i < 80) { layers = 12; rows = 7; cols = 7; numTypes = 10; }
  else if (i < 100) { layers = 15; rows = 7; cols = 7; numTypes = 10; } 
  else { layers = 20; rows = 8; cols = 8; numTypes = 12; }
  return { id: i + 1, layers, rows, cols, numTypes };
});