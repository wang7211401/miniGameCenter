// src/games/sokoban/sokobanLogic.js

// 方向向量
export const DIRS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

// 判断某位置是否是墙 (1)
function isWall(map, row, col) {
  return map[row]?.[col] === 1;
}

// 判断是否是箱子 (3 或 5)
function isBox(map, row, col) {
  return map[row]?.[col] === 3 || map[row]?.[col] === 5;
}

// 判断是否为目标 (2 或 5 或 6)
function isTarget(map, row, col) {
  return map[row]?.[col] === 2 || map[row]?.[col] === 5 || map[row]?.[col] === 6;
}

// 移动玩家
export function movePlayer(map, row, col, dir) {
  const [dr, dc] = DIRS[dir];
  const newRow = row + dr;
  const newCol = col + dc;
  // 检查目标位置
  if (isWall(map, newRow, newCol)) return null; // 撞墙

  if (isBox(map, newRow, newCol)) {
    // 检查箱子后面
    const boxRow = newRow + dr;
    const boxCol = newCol + dc;
    if (isWall(map, boxRow, boxCol) || isBox(map, boxRow, boxCol)) return null;
    // 移动箱子
    const newMap = map.map(r => [...r]);
    // 清除原箱子位置
    newMap[newRow][newCol] = isTarget(map, newRow, newCol) ? 2 : 0;
    // 设置新箱子位置
    newMap[boxRow][boxCol] = isTarget(map, boxRow, boxCol) ? 5 : 3;
    // 移动玩家
    newMap[row][col] = isTarget(map, row, col) ? 2 : 0;
    newMap[newRow][newCol] = isTarget(map, newRow, newCol) ? 6 : 4;
    return newMap;
  } else {
    // 空地或目标
    const newMap = map.map(r => [...r]);
    newMap[row][col] = isTarget(map, row, col) ? 2 : 0;
    newMap[newRow][newCol] = isTarget(map, newRow, newCol) ? 6 : 4;
    return newMap;
  }
}

// 检查胜利
export function checkWin(map) {
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[0].length; c++) {
      if (map[r][c] === 3) return false; // 有箱子不在目标上
    }
  }
  return true;
}

// 查找玩家位置
export function findPlayer(map) {
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[0].length; c++) {
      if (map[r][c] === 4 || map[r][c] === 6) return [r, c];
    }
  }
  return null;
}