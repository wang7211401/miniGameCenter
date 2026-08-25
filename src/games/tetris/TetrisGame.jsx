// src/games/tetris/TetrisGame.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const TetrisGame = ({ levelId, onComplete }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomSafe = insets.bottom || 0;

  const [board, setBoard] = useState([]);
  const [shape, setShape] = useState(null);
  const [score, setScore] = useState(0);
  const [rowsCleared, setRowsCleared] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [nextShape, setNextShape] = useState(null);
  const [dropInterval, setDropInterval] = useState(1000);
  const [isPaused, setIsPaused] = useState(true);

  const boardRef = useRef([]);
  const shapeRef = useRef(null);
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
    setIsPaused(true);
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

  const moveShape = useCallback(
    (dx, dy) => {
      if (gameOver || isPaused || !shapeRef.current) return false;
      const newShape = {
        ...shapeRef.current,
        row: shapeRef.current.row + dx,
        col: shapeRef.current.col + dy,
      };
      if (isValidPosition(boardRef.current, newShape, newShape.row, newShape.col)) {
        setShape(newShape);
        shapeRef.current = newShape;
        return true;
      }
      if (dx === 1 && dy === 0) {
        lockShape();
      }
      return false;
    },
    [gameOver, isPaused, lockShape]
  );

  const rotateShapeFn = useCallback(() => {
    if (gameOver || isPaused || !shapeRef.current) return;
    const rotated = rotateShape(shapeRef.current);
    if (isValidPosition(boardRef.current, rotated, rotated.row, rotated.col)) {
      setShape(rotated);
      shapeRef.current = rotated;
    }
  }, [gameOver, isPaused]);

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

  // 游戏循环
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

  const togglePause = () => {
    if (gameOver) return;
    setIsPaused(prev => !prev);
  };

  // ----- 动态尺寸计算 -----
  // 预留顶部信息栏高度（约 50px）和底部控制区高度（根据屏幕调整）
  const headerHeight = 50;
  const controlHeight = screenWidth < 400 ? 140 : 180; // 小屏手机控制区更紧凑
  const bottomPadding = 20;
  const availableHeight = screenHeight - headerHeight - controlHeight - bottomPadding - bottomSafe;
  const availableWidth = screenWidth - 20; // 左右留边距

  // 棋盘列数 10，行数 20
  const COLS = 10;
  const ROWS = 20;

  // 计算单元格大小：取宽度和高度适配的较小值
  const cellSizeByWidth = availableWidth / (COLS + 2.8); // 预留侧面板空间（约2.8列宽）
  const cellSizeByHeight = availableHeight / ROWS;
  let cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
  cellSize = Math.max(cellSize, 12); // 最小 12px，防止太小
  cellSize = Math.min(cellSize, 36); // 最大 36px，防止过大

  // 棋盘实际尺寸
  const boardWidth = cellSize * COLS;
  const boardHeight = cellSize * ROWS;

  // 侧面板宽度（动态取 2~3 个单元格宽度）
  const sidePanelWidth = Math.max(60, cellSize * 2.2);
  const sidePanelHeight = boardHeight;

  // 预览方块尺寸
  const previewSize = cellSize * 0.6;

  // 控制按钮尺寸
  const btnSize = cellSize * 1.2;
  const btnMinSize = 50;

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
          { width: cellSize, height: cellSize, backgroundColor: color },
        ]}
      />
    );
  };

  // 渲染下一个方块
  const renderNext = () => {
    if (!nextShape) return null;
    return (
      <View style={styles.nextContainer}>
        <Text style={[styles.nextLabel, { fontSize: cellSize * 0.5 }]}>下一个</Text>
        {nextShape.matrix.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {row.map((cell, c) => (
              <View
                key={c}
                style={{
                  width: previewSize,
                  height: previewSize,
                  backgroundColor: cell ? nextShape.color : 'transparent',
                  borderWidth: cell ? 0.5 : 0,
                  borderColor: '#555',
                }}
              />
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 顶部信息栏 */}
      <View style={[styles.header, { height: headerHeight }]}>
        <Text style={styles.headerText}>关卡 {levelId}</Text>
        <Text style={styles.headerText}>得分 {score}</Text>
        <Text style={styles.headerText}>目标 {targetScore}</Text>
      </View>

      {/* 游戏主体：棋盘 + 侧面板 */}
      <View style={[styles.gameArea, { height: availableHeight }]}>
        <View style={[styles.board, { width: boardWidth, height: boardHeight }]}>
          {board.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {row.map((_, c) => renderCell(r, c))}
            </View>
          ))}
        </View>

        {/* 侧面板 */}
        <View style={[styles.sidePanel, { width: sidePanelWidth, height: sidePanelHeight }]}>
          {renderNext()}
          <Text style={[styles.infoText, { fontSize: cellSize * 0.4 }]}>等级 {level}</Text>
          <Text style={[styles.infoText, { fontSize: cellSize * 0.4 }]}>消除 {rowsCleared} 行</Text>
          <TouchableOpacity
            style={[
              styles.controlBtn,
              styles.pauseBtn,
              { width: sidePanelWidth * 0.7, height: sidePanelWidth * 0.4 },
              gameOver && styles.disabledBtn,
            ]}
            onPress={togglePause}
            disabled={gameOver}
          >
            <Text style={[styles.controlText, { fontSize: cellSize * 0.4 }]}>
              {isPaused ? '▶开始' : '⏸暂停'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 底部控制按钮 */}
      <View style={[styles.controls, { height: controlHeight, paddingBottom: bottomPadding * 2  + bottomSafe }]}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlBtn, { width: btnSize, height: btnSize }]}
            onPress={() => moveShape(0, -1)}
          >
            <Text style={[styles.controlText, { fontSize: cellSize * 0.6 }]}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, { width: btnSize, height: btnSize }]}
            onPress={rotateShapeFn}
          >
            <Text style={[styles.controlText, { fontSize: cellSize * 0.6 }]}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlBtn, { width: btnSize, height: btnSize }]}
            onPress={() => moveShape(0, 1)}
          >
            <Text style={[styles.controlText, { fontSize: cellSize * 0.6 }]}>▶</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlBtn, styles.dropBtn, { width: btnSize * 2, height: btnSize * 0.8 }]}
            onPress={hardDrop}
          >
            <Text style={[styles.controlText, { fontSize: cellSize * 0.5 }]}>⤓ 落下</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
  },
  headerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  board: {
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: '#555',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: '#444',
  },
  sidePanel: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 8,
  },
  nextContainer: {
    backgroundColor: '#1a1a1a',
    padding: 6,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  nextLabel: {
    color: '#fff',
    marginBottom: 4,
  },
  infoText: {
    color: '#ccc',
    marginVertical: 2,
  },
  controls: {
    justifyContent: 'center',
    alignItems: 'center',
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
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#555',
  },
  controlText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dropBtn: {
    backgroundColor: '#f00',
  },
  pauseBtn: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  restartBtn: {
    position: 'absolute',
    top: '40%',
    left: '15%',
    right: '15%',
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