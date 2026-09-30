// src/games/crossword/crosswordLogic.js
// 填字游戏核心逻辑：交叉布词生成 + 结构校验 + 对局操作。
//
// 生成思路（构造性保证横纵词交叉一致）：
// 1. 先放一个横词；之后每个新词必须与已放词在"共享汉字"处垂直交叉。
// 2. 放置时做平行邻接检查：新词的非交叉格两侧必须为空，词端延伸格必须为空，
//    从而保证棋盘上每条长度≥2 的连续白格 run 恰好对应一个已放词（无意外词）。
// 3. 放完后提取全部横/纵 run 逐一与词表比对做最终校验，失败则重新生成。

import { wordsOfLength } from './wordbank';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArr(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- 放置规则 ----------
// grid: Array(size*size) 存 char|null。dir: 'H'|'V'。返回是否可放置。
function canPlace(grid, size, chars, startR, startC, dir) {
  const dr = dir === 'H' ? 0 : 1;
  const dc = dir === 'H' ? 1 : 0;
  // 两端延伸格必须为空（防止 run 合并成意外长词）
  const out = (r, c) => r < 0 || c < 0 || r >= size || c >= size;
  const beforeR = startR - dr, beforeC = startC - dc;
  const afterR = startR + chars.length * dr, afterC = startC + chars.length * dc;
  if (!out(beforeR, beforeC) && grid[beforeR * size + beforeC] !== null) return false;
  if (!out(afterR, afterC) && grid[afterR * size + afterC] !== null) return false;

  let crossings = 0;
  for (let k = 0; k < chars.length; k++) {
    const r = startR + k * dr, c = startC + k * dc;
    const idx = r * size + c;
    const ch = chars[k];
    if (grid[idx] !== null) {
      if (grid[idx] !== ch) return false; // 交叉字必须一致
      crossings++;
    } else {
      // 非交叉格：垂直方向两侧必须为空（防止平行意外 run）
      const s1r = dir === 'H' ? r - 1 : r, s1c = dir === 'H' ? c : c - 1;
      const s2r = dir === 'H' ? r + 1 : r, s2c = dir === 'H' ? c : c + 1;
      if (!out(s1r, s1c) && grid[s1r * size + s1c] !== null) return false;
      if (!out(s2r, s2c) && grid[s2r * size + s2c] !== null) return false;
    }
  }
  return crossings >= 1; // 必须与已有词交叉
}

function placeWord(grid, size, chars, startR, startC, dir) {
  const dr = dir === 'H' ? 0 : 1;
  const dc = dir === 'H' ? 1 : 0;
  const cells = [];
  for (let k = 0; k < chars.length; k++) {
    const idx = (startR + k * dr) * size + (startC + k * dc);
    grid[idx] = chars[k];
    cells.push(idx);
  }
  return cells;
}

// ---------- 生成 ----------
export function generateBoard(level, seed) {
  const size = level.size;
  const minLen = level.minLen || 2;
  const maxLen = Math.min(level.maxLen || 4, size);

  // 候选词池（按长度分组，洗牌后使用）
  const pool = [];
  for (let n = minLen; n <= maxLen; n++) {
    for (const w of wordsOfLength(n)) pool.push(w);
  }

  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = mulberry32((seed + attempt * 7919) >>> 0);
    const target = level.minWords + Math.floor(rng() * (level.maxWords - level.minWords + 1));
    const grid = new Array(size * size).fill(null);
    const placed = []; // {entry, chars, dir, r, c, cells}

    const tryAdd = (entry) => {
      const chars = [...entry.w];
      if (chars.length > size) return false;
      const dirs = rng() < 0.5 ? ['H', 'V'] : ['V', 'H'];
      for (const dir of dirs) {
        // 交叉点：新词字位 k × 已放词格 idx（同字）
        const crossOptions = [];
        for (let k = 0; k < chars.length; k++) {
          for (const w of placed) {
            for (const idx of w.cells) {
              if (grid[idx] === chars[k]) crossOptions.push({ k, idx });
            }
          }
        }
        if (!crossOptions.length) continue;
        shuffleArr(crossOptions, rng);
        const limit = Math.min(40, crossOptions.length);
        for (let oi = 0; oi < limit; oi++) {
          const pick = crossOptions[oi];
          const cr = Math.floor(pick.idx / size), cc = pick.idx % size;
          let startR, startC;
          if (dir === 'H') { startR = cr; startC = cc - pick.k; }
          else { startR = cr - pick.k; startC = cc; }
          if (startR < 0 || startC < 0 || startR + (dir === 'H' ? 0 : chars.length - 1) >= size ||
              startC + (dir === 'H' ? chars.length - 1 : 0) >= size) continue;
          if (!canPlace(grid, size, chars, startR, startC, dir)) continue;
          const cells = placeWord(grid, size, chars, startR, startC, dir);
          placed.push({ entry, chars, dir, r: startR, c: startC, cells });
          return true;
        }
      }
      return false;
    };

    // 首词：横向随机位置（多试几个位置）
    const firstPool = shuffleArr(pool.slice(), rng);
    let first = null;
    for (const e of firstPool) {
      const chars = [...e.w];
      if (chars.length > size) continue;
      for (let posTry = 0; posTry < 12 && !first; posTry++) {
        const r = Math.floor(rng() * size);
        const c = Math.floor(rng() * (size - chars.length + 1));
        const ok = (() => {
          for (let k = 0; k < chars.length; k++) {
            const idx = r * size + c + k;
            if (grid[idx] !== null) return false;
            if (r - 1 >= 0 && grid[(r - 1) * size + c + k] !== null) return false;
            if (r + 1 < size && grid[(r + 1) * size + c + k] !== null) return false;
          }
          const bl = c - 1, ar = c + chars.length;
          if (bl >= 0 && grid[r * size + bl] !== null) return false;
          if (ar < size && grid[r * size + ar] !== null) return false;
          return true;
        })();
        if (!ok) continue;
        const cells = placeWord(grid, size, chars, r, c, 'H');
        placed.push({ entry: e, chars, dir: 'H', r, c, cells });
        first = e;
      }
      if (first) break;
    }
    if (!first) continue;

    // 多轮贪心加词：每轮尝试全部剩余词，直到达标或一轮无进展
    let rest = shuffleArr(pool.slice(), rng);
    for (let pass = 0; pass < 6 && placed.length < target; pass++) {
      let progress = false;
      const next = [];
      for (const e of rest) {
        if (placed.length >= target) { next.push(e); continue; }
        if (placed.some(p => p.entry.w === e.w)) continue;
        if (tryAdd(e)) progress = true;
        else next.push(e);
      }
      rest = shuffleArr(next, rng);
      if (!progress) break;
    }
    if (placed.length < level.minWords) continue;

    // ---------- 结构校验：每条 run 必须恰好是一个已放词 ----------
    const runWords = [];
    let bad = false;
    // 横向
    for (let r = 0; r < size && !bad; r++) {
      let c = 0;
      while (c < size) {
        if (grid[r * size + c] === null) { c++; continue; }
        let e = c;
        while (e + 1 < size && grid[r * size + e + 1] !== null) e++;
        const len = e - c + 1;
        if (len >= 2) {
          const chars = [];
          for (let k = c; k <= e; k++) chars.push(grid[r * size + k]);
          const hit = placed.find(p => p.dir === 'H' && p.r === r && p.c === c && p.chars.join('') === chars.join(''));
          if (!hit) { bad = true; break; }
          runWords.push(hit);
        }
        c = e + 1;
      }
    }
    // 纵向
    for (let c = 0; c < size && !bad; c++) {
      let r = 0;
      while (r < size) {
        if (grid[r * size + c] === null) { r++; continue; }
        let e = r;
        while (e + 1 < size && grid[(e + 1) * size + c] !== null) e++;
        const len = e - r + 1;
        if (len >= 2) {
          const chars = [];
          for (let k = r; k <= e; k++) chars.push(grid[k * size + c]);
          const hit = placed.find(p => p.dir === 'V' && p.r === r && p.c === c && p.chars.join('') === chars.join(''));
          if (!hit) { bad = true; break; }
          runWords.push(hit);
        }
        r = e + 1;
      }
    }
    if (bad) continue;
    // 所有已放词都必须真的成为 run（长度≥2 且位置一致）
    if (runWords.length !== placed.length) continue;

    const board = buildBoard(grid, size, placed, level);
    if (board) return board;
  }
  throw new Error(`填字第 ${level.id} 关生成失败`);
}

