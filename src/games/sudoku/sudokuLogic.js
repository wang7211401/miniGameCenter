// src/games/sudoku/sudokuLogic.js

// 生成完整数独解
function generateSudoku() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveSudoku(board);
  return board;
}

function solveSudoku(board) {
  const empty = findEmpty(board);
  if (!empty) return true;
  const [row, col] = empty;
  const nums = shuffle([1,2,3,4,5,6,7,8,9]);
  for (let num of nums) {
    if (isValid(board, row, col, num)) {
      board[row][col] = num;
      if (solveSudoku(board)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function findEmpty(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function isValid(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
    const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
    const boxCol = 3 * Math.floor(col / 3) + (i % 3);
    if (board[boxRow][boxCol] === num) return false;
  }
  return true;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 生成关卡（含初始盘面和答案）
export function generatePuzzle(difficulty = 'medium') {
  const solution = generateSudoku();
  const puzzle = solution.map(row => [...row]);
  let blanks;
  switch (difficulty) {
    case 'easy': blanks = 30; break;
    case 'medium': blanks = 45; break;
    case 'hard': blanks = 55; break;
    case 'expert': blanks = 60; break;
    default: blanks = 45;
  }
  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  shuffle(positions);
  for (let i = 0; i < blanks; i++) {
    const [r, c] = positions[i];
    puzzle[r][c] = 0;
  }
  return { puzzle, solution };
}

// 检查玩家填写的盘面是否与答案一致
export function checkSolution(playerBoard, solution) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (playerBoard[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

// 实时校验行/列/宫（可选）
export function isValidPlacement(board, row, col, num) {
  // 检查该位置是否与已有数字冲突
  for (let i = 0; i < 9; i++) {
    if (i !== col && board[row][i] === num) return false;
    if (i !== row && board[i][col] === num) return false;
    const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
    const boxCol = 3 * Math.floor(col / 3) + (i % 3);
    if ((boxRow !== row || boxCol !== col) && board[boxRow][boxCol] === num) return false;
  }
  return true;
}