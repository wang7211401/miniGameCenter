// src/games/link/linkLogic.js

// 辅助函数：检查两点之间直线是否畅通（包括棋盘外部）
// board 是二维数组，r, c 是坐标
// 如果 r < 0 || r >= rows || c < 0 || c >= cols，则视为空（0）
function isLineClear(board, r1, c1, r2, c2) {
  const rows = board.length;
  const cols = board[0].length;

  // 如果两点相同，直接返回 true
  if (r1 === r2 && c1 === c2) return true;

  // 如果不同行且不同列，不能直线连接
  if (r1 !== r2 && c1 !== c2) return false;

  if (r1 === r2) {
    // 水平线
    const minC = Math.min(c1, c2);
    const maxC = Math.max(c1, c2);
    for (let c = minC + 1; c < maxC; c++) {
      // 如果点在棋盘内且不为0，则阻挡
      if (r1 >= 0 && r1 < rows && c >= 0 && c < cols) {
        if (board[r1][c] !== 0) return false;
      }
      // 如果点在棋盘外，视为空，继续
    }
    return true;
  } else {
    // 垂直线
    const minR = Math.min(r1, r2);
    const maxR = Math.max(r1, r2);
    for (let r = minR + 1; r < maxR; r++) {
      if (r >= 0 && r < rows && c1 >= 0 && c1 < cols) {
        if (board[r][c1] !== 0) return false;
      }
    }
    return true;
  }
}

export function canConnect(board, r1, c1, r2, c2) {
  if (!board?.length || !board[0]?.length) return false;

  const rows = board.length;
  const cols = board[0].length;

  // 边界检查
  if (r1 < 0 || r1 >= rows || c1 < 0 || c1 >= cols) return false;
  if (r2 < 0 || r2 >= rows || c2 < 0 || c2 >= cols) return false;

  if (r1 === r2 && c1 === c2) return false;
  const val1 = board[r1][c1];
  const val2 = board[r2][c2];

  if (val1 === 0 || val2 === 0) return false;
  if (val1 !== val2) return false;

  // 1. 直线连接
  if (isLineClear(board, r1, c1, r2, c2)) return true;

  // 2. 单折连接 (One Corner)
  // 拐点 (r1, c2) 必须为空
  if (board[r1][c2] === 0) {
    if (isLineClear(board, r1, c1, r1, c2) && isLineClear(board, r1, c2, r2, c2)) {
      return true;
    }
  }
  // 拐点 (r2, c1) 必须为空
  if (board[r2][c1] === 0) {
    if (isLineClear(board, r1, c1, r2, c1) && isLineClear(board, r2, c1, r2, c2)) {
      return true;
    }
  }

  // 3. 双折连接 (Two Corners)
  // 水平扫描：寻找中间列 c
  for (let c = -1; c <= cols; c++) {
    if (c === c1 || c === c2) continue;
    // 检查两个转折点是否为空（如果在棋盘内）
    if (c >= 0 && c < cols) {
      if (board[r1][c] !== 0 || board[r2][c] !== 0) continue;
    }
    // 检查三段直线
    if (isLineClear(board, r1, c1, r1, c) &&
        isLineClear(board, r1, c, r2, c) &&
        isLineClear(board, r2, c, r2, c2)) {
      return true;
    }
  }

  // 垂直扫描：寻找中间行 r
  for (let r = -1; r <= rows; r++) {
    if (r === r1 || r === r2) continue;
    if (r >= 0 && r < rows) {
      if (board[r][c1] !== 0 || board[r][c2] !== 0) continue;
    }
    if (isLineClear(board, r1, c1, r, c1) &&
        isLineClear(board, r, c1, r, c2) &&
        isLineClear(board, r, c2, r2, c2)) {
      return true;
    }
  }

  return false;
}

function isDirectConnect(board, r1, c1, r2, c2) {
  if (r1 === r2) {
    let minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
    for (let c = minC + 1; c < maxC; c++) {
      if (board[r1][c] !== 0) return false;
    }
    return true;
  } else if (c1 === c2) {
    let minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
    for (let r = minR + 1; r < maxR; r++) {
      if (board[r][c1] !== 0) return false;
    }
    return true;
  }
  return false;
}

