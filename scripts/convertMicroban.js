const fs = require('fs');
const path = require('path');

// 读取项目根目录下的 microban.txt
const filePath = path.join(__dirname, '..', 'microban.txt');
const text = fs.readFileSync(filePath, 'utf-8');

// 字符映射
const CHAR_MAP = { '#':1, ' ':0, '.':2, '$':3, '@':4, '*':5, '+':6 };

// 分割行
const lines = text.split('\n').map(line => line.trim());

// 解析关卡
const levels = [];
let current = [];
let inLevel = false;

for (const line of lines) {
  // 跳过空行和注释（以 ';' 或 'Level' 开头，或纯数字）
  if (line === '' || /^Level\s*\d+/i.test(line) || /^[';]/.test(line) || /^\d+$/.test(line)) {
    if (current.length > 0) {
      levels.push([...current]);
      current = [];
    }
    continue;
  }
  // 如果行包含地图字符，则加入当前关卡
  if (/[#@$.*+]/.test(line)) {
    current.push(line);
  }
}
// 处理最后一个关卡
if (current.length > 0) levels.push(current);

console.log(`📦 提取到 ${levels.length} 个关卡`);

// 转换为字符串格式
function gridToStr(grid) {
  const maxWidth = Math.max(...grid.map(row => row.length));
  const padded = grid.map(row => row.padEnd(maxWidth, ' '));
  return padded.map(row => row.split('').map(ch => CHAR_MAP[ch] ?? 0).join('')).join('|');
}

const levelStrings = levels.map(gridToStr);

// 只取前 100 个（Microban 有 150+，我们只取前 100）
// const finalLevels = levelStrings.slice(0, 100);
console.log(`✅ 输出 ${levelStrings.length} 个关卡`);

// 写入文件
const outputDir = path.join(__dirname, '..', 'src', 'games', 'sokoban');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputFile = path.join(outputDir, 'microbanLevels.js');
const content = `// 从 Microban 文本文件自动转换生成
// 生成时间: ${new Date().toISOString()}

export const levelStrings = ${JSON.stringify(levelStrings, null, 2)};
`;

fs.writeFileSync(outputFile, content, 'utf-8');
console.log(`✅ 已生成 ${outputFile}`);