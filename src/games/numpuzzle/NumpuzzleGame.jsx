// src/games/numpuzzle/NumpuzzleGame.jsx
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { levels } from './levels';
import styles from './styles';

const NumpuzzleGame = ({ levelId, onComplete }) => {
  const level = levels.find(l => l.id === levelId) || levels[0];
  const gridSize = level.gridSize;
  const shuffleMoves = level.shuffleMoves || (gridSize * gridSize * 10);
  const { width: screenWidth } = useWindowDimensions();

  const [board, setBoard] = useState([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [completionStars, setCompletionStars] = useState(0);
  const completionHandledRef = useRef(false);

  // 判断是否已完成
  const isSolved = (arr, size) => {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] !== i + 1) return false;
    }
    return true;
  };

  // 打乱函数：从目标状态随机移动空白格，确保有解
  const shuffle = (arr, size, steps) => {
    let newArr = [...arr];
    let blankPos = newArr.indexOf(0);
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    let lastDir = -1;

    for (let i = 0; i < steps; i++) {
      const row = Math.floor(blankPos / size);
      const col = blankPos % size;
      const possible = [];

      directions.forEach((dir, idx) => {
        const newRow = row + dir[0];
        const newCol = col + dir[1];
        if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
          possible.push({ idx, newPos: newRow * size + newCol });
        }
      });

      // 避免连续向同一个方向移动
      const filtered = possible.filter(p => p.idx !== lastDir);
      const chosen = filtered.length > 0
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : possible[0];

      // 交换空白格和相邻格
      [newArr[blankPos], newArr[chosen.newPos]] = [newArr[chosen.newPos], newArr[blankPos]];
      blankPos = chosen.newPos;
      lastDir = chosen.idx;
    }

    // 防止打乱后直接恢复原样
    if (isSolved(newArr, size)) {
      return shuffle(newArr, size, 2);
    }
    return newArr;
  };

  // 初始化关卡
  useEffect(() => {
    const size = gridSize * gridSize;
    const initial = Array.from({ length: size - 1 }, (_, i) => i + 1);
    initial.push(0); // 空白格
    setBoard(shuffle(initial, gridSize, shuffleMoves));
    setMoves(0);
    setIsComplete(false);
    setCompletionStars(0);
    completionHandledRef.current = false;
  }, [levelId]);

  useEffect(() => {
    if (!board.length || !isSolved(board, gridSize) || completionHandledRef.current) {
      return;
    }

    completionHandledRef.current = true;
    setIsComplete(true);
    const stars = moves <= shuffleMoves * 0.5 ? 3 : moves <= shuffleMoves ? 2 : 1;
    setCompletionStars(stars);
  }, [board, gridSize, moves, onComplete, shuffleMoves]);

  // 处理点击
  const handlePress = (index) => {
    if (isComplete || !board.length) return;
    const blankPos = board.indexOf(0);
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const blankRow = Math.floor(blankPos / gridSize);
    const blankCol = blankPos % gridSize;

    // 检查是否相邻
    const isAdjacent = Math.abs(row - blankRow) + Math.abs(col - blankCol) === 1;
    if (!isAdjacent) return;

    // 交换
    const newBoard = [...board];
    [newBoard[index], newBoard[blankPos]] = [newBoard[blankPos], newBoard[index]];
    setBoard(newBoard);
    setMoves(prev => prev + 1);

  };

  // 重新打乱
  const reset = () => {
    const size = gridSize * gridSize;
    const initial = Array.from({ length: size - 1 }, (_, i) => i + 1);
    initial.push(0);
    setBoard(shuffle(initial, gridSize, shuffleMoves));
    setMoves(0);
    setIsComplete(false);
    setCompletionStars(0);
    completionHandledRef.current = false;
  };

  // 渲染网格
  const boardSize = Math.min(360, Math.max(1, screenWidth - 32));
  const boardPadding = 4;
  const tileSize = Math.floor((boardSize - boardPadding * 2) / gridSize);
  const actualBoardSize = tileSize * gridSize + boardPadding * 2;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{level.name}</Text>
        <Text style={styles.moves}>步数: {moves}</Text>
        <View style={[styles.board, { width: actualBoardSize, height: actualBoardSize, padding: boardPadding }]}>
          {board.map((value, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.tile,
                { width: tileSize, height: tileSize },
                value === 0 ? styles.emptyTile : styles.numberTile
              ]}
              onPress={() => handlePress(index)}
            >
              {value !== 0 && <Text style={[styles.tileText, { fontSize: Math.max(16, tileSize * 0.3) }]}>{value}</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={reset}>
          <Text style={styles.resetText}>🔄 重新打乱</Text>
        </TouchableOpacity>
      </View>

      {isComplete && (
        <View style={styles.completionOverlay}>
          <View style={styles.completionPanel}>
            <Text style={styles.completionTitle}>🎉 拼图完成！</Text>
            <Text style={styles.completionMessage}>用了 {moves} 步</Text>
            <Text style={styles.completionStars}>{'★'.repeat(completionStars)}</Text>
            <View style={styles.completionActions}>
              <TouchableOpacity
                style={[styles.completionButton, styles.listButton]}
                onPress={() => onComplete?.(completionStars, 'list')}
              >
                <Text style={styles.completionButtonText}>返回列表</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.completionButton, styles.nextButton]}
                onPress={() => onComplete?.(completionStars, 'next')}
              >
                <Text style={styles.completionButtonText}>下一关</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default NumpuzzleGame;