// ---------- 组装棋盘数据（编号、提示、交叉标记） ----------
function buildBoard(grid, size, placed, level) {
  const white = [];
  const sol = new Array(size * size).fill(null);
  for (let i = 0; i < size * size; i++) {
    if (grid[i] !== null) { white.push(i); sol[i] = grid[i]; }
  }

  // 每格所属的词（用于判断交叉格）
  const cellWordCount = new Map();
  for (const p of placed) {
    for (const idx of p.cells) {
      cellWordCount.set(idx, (cellWordCount.get(idx) || 0) + 1);
    }
  }

  // 标准编号：按行优先扫描，白格若"左边黑且右边白"或"上边黑且下边白"则编号
  const isWhite = (r, c) => r >= 0 && c >= 0 && r < size && c < size && grid[r * size + c] !== null;
  let num = 0;
  const words = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isWhite(r, c)) continue;
      const startsH = !isWhite(r, c - 1) && isWhite(r, c + 1);
      const startsV = !isWhite(r - 1, c) && isWhite(r + 1, c);
      if (!startsH && !startsV) continue;
      num++;
      if (startsH) {
        const p = placed.find(x => x.dir === 'H' && x.r === r && x.c === c);
        if (!p) return null;
        words.push(makeWordEntry(num, 'H', r, c, p, cellWordCount, level, words.length));
      }
      if (startsV) {
        const p = placed.find(x => x.dir === 'V' && x.r === r && x.c === c);
        if (!p) return null;
        words.push(makeWordEntry(num, 'V', r, c, p, cellWordCount, level, words.length));
      }
    }
  }

  // 词间引用：每格属于哪些词
  const cellWords = new Map();
  words.forEach((w, wi) => {
    for (const idx of w.cells) {
      if (!cellWords.has(idx)) cellWords.set(idx, []);
      cellWords.get(idx).push(wi);
    }
  });

  // 每格起始词映射（UI 编号用）
  const cellStart = new Map();
  words.forEach((w, wi) => {
    if (!cellStart.has(w.cells[0])) cellStart.set(w.cells[0], []);
    cellStart.get(w.cells[0]).push(wi);
  });

  // 键盘字符：本关答案全部字 + 常用字补充
  const keySet = new Set();
  for (const idx of white) keySet.add(sol[idx]);
  return {
    id: level.id,
    size,
    white,
    sol,
    words,
    cellWords,
    cellStart,
    hintStyle: level.hintStyle,
    errorLimit: level.errorLimit,
    timeLimit: level.timeLimit,
    hintCount: level.hintCount,
    keyboard: buildKeyboard(keySet),
  };
}

