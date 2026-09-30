// src/games/breaker/levels.js
// 共 100 关：前 5 关手工配置，其余按难度曲线程序化生成（确定性，无随机）

const TOTAL_LEVELS = 100;

const manualLevels = [
  { id: 1, rows: 5, gap: 5, ballSpeed: 5, hpRows: 0 },
  { id: 2, rows: 6, gap: 5, ballSpeed: 5.4, hpRows: 1 },
  { id: 3, rows: 6, gap: 6, ballSpeed: 5.8, hpRows: 1 },
  { id: 4, rows: 7, gap: 6, ballSpeed: 6.2, hpRows: 2 },
  { id: 5, rows: 8, gap: 6, ballSpeed: 6.6, hpRows: 2 },
];

function generateLevel(id) {
  // 行数：从 8 缓慢增加到 10
  const rows = Math.min(8 + Math.floor((id - 6) / 20), 10);

  // 间距在 5~7 之间循环，制造不同的视觉节奏
  const gap = 5 + (id % 3);

  // 球速从 ~6.8 平滑提升到 9（封顶，保证可玩）
  const ballSpeed = Math.min(6.6 + (id - 5) * 0.03, 9);

  // 多血砖行数从 2 增加到 5
  const hpRows = Math.min(2 + Math.floor((id - 6) / 12), 5);

  return { id, rows, gap, ballSpeed: Math.round(ballSpeed * 10) / 10, hpRows };
}

export const levels = [
  ...manualLevels,
  ...Array.from({ length: TOTAL_LEVELS - manualLevels.length }, (_, i) =>
    generateLevel(i + manualLevels.length + 1)
  ),
];
