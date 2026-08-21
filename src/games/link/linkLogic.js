// src/games/link/linkLogic.js

// 检查两个格子是否相同且可连接
export function canConnect(board, r1, c1, r2, c2) {
  if (r1 === r2 && c1 === c2) return false;
  if (board[r1][c1] !== board[r2][c2]) return false;
  if (board[r1][c1] === 0 || board[r2][c2] === 0) return false;
  // 直线连接
  if (isDirectConnect(board, r1, c1, r2, c2)) return true;
  // 单折连接
  if (isOneCornerConnect(board, r1, c1, r2, c2)) return true;
  // 双折连接
  if (isTwoCornerConnect(board, r1, c1, r2, c2)) return true;
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
  const pairs = total / 2;
  const patterns = [];
  for (let i = 0; i < pairs; i++) {
    const type = (i % numTypes) + 1; // 图案编号从1开始
    patterns.push(type, type);
  }
  // 打乱
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
  return board;
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