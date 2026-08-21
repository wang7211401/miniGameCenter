// src/games/tetris/tetrisLogic.js

// 定义方块形状
export const SHAPES = {
  I: { matrix: [[1,1,1,1]], color: '#00f0f0' },
  O: { matrix: [[1,1],[1,1]], color: '#f0f000' },
  T: { matrix: [[0,1,0],[1,1,1]], color: '#a000f0' },
  S: { matrix: [[0,1,1],[1,1,0]], color: '#00f000' },
  Z: { matrix: [[1,1,0],[0,1,1]], color: '#f00000' },
  L: { matrix: [[1,0,0],[1,1,1]], color: '#f0a000' },
  J: { matrix: [[0,0,1],[1,1,1]], color: '#0000f0' },
};

export const SHAPE_NAMES = ['I','O','T','S','Z','L','J'];

// 创建空棋盘 (行, 列)
export function createBoard(rows = 20, cols = 10) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

// 随机获取一个方块对象（包含名称、矩阵、颜色、初始行列）
export function getRandomShape() {
  const name = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
  const shape = SHAPES[name];
  return {
    name,
    matrix: shape.matrix.map(row => [...row]),
    color: shape.color,
    row: 0,
    col: Math.floor((10 - shape.matrix[0].length) / 2),
  };
}

// 别名（兼容旧代码）
export function getRandomPiece() {
  return getRandomShape();
}

// 别名（兼容旧代码，但建议使用 getRandomShape）
export function createPiece(type) {
  // 如果传入的是名称字符串
  if (typeof type === 'string') {
    const shape = SHAPES[type];
    if (!shape) return getRandomShape();
    return {
      name: type,
      matrix: shape.matrix.map(row => [...row]),
      color: shape.color,
      row: 0,
      col: Math.floor((10 - shape.matrix[0].length) / 2),
    };
  }
  // 如果传入的是对象（直接返回）
  return type || getRandomShape();
}

// 获取下一个方块（与 getRandomShape 相同）
export function getNextShape() {
  return getRandomShape();
}

// 顺时针旋转矩阵
export function rotateMatrix(matrix) {
  const n = matrix.length;
  const m = matrix[0].length;
  const rotated = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      rotated[j][n - 1 - i] = matrix[i][j];
    }
  }
  return rotated;
}

// 旋转当前方块（返回新对象）
export function rotateShape(shape) {
  const rotatedMatrix = rotateMatrix(shape.matrix);
  return {
    ...shape,
    matrix: rotatedMatrix,
  };
}

// 碰撞检测（基于位置）
export function isValidPosition(board, shape, row, col, matrix) {
  const m = matrix || shape.matrix;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[0].length; c++) {
      if (m[r][c] !== 0) {
        const newRow = row + r;
        const newCol = col + c;
        if (newRow >= board.length || newCol < 0 || newCol >= board[0].length || newRow < 0) {
          return false;
        }
        if (board[newRow][newCol] !== 0) {
          return false;
        }
      }
    }
  }
  return true;
}

// 简写碰撞（使用 shape 自身行列）
export function collide(board, shape) {
  return !isValidPosition(board, shape, shape.row, shape.col);
}

// 固定方块到棋盘（返回新棋盘）
export function lockPiece(board, shape) {
  const newBoard = board.map(row => [...row]);
  for (let r = 0; r < shape.matrix.length; r++) {
    for (let c = 0; c < shape.matrix[0].length; c++) {
      if (shape.matrix[r][c] !== 0) {
        newBoard[shape.row + r][shape.col + c] = shape.color;
      }
    }
  }
  return newBoard;
}

// 别名（merge）
export function merge(board, shape) {
  return lockPiece(board, shape);
}

// 消除完整行并返回新棋盘和消除行数
export function clearRows(board) {
  const newBoard = board.filter(row => row.some(cell => cell === 0));
  const cleared = board.length - newBoard.length;
  // 补回空行
  for (let i = 0; i < cleared; i++) {
    newBoard.unshift(Array(board[0].length).fill(0));
  }
  return { board: newBoard, cleared };
}