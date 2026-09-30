// src/games/maze/MazeGame.jsx
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import useUserStore from '../../store/userSlice';
import { getLevelConfig } from './levels';
import {
  computeStars,
  createPlayState,
  DIRS,
  generateMaze,
  movePlayer,
} from './mazeLogic';

const { width } = Dimensions.get('window');

const MazeGame = ({ levelId, onComplete }) => {
  const level = getLevelConfig(levelId || 1);
  const navigation = useNavigation();

  const maze = useMemo(() => generateMaze(level, level.id * 1000003 + 11), [level]);
  const size = maze.size;

  const [pstate, setPstate] = useState(() => createPlayState(maze));
  const [status, setStatus] = useState('playing'); // playing/paused/won/lost
  const [seconds, setSeconds] = useState(0);
  const pstateRef = useRef(pstate);
  pstateRef.current = pstate;
  const statusRef = useRef(status);
  statusRef.current = status;
  const reportedRef = useRef(false);

  const cellPx = Math.floor(Math.min(width - 24, 420) / size);
  const boardPx = cellPx * size;

  // 玩家动画位置
  const posXY = useMemo(() => ({
    x: new Animated.Value((maze.start % size) * cellPx),
    y: new Animated.Value(Math.floor(maze.start / size) * cellPx),
  }), [maze, size, cellPx]);

  useEffect(() => {
    Animated.timing(posXY.x, {
      toValue: (pstate.cell % size) * cellPx,
      duration: 130,
      useNativeDriver: false,
    }).start();
    Animated.timing(posXY.y, {
      toValue: Math.floor(pstate.cell / size) * cellPx,
      duration: 130,
      useNativeDriver: false,
    }).start();
  }, [pstate.cell, size, cellPx, posXY]);

  // ---------- 计时 ----------
  useEffect(() => {
    if (status !== 'playing') return undefined;
    const timer = setInterval(() => {
      setSeconds(s => {
        const next = s + 1;
        if (maze.timeLimit > 0 && next >= maze.timeLimit) setStatus('lost');
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, maze]);

  // ---------- 胜负 ----------
  useEffect(() => {
    if (status !== 'playing') return;
    if (pstate.won) setStatus('won');
    else if (maze.stepLimit > 0 && pstate.steps > maze.stepLimit) setStatus('lost');
  }, [pstate, status, maze]);

  useEffect(() => {
    if (status !== 'won' || reportedRef.current) return;
    reportedRef.current = true;
    const stars = computeStars(maze, pstateRef.current, seconds);
    const store = useUserStore.getState();
    store.recordBestMoves('maze', level.id, pstateRef.current.steps);
    store.recordBestTime('maze', level.id, seconds);
    Alert.alert(
      '🎉 走出迷宫！',
      `第 ${level.id} 关：${pstateRef.current.steps} 步（最短 ${maze.par}）· ${seconds}s · ${stars} 星`,
      [{ text: '确定', onPress: () => onComplete && onComplete(stars) }]
    );
  }, [status, maze, level, seconds, onComplete]);

  useEffect(() => {
    if (status !== 'lost') return;
    Alert.alert('💔 失败',
      pstateRef.current.steps > maze.stepLimit && maze.stepLimit > 0
        ? `步数超过限制 ${maze.stepLimit}`
        : '时间用尽！',
      [
        { text: '重试', onPress: resetRound },
        { text: '选关', onPress: () => navigation.goBack() },
      ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ---------- 移动 ----------
  const doMove = useCallback((dirIndex) => {
    if (statusRef.current !== 'playing') return;
    const next = movePlayer(maze, pstateRef.current, dirIndex);
    if (next !== pstateRef.current) setPstate(next);
  }, [maze]);

  const resetRound = useCallback(() => {
    setPstate(createPlayState(maze));
    setSeconds(0);
    setStatus('playing');
    reportedRef.current = false;
  }, [maze]);

  // 棋盘滑动（pageX/pageY 稳定坐标）
  const swipeRef = useRef(null);
  const boardPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      swipeRef.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
    },
    onPanResponderMove: (evt) => {
      const s = swipeRef.current;
      if (!s) return;
      const dx = evt.nativeEvent.pageX - s.x;
      const dy = evt.nativeEvent.pageY - s.y;
      if (Math.abs(dx) < 26 && Math.abs(dy) < 26) return;
      if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 1 : 3);
      else doMove(dy > 0 ? 2 : 0);
      swipeRef.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
    },
    onPanResponderRelease: () => { swipeRef.current = null; },
  })).current;

  // 虚拟摇杆：拖动圆盘，越过阈值走一步并回中
  const joyRef = useRef(null);
  const stickXY = useRef(new Animated.ValueXY({ x: 0, y: 0 }));
  const joyPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      joyRef.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
    },
    onPanResponderMove: (evt) => {
      const s = joyRef.current;
      if (!s) return;
      const dx = evt.nativeEvent.pageX - s.x;
      const dy = evt.nativeEvent.pageY - s.y;
      stickXY.current.setValue({ x: clamp(dx, -22, 22), y: clamp(dy, -22, 22) });
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 1 : 3);
      else doMove(dy > 0 ? 2 : 0);
      joyRef.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
      stickXY.current.setValue({ x: 0, y: 0 });
    },
    onPanResponderRelease: () => {
      joyRef.current = null;
      stickXY.current.setValue({ x: 0, y: 0 });
    },
  })).current;

  // ---------- 迷雾可见性 ----------
  const visible = (cell) => {
    if (!maze.fog) return true;
    const r = Math.floor(cell / size), c = cell % size;
    const pr = Math.floor(pstate.cell / size), pc = pstate.cell % size;
    return Math.max(Math.abs(r - pr), Math.abs(c - pc)) <= 3;
  };

  // ---------- 渲染 ----------
  const keyCount = maze.doors.length;
  const keysHeld = countBits(pstate.keyMask);
  const timeText = maze.timeLimit > 0
    ? `${Math.max(0, maze.timeLimit - seconds)}s`
    : `${seconds}s`;

  const cellContent = (cell) => {
    if (cell === maze.end) return '🚪';
    const star = maze.stars.find(s => s.cell === cell);
    const key = maze.keys.find(k => k.cell === cell);
    const door = maze.doors.find(d => d.cell === cell);
    const trap = maze.traps.find(t => t.cell === cell);
    const portal = maze.portals.find(p => p.a === cell || p.b === cell);
    if (door) return pstate.keyMask & (1 << door.key) ? '' : '🔒';
    if (key && !(pstate.keyMask & (1 << key.id))) return '🗝';
    if (star && !pstate.collectedStars.has(cell)) return '⭐';
    if (trap) return '🔥';
    if (portal) return '🌀';
    return '';
  };

  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = r * size + c;
      const w = maze.walls[cell];
      const vis = visible(cell);
      const content = cellContent(cell);
      cells.push(
        <View
          key={cell}
          style={[
            styles.cell,
            {
              width: cellPx, height: cellPx,
              left: c * cellPx, top: r * cellPx,
              borderTopWidth: w & DIRS[0].wall ? 2 : 0,
              borderRightWidth: w & DIRS[1].wall ? 2 : 0,
              borderBottomWidth: w & DIRS[2].wall ? 2 : 0,
              borderLeftWidth: w & DIRS[3].wall ? 2 : 0,
            },
            !vis && styles.cellFog,
          ]}
        >
          {vis && content ? (
            <Text style={{ fontSize: cellPx * 0.55, lineHeight: cellPx * 0.7 }}>{content}</Text>
          ) : null}
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudItem}>第 {level.id} 关</Text>
        <Text style={[styles.hudItem, maze.stepLimit > 0 && pstate.steps > maze.stepLimit * 0.8 && styles.hudDanger]}>
          步数 {pstate.steps}{maze.stepLimit > 0 ? `/${maze.stepLimit}` : ''}
        </Text>
        <Text style={styles.hudItem}>⏱ {timeText}</Text>
        {keyCount > 0 && <Text style={styles.hudItem}>🗝 {keysHeld}/{keyCount}</Text>}
        {maze.stars.length > 0 && (
          <Text style={styles.hudItem}>⭐ {pstate.collectedStars.size}/{maze.stars.length}</Text>
        )}
      </View>

      {/* 迷宫 */}
      <View style={styles.boardWrap} {...boardPan.panHandlers}>
        <View style={[styles.board, { width: boardPx, height: boardPx }]}>
          {cells}
          {/* 玩家 */}
          <Animated.View
            style={[
              styles.player,
              {
                width: cellPx * 0.6, height: cellPx * 0.6,
                transform: [{ translateX: posXY.x }, { translateY: posXY.y }],
                left: cellPx * 0.2, top: cellPx * 0.2,
              },
            ]}
          />
          {status === 'paused' && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>⏸ 已暂停</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStatus('playing')}>
                <Text style={styles.primaryBtnText}>继续</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* 控制区：摇杆 + 方向键 */}
      <View style={styles.controls}>
        <View style={styles.joyBase} {...joyPan.panHandlers}>
          <Animated.View style={[styles.joyStick, { transform: stickXY.current.getTranslateTransform() }]} />
        </View>
        <View style={styles.dpad}>
          <View style={styles.dpadRow}>
            <DirBtn label="▲" onPress={() => doMove(0)} />
          </View>
          <View style={styles.dpadRow}>
            <DirBtn label="◀" onPress={() => doMove(3)} />
            <DirBtn label="⏸" onPress={() => setStatus(s => s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s)} small />
            <DirBtn label="▶" onPress={() => doMove(1)} />
          </View>
          <View style={styles.dpadRow}>
            <DirBtn label="▼" onPress={() => doMove(2)} />
          </View>
        </View>
        <TouchableOpacity style={styles.restartBtn} onPress={resetRound}>
          <Text style={styles.restartText}>🔄 重开</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.restartBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.restartText}>🗂 选关</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.tip}>在迷宫上滑动 · 摇杆 · 方向键 均可移动</Text>
    </View>
  );
};

