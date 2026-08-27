// src/games/2048/Game2048.jsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import {
  generateNewTile,
  initBoard,
  isGameOver,
  moveDown,
  moveLeft,
  moveRight,
  moveUp,
} from './logic';

const { width } = Dimensions.get('window');
const HIGH_SCORE_KEY = '@highScore2048';

// 颜色映射
const tileColors = {
  0: '#cdc1b4',
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

const tileTextColors = {
  2: '#776e65',
  4: '#776e65',
  8: '#f9f6f2',
  16: '#f9f6f2',
  32: '#f9f6f2',
  64: '#f9f6f2',
  128: '#f9f6f2',
  256: '#f9f6f2',
  512: '#f9f6f2',
  1024: '#f9f6f2',
  2048: '#f9f6f2',
};

const Game2048 = () => {
  const [board, setBoard] = useState(() => initBoard());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  // 加载最高分
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const stored = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (stored) setHighScore(parseInt(stored, 10));
      } catch (e) {}
    };
    loadHighScore();
  }, []);

  // 保存最高分
  const saveHighScore = async (value) => {
    try {
      await AsyncStorage.setItem(HIGH_SCORE_KEY, String(value));
    } catch (e) {}
  };

  // 重置游戏
  const resetGame = () => {
    setBoard(initBoard());
    setScore(0);
    setGameOver(false);
  };

  // 移动处理
  const handleMove = (direction) => {
    if (gameOver) return;
    let result;
    switch (direction) {
      case 'left':
        result = moveLeft(board);
        break;
      case 'right':
        result = moveRight(board);
        break;
      case 'up':
        result = moveUp(board);
        break;
      case 'down':
        result = moveDown(board);
        break;
      default:
        return;
    }

    if (result.moved) {
      const newBoard = generateNewTile(result.board);
      const newScore = score + result.score;
      setBoard(newBoard);
      setScore(newScore);

      if (isGameOver(newBoard)) {
        setGameOver(true);
        // 更新最高分
        if (newScore > highScore) {
          setHighScore(newScore);
          saveHighScore(newScore);
        }
        Alert.alert(
          '游戏结束',
          `得分：${newScore}\n最高分：${Math.max(highScore, newScore)}`,
          [{ text: '重新开始', onPress: resetGame }]
        );
      }
    }
  };

  // PanResponder 处理滑动手势
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          // 水平滑动
          if (dx > 0) handleMove('right');
          else handleMove('left');
        } else {
          // 垂直滑动
          if (dy > 0) handleMove('down');
          else handleMove('up');
        }
      },
    })
  ).current;

  // 计算格子尺寸
  const padding = SPACING.md * 2;
  const gap = 8;
  const gridSize = width - padding * 2;
  const cellSize = (gridSize - gap * 5) / 4;

  // 渲染单个格子
  const renderTile = (value, row, col) => {
    const backgroundColor = tileColors[value] || tileColors[0];
    const color = tileTextColors[value] || '#f9f6f2';
    const fontSize = value >= 1024 ? 20 : value >= 128 ? 24 : 32;
    return (
      <View
        key={`${row}-${col}`}
        style={[
          styles.tile,
          { width: cellSize, height: cellSize, backgroundColor },
        ]}
      >
        {value !== 0 && (
          <Text style={[styles.tileText, { color, fontSize }]}>
            {value}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>得分</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>最高分</Text>
          <Text style={styles.scoreValue}>{highScore}</Text>
        </View>
      </View>

      <View
        style={[styles.gridContainer, { padding: gap, width: gridSize }]}
        {...panResponder.panHandlers}
      >
        {board.map((row, r) =>
          row.map((value, c) => renderTile(value, r, c))
        )}
      </View>

      <TouchableOpacity style={styles.newGameBtn} onPress={resetGame}>
        <Text style={styles.newGameText}>新游戏</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    paddingTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: SPACING.md,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minWidth: 100,
  },
  scoreLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  gridContainer: {
    backgroundColor: '#bbada0',
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tileText: {
    fontWeight: 'bold',
  },
  newGameBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.lg,
  },
  newGameText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Game2048;