// src/games/crossword/levels.js
// 填字游戏 100 关配置。棋盘布局由 crosswordLogic.generateBoard 交叉布词生成并校验。
// 此处只描述每关的目标参数（尺寸、词数区间、提示风格、限制），确定性可复现。

export const LEVEL_COUNT = 100;

// 提示风格：
// direct=直接提示(h)  synonym=同义提示(s)  paraphrase=释义提示(h)
// fillin=填空提示(交叉字外露)  mixed=混合(h/s/r 轮换)  obscure=隐晦(r)
// riddle=谜语(r)  allusion=典故(r)
function bandParams(id) {
  const p = {
    size: 5,
    minWords: 4, maxWords: 6,
    minLen: 2, maxLen: 4,
    hintStyle: 'direct',
    errorLimit: 0,   // 0 = 不限
    timeLimit: 0,    // 0 = 不限（秒）
    hintCount: 0,    // 0 = 不限
  };
  if (id <= 10) {
    p.size = 5; p.minWords = 4; p.maxWords = 6;
    p.hintStyle = 'direct';
  } else if (id <= 20) {
    p.size = 6; p.minWords = 6; p.maxWords = 8;
    p.hintStyle = 'direct';
  } else if (id <= 30) {
    p.size = 7; p.minWords = 8; p.maxWords = 10;
    p.maxLen = 5; p.hintStyle = 'synonym'; p.errorLimit = 3;
  } else if (id <= 40) {
    p.size = 8; p.minWords = 10; p.maxWords = 12;
    p.maxLen = 5; p.hintStyle = 'synonym'; p.timeLimit = 300;
  } else if (id <= 50) {
    p.size = 9; p.minWords = 12; p.maxWords = 15;
    p.maxLen = 5; p.hintStyle = 'paraphrase'; p.hintCount = 3;
  } else if (id <= 60) {
    p.size = 10; p.minWords = 15; p.maxWords = 18;
    p.maxLen = 6; p.hintStyle = 'fillin'; p.timeLimit = 360;
  } else if (id <= 70) {
    p.size = 11; p.minWords = 18; p.maxWords = 22;
    p.maxLen = 6; p.hintStyle = 'mixed'; p.errorLimit = 2;
  } else if (id <= 80) {
    p.size = 12; p.minWords = 22; p.maxWords = 26;
    p.maxLen = 7; p.hintStyle = 'obscure'; p.timeLimit = 480;
  } else if (id <= 90) {
    p.size = 13; p.minWords = 26; p.maxWords = 32;
    p.maxLen = 7; p.hintStyle = 'riddle'; p.hintCount = 2;
  } else {
    // 91-100 综合：典故提示 + 限时 + 限错 + 提示少
    p.size = 15; p.minWords = 35; p.maxWords = 45;
    p.maxLen = 7; p.hintStyle = 'allusion';
    p.timeLimit = 600; p.errorLimit = 3; p.hintCount = 2;
  }
  return p;
}

export const levels = Array.from({ length: LEVEL_COUNT }, (_, idx) => {
  const id = idx + 1;
  return { id, name: `第 ${id} 关`, ...bandParams(id) };
});

export function getLevelConfig(id) {
  return levels.find(l => l.id === id) || levels[0];
}