const DirBtn = ({ label, onPress, small }) => (
  <TouchableOpacity
    style={[styles.dirBtn, small && styles.dirBtnSmall]}
    onPress={onPress}
    activeOpacity={0.6}
  >
    <Text style={styles.dirText}>{label}</Text>
  </TouchableOpacity>
);

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function countBits(n) { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', paddingTop: SPACING.sm },
  hud: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: SPACING.sm },
  hudItem: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginHorizontal: 5 },
  hudDanger: { color: COLORS.danger },
  boardWrap: { alignItems: 'center' },
  board: {
    position: 'relative',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2F3E46',
    overflow: 'hidden',
  },
  cell: {
    position: 'absolute',
    borderColor: '#2F3E46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFog: { backgroundColor: '#263238' },
  player: {
    position: 'absolute',
    backgroundColor: '#E53935',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,24,32,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overlayTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  primaryBtn: { backgroundColor: COLORS.success, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 22 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    width: '100%',
    paddingHorizontal: SPACING.md,
  },
  joyBase: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(47,62,70,0.15)',
    borderWidth: 2,
    borderColor: '#546E7A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  joyStick: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary },
  dpad: {},
  dpadRow: { flexDirection: 'row', marginVertical: 2 },
  dirBtn: {
    width: 46, height: 46, marginHorizontal: 2,
    backgroundColor: '#2F3E46', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  dirBtnSmall: { backgroundColor: '#78909C' },
  dirText: { color: '#fff', fontSize: 17 },
  restartBtn: {
    marginLeft: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  restartText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  tip: { marginTop: SPACING.sm, color: COLORS.textLight, fontSize: 12 },
});

export default MazeGame;
