// src/games/idiom/idiomLogic.js

// 打乱字符串
export function shuffleString(str) {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // 如果打乱后和原顺序一样，重新打乱一次
  if (arr.join('') === str && arr.length > 1) {
    return shuffleString(str);
  }
  return arr;
}

// 检查答案是否正确
export function checkAnswer(selectedChars, correctIdiom) {
  return selectedChars.join('') === correctIdiom;
}