// src/games/maze/levels.js
// 迷宫 100 关配置。迷宫布局与元素由 mazeLogic.generateMaze 用 DFS 生成并校验。
// 此处只描述每关的目标参数（尺寸、元素数量、限制），确定性可复现。

export const LEVEL_COUNT = 100;

function bandParams(id) {
  // 尺寸：7,9,11,...,25（每 10 关 +2）
  const size = 7 + Math.floor((id - 1) / 10) * 2; // 1-10:7 11-20:9 ... 91-100:25
  const p = {
    size,
    keys: 0, doors: 0, traps: 0, portals: 0,
    fog: false, stars: 0,
    stepLimit: 0, timeLimit: 0,
  };
  if (id <= 10) {
    // 单通路，无收集
  } else if (id <= 20) {
    p.stars = 1; // 简单分叉 + 1 星
  } else if (id <= 30) {
    p.stars = 2; // 收集星星
  } else if (id <= 40) {
    p.keys = 1; p.doors = 1; p.stars = 1; // 钥匙门
  } else if (id <= 50) {
    p.keys = 1; p.doors = 1; p.stars = 1;
    p.stepLimit = Math.round(size * size * 0.6); // 限步
  } else if (id <= 60) {
    p.keys = 1; p.doors = 1; p.stars = 2;
    p.traps = Math.floor(size / 4); // 陷阱
    p.stepLimit = Math.round(size * size * 0.55);
  } else if (id <= 70) {
    p.keys = 1; p.doors = 1; p.stars = 2;
    p.traps = Math.floor(size / 4);
    p.portals = 1; // 传送门（1 对）
    p.stepLimit = Math.round(size * size * 0.55);
  } else if (id <= 80) {
    p.keys = 2; p.doors = 2; p.stars = 2;
    p.traps = Math.floor(size / 3);
    p.portals = 1;
    p.fog = true; // 迷雾
    p.stepLimit = Math.round(size * size * 0.5);
  } else if (id <= 90) {
    p.keys = 3; p.doors = 3; p.stars = 3;
    p.traps = Math.floor(size / 3);
    p.portals = 2;
    p.fog = true;
    p.timeLimit = Math.round(size * size * 1.2); // 多钥匙 + 限时
    p.stepLimit = Math.round(size * size * 0.5);
  } else {
    // 91-100 综合
    const i = id - 90; // 1..10
    p.keys = 3 + Math.floor((i - 1) / 4); // 3~4
    p.doors = p.keys;
    p.stars = 3;
    p.traps = Math.floor(size / 3);
    p.portals = 2;
    p.fog = true;
    p.timeLimit = Math.round(size * size * 1.0) - i * 2;
    p.stepLimit = Math.round(size * size * 0.45);
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