function makeWordEntry(num, dir, r, c, p, cellWordCount, level, wi) {
  const entry = p.entry;
  const chars = p.chars;
  const isCross = chars.map((_, k) => {
    const idx = dir === 'H' ? r * level.size + c + k : (r + k) * level.size + c;
    return (cellWordCount.get(idx) || 0) > 1;
  });
  let hint;
  switch (level.hintStyle) {
    case 'synonym': hint = entry.s; break;
    case 'paraphrase': hint = entry.h; break;
    case 'fillin': {
      // 填空提示：交叉字外露，其余用 □
      hint = chars.map((ch, k) => (isCross[k] ? ch : '□')).join('');
      break;
    }
    case 'mixed': hint = [entry.h, entry.s, entry.r][wi % 3]; break;
    case 'obscure':
    case 'riddle':
    case 'allusion': hint = entry.r; break;
    default: hint = entry.h;
  }
  const cells = [];
  for (let k = 0; k < chars.length; k++) {
    cells.push(dir === 'H' ? r * level.size + c + k : (r + k) * level.size + c);
  }
  return { num, dir, r, c, chars, hint, cells, answer: entry.w };
}

// 常用汉字键盘：本关答案字（打乱）+ 高频常用字，保证一定能填出来
const COMMON_CHARS = [
  '天地日月山水火土木金人大小上下中一二三四五六七八九十百千万',
  '风雨雷电春夏秋冬花鸟鱼虫石云光明星江河湖海城乡村路桥梁',
  '心手口耳目足身发面毛皮骨肉血气声音香味色红黄蓝绿白黑灰',
  '东西南北前后左右内外远近高低快慢新旧多少有无是非对错',
  '家国春秋史诗词书画琴棋酒茶饭衣食住行走坐卧看听闻说写',
  '花好月圆春风秋霜冰雪云雾烟霞松柏竹梅兰菊桃李禾麦稻粱',
  '忠孝仁义礼智信勇勤俭温良恭让谦诚信明恕道德贤圣愚善恶',
  '龙马牛羊虎兔蛇猴鸡犬猪鸟燕雀鹰鹤鸳鸯蝴蝶蜂蚁鱼虾龟鹤',
  '江河南山塞楼台亭阁轩堂屋门窗帘幕帐屏风钟鼓琴瑟琵琶',
  '明月清风白露霜降惊蛰谷雨小满芒种处暑寒露霜降小雪大雪',
].join('').split('');

