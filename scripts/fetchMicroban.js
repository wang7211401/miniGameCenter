// scripts/fetchMicroban.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Microban 关卡页面 URL
const MICROBAN_URL = 'http://www.sneezingtiger.com/sokoban/levels/microban.html';

// 字符到数字的映射（推箱子标准符号）
const CHAR_MAP = {
  '#': 1, // 墙
  ' ': 0, // 空地
  '.': 2, // 目标
  '$': 3, // 箱子
  '@': 4, // 玩家
  '*': 5, // 箱子在目标上
  '+': 6, // 玩家在目标上
};

/**
 * 将关卡网格（字符串数组）转换为我们的数字字符串格式
 * 例如 ['#####','# @ #','# . #','#####'] -> '11111|10401|10201|11111'
 */
function gridToLevelString(grid) {
  // 先去除首尾空行
  const trimmed = grid.filter(row => row.trim() !== '');
  if (trimmed.length === 0) return null;

  // 找出最大行宽，补足空格使每行等长
  const maxWidth = Math.max(...trimmed.map(row => row.length));
  const padded = trimmed.map(row => row.padEnd(maxWidth, ' '));

  // 将每行字符转换为数字字符串
  const numRows = padded.map(row => {
    return row.split('').map(ch => {
      return CHAR_MAP[ch] !== undefined ? CHAR_MAP[ch] : 0; // 未知字符当作空地
    }).join('');
  });

  return numRows.join('|');
}

async function fetchMicrobanLevels() {
  try {
    console.log('🌐 正在从 Microban 网站抓取关卡...');
    const response = await axios.get(MICROBAN_URL, { timeout: 10000 });
    const html = response.data;

    const $ = cheerio.load(html);

    // 收集所有 <pre> 标签内的文本（关卡数据通常放在 pre 中）
    let allLevelText = '';
    $('pre').each((i, el) => {
      allLevelText += $(el).text() + '\n';
    });

    // 如果 pre 标签没有抓到，尝试从整个 body 中提取（备用）
    if (!allLevelText.trim()) {
      console.warn('⚠️ 未找到 <pre> 标签，尝试从 body 中提取...');
      allLevelText = $('body').text();
    }

    // 按行分割
    const lines = allLevelText.split('\n').map(line => line.replace(/\r$/, ''));

    // 解析关卡：以包含 '#' 的行作为关卡开始，以连续空行或下一个包含 '#' 的行作为结束
    const levels = [];
    let currentLevel = [];

    for (let line of lines) {
      // 跳过纯数字行（可能是页码）和注释（以 ';' 或 '#' 开头但非地图）
      if (line.trim().match(/^[0-9]+$/) || line.trim().startsWith(';')) {
        continue;
      }

      // 如果当前行是地图的一部分（包含墙、玩家、箱子、目标等）
      if (line.includes('#') || line.includes('@') || line.includes('$') || line.includes('.') || line.includes('*') || line.includes('+')) {
        // 如果当前行长度大于0，加入当前关卡
        if (line.trim() !== '') {
          currentLevel.push(line);
        }
      } else if (line.trim() === '' && currentLevel.length > 0) {
        // 空行表示关卡结束
        if (currentLevel.length > 0) {
          levels.push([...currentLevel]);
          currentLevel = [];
        }
      }
    }
    // 处理最后一个关卡（如果文件末尾没有空行）
    if (currentLevel.length > 0) {
      levels.push([...currentLevel]);
    }

    console.log(`📦 共提取到 ${levels.length} 个原始关卡（未过滤）`);

    // 过滤掉明显无效的关卡（高度小于3，或宽度小于3）
    const validLevels = levels.filter(grid => {
      const height = grid.length;
      if (height < 3) return false;
      const widths = grid.map(row => row.length);
      const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
      if (avgWidth < 3) return false;
      return true;
    });

    console.log(`✅ 有效关卡数量: ${validLevels.length}`);

    // 转换为我们的字符串格式
    const levelStrings = validLevels.map(grid => gridToLevelString(grid)).filter(str => str !== null);

    // 取前100个（或全部，如果你想要全部）
    const finalLevels = levelStrings.slice(0, 100); // 限制100关
    console.log(`🔢 最终输出 ${finalLevels.length} 个关卡`);

    // 生成 JavaScript 文件
    const outputDir = path.join(__dirname, '../src/games/sokoban');
    const outputFile = path.join(outputDir, 'microbanLevels.js');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileContent = `// 自动从 Microban 爬取生成的关卡数据
// 来源: ${MICROBAN_URL}
// 生成时间: ${new Date().toISOString()}

export const levelStrings = ${JSON.stringify(finalLevels, null, 2)};
`;

    fs.writeFileSync(outputFile, fileContent, 'utf-8');
    console.log(`✅ 成功生成文件: ${outputFile}`);

  } catch (error) {
    console.error('❌ 爬取失败:', error.message);
    if (error.response) {
      console.error('HTTP 状态码:', error.response.status);
    }
  }
}

// 执行爬虫
fetchMicrobanLevels();