// src/games/puzzle/PuzzleGame.jsx
import { useEffect, useState } from 'react';
import { Alert, ImageBackground, Text, TouchableOpacity, View } from 'react-native';
import { levels } from './levels'; // 引入关卡配置
import styles from './styles';

// 生成拼图块（根据网格大小）
const createCorrectTiles = (gridSize) => {
  const tiles = [];
  const total = gridSize * gridSize;
  for (let i = 0; i < total; i++) {
    tiles.push({
      id: i,                // 原始顺序编号（0~total-1）
      correctIndex: i,      // 正确位置索引
      currentIndex: i,      // 当前所在位置索引
    });
  }
  return tiles;
};

// Fisher-Yates 打乱
const shuffleTiles = (tiles) => {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  shuffled.forEach((tile, index) => {
    tile.currentIndex = index;
  });
  return shuffled;
};

// 计算棋盘尺寸（固定最大宽度 300，根据网格大小调整）
const getBoardSize = (gridSize) => {
  return Math.min(300, 100 * gridSize); // 单个块最小 100，但总尺寸不超过 300
};

const PuzzleGame = ({ onExit }) => {
  const [currentLevel, setCurrentLevel] = useState(0); // 当前关卡索引
  const [tiles, setTiles] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // 初始化或切换关卡
  useEffect(() => {
    const level = levels[currentLevel];
    const gridSize = level.gridSize;
    const initialTiles = shuffleTiles(createCorrectTiles(gridSize));
    setTiles(initialTiles);
    setMoves(0);
    setIsComplete(false);
    setSelectedIndex(null);
  }, [currentLevel]);

  // 检查完成
  useEffect(() => {
    if (tiles.length === 0) return;
    const allCorrect = tiles.every((tile) => tile.id === tile.currentIndex);
    if (allCorrect) {
      setIsComplete(true);
    }
  }, [tiles]);

  // 点击拼图块
  const handleTilePress = (index) => {
    if (isComplete) return;
    if (selectedIndex === null) {
      setSelectedIndex(index);
    } else if (selectedIndex === index) {
      setSelectedIndex(null);
    } else {
      const newTiles = [...tiles];
      const tileA = newTiles[selectedIndex];
      const tileB = newTiles[index];

      // 交换 currentIndex
      const temp = tileA.currentIndex;
      tileA.currentIndex = tileB.currentIndex;
      tileB.currentIndex = temp;

      // 按 currentIndex 排序，确保渲染位置正确
      const sortedTiles = [...newTiles].sort((a, b) => a.currentIndex - b.currentIndex);
      setTiles(sortedTiles);

      setSelectedIndex(null);
      setMoves(prev => prev + 1);
    }
  };

  // 切换关卡选择
  const switchLevel = () => {
    const levelNames = levels.map((level, idx) => ({
      text: `第${level.id}关：${level.name}`,
      onPress: () => setCurrentLevel(idx),
    }));
    Alert.alert('选择关卡', '请选择关卡', [
      ...levelNames,
      { text: '取消', style: 'cancel' },
    ]);
  };

  const restart = () => {
    // 重新打乱当前关卡
    const level = levels[currentLevel];
    const gridSize = level.gridSize;
    setTiles(shuffleTiles(createCorrectTiles(gridSize)));
    setMoves(0);
    setIsComplete(false);
    setSelectedIndex(null);
  };

  // 渲染
  const level = levels[currentLevel];
  const gridSize = level.gridSize;
  const boardSize = getBoardSize(gridSize);
  const tileSize = boardSize / gridSize;

  return (
    <View style={styles.container}>
      {/* 顶部信息 */}
      <View style={styles.info}>
        <Text style={styles.title}>拼图游戏</Text>
        <Text style={{ color: '#aaa' }}>
          关卡 {level.id}: {level.name} · 步数: {moves}
        </Text>
      </View>

      {/* 棋盘 */}
      <View style={[styles.board, { width: boardSize, height: boardSize }]}>
        {tiles.map((tile, index) => {
          // 计算该块应显示的图片偏移位置
          const row = Math.floor(tile.id / gridSize);
          const col = tile.id % gridSize;
          return (
            <TouchableOpacity
              key={tile.id}
              style={[
                styles.tile,
                {
                  width: tileSize,
                  height: tileSize,
                  backgroundColor: selectedIndex === index ? '#2ed573' : '#2a2a3a',
                  borderColor: selectedIndex === index ? '#ffd700' : '#444',
                }
              ]}
              onPress={() => handleTilePress(index)}
            >
              <ImageBackground
                source={level.image}
                style={{ width: tileSize, height: tileSize }}
                imageStyle={{
                  width: boardSize,
                  height: boardSize,
                  transform: [
                    { translateX: -col * tileSize },
                    { translateY: -row * tileSize },
                  ],
                }}
                resizeMode="cover"
              />
              {/* 编号辅助（可移除） */}
              <Text
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  color: '#fff',
                  fontSize: 12,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  padding: 2,
                  borderRadius: 4,
                }}
              >
                {tile.id + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isComplete && (
        <Text style={styles.successText}>🎉 第 {level.id} 关完成！</Text>
      )}

      {/* 按钮组 */}
      <View style={{ flexDirection: 'row', marginTop: 30 }}>
        <TouchableOpacity style={styles.button} onPress={switchLevel}>
          <Text style={styles.buttonText}>切换关卡</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ffa502', marginLeft: 10 }]}
          onPress={restart}
        >
          <Text style={styles.buttonText}>重新打乱</Text>
        </TouchableOpacity>
      </View>

      {/* <TouchableOpacity
        style={[styles.button, { backgroundColor: '#e74c3c', marginTop: 10 }]}
        onPress={onExit}
      >
        <Text style={styles.buttonText}>退出</Text>
      </TouchableOpacity> */}
    </View>
  );
};

export default PuzzleGame;