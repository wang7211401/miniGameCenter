import { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { levels } from './levels';
import { canConnect, generateBoard } from './linkLogic';

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
    
    // 生成棋盘
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

  const countCards = (board) => {
    let count = 0;
    board.forEach(row => row.forEach(cell => { if (cell !== 0) count++; }));
    return count;
  };

  const handleShuffle = () => {
    if (gameOver || board.length === 0) return;
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
    
    // 打乱
    for (let i = flat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flat[i], flat[j]] = [flat[j], flat[i]];
    }
    
    const newBoard = board.map(row => [...row]);
    positions.forEach(([r, c], idx) => {
      newBoard[r][c] = flat[idx];
    });
    
    setBoard(newBoard);
    setSelected(null);
  };

  const handleCardPress = (row, col) => {
    if (gameOver || board.length === 0) return;
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

    // 检查连接
    if (canConnect(board, selected.row, selected.col, row, col)) {
      const newBoard = board.map(r => [...r]);
      newBoard[selected.row][selected.col] = 0;
      newBoard[row][col] = 0;
      
      const newRemaining = countCards(newBoard);
      
      setBoard(newBoard);
      setSelected(null);
      setRemaining(newRemaining);

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
      // 无法消除
      Alert.alert('无法消除', '这两个卡片无法通过路径连接');
      setSelected(null);
    }
  };

  const renderCard = (row, col) => {
    const value = board[row][col];
    if (value === 0) {
      // 使用动态计算的 cellSize
      return <View key={`${row}-${col}`} style={[styles.emptyCell, { width: cellSize, height: cellSize }]} />;
    }
    const isSelected = selected && selected.row === row && selected.col === col;
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[styles.card, isSelected && styles.selected, { width: cellSize, height: cellSize }]}
        onPress={() => handleCardPress(row, col)}
      >
        <Text style={styles.cardText}>{value}</Text>
      </TouchableOpacity>
    );
  };

  const rows = board.length || 0;
  const cols = board[0]?.length || 0;
  
  // 动态计算单元格大小，确保适配屏幕宽度
  // 减去一些边距和间隙
  const padding = 20;
  const gap = 4;
  const cellSize = Math.min((width - padding) / cols, 60);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.timer}>⏱️ {elapsed}s</Text>
        <Text style={styles.remaining}>剩余: {remaining}</Text>
        <TouchableOpacity style={styles.shuffleBtn} onPress={handleShuffle}>
          <Text style={styles.shuffleText}>🔄 重排</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.board, { width: cols * (cellSize + gap) }]}>
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