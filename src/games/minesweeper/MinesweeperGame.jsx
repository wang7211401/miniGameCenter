// src/games/minesweeper/MinesweeperGame.jsx
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import useUserStore from '../../store/userSlice';
import { getLevelConfig } from './levels';
import {
  chordCell,
  computeStars,
  createGameState,
  generateBoard,
  revealCell,
  toggleFlag,
} from './minesweeperLogic';

const { width } = Dimensions.get('window');

const NUM_COLORS = [
  null, '#1976D2', '#388E3C', '#D32F2F', '#7B1FA2',
  '#FF8F00', '#0097A7', '#424242', '#880E4F',
];

// 状态机：playing / paused / won / lost
const MinesweeperGame = ({ levelId, onComplete }) => {
  const level = getLevelConfig(levelId || 1);
  const navigation = useNavigation();

  const [status, setStatus] = useState('playing');
  const [game, setGame] = useState(() => createGameState(level));
  const [seconds, setSeconds] = useState(0);
  const boardRef = useRef(null); // 雷区在首点时才生成
  const gameRef = useRef(game);
  gameRef.current = game;
  const statusRef = useRef(status);
  statusRef.current = status;
  const lastTapRef = useRef({ r: -1, c: -1, t: 0 });
  const reportedRef = useRef(false);

  const cellSize = Math.floor((Math.min(width, 420) - 16) / level.cols);
  const boardPx = cellSize * level.cols;

  // ---------- 重开 ----------
  const resetGame = useCallback(() => {
    boardRef.current = null;
    setGame(createGameState(level));
    setSeconds(0);
    setStatus('playing');
    reportedRef.current = false;
    lastTapRef.current = { r: -1, c: -1, t: 0 };
  }, [level]);

  // ---------- 计时 ----------
  useEffect(() => {
    if (status !== 'playing') return undefined;
    const timer = setInterval(() => {
      setSeconds(s => {
        const next = s + 1;
        if (level.timeLimit > 0 && next >= level.timeLimit) {
          setStatus('lost');
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, level]);

  // ---------- 胜负上报 ----------
  useEffect(() => {
    if (game.status === 'won' && status === 'playing' && !reportedRef.current) {
      reportedRef.current = true;
      setStatus('won');
    }
  }, [game.status, status]);

  const handleWin = useCallback(() => {
    const stars = computeStars(level, seconds);
    useUserStore.getState().recordBestTime('minesweeper', level.id, seconds);
    Alert.alert(
      '🎉 扫雷成功！',
      `第 ${level.id} 关用时 ${seconds} 秒，获得 ${stars} 星`,
      [{ text: '确定', onPress: () => onComplete && onComplete(stars) }]
    );
  }, [level, seconds, onComplete]);

  useEffect(() => {
    if (status === 'won') handleWin();
  }, [status, handleWin]);

  useEffect(() => {
    if (status === 'lost') {
      Alert.alert('💥 游戏结束',
        gameRef.current.status === 'lost' ? '踩到雷了！' : '时间用尽！',
        [
          { text: '重试', onPress: resetGame },
          { text: '选关', onPress: () => navigation.goBack() },
        ]);
    }
  }, [status, resetGame, navigation]);

  // ---------- 首点生成雷区（保证首点安全 + 求解器可解） ----------
  const ensureBoard = useCallback((r, c) => {
    if (boardRef.current) return boardRef.current;
    let generated;
    try {
      generated = generateBoard(level, Math.random, { r, c });
    } catch {
      generated = generateBoard(level, Math.random); // 兜底：随机起点
    }
    boardRef.current = generated.board;
    return generated.board;
  }, [level]);

  // ---------- 交互 ----------
  const onCellPress = (r, c) => {
    if (status !== 'playing' || gameRef.current.status !== 'playing') return;
    const now = Date.now();
    const last = lastTapRef.current;
    const board = boardRef.current;

    // 双击同一格 => 快击展开（chord）
    if (board && last.r === r && last.c === c && now - last.t < 350 &&
        gameRef.current.revealed[r][c]) {
      lastTapRef.current = { r: -1, c: -1, t: 0 };
      const res = chordCell(gameRef.current, level, board, r, c);
      setGame(res.state);
      if (res.state.status === 'lost') setStatus('lost');
      return;
    }
    lastTapRef.current = { r, c, t: now };

    if (!board) {
      // 首点：生成雷区后翻开
      const b = ensureBoard(r, c);
      const res = revealCell(gameRef.current, level, b, r, c);
      setGame(res.state);
      return;
    }
    // 已翻开格单击也触发 chord（移动端惯例）
    if (gameRef.current.revealed[r][c]) {
      const res = chordCell(gameRef.current, level, board, r, c);
      setGame(res.state);
      if (res.state.status === 'lost') setStatus('lost');
      return;
    }
    const res = revealCell(gameRef.current, level, board, r, c);
    setGame(res.state);
    if (res.state.status === 'lost') setStatus('lost');
  };

  const onCellLongPress = (r, c) => {
    if (status !== 'playing' || gameRef.current.status !== 'playing') return;
    lastTapRef.current = { r: -1, c: -1, t: 0 };
    const maxFlags = level.flagLimit > 0 ? level.flagLimit : level.mines;
    if (!gameRef.current.revealed[r][c] &&
        !gameRef.current.flagged[r][c] &&
        gameRef.current.flagsUsed >= maxFlags) {
      Alert.alert('旗子用尽', `本关最多可插 ${maxFlags} 面旗`);
      return;
    }
    setGame(toggleFlag(gameRef.current, level, r, c));
  };

  // ---------- 渲染 ----------
  const flagsLeft = (level.flagLimit > 0 ? level.flagLimit : level.mines) - game.flagsUsed;
  const timeText = level.timeLimit > 0
    ? `${Math.max(0, level.timeLimit - seconds)}`
    : `${seconds}`;

  const renderCell = (r, c) => {
    const revealed = game.revealed[r][c];
    const flagged = game.flagged[r][c];
    const board = boardRef.current;
    const isMine = board && board.isMine[r][c];
    const num = board ? board.adj[r][c] : 0;
    const lost = status === 'lost' && game.status === 'lost';

    let content = null;
    let bg = '#B0BEC5';
    let style = {};

    if (revealed) {
      bg = '#ECEFF1';
      if (isMine && lost) {
        content = '💣';
        style = { backgroundColor: '#FFCDD2' };
      } else if (num > 0) {
        content = (
          <Text style={[styles.numText, { color: NUM_COLORS[num] }]}>{num}</Text>
        );
      }
    } else if (flagged) {
      content = lost && !isMine ? '❌' : '🚩';
    } else if (lost && isMine) {
      content = '💣';
      style = { backgroundColor: '#FFCDD2' };
    }

    return (
      <TouchableOpacity
        key={`${r},${c}`}
        style={[styles.cell, { width: cellSize, height: cellSize }, style]}
        onPress={() => onCellPress(r, c)}
        onLongPress={() => onCellLongPress(r, c)}
        delayLongPress={350}
        activeOpacity={0.7}
      >
        {typeof content === 'string' ? (
          <Text style={{ fontSize: cellSize * 0.58 }}>{content}</Text>
        ) : content}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudItem}>第 {level.id} 关</Text>
        <Text style={styles.hudItem}>🚩 {flagsLeft}</Text>
        <Text style={[styles.hudItem, level.timeLimit > 0 && seconds > level.timeLimit * 0.8 && styles.hudDanger]}>
          ⏱ {timeText}s
        </Text>
        <Text style={styles.hudItem}>💣 {level.mines}</Text>
        <TouchableOpacity style={styles.hudBtn} onPress={resetGame}>
          <Text style={styles.hudBtnText}>重开</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.hudBtn}
          onPress={() => setStatus(s => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s))}
          disabled={game.status !== 'playing'}
        >
          <Text style={styles.hudBtnText}>{status === 'paused' ? '继续' : '暂停'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.hudBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.hudBtnText}>选关</Text>
        </TouchableOpacity>
      </View>

      {/* 棋盘 */}
      <View style={styles.boardWrap}>
        <View
          style={[styles.board, { width: boardPx, height: cellSize * level.rows }]}
        >
          {Array.from({ length: level.rows }).map((_, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {Array.from({ length: level.cols }).map((_, c) => renderCell(r, c))}
            </View>
          ))}

          {/* 暂停遮罩：隐藏棋盘防偷看 */}
          {status === 'paused' && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>⏸ 已暂停</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStatus('playing')}>
                <Text style={styles.primaryBtnText}>继续游戏</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.tip}>单击翻开 · 长按插旗 · 双击数字快击展开</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', paddingTop: SPACING.sm },
  hud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  hudItem: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginHorizontal: 5 },
  hudDanger: { color: COLORS.danger },
  hudBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginHorizontal: 3,
  },
  hudBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  boardWrap: { alignItems: 'center' },
  board: {
    borderWidth: 2,
    borderColor: '#546E7A',
    borderRadius: 6,
    overflow: 'hidden',
  },
  cell: {
    backgroundColor: '#B0BEC5',
    borderWidth: 0.5,
    borderColor: '#90A4AE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 14, fontWeight: '800' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,24,32,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  primaryBtn: { backgroundColor: COLORS.success, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 24 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  tip: { marginTop: SPACING.md, color: COLORS.textLight, fontSize: 12 },
});

export default MinesweeperGame;
