// src/games/idiom/levels.js
import { idiomList } from './idiomData';

// 每个成语作为一关，按顺序
export const levels = idiomList.map((idiom, index) => ({
  id: index + 1,
  idiom,
  hint: `（共${idiom.length}个字）`,
}));