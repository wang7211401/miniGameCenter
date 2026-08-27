// src/games/screw/ScrewGame.jsx
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SPACING, COLORS as THEME_COLORS } from '../../constants/theme';
import { levels } from './levels';
import {
  COLOR_NAMES,
  generateBoard,
  isGameOver,
  isWin,
  MAX_SLOT,
  removeScrew,
} from './screwLogic';

const { width } = Dimensions.get('window');

const ScrewGame = ({ levelId, onComplete }) => {
  const [board, setBoard] = useState([]);
  const [slotCounts, setSlotCounts] = useState({ 1: 0, 2: 0, 3: 0 });
  const [remaining, setRemaining] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timer, setTimer] = useState(null);

  // 加载关卡
  useEffect(() => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;
    const newBoard = generateBoard(level.rows, level.cols, level.numScrews, level.colors);
    setBoard(newBoard);
    setSlotCounts({ 1: 0, 2: 0, 3: 0 });
    setRemaining(countScrews(newBoard));
    setGameOver(false);
    setElapsed(0);
    if (timer) clearInterval(timer);
    const t = setInterval(() => setElapsed(prev => prev + 1), 1000);
    setTimer(t);
    return () => clearInterval(t);
  }, [levelId]);

  const countScrews = (board) => {
    let cnt = 0;
    board.forEach(row => row.forEach(cell => { if (cell !== 0) cnt++; }));
    return cnt;
  };

  const handlePress = (r, c) => {
    if (gameOver) return;
    const color = board[r][c];
    if (color === 0) return;

    // 尝试拧下
    const result = removeScrew(board, r, c, slotCounts);
    if (!result) {
      // 不可拧，可能是槽满或不在边缘
      Alert.alert('无法拧下', '该螺丝被挡住或对应颜色槽已满');
      return;
    }
    const newBoard = result.board;
    const newSlotCounts = result.slotCounts;
    setBoard(newBoard);
    setSlotCounts(newSlotCounts);
    const newRemaining = countScrews(newBoard);
    setRemaining(newRemaining);

    // 检查胜利
    if (isWin(newBoard)) {
      clearInterval(timer);
      setGameOver(true);
      const stars = elapsed <= 30 ? 3 : elapsed <= 60 ? 2 : 1;
      Alert.alert('🎉 通关！', `用时 ${elapsed} 秒，获得 ${stars} 星`);
      onComplete && onComplete(stars);
      return;
    }

    // 检查是否卡死
    if (isGameOver(newBoard, newSlotCounts)) {
      clearInterval(timer);
      setGameOver(true);
      Alert.alert('😵 游戏结束', '没有可拧的螺丝了', [
        { text: '重试', onPress: () => loadLevel(levelId) },
      ]);
    }
  };

  const loadLevel = (id) => {
    const level = levels.find(l => l.id === id);
    if (!level) return;
    const newBoard = generateBoard(level.rows, level.cols, level.numScrews, level.colors);
    setBoard(newBoard);
    setSlotCounts({ 1: 0, 2: 0, 3: 0 });
    setRemaining(countScrews(newBoard));
    setGameOver(false);
    setElapsed(0);
    if (timer) clearInterval(timer);
    const t = setInterval(() => setElapsed(prev => prev + 1), 1000);
    setTimer(t);
  };

  const renderBoard = () => {
    const rows = board.length;
    const cols = board[0]?.length || 0;
    const gap = 4;
    const maxSize = width - SPACING.md * 4;
    const cellSize = Math.min((maxSize - gap * (cols - 1)) / cols, 70);

    return board.map((row, r) => (
      <View key={r} style={styles.row}>
        {row.map((cell, c) => (
          <TouchableOpacity
            key={`${r}-${c}`}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor: cell === 0 ? 'transparent' : getColor(cell),
              },
              cell !== 0 && styles.screw,
            ]}
            onPress={() => handlePress(r, c)}
            disabled={cell === 0 || gameOver}
          >
            {cell !== 0 && <Text style={styles.screwText}>{COLOR_NAMES[cell]}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  const getColor = (colorId) => {
    switch (colorId) {
      case 1: return '#ff4444';
      case 2: return '#4444ff';
      case 3: return '#44bb44';
      default: return '#ccc';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.timer}>⏱️ {elapsed}s</Text>
        <Text style={styles.remaining}>剩余: {remaining}</Text>
      </View>
      <View style={styles.slotContainer}>
        {[1, 2, 3].map(color => (
          <View key={color} style={styles.slotItem}>
            <Text style={styles.slotLabel}>{COLOR_NAMES[color]}</Text>
            <View style={styles.slotBar}>
              <View
                style={[
                  styles.slotFill,
                  {
                    width: `${(slotCounts[color] / MAX_SLOT) * 100}%`,
                    backgroundColor: getColor(color),
                  },
                ]}
              />
            </View>
            <Text style={styles.slotCount}>{slotCounts[color]}/{MAX_SLOT}</Text>
          </View>
        ))}
      </View>
      <View style={styles.boardContainer}>{renderBoard()}</View>
      <TouchableOpacity style={styles.resetBtn} onPress={() => loadLevel(levelId)}>
        <Text style={styles.resetText}>🔄 重玩</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.background,
    alignItems: 'center',
    paddingTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: SPACING.sm,
  },
  timer: { fontSize: 16, fontWeight: 'bold', color: THEME_COLORS.text },
  remaining: { fontSize: 16, color: THEME_COLORS.text },
  slotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginBottom: SPACING.md,
  },
  slotItem: {
    alignItems: 'center',
    flex: 1,
  },
  slotLabel: { fontSize: 14, fontWeight: 'bold' },
  slotBar: {
    width: '80%',
    height: 10,
    backgroundColor: '#ddd',
    borderRadius: 5,
    marginVertical: 2,
    overflow: 'hidden',
  },
  slotFill: {
    height: '100%',
    borderRadius: 5,
  },
  slotCount: { fontSize: 12, color: THEME_COLORS.textLight },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cell: {
    margin: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screw: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  screwText: {
    fontSize: 18,
  },
  resetBtn: {
    backgroundColor: THEME_COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginVertical: SPACING.md,
  },
  resetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ScrewGame;