// src/games/2048/logic.js

export function processRow(row) {
  // 去掉零
  let filtered = row.filter(v => v !== 0);
  let merged = [];
  let score = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      merged.push(filtered[i] * 2);
      score += filtered[i] * 2;
      i++; // 跳过下一个
    } else {
      merged.push(filtered[i]);
    }
  }
  // 补零
  while (merged.length < row.length) {
    merged.push(0);
  }
  return { row: merged, score };
}

export function moveLeft(board) {
  let newBoard = board.map(row => [...row]);
  let totalScore = 0;
  let moved = false;
  for (let r = 0; r < 4; r++) {
    const { row: newRow, score } = processRow(newBoard[r]);
    if (newRow.join(',') !== newBoard[r].join(',')) moved = true;
    newBoard[r] = newRow;
    totalScore += score;
  }
  return { board: newBoard, moved, score: totalScore };
}

export function moveRight(board) {
  let newBoard = board.map(row => [...row]);
  let totalScore = 0;
  let moved = false;
  for (let r = 0; r < 4; r++) {
    const reversed = [...newBoard[r]].reverse();
    const { row: processed, score } = processRow(reversed);
    const newRow = processed.reverse();
    if (newRow.join(',') !== newBoard[r].join(',')) moved = true;
    newBoard[r] = newRow;
    totalScore += score;
  }
  return { board: newBoard, moved, score: totalScore };
}

function getColumn(board, col) {
  return board.map(row => row[col]);
}

function setColumn(board, col, column) {
  for (let r = 0; r < 4; r++) {
    board[r][col] = column[r];
  }
}

export function moveUp(board) {
  let newBoard = board.map(row => [...row]);
  let totalScore = 0;
  let moved = false;
  for (let c = 0; c < 4; c++) {
    let col = getColumn(newBoard, c);
    const { row: newCol, score } = processRow(col);
    if (newCol.join(',') !== col.join(',')) moved = true;
    setColumn(newBoard, c, newCol);
    totalScore += score;
  }
  return { board: newBoard, moved, score: totalScore };
}

export function moveDown(board) {
  let newBoard = board.map(row => [...row]);
  let totalScore = 0;
  let moved = false;
  for (let c = 0; c < 4; c++) {
    let col = getColumn(newBoard, c);
    const reversed = [...col].reverse();
    const { row: processed, score } = processRow(reversed);
    const newCol = processed.reverse();
    if (newCol.join(',') !== col.join(',')) moved = true;
    setColumn(newBoard, c, newCol);
    totalScore += score;
  }
  return { board: newBoard, moved, score: totalScore };
}

export function generateNewTile(board) {
  const emptyCells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) emptyCells.push({ r, c });
    }
  }
  if (emptyCells.length === 0) return board;
  const randIdx = Math.floor(Math.random() * emptyCells.length);
  const { r, c } = emptyCells[randIdx];
  const value = Math.random() < 0.9 ? 2 : 4;
  board[r][c] = value;
  return board;
}

export function isGameOver(board) {
  // 如果有空位，未结束
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  // 检查水平相邻
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] === board[r][c + 1]) return false;
    }
  }
  // 检查垂直相邻
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === board[r + 1][c]) return false;
    }
  }
  return true;
}

export function initBoard() {
  let board = Array(4).fill().map(() => Array(4).fill(0));
  // 添加两个初始数字
  board = generateNewTile(board);
  board = generateNewTile(board);
  return board;
}