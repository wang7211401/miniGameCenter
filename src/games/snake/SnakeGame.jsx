// src/games/snake/SnakeGame.jsx
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { getLevelConfig } from './levels';
import {
  computeStars,
  createInitialState,
  OPPOSITE,
  step
} from './snakeLogic';

const { width } = Dimensions.get('window');

// 状态机：start / playing / paused / success / failed
const SnakeGame = ({ levelId, onComplete }) => {
  const level = getLevelConfig(levelId || 1);
  const size = level.size;
  const navigation = useNavigation();

  const [status, setStatus] = useState('start');
  const [snapshot, setSnapshot] = useState(null);
  const [timeLeft, setTimeLeft] = useState(level.timeLimit);
  const [failReason, setFailReason] = useState('');

  const stateRef = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const reportedRef = useRef(false);
  const startAlertedRef = useRef(false);
  const timeLeftRef = useRef(level.timeLimit);

  const cellSize = Math.floor((Math.min(width, 420) - 24) / size);
  const boardPx = cellSize * size;

  // ---------- 初始化 ----------
  const resetGame = useCallback(() => {
    stateRef.current = createInitialState(level, Math.random);
    setSnapshot(stateRef.current);
    timeLeftRef.current = level.timeLimit;
    setTimeLeft(level.timeLimit);
    reportedRef.current = false;
    startAlertedRef.current = false;
    setFailReason('');
  }, [level]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // ---------- 方向输入 ----------
  const changeDir = useCallback((dir) => {
    const st = stateRef.current;
    if (!st || statusRef.current !== 'playing') return;
    // 只允许相对"本 tick 实际移动方向"转向，防止快速两次滑动 180° 掉头自杀
    if (dir === OPPOSITE[st.dir]) return;
    st.pendingDir = dir;
  }, []);

  // ---------- 固定 tick 主循环 ----------
  useEffect(() => {
    if (status !== 'playing') return undefined;
    const timer = setInterval(() => {
      const st = stateRef.current;
      if (!st) return;
      const { state: next, events } = step(st, level, Math.random);
      stateRef.current = next;
      setSnapshot({ ...next });

      if (events.atePoison && next.timePenalty && level.timeLimit > 0) {
        timeLeftRef.current = Math.max(0, timeLeftRef.current - next.timePenalty);
        setTimeLeft(timeLeftRef.current);
      }

      if (!next.alive) {
        setStatus('failed');
        setFailReason(
          events.dead === 'wall' ? '撞墙了' :
          events.dead === 'self' ? '咬到自己了' :
          events.dead === 'mover' ? '撞上移动障碍' : '撞上障碍物'
        );
        return;
      }
      if (next.won) {
        setStatus('success');
        return;
      }
      // 步数限制
      if (level.stepLimit > 0 && next.steps >= level.stepLimit) {
        setStatus('failed');
        setFailReason('步数用尽');
      }
    }, level.speed);
    return () => clearInterval(timer);
  }, [status, level]);

  // ---------- 倒计时 ----------
  useEffect(() => {
    if (status !== 'playing' || level.timeLimit <= 0) return undefined;
    const timer = setInterval(() => {
      timeLeftRef.current -= 1;
      setTimeLeft(timeLeftRef.current);
      if (timeLeftRef.current <= 0) {
        setStatus('failed');
        setFailReason('时间用尽');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [status, level]);

  // ---------- 进入关卡弹出"开始游戏"弹窗（只弹一次） ----------
  useEffect(() => {
    if (status !== 'start' || startAlertedRef.current) return;
    startAlertedRef.current = true;
    Alert.alert(
      `🐍 第 ${level.id} 关`,
      `目标吃 ${level.target} 个食物${level.timeLimit ? ` · 限时 ${level.timeLimit}s` : ''}` +
      `${level.stepLimit ? ` · 限步 ${level.stepLimit}` : ''}${level.wrap ? ' · 可穿墙' : ''}`,
      [
        { text: '开始游戏', onPress: startGame },
        { text: '返回', style: 'cancel', onPress: () => navigation.goBack() },
      ]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, level]);

  // ---------- 胜利后上报（只报一次） ----------
  useEffect(() => {
    if (status !== 'success' || reportedRef.current) return;
    reportedRef.current = true;
    const st = stateRef.current;
    const stars = computeStars(
      level,
      st,
      timeLeftRef.current,
      level.stepLimit > 0 ? level.stepLimit - st.steps : 0
    );
    Alert.alert(
      '🎉 通关！',
      `第 ${level.id} 关完成，获得 ${stars} 星\n得分: ${st.eaten * 10}`,
      [{ text: '确定', onPress: () => onComplete && onComplete(stars) }]
    );
  }, [status, level, onComplete]);

  // ---------- 失败提示 ----------
  useEffect(() => {
    if (status !== 'failed') return;
    Alert.alert('💔 游戏已结束', `${failReason}！吃到 ${stateRef.current?.eaten ?? 0}/${level.target}`, [
      { text: '重试', onPress: () => { resetGame(); setStatus('playing'); } },
      { text: '返回选关', style: 'cancel', onPress: () => navigation.goBack() },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, failReason, level, resetGame]);

  // ---------- 手势滑动（用 pageX/pageY，避免 locationX 基准跳变） ----------
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => statusRef.current === 'playing',
      onMoveShouldSetPanResponder: () => statusRef.current === 'playing',
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const start = { x: pageX, y: pageY };
        panResponder._start = start;
      },
      onPanResponderMove: (evt) => {
        const start = panResponder._start;
        if (!start) return;
        const dx = evt.nativeEvent.pageX - start.x;
        const dy = evt.nativeEvent.pageY - start.y;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          changeDir(dx > 0 ? 'right' : 'left');
        } else {
          changeDir(dy > 0 ? 'down' : 'up');
        }
        panResponder._start = null; // 一次滑动只触发一次
      },
      onPanResponderRelease: () => {
        panResponder._start = null;
      },
    })
  ).current;

  // ---------- 控制 ----------
  const startGame = () => {
    resetGame();
    setStatus('playing');
  };
  const togglePause = () => {
    if (status === 'playing') setStatus('paused');
    else if (status === 'paused') setStatus('playing');
  };

  // ---------- 渲染 ----------
  const st = snapshot;
  const obstacleSet = st ? st.obstacles : new Set();
  const moverSet = st ? new Set(st.movers.map(m => `${m.r},${m.c}`)) : new Set();
  const snakeSet = st ? new Set(st.snake.map(s => `${s.r},${s.c}`)) : new Set();
  const headKey = st ? `${st.snake[0].r},${st.snake[0].c}` : '';

  const renderCell = (r, c) => {
    const k = `${r},${c}`;
    let content = null;
    let bg = (r + c) % 2 === 0 ? '#EAF3EA' : '#E1EDE1';

    if (obstacleSet.has(k)) bg = '#8D99AE';
    if (level.door && level.door.r === r && level.door.c === c && !st?.hasKey) bg = '#B87333';
    if (moverSet.has(k)) bg = '#FF9F43';
    if (snakeSet.has(k)) bg = k === headKey ? '#0B6E2F' : '#2ECC71';

    if (st) {
      if (st.food && st.food.r === r && st.food.c === c) content = '🍎';
      else if (st.keyPos && !st.hasKey && st.keyPos.r === r && st.keyPos.c === c) content = '🔑';
      else if (st.poisons.some(p => p.r === r && p.c === c)) content = '☠️';
      else if (k === headKey) content = '🐍';
    }

    return (
      <View
        key={k}
        style={{
          width: cellSize,
          height: cellSize,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content && (
          <Text style={{ fontSize: cellSize * 0.62, lineHeight: cellSize * 0.75 }}>{content}</Text>
        )}
      </View>
    );
  };

  const dirBtn = (dir, label) => (
    <TouchableOpacity
      key={dir}
      style={styles.dirBtn}
      onPress={() => changeDir(dir)}
      disabled={status !== 'playing'}
      activeOpacity={0.6}
    >
      <Text style={styles.dirText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 顶部信息栏 */}
      <View style={styles.hud}>
        <Text style={styles.hudItem}>第 {level.id} 关</Text>
        <Text style={styles.hudItem}>
          🍎 {st ? st.eaten : 0}/{level.target}
        </Text>
        <Text style={styles.hudItem}>得分 {st ? st.eaten * 10 : 0}</Text>
        {level.timeLimit > 0 && <Text style={styles.hudItem}>⏱ {Math.max(0, timeLeft)}s</Text>}
        {level.stepLimit > 0 && (
          <Text style={styles.hudItem}>
            步数 {st ? st.steps : 0}/{level.stepLimit}
          </Text>
        )}
        {level.wrap && <Text style={[styles.hudItem, styles.wrapTag]}>穿墙</Text>}
        {st?.hasKey && <Text style={styles.hudItem}>🔑</Text>}
      </View>

      {/* 游戏网格 */}
      <View style={styles.boardWrap}>
        <View
          {...panResponder.panHandlers}
          style={[styles.board, { width: boardPx, height: boardPx }]}
        >
          {Array.from({ length: size }).map((_, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {Array.from({ length: size }).map((_, c) => renderCell(r, c))}
            </View>
          ))}

          {/* 覆盖层：开始 / 暂停 / 成功 */}
          {(status === 'start' || status === 'paused' || status === 'success') && (
            <View style={styles.overlay}>
              {status === 'start' && (
                <>
                  <Text style={styles.overlayTitle}>贪吃蛇</Text>
                  <Text style={styles.overlayDesc}>
                    目标吃 {level.target} 个食物{level.timeLimit ? ` · 限时 ${level.timeLimit}s` : ''}
                    {level.stepLimit ? ` · 限步 ${level.stepLimit}` : ''}
                    {level.wrap ? ' · 可穿墙' : ''}
                  </Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={startGame}>
                    <Text style={styles.primaryBtnText}>开始游戏</Text>
                  </TouchableOpacity>
                </>
              )}
              {status === 'paused' && (
                <>
                  <Text style={styles.overlayTitle}>已暂停</Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={togglePause}>
                    <Text style={styles.primaryBtnText}>继续</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={startGame}>
                    <Text style={styles.secondaryBtnText}>重新开始</Text>
                  </TouchableOpacity>
                </>
              )}
              {status === 'success' && (
                <Text style={styles.overlayTitle}>🎉 通关！</Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* 控制区：暂停 + 虚拟方向键 */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.pauseBtn} onPress={togglePause} disabled={status === 'start'}>
          <Text style={styles.pauseBtnText}>{status === 'paused' ? '▶ 继续' : '⏸ 暂停'}</Text>
        </TouchableOpacity>
        <View style={styles.dpad}>
          <View style={styles.dpadRow}>{dirBtn('up', '▲')}</View>
          <View style={styles.dpadRow}>
            {dirBtn('left', '◀')}
            {dirBtn('right', '▶')}
          </View>
          <View style={styles.dpadRow}>{dirBtn('down', '▼')}</View>
        </View>
        <Text style={styles.tip}>也可以直接在棋盘上滑动改变方向</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', paddingTop: SPACING.sm },
  hud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  hudItem: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginHorizontal: 6 },
  wrapTag: { color: COLORS.primary },
  boardWrap: { alignItems: 'center' },
  board: {
    borderWidth: 2,
    borderColor: '#2F3E46',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#E1EDE1',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,24,32,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  overlayTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  overlayDesc: { color: '#CFD8DC', fontSize: 13, marginBottom: 14, textAlign: 'center' },
  primaryBtn: { backgroundColor: COLORS.success, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 24 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { marginTop: 10, backgroundColor: '#546E7A', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 },
  secondaryBtnText: { color: '#fff', fontSize: 14 },
  controls: { alignItems: 'center', marginTop: SPACING.md },
  pauseBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: SPACING.sm,
  },
  pauseBtnText: { color: '#fff', fontWeight: 'bold' },
  dpad: { alignItems: 'center' },
  dpadRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 3 },
  dirBtn: {
    width: 58,
    height: 58,
    marginHorizontal: 4,
    backgroundColor: '#2F3E46',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirText: { color: '#fff', fontSize: 20 },
  tip: { marginTop: SPACING.sm, color: COLORS.textLight, fontSize: 12 },
});

export default SnakeGame;
