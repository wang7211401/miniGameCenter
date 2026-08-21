// src/games/sudoku/SudokuGame.jsx
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { levels } from './levels';
import { checkSolution, generatePuzzle } from './sudokuLogic';

const SudokuGame = ({ levelId, onComplete }) => {
  const [initialPuzzle, setInitialPuzzle] = useState([]);
  const [playerBoard, setPlayerBoard] = useState([]);
  const [solution, setSolution] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [errors, setErrors] = useState(0);

  // 加载关卡
  useEffect(() => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;
    const { puzzle, solution } = generatePuzzle(level.difficulty);
    setInitialPuzzle(puzzle.map(row => [...row]));
    setPlayerBoard(puzzle.map(row => [...row]));
    setSolution(solution);
    setStartTime(Date.now());
    setErrors(0);
  }, [levelId]);

  const handleCellPress = (row, col) => {
    if (initialPuzzle[row][col] !== 0) return; // 预填数字不可修改
    setSelectedCell({ row, col });
  };

  const handleNumberInput = (num) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    if (initialPuzzle[row][col] !== 0) return;
    const newBoard = playerBoard.map(r => [...r]);
    if (num === 0) {
      newBoard[row][col] = 0;
    } else {
      // 可在此实时校验（可选）
      newBoard[row][col] = num;
    }
    setPlayerBoard(newBoard);
    // 判断是否完成
    if (checkSolution(newBoard, solution)) {
      const timeTaken = (Date.now() - startTime) / 1000; // 秒
      let stars = 3;
      if (timeTaken > 120) stars = 2;
      if (timeTaken > 300) stars = 1;
      Alert.alert('🎉 恭喜过关！', `用时 ${Math.round(timeTaken)} 秒，获得 ${stars} 星`);
      onComplete && onComplete(stars);
    }
  };

  const renderCell = (row, col) => {
    const value = playerBoard[row]?.[col];
    const isInitial = initialPuzzle[row]?.[col] !== 0 && initialPuzzle[row]?.[col] !== undefined;
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.cell,
          isSelected && styles.selected,
          { borderRightWidth: (col + 1) % 3 === 0 ? 2 : 0.5,
            borderBottomWidth: (row + 1) % 3 === 0 ? 2 : 0.5 }
        ]}
        onPress={() => handleCellPress(row, col)}
      >
        <Text style={[styles.cellText, isInitial && styles.initialText]}>
          {value !== 0 ? value : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.board}>
        {Array.from({ length: 9 }, (_, row) => (
          <View key={row} style={styles.row}>
            {Array.from({ length: 9 }, (_, col) => renderCell(row, col))}
          </View>
        ))}
      </View>
      <View style={styles.numberPad}>
        {[1,2,3,4,5,6,7,8,9].map(num => (
          <TouchableOpacity key={num} style={styles.numBtn} onPress={() => handleNumberInput(num)}>
            <Text style={styles.numText}>{num}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.numBtn} onPress={() => handleNumberInput(0)}>
          <Text style={styles.numText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  board: { marginVertical: SPACING.md },
  row: { flexDirection: 'row' },
  cell: {
    width: 36,
    height: 36,
    borderWidth: 0.5,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  selected: { backgroundColor: '#BBDEFB' },
  cellText: { fontSize: 18 },
  initialText: { color: '#000', fontWeight: 'bold' },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  numBtn: {
    width: 44,
    height: 44,
    margin: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
});

export default SudokuGame;