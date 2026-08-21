// src/games/tetris/TetrisGame.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { levels } from './levels';
import {
  clearRows,
  collide,
  createBoard,
  getNextShape,
  getRandomShape,
  isValidPosition,
  merge,
  rotateShape,
} from './tetrisLogic';

const { width, height } = Dimensions.get('window');

const TetrisGame = ({ levelId, onComplete }) => {
  const [board, setBoard] = useState([]);
  const [shape, setShape] = useState(null);
  const [score, setScore] = useState(0);
  const [rowsCleared, setRowsCleared] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [nextShape, setNextShape] = useState(null);
  const [dropInterval, setDropInterval] = useState(1000);
  const [isPaused, setIsPaused] = useState(true); // 默认暂停

  const boardRef = useRef([]);
  const shapeRef = useRef(null);
  // 保持一个唯一的下落定时器。使用 setInterval 而不是 requestAnimationFrame，
  // 避免开始/暂停时 effect 清理旧动画帧后没有稳定地重新调度下落。
  const dropTimerRef = useRef(null);

  const levelData = levels.find(l => l.id === levelId) || { targetScore: 1000, initialSpeed: 800 };
  const targetScore = levelData.targetScore || 1000;

  // 初始化游戏
  const initGame = useCallback(() => {
    const newBoard = createBoard(20, 10);
    setBoard(newBoard);
    boardRef.current = newBoard;
    const firstShape = getRandomShape();
    setShape(firstShape);
    shapeRef.current = firstShape;
    const next = getNextShape();
    setNextShape(next);
    setScore(0);
    setRowsCleared(0);
    setLevel(1);
    setGameOver(false);
    setDropInterval(levelData.initialSpeed || 800);
    setIsPaused(true); // 初始暂停
    if (dropTimerRef.current) {
      clearInterval(dropTimerRef.current);
      dropTimerRef.current = null;
    }
  }, [levelData.initialSpeed]);

  useEffect(() => {
    initGame();
    return () => {
      if (dropTimerRef.current) {
        clearInterval(dropTimerRef.current);
        dropTimerRef.current = null;
      }
    };
  }, [initGame]);

  // 锁定当前方块
  const lockShape = useCallback(() => {
    if (!shapeRef.current) return;
    let newBoard = merge(boardRef.current, shapeRef.current);
    const { board: clearedBoard, cleared } = clearRows(newBoard);
    newBoard = clearedBoard;
    boardRef.current = newBoard;
    setBoard(newBoard);
    if (cleared > 0) {
      const newRowsCleared = rowsCleared + cleared;
      setRowsCleared(newRowsCleared);
      const points = [0, 40, 100, 300, 1200][cleared] || 0;
      const newScore = score + points * level;
      setScore(newScore);
      if (newScore >= targetScore) {
        Alert.alert('🎉 过关！', `得分 ${newScore}，达到目标 ${targetScore}`);
        onComplete && onComplete(3);
        setGameOver(true);
        setIsPaused(true);
        return;
      }
      const newLevel = Math.floor(newRowsCleared / 10) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        const newInterval = Math.max(100, 800 - (newLevel - 1) * 50);
        setDropInterval(newInterval);
      }
    }
    // 生成下一个
    const newShape = nextShape || getRandomShape();
    setShape(newShape);
    shapeRef.current = newShape;
    const next = getNextShape();
    setNextShape(next);
    if (collide(boardRef.current, newShape)) {
      Alert.alert('💔 游戏结束', `得分 ${score}`);
      setGameOver(true);
      setIsPaused(true);
    }
  }, [nextShape, rowsCleared, level, score, targetScore]);

  // 移动
  const moveShape = useCallback(
    (dx, dy) => {
      if (gameOver || isPaused || !shapeRef.current) {
        return false;
      }

      const newShape = {
        ...shapeRef.current,
        row: shapeRef.current.row + dx,
        col: shapeRef.current.col + dy,
      };

      if (
        isValidPosition(
          boardRef.current,
          newShape,
          newShape.row,
          newShape.col
        )
      ) {
        setShape(newShape);
        shapeRef.current = newShape;
        return true;
      }

      // 只有向下移动失败时才锁定
      if (dx === 1 && dy === 0) {
        lockShape();
      }

      return false;
    },
    [gameOver, isPaused, lockShape]
  );

  // 旋转
  const rotateShapeFn = useCallback(() => {
    if (gameOver || isPaused || !shapeRef.current) return;
    const rotated = rotateShape(shapeRef.current);
    if (isValidPosition(boardRef.current, rotated, rotated.row, rotated.col)) {
      setShape(rotated);
      shapeRef.current = rotated;
    }
  }, [gameOver, isPaused]);

  // 硬降
  const hardDrop = useCallback(() => {
    if (gameOver || isPaused || !shapeRef.current) return;
    let newShape = { ...shapeRef.current };
    while (isValidPosition(boardRef.current, newShape, newShape.row + 1, newShape.col)) {
      newShape.row += 1;
    }
    setShape(newShape);
    shapeRef.current = newShape;
    lockShape();
  }, [gameOver, isPaused, lockShape]);

  // 游戏循环：只有游戏进行中才创建定时器；开始后该 effect 会立即创建定时器。
  useEffect(() => {
    if (gameOver || isPaused) {
      if (dropTimerRef.current) {
        clearInterval(dropTimerRef.current);
        dropTimerRef.current = null;
      }
      return;
    }

    dropTimerRef.current = setInterval(() => {
      moveShape(1, 0);
    }, dropInterval);

    return () => {
      if (dropTimerRef.current) {
        clearInterval(dropTimerRef.current);
        dropTimerRef.current = null;
      }
    };
  }, [gameOver, isPaused, dropInterval, moveShape]);

  // 切换暂停状态
  const togglePause = () => {
    if (gameOver) return;
    setIsPaused(prev => !prev);
  };

  // 渲染单元格
  const renderCell = (row, col) => {
    const cellColor = board[row]?.[col] || 0;
    const isShape = shape && shape.matrix &&
      row >= shape.row && row < shape.row + shape.matrix.length &&
      col >= shape.col && col < shape.col + shape.matrix[0].length &&
      shape.matrix[row - shape.row][col - shape.col] !== 0;
    const color = isShape ? shape.color : (cellColor || '#333');
    return (
      <View
        key={`${row}-${col}`}
        style={[
          styles.cell,
          {
            width: cellSize,
            height: cellSize,
            backgroundColor: color,
          },
        ]}
      />
    );
  };

  // 计算格子尺寸
  const boardWidth = width * 0.7;
  const boardHeight = height * 0.65;
  const cellSize = Math.min(boardWidth / 10, boardHeight / 20, 32);

  // 预览下一个方块
  const renderNext = () => {
    if (!nextShape) return null;
    const previewSize = cellSize * 0.6;
    return (
      <View style={styles.nextContainer}>
        <Text style={styles.nextLabel}>下一个</Text>
        {nextShape.matrix.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.map((cell, c) => (
              <View key={c} style={{
                width: previewSize,
                height: previewSize,
                backgroundColor: cell ? nextShape.color : 'transparent',
                borderWidth: cell ? 0.5 : 0,
                borderColor: '#555',
              }} />
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>关卡 {levelId}</Text>
        <Text style={styles.headerText}>得分 {score}</Text>
        <Text style={styles.headerText}>目标 {targetScore}</Text>
      </View>
      <View style={styles.gameArea}>
        <View style={[styles.board, { width: cellSize * 10, height: cellSize * 20 }]}>
          {board.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {row.map((_, c) => renderCell(r, c))}
            </View>
          ))}
        </View>
        <View style={styles.sidePanel}>
          {renderNext()}
          <Text style={styles.infoText}>等级 {level}</Text>
          <Text style={styles.infoText}>消除 {rowsCleared} 行</Text>
          <TouchableOpacity
            style={[styles.controlBtn, styles.pauseBtn, (gameOver) && styles.disabledBtn]}
            onPress={togglePause}
            disabled={gameOver}
          >
            <Text style={styles.controlText}>{isPaused ? `▶开始` : '⏸ 暂停'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.controlBtn} onPress={() => moveShape(0, -1)}>
            <Text style={styles.controlText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={rotateShapeFn}>
            <Text style={styles.controlText}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={() => moveShape(0, 1)}>
            <Text style={styles.controlText}>▶</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.controlRow}>
          <TouchableOpacity style={[styles.controlBtn, styles.dropBtn]} onPress={hardDrop}>
            <Text style={styles.controlText}>⤓ 落下</Text>
          </TouchableOpacity>
        </View>
      </View>
      {gameOver && (
        <TouchableOpacity style={styles.restartBtn} onPress={initGame}>
          <Text style={styles.restartText}>重新开始</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
  },
  headerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  board: {
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#555',
    marginRight: 10,
  },
  cell: {
    borderWidth: 0.5,
    borderColor: '#444',
  },
  sidePanel: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  nextContainer: {
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  nextLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    marginVertical: 2,
  },
  controls: {
    paddingVertical: 15,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  controlBtn: {
    backgroundColor: '#333',
    width: 70,
    height: 70,
    marginHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#555',
  },
  controlText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropBtn: {
    backgroundColor: '#f00',
    width: 120,
    height: 60,
  },
  pauseBtn: {
    width: 70,
    height: 50,
    marginTop: 10,
    backgroundColor: '#4CAF50',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  restartBtn: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    right: '20%',
    backgroundColor: '#f00',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  restartText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
});

export default TetrisGame;
