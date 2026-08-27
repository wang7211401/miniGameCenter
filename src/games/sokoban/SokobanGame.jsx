// src/games/sokoban/SokobanGame.jsx
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { COLORS, SPACING } from '../../constants/theme';
import { levels } from './levels';
import { checkWin, findPlayer, movePlayer } from './sokobanLogic';

// 符号映射
const CELL_SYMBOLS = {
  0: '⬜', // 空地
  1: '🧱', // 墙
  2: '⭐', // 目标
  3: '📦', // 箱子
  4: '😀', // 玩家
  5: '📦', // 箱子在目标上
  6: '😀', // 玩家在目标上
};

const SokobanGame = ({ levelId, onComplete }) => {
  const [map, setMap] = useState([]);
  const [moves, setMoves] = useState(0);
  const [playerPos, setPlayerPos] = useState(null);
  const [gameWon, setGameWon] = useState(false);

  const resetLevel = () => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;
    const initialMap = level.map.map(row => [...row]);
    setMap(initialMap);
    setMoves(0);
    setPlayerPos(findPlayer(initialMap));
    setGameWon(false);
  };

  useEffect(() => {
    resetLevel();
  }, [levelId]);

  const handleMove = (dir) => {
    if (!playerPos || gameWon) return;
    const [r, c] = playerPos;
    const newMap = movePlayer(map, r, c, dir);
    if (newMap) {
      const newMoves = moves + 1;
      setMap(newMap);
      setMoves(newMoves);
      const newPos = findPlayer(newMap);
      setPlayerPos(newPos);
      if (checkWin(newMap)) {
        let stars = 3;
        if (newMoves > 20) stars = 2;
        if (newMoves > 50) stars = 1;
        setGameWon(true);
        Alert.alert('🎉 过关！', `用了 ${newMoves} 步，获得 ${stars} 星`);
        onComplete && onComplete(stars);
      }
    }
  };

  const renderCell = (row, col) => {
    const val = map[row]?.[col];
    return (
      <View key={`${row}-${col}`} style={styles.cell}>
        <Text style={styles.cellText}>{CELL_SYMBOLS[val] || ' '}</Text>
      </View>
    );
  };

  // 方向按钮
  const DirectionButton = ({ dir, label }) => (
    <TouchableOpacity style={styles.dirBtn} onPress={() => handleMove(dir)}>
      <Text style={styles.dirText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.board}>
        {map.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((_, c) => renderCell(r, c))}
          </View>
        ))}
      </View>
      <View style={styles.controls}>
        <View style={styles.dirRow}>
          <DirectionButton dir="up" label="↑" />
        </View>
        <View style={styles.dirRow}>
          <DirectionButton dir="left" label="←" />
          <DirectionButton dir="down" label="↓" />
          <DirectionButton dir="right" label="→" />
        </View>
      </View>
      <Text style={styles.moves}>步数: {moves}</Text>
      <TouchableOpacity style={styles.restartBtn} onPress={resetLevel}>
        <Text style={styles.restartText}>重新开始</Text>
      </TouchableOpacity>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  board: { marginVertical: SPACING.md },
  row: { flexDirection: 'row' },
  cell: {
    width: 40,
    height: 40,
    borderWidth: 0.5,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  cellText: { fontSize: 20 },
  controls: { marginTop: SPACING.md },
  dirRow: { flexDirection: 'row', justifyContent: 'center' },
  dirBtn: {
    width: 60,
    height: 60,
    margin: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dirText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  moves: { marginTop: SPACING.md, fontSize: 18 },
  restartBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#666',
    borderRadius: 8,
  },
  restartText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});

export default SokobanGame;