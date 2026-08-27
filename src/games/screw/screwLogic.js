// src/games/screw/screwLogic.js

// 颜色常量
export const COLORS = [1, 2, 3]; // 1:红, 2:蓝, 3:绿
export const COLOR_NAMES = ['', '🔴', '🔵', '🟢'];
export const MAX_SLOT = 5; // 每个颜色槽容量

// 生成一个可解的棋盘
export function generateBoard(rows, cols, numScrews, numColors = 3) {
  // 先创建空棋盘
  let board = Array.from({ length: rows }, () => Array(cols).fill(0));

  // 确保所有螺丝都有解：采用“从内向外”逆生成
  // 先随机选一个起始点
  const startR = Math.floor(Math.random() * rows);
  const startC = Math.floor(Math.random() * cols);
  board[startR][startC] = getRandomColor(numColors);
  let placed = 1;

  // 存放已放置的位置
  let placedPositions = [{ r: startR, c: startC }];

  while (placed < numScrews) {
    // 从已放置位置中随机选一个，找其相邻空位
    const idx = Math.floor(Math.random() * placedPositions.length);
    const { r, c } = placedPositions[idx];
    const neighbors = [
      [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
    ];
    // 随机打乱邻居顺序
    for (let i = neighbors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
    }
    let placedNew = false;
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc] === 0) {
        board[nr][nc] = getRandomColor(numColors);
        placedPositions.push({ r: nr, c: nc });
        placed++;
        placedNew = true;
        break;
      }
    }
    // 如果没有找到相邻空位，移除该位置（避免死循环）
    if (!placedNew) {
      placedPositions.splice(idx, 1);
    }
    // 防止死循环（万一无解）
    if (placedPositions.length === 0) break;
  }

  // 如果放置数量不足，补充随机（但一般不会）
  while (placed < numScrews) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c] === 0) {
      board[r][c] = getRandomColor(numColors);
      placed++;
    }
  }

  return board;
}

function getRandomColor(numColors) {
  return Math.floor(Math.random() * numColors) + 1;
}

// 检查某个螺丝是否可拧（在边缘且颜色槽未满）
export function isRemovable(board, r, c, slotCounts) {
  const rows = board.length;
  const cols = board[0].length;
  if (board[r][c] === 0) return false;
  // 检查是否在边缘：上下左右至少有一个方向超出边界或为空
  const isEdge = 
    r === 0 || r === rows - 1 || c === 0 || c === cols - 1 ||
    board[r-1]?.[c] === 0 ||
    board[r+1]?.[c] === 0 ||
    board[r][c-1] === 0 ||
    board[r][c+1] === 0;
  if (!isEdge) return false;
  // 检查对应颜色槽是否已满
  const color = board[r][c];
  if (slotCounts[color] >= MAX_SLOT) return false;
  return true;
}

// 拧下螺丝
export function removeScrew(board, r, c, slotCounts) {
  if (!isRemovable(board, r, c, slotCounts)) return null;
  const color = board[r][c];
  board[r][c] = 0;
  slotCounts[color] = (slotCounts[color] || 0) + 1;
  return { board, slotCounts };
}

// 检查是否胜利（所有螺丝拧完）
export function isWin(board) {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (board[r][c] !== 0) return false;
    }
  }
  return true;
}

// 检查是否失败（存在可拧的螺丝但槽已满，或者无任何可拧螺丝且未胜利）
export function isGameOver(board, slotCounts) {
  const rows = board.length;
  const cols = board[0].length;
  let anyRemovable = false;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== 0 && isRemovable(board, r, c, slotCounts)) {
        anyRemovable = true;
      }
    }
  }
  if (!anyRemovable && !isWin(board)) return true;
  // 检查是否有槽已满且对应颜色螺丝还在
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== 0 && slotCounts[board[r][c]] >= MAX_SLOT) {
        // 这种情况下，该螺丝不可拧，但可能其他颜色可拧，所以不直接判定失败
        // 我们只判定：如果没有任何可拧螺丝，则失败
      }
    }
  }
  return false;
}