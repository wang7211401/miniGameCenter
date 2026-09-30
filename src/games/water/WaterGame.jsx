// src/games/water/WaterGame.jsx
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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
  canPour,
  generateLevel,
  hint,
  isWon,
  PALETTE,
  pour,
  tubeComplete,
} from './waterLogic';

const { width } = Dimensions.get('window');

const WaterGame = ({ levelId, onComplete }) => {
  const level = getLevelConfig(levelId || 1);
  const navigation = useNavigation();

  // 同一局内布局固定（重开不换布局）
  const [seed] = useState(() => level.id * 1000003 + 7);
  const generated = useMemo(
    () => generateLevel(level, seed),
    [level, seed]
  );

  const [tubes, setTubes] = useState(generated.tubes);
  const [selected, setSelected] = useState(null);
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState('playing'); // playing/paused/won/lost
  const [seconds, setSeconds] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(level.hints || 0);
  const historyRef = useRef([]);
  const revealedRef = useRef(new Set()); // 隐藏层一旦露出永久可见
  const reportedRef = useRef(false);
  const bounceRef = useRef([]); // 每根管子的倒水动画值

  const optimal = generated.optimal;
  const stepLimit = generated.stepLimit; // 最少步数 + slack（0=不限）

  const tubeW = Math.floor(
    Math.min((Math.min(width, 480) - 16) / Math.min(level.tubeCount, 7) - 6, 44)
  );
  const segH = level.capacity >= 5 ? 16 : 18;

  const resetRound = useCallback(() => {
    setTubes(generated.tubes.map(t => [...t]));
    setSelected(null);
    setMoves(0);
    setSeconds(0);
    setHintsLeft(level.hints || 0);
    setStatus('playing');
    historyRef.current = [];
    revealedRef.current = new Set();
    reportedRef.current = false;
  }, [generated, level]);

  // 每根管子一个 Animated.Value
  useEffect(() => {
    bounceRef.current = Array.from({ length: level.tubeCount }, () => new Animated.Value(0));
  }, [level]);

  // ---------- 计时 ----------
  useEffect(() => {
    if (status !== 'playing') return undefined;
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  // ---------- 胜利 / 失败判定 ----------
  useEffect(() => {
    if (status !== 'playing') return;
    if (isWon(tubes, level.capacity)) {
      setStatus('won');
    } else if (stepLimit > 0 && moves >= stepLimit) {
      setStatus('lost');
    }
  }, [tubes, moves, status, level, stepLimit]);

  useEffect(() => {
    if (status !== 'won' || reportedRef.current) return;
    reportedRef.current = true;
    const stars = moves <= optimal ? 3 : moves <= Math.ceil(optimal * 1.5) ? 2 : 1;
    useUserStore.getState().recordBestMoves('water', level.id, moves);
    Alert.alert(
      '🎉 通关！',
      `第 ${level.id} 关用了 ${moves} 步（最少 ${optimal} 步）· ${seconds}s，获得 ${stars} 星`,
      [{ text: '确定', onPress: () => onComplete && onComplete(stars) }]
    );
  }, [status, moves, optimal, seconds, level, onComplete]);

  useEffect(() => {
    if (status !== 'lost') return;
    Alert.alert('😵 步数用尽', `本关限 ${stepLimit} 步（最少 ${optimal} 步），可撤销或重开`, [
      { text: '撤销', onPress: undo },
      { text: '重开', onPress: resetRound },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ---------- 交互 ----------
  const onTubePress = (idx) => {
    if (status !== 'playing') return;
    if (generated.lockedSet.has(idx)) {
      Alert.alert('锁定管', '这根管已锁定，无法操作');
      return;
    }
    if (selected === null) {
      if (!tubes[idx].length) return; // 空管不能作源
      setSelected(idx);
      return;
    }
    if (selected === idx) {
      setSelected(null);
      return;
    }
    if (canPour(tubes, selected, idx, level.capacity, generated.lockedSet)) {
      const from = selected;
      historyRef.current.push({ tubes: tubes.map(t => [...t]), moves });
      const next = pour(tubes, from, idx, level.capacity);
      setTubes(next);
      setMoves(m => m + 1);
      setSelected(null);
      // 目标管弹跳动画
      const bv = bounceRef.current[idx];
      if (bv) {
        bv.setValue(0);
        Animated.sequence([
          Animated.timing(bv, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(bv, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start();
      }
    } else {
      // 改选新源管
      setSelected(tubes[idx].length ? idx : null);
    }
  };

  function undo() {
    const last = historyRef.current.pop();
    if (!last) return;
    setTubes(last.tubes);
    setMoves(last.moves);
    setSelected(null);
    if (status === 'lost') setStatus('playing');
  }

  const showHint = () => {
    if (status !== 'playing') return;
    if (hintsLeft <= 0) {
      Alert.alert('提示', '本关提示次数已用完');
      return;
    }
    const mv = hint(tubes, level.capacity, generated.lockedSet);
    if (!mv) {
      Alert.alert('提示', '当前局面无可行操作，请撤销或重开');
      return;
    }
    setHintsLeft(h => h - 1);
    Alert.alert('提示', `把 ${mv[0] + 1} 号管倒入 ${mv[1] + 1} 号管`);
  };

  // ---------- 渲染单管 ----------
  const renderTube = (idx) => {
    const tube = tubes[idx];
    const locked = generated.lockedSet.has(idx);
    const hidden = generated.hiddenTubes.has(idx) ? level.hiddenLayers : 0;
    // 隐藏层是否已露出
    if (tube.length <= hidden) revealedRef.current.add(idx);
    const revealed = revealedRef.current.has(idx);
    const done = tubeComplete(tube, level.capacity);
    const isSelected = selected === idx;
    const bv = bounceRef.current[idx] || new Animated.Value(0);

    const cells = [];
    const offset = level.capacity - tube.length; // 顶部空行数
    for (let i = 0; i < level.capacity; i++) {
      // 视觉第 i 行（自上而下）：管口在上、液体沉底；液面顶部即逻辑顶（倒出的来源）
      const exist = i >= offset;
      const layerIdx = level.capacity - 1 - i; // 数组底部（index 0）显示在最下方
      let color = null;
      let isHidden = false;
      if (exist) {
        const realColor = tube[layerIdx];
        // 底部 hidden 层且未露出 => 隐藏
        if (hidden > 0 && !revealed && layerIdx < hidden) isHidden = true;
        else color = realColor;
      }
      cells.push(
        <View
          key={i}
          style={[
            styles.seg,
            { height: segH },
            color ? { backgroundColor: PALETTE[color - 1] } : null,
            isHidden ? styles.segHidden : null,
            i === level.capacity - 1 && exist ? styles.segBottom : null,
          ]}
        >
          {isHidden && <Text style={styles.hiddenMark}>?</Text>}
        </View>
      );
    }

    return (
      <Animated.View
        key={idx}
        style={{
          transform: [
            { translateY: isSelected ? -14 : bv.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
          ],
        }}
      >
        <TouchableOpacity
          onPress={() => onTubePress(idx)}
          activeOpacity={0.85}
          style={styles.pipeWrap}
        >
          {/* 管口法兰 */}
          <View style={[styles.pipeRim, { width: tubeW + 8 }, isSelected && styles.pipeRimSelected]} />
          <View
            style={[
              styles.pipe,
              { width: tubeW },
              isSelected && styles.tubeSelected,
              locked && styles.tubeLocked,
            ]}
          >
            <View style={styles.tubeBody}>{cells}</View>
          </View>
          {locked && <Text style={styles.lockMark}>🔒</Text>}
          {done && !locked && <Text style={styles.doneMark}>✓</Text>}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const rows = [];
  for (let i = 0; i < level.tubeCount; i += 7) {
    rows.push(
      <View key={i} style={styles.tubeRow}>
        {tubes.slice(i, i + 7).map((_, j) => renderTube(i + j))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudItem}>第 {level.id} 关</Text>
        <Text style={styles.hudItem}>步数 {moves}</Text>
        <Text style={styles.hudItem}>
          最少 {optimal}{stepLimit > 0 ? ` / 限 ${stepLimit}` : ''}
        </Text>
        <Text style={styles.hudItem}>⏱ {seconds}s</Text>
        {level.hints > 0 && <Text style={styles.hudItem}>💡 {hintsLeft}</Text>}
        <TouchableOpacity style={styles.hudBtn} onPress={() => setStatus(s => s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s)}>
          <Text style={styles.hudBtnText}>{status === 'paused' ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.hudBtn} onPress={resetRound}>
          <Text style={styles.hudBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* 试管区 */}
      <View style={styles.boardWrap}>{rows}</View>

      {status === 'paused' && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>⏸ 已暂停</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStatus('playing')}>
            <Text style={styles.primaryBtnText}>继续</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 底部按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={undo} disabled={historyRef.current.length === 0}>
          <Text style={styles.btnText}>↩ 撤销</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={showHint} disabled={hintsLeft <= 0}>
          <Text style={styles.btnText}>💡 提示 {hintsLeft}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={resetRound}>
          <Text style={styles.btnText}>� 重开</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => setStatus(s => s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s)}>
          <Text style={styles.btnText}>{status === 'paused' ? '▶ 继续' : '⏸ 暂停'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>🗂 选关</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', paddingTop: SPACING.sm },
  hud: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: SPACING.md },
  hudItem: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginHorizontal: 6 },
  hudDanger: { color: COLORS.danger },
  hudBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 4,
  },
  hudBtnText: { fontSize: 14 },
  boardWrap: { alignItems: 'center', paddingHorizontal: 8 },
  tubeRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10, columnGap: 10 },
  pipeWrap: { alignItems: 'center' },
  pipeRim: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#B0BEC5',
    borderWidth: 2,
    borderColor: '#78909C',
    marginBottom: -1,
  },
  pipeRimSelected: { backgroundColor: '#C5CAE9', borderColor: COLORS.primary },
  pipe: {
    alignItems: 'center',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 2,
    borderColor: '#78909C',
    backgroundColor: 'rgba(224,242,254,0.55)',
    paddingTop: 2,
    paddingBottom: 3,
  },
  tubeSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(108,99,255,0.12)' },
  tubeLocked: { borderColor: '#546E7A', backgroundColor: 'rgba(120,144,156,0.2)' },
  tubeBody: { width: '82%', alignItems: 'stretch', minHeight: 4 },
  seg: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  segBottom: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  segHidden: { backgroundColor: '#455A64' },
  hiddenMark: { color: '#CFD8DC', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  lockMark: { position: 'absolute', top: -8, right: -6, fontSize: 12 },
  doneMark: { position: 'absolute', top: -8, right: -4, fontSize: 12, color: COLORS.success, fontWeight: '900' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,24,32,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  primaryBtn: { backgroundColor: COLORS.success, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 24 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.md,
  },
  btn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    margin: 4,
  },
  btnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});

export default WaterGame;
