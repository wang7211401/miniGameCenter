// src/games/sokoban/levels.js
import { levelStrings } from './microbanLevels';

function parseMap(str) {
  return str.split('|').map(row => row.split('').map(Number));
}

export const levels = levelStrings.map((str, index) => ({
  id: index + 1,
  map: parseMap(str),
}));