function buildKeyboard(solutionChars) {
  const seen = new Set();
  const out = [];
  const add = ch => { if (!seen.has(ch)) { seen.add(ch); out.push(ch); } };
  for (const ch of solutionChars) add(ch);
  for (const ch of COMMON_CHARS) add(ch);
  return out;
}

// ---------- 对局操作 ----------
export function createPlayState(board) {
  return {
    filled: new Map(), // idx -> char（仅正确的字会写入）
    selected: board.white[0],
    dir: 'H',
    errors: 0,
    hintsUsed: 0,
    won: false,
  };
}

export function selectCell(board, state, idx) {
  if (state.won) return state;
  const wi = board.cellWords.get(idx);
  let dir = state.dir;
  if (idx !== state.selected) {
    // 点击同一格切换方向；点击新格保持当前方向（若该格有此方向的词）
    if (wi && wi.length === 1) dir = board.words[wi[0]].dir;
  }
  return { ...state, selected: idx, dir };
}

export function toggleDir(board, state) {
  if (state.won) return state;
  return { ...state, dir: state.dir === 'H' ? 'V' : 'H' };
}

// 当前词（按选中格与方向）
export function currentWord(board, state) {
  const wi = board.cellWords.get(state.selected);
  if (!wi || !wi.length) return null;
  const prefer = wi.find(i => board.words[i].dir === state.dir);
  return board.words[prefer != null ? prefer : wi[0]];
}

// 输入一个字符。返回 { state, correct }
export function inputChar(board, state, ch) {
  if (state.won) return { state, correct: false };
  const word = currentWord(board, state);
  if (!word) return { state, correct: false };
  const pos = word.cells.indexOf(state.selected);
  if (pos < 0) return { state, correct: false };
  const idx = state.selected;
  const expect = board.sol[idx];
  if (ch === expect) {
    const filled = new Map(state.filled);
    filled.set(idx, ch);
    let selected = idx;
    // 自动前进到词内下一个未填格
    for (let k = pos + 1; k < word.cells.length; k++) {
      if (!filled.has(word.cells[k])) { selected = word.cells[k]; break; }
    }
    const won = filled.size === board.white.length;
    return { state: { ...state, filled, selected, won }, correct: true };
  }
  return {
    state: { ...state, errors: state.errors + 1 },
    correct: false,
  };
}

export function deleteChar(board, state) {
  if (state.won) return state;
  const word = currentWord(board, state);
  const pos = word ? word.cells.indexOf(state.selected) : -1;
  const filled = new Map(state.filled);
  if (filled.has(state.selected)) {
    filled.delete(state.selected);
  } else if (word && pos > 0) {
    // 后退一格再删
    const prev = word.cells[pos - 1];
    filled.delete(prev);
    return { ...state, filled, selected: prev };
  }
  return { ...state, filled };
}

// 提示：揭示当前格答案字。返回 null 表示提示次数用尽
export function useHint(board, state) {
  if (state.won) return null;
  if (board.hintCount > 0 && state.hintsUsed >= board.hintCount) return null;
  const idx = state.selected;
  if (state.filled.has(idx)) return state; // 已填对不消耗
  const filled = new Map(state.filled);
  filled.set(idx, board.sol[idx]);
  const won = filled.size === board.white.length;
  return { ...state, filled, hintsUsed: state.hintsUsed + 1, won };
}

export function computeStars(board, state, seconds) {
  let stars = 3;
  if (state.hintsUsed > 0) stars -= 1;
  if (state.errors > 0) stars -= 1;
  if (board.timeLimit > 0 && seconds > board.timeLimit * 0.8) stars -= 1;
  return Math.max(1, stars);
}
