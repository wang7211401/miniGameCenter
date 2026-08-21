// src/games/match/MatchGame.jsx
import { useEffect, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { levels } from './levels';
import { applyGravity, findMatches, generateBoard } from './matchLogic';

const { width } = Dimensions.get('window');

// 颜色映射
const COLORS_MAP = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#A8D8EA', '#FFB6C1'];

const MatchGame = ({ levelId, onComplete }) => {
  const [board, setBoard] = useState([]);
  const [score, setScore] = useState(0);
  const [steps, setSteps] = useState(0);
  const [maxSteps, setMaxSteps] = useState(30);
  const [selected, setSelected] = useState(null);
  const [targetScore, setTargetScore] = useState(50);
  const [gameOver, setGameOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 加载关卡
  useEffect(() => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;
    const newBoard = generateBoard(level.rows, level.cols, level.numTypes);
    setBoard(newBoard);
    setScore(0);
    setSteps(0);
    setMaxSteps(level.maxSteps);
    setTargetScore(level.targetScore);
    setSelected(null);
    setGameOver(false);
    setIsProcessing(false);
  }, [levelId]);

  // 处理交换
  const handleSwap = async (r1, c1, r2, c2) => {
    if (isProcessing || gameOver) return;
    if (steps >= maxSteps) {
      Alert.alert('步数用尽', '游戏结束');
      setGameOver(true);
      return;
    }
    // 检查是否相邻
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    // 交换
    const newBoard = board.map(row => [...row]);
    const temp = newBoard[r1][c1];
    newBoard[r1][c1] = newBoard[r2][c2];
    newBoard[r2][c2] = temp;

    // 检查是否有消除
    const matches = findMatches(newBoard);
    if (matches.size === 0) {
      // 无消除，换回
      return;
    }

    // 有效交换
    setIsProcessing(true);
    setSteps(steps + 1);

    // 处理消除链
    let currentBoard = newBoard;
    let totalCleared = 0;
    while (true) {
      const matches = findMatches(currentBoard);
      if (matches.size === 0) break;
      totalCleared += matches.size;
      // 清除
      const afterClear = currentBoard.map(row => [...row]);
      matches.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        afterClear[r][c] = 0;
      });
      // 下落
      const afterGravity = applyGravity(afterClear);
      // 填充顶部（使用随机）
      for (let c = 0; c < afterGravity[0].length; c++) {
        let countZero = 0;
        for (let r = 0; r < afterGravity.length; r++) {
          if (afterGravity[r][c] === 0) countZero++;
        }
        for (let r = 0; r < countZero; r++) {
          afterGravity[r][c] = Math.floor(Math.random() * 4) + 1; // 简化
        }
      }
      currentBoard = afterGravity;
    }

    // 更新得分 (每个消除得1分)
    const addScore = totalCleared;
    const newScore = score + addScore;
    setScore(newScore);
    setBoard(currentBoard);
    setSelected(null);
    setIsProcessing(false);

    // 检查过关
    if (newScore >= targetScore) {
      const stars = newScore >= targetScore * 1.5 ? 3 : (newScore >= targetScore * 1.2 ? 2 : 1);
      Alert.alert('🎉 过关！', `得分: ${newScore}，获得 ${stars} 星`);
      onComplete && onComplete(stars);
      setGameOver(true);
      return;
    }

    // 检查步数
    if (steps + 1 >= maxSteps) {
      Alert.alert('步数用尽', '游戏结束');
      setGameOver(true);
    }
  };

  const handleCellPress = (row, col) => {
    if (isProcessing || gameOver) return;
    if (!selected) {
      setSelected({ row, col });
      return;
    }
    if (selected.row === row && selected.col === col) {
      setSelected(null);
      return;
    }
    // 尝试交换
    handleSwap(selected.row, selected.col, row, col);
    setSelected(null);
  };

  const renderCell = (row, col) => {
    const value = board[row]?.[col];
    const isSelected = selected && selected.row === row && selected.col === col;
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.cell,
          { backgroundColor: value ? COLORS_MAP[(value - 1) % COLORS_MAP.length] : '#ddd' },
          isSelected && styles.selected,
        ]}
        onPress={() => handleCellPress(row, col)}
        disabled={isProcessing}
      />
    );
  };

  const cellSize = Math.floor((width - 40) / (board[0]?.length || 8));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.score}>得分: {score}/{targetScore}</Text>
        <Text style={styles.steps}>步数: {steps}/{maxSteps}</Text>
      </View>
      <View style={[styles.board, { width: board[0]?.length * (cellSize + 2) }]}>
        {board.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((_, c) => renderCell(r, c))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', paddingTop: SPACING.md },
  header: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 10 },
  score: { fontSize: 18, fontWeight: 'bold' },
  steps: { fontSize: 18, fontWeight: 'bold' },
  board: { alignItems: 'center' },
  row: { flexDirection: 'row' },
  cell: {
    width: 44,
    height: 44,
    margin: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#888',
  },
  selected: { borderWidth: 3, borderColor: COLORS.primary },
});

export default MatchGame;