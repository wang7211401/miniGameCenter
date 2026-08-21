// src/games/link/LinkGame.jsx
import { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { levels } from './levels';
import { canConnect, generateBoard } from './linkLogic'; // 修改这里

const { width } = Dimensions.get('window');

const LinkGame = ({ levelId, onComplete }) => {
  const [board, setBoard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef(null);

  // 加载关卡
  useEffect(() => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;
    const newBoard = generateBoard(level.rows, level.cols, level.numTypes);
    setBoard(newBoard);
    setSelected(null);
    setRemaining(countCards(newBoard));
    setElapsed(0);
    setGameOver(false);
    // 启动计时器
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [levelId]);

  // 统计剩余卡片数
  const countCards = (board) => {
    let count = 0;
    board.forEach(row => row.forEach(cell => { if (cell !== 0) count++; }));
    return count;
  };

  // 重排功能：收集所有剩余卡片，打乱后重新填充到原来的非零位置
  const handleShuffle = () => {
    if (gameOver) return;
    const flat = [];
    const positions = [];
    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell !== 0) {
          flat.push(cell);
          positions.push([r, c]);
        }
      });
    });
    // 打乱卡片数组
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    // 重新填充
    const newBoard = board.map(row => [...row]);
    positions.forEach(([r, c], idx) => {
      newBoard[r][c] = flat[idx];
    });
    setBoard(newBoard);
    setSelected(null);
  };

  // 处理点击卡片
  const handleCardPress = (row, col) => {
    if (gameOver) return;
    const value = board[row][col];
    if (value === 0) return;

    if (!selected) {
      setSelected({ row, col });
      return;
    }

    if (selected.row === row && selected.col === col) {
      setSelected(null);
      return;
    }

    // 检查是否可以消除 - 使用 canConnect
    if (canConnect(board, selected.row, selected.col, row, col)) {
      // 消除
      const newBoard = board.map(r => [...r]);
      newBoard[selected.row][selected.col] = 0;
      newBoard[row][col] = 0;
      setBoard(newBoard);
      setSelected(null);
      const newRemaining = countCards(newBoard);
      setRemaining(newRemaining);

      // 检查胜利
      if (newRemaining === 0) {
        clearInterval(timerRef.current);
        let stars = 3;
        if (elapsed > 60) stars = 2;
        if (elapsed > 120) stars = 1;
        Alert.alert('🎉 过关！', `用时 ${elapsed} 秒，获得 ${stars} 星`);
        onComplete && onComplete(stars);
        setGameOver(true);
      }
    } else {
      // 无法消除，取消选中或提示
      Alert.alert('无法消除', '这两个卡片无法通过路径连接');
      setSelected(null);
    }
  };

  // 渲染卡片
  const renderCard = (row, col) => {
    const value = board[row][col];
    if (value === 0) return <View key={`${row}-${col}`} style={styles.emptyCell} />;
    const isSelected = selected && selected.row === row && selected.col === col;
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[styles.card, isSelected && styles.selected]}
        onPress={() => handleCardPress(row, col)}
      >
        <Text style={styles.cardText}>{value}</Text>
      </TouchableOpacity>
    );
  };

  const rows = board.length;
  const cols = board[0]?.length || 0;
  const cellSize = Math.min((width - 40) / cols, 60);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.timer}>⏱️ {elapsed}s</Text>
        <Text style={styles.remaining}>剩余: {remaining}</Text>
        <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffle}>
          <Text style={styles.shuffleText}>🔄 重排</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.board, { width: cols * (cellSize + 4) }]}>
        {board.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((_, c) => renderCard(r, c))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', paddingTop: SPACING.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginBottom: 10 },
  timer: { fontSize: 16, fontWeight: 'bold' },
  remaining: { fontSize: 16 },
  shuffleBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  shuffleText: { color: '#fff', fontWeight: 'bold' },
  board: { alignItems: 'center' },
  row: { flexDirection: 'row' },
  card: {
    width: 56,
    height: 56,
    margin: 2,
    backgroundColor: '#FFD700',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: { borderWidth: 3, borderColor: COLORS.primary },
  cardText: { fontSize: 20, fontWeight: 'bold' },
  emptyCell: { width: 56, height: 56, margin: 2, backgroundColor: 'transparent' },
});

export default LinkGame;