function isOneCornerConnect(board, r1, c1, r2, c2) {
  // 拐点 (r1, c2)
  if (board[r1][c2] === 0) {
    if (isDirectConnect(board, r1, c1, r1, c2) && isDirectConnect(board, r1, c2, r2, c2))
      return true;
  }
  // 拐点 (r2, c1)
  if (board[r2][c1] === 0) {
    if (isDirectConnect(board, r1, c1, r2, c1) && isDirectConnect(board, r2, c1, r2, c2))
      return true;
  }
  return false;
}

function isTwoCornerConnect(board, r1, c1, r2, c2) {
  // 水平扫描：在行 r1 和 r2 之间找一个列 c，使得 (r1,c) 和 (r2,c) 为空且与两点直线相连
  for (let c = 0; c < board[0].length; c++) {
    if (c === c1 || c === c2) continue;
    if (board[r1][c] === 0 && board[r2][c] === 0) {
      if (isDirectConnect(board, r1, c1, r1, c) && isDirectConnect(board, r1, c, r2, c) && isDirectConnect(board, r2, c, r2, c2))
        return true;
    }
  }
  // 垂直扫描：在列 c1 和 c2 之间找一个行 r，使得 (r,c1) 和 (r,c2) 为空
  for (let r = 0; r < board.length; r++) {
    if (r === r1 || r === r2) continue;
    if (board[r][c1] === 0 && board[r][c2] === 0) {
      if (isDirectConnect(board, r1, c1, r, c1) && isDirectConnect(board, r, c1, r, c2) && isDirectConnect(board, r, c2, r2, c2))
        return true;
    }
  }
  return false;
}

// 初始化棋盘：生成图案对，并随机打乱
export function generateBoard(rows, cols, numTypes) {
  const total = rows * cols;
  if (total % 2 !== 0) throw new Error('棋盘格子数必须为偶数');

  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const pairs = total / 2;
    const patterns = [];
    for (let i = 0; i < pairs; i++) {
      const type = (i % numTypes) + 1;
      patterns.push(type, type);
    }
    shuffle(patterns);

    const board = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push(patterns[idx++]);
      }
      board.push(row);
    }

    // 检查是否有解
    if (hasRemainingMoves(board)) {
      return board;
    }
    attempts++;
  }

  console.warn("Failed to generate a solvable board after max attempts.");
  // 如果实在生成不出，返回一个随机棋盘，游戏可能会死锁
  const fallbackBoard = [];
  for (let r = 0; r < rows; r++) {
    fallbackBoard.push(new Array(cols).fill(0)); // 或者重新生成随机
  }
  // 这里为了简单，重新生成一个随机棋盘，即使无解
  const fallbackPatterns = [];
  for (let i = 0; i < pairs; i++) {
    fallbackPatterns.push((i % numTypes) + 1, (i % numTypes) + 1);
  }
  shuffle(fallbackPatterns);
  let fIdx = 0;
  const finalBoard = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(fallbackPatterns[fIdx++]);
    }
    finalBoard.push(row);
  }
  return finalBoard;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 检查是否还有可消除的对
export function hasRemainingMoves(board) {
  if (!board?.length || !board[0]?.length) return false;

  const rows = board.length, cols = board[0].length;
  for (let r1 = 0; r1 < rows; r1++) {
    for (let c1 = 0; c1 < cols; c1++) {
      if (board[r1][c1] === 0) continue;
      for (let r2 = 0; r2 < rows; r2++) {
        for (let c2 = 0; c2 < cols; c2++) {
          if (r1 === r2 && c1 === c2) continue;
          if (board[r2][c2] === 0) continue;
          if (board[r1][c1] !== board[r2][c2]) continue;
          if (canConnect(board, r1, c1, r2, c2)) return true;
        }
      }
    }
  }
  return false;
}