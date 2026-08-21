// src/games/match/matchLogic.js

// 生成初始棋盘 (避免三消)
export function generateBoard(rows, cols, numTypes) {
  let board = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let type;
      let attempts = 0;
      do {
        type = Math.floor(Math.random() * numTypes) + 1;
        attempts++;
      } while (attempts < 20 && (hasMatchAt(board, r, c, type)));
      board[r][c] = type;
    }
  }
  return board;
}

// 检测在 (r,c) 放置 type 后是否形成三消
function hasMatchAt(board, r, c, type) {
  // 水平检查
  let count = 1;
  // 向左
  for (let i = c - 1; i >= 0 && board[r] && board[r][i] === type; i--) count++;
  // 向右
  for (let i = c + 1; i < board[0].length && board[r][i] === type; i++) count++;
  if (count >= 3) return true;
  // 垂直检查
  count = 1;
  for (let i = r - 1; i >= 0 && board[i] && board[i][c] === type; i--) count++;
  for (let i = r + 1; i < board.length && board[i][c] === type; i++) count++;
  if (count >= 3) return true;
  return false;
}

// 查找所有可消除的匹配 (返回待消除坐标数组)
export function findMatches(board) {
  const matches = new Set();
  const rows = board.length;
  const cols = board[0].length;
  // 水平检查
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 2; c++) {
      if (board[r][c] !== 0 && board[r][c] === board[r][c+1] && board[r][c] === board[r][c+2]) {
        let end = c+2;
        while (end+1 < cols && board[r][end+1] === board[r][c]) end++;
        for (let i = c; i <= end; i++) matches.add(`${r},${i}`);
      }
    }
  }
  // 垂直检查
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows - 2; r++) {
      if (board[r][c] !== 0 && board[r][c] === board[r+1][c] && board[r][c] === board[r+2][c]) {
        let end = r+2;
        while (end+1 < rows && board[end+1][c] === board[r][c]) end++;
        for (let i = r; i <= end; i++) matches.add(`${i},${c}`);
      }
    }
  }
  return matches;
}

// 重力下落 (填补空洞)
export function applyGravity(board) {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map(row => [...row]);
  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (newBoard[r][c] !== 0) {
        newBoard[writeRow][c] = newBoard[r][c];
        if (writeRow !== r) newBoard[r][c] = 0;
        writeRow--;
      }
    }
  }
  return newBoard;
}

// 全盘检测消除并连锁，返回 { board, cleared, chainCount }
export function processMatches(board) {
  let cleared = 0;
  let chainCount = 0;
  let currentBoard = board.map(row => [...row]);
  while (true) {
    const matches = findMatches(currentBoard);
    if (matches.size === 0) break;
    // 消除
    matches.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      currentBoard[r][c] = 0;
    });
    cleared += matches.size;
    chainCount++;
    // 下落
    currentBoard = applyGravity(currentBoard);
    // 重新填充顶部空白（可选：用随机新宝石填充）
    for (let c = 0; c < currentBoard[0].length; c++) {
      let countZero = 0;
      for (let r = 0; r < currentBoard.length; r++) {
        if (currentBoard[r][c] === 0) countZero++;
      }
      for (let r = 0; r < countZero; r++) {
        // 生成随机类型（暂时简单处理，避免生成时产生新三消？但可能连锁继续）
        currentBoard[r][c] = Math.floor(Math.random() * 4) + 1; // 假设4种类型
      }
    }
    // 再次检测连锁（循环）
  }
  return { board: currentBoard, cleared, chainCount };
}