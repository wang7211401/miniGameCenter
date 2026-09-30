// src/games/crossword/CrosswordGame.jsx
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import useUserStore from '../../store/userSlice';
import {
  computeStars,
  createPlayState,
  currentWord,
  deleteChar,
  generateBoard,
  inputChar,
  selectCell,
  toggleDir,
  useHint,
} from './crosswordLogic';
import { getLevelConfig } from './levels';

const { width } = Dimensions.get('window');

const HINT_LABEL = {
  direct: '提示',
  synonym: '近义词',
  paraphrase: '释义',
  fillin: '填空',
  mixed: '提示',
  obscure: '隐晦',
  riddle: '谜面',
  allusion: '典故',
};

const CrosswordGame = ({ levelId, onComplete }) => {
  const level = getLevelConfig(levelId || 1);
  const navigation = useNavigation();

  const board = useMemo(() => generateBoard(level, level.id * 1000003 + 17), [level]);
  const size = board.size;

  const [pstate, setPstate] = useState(() => createPlayState(board));
  const [status, setStatus] = useState('playing'); // playing/paused/won/lost
  const [seconds, setSeconds] = useState(0);
  const pstateRef = useRef(pstate);
  pstateRef.current = pstate;
  const statusRef = useRef(status);
  statusRef.current = status;
  const reportedRef = useRef(false);

  const cellPx = Math.floor(Math.min(width - 16, 460) / size);
  const boardPx = cellPx * size;

  // ---------- 计时 ----------
  useEffect(() => {
    if (status !== 'playing') return undefined;
    const timer = setInterval(() => {
      setSeconds(s => {
        const next = s + 1;
        if (board.timeLimit > 0 && next >= board.timeLimit) setStatus('lost');
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, board]);

  // ---------- 胜负 ----------
  useEffect(() => {
    if (status !== 'playing') return;
    if (pstate.won) setStatus('won');
    else if (board.errorLimit > 0 && pstate.errors > board.errorLimit) setStatus('lost');
  }, [pstate, status, board]);

  useEffect(() => {
    if (status !== 'won' || reportedRef.current) return;
    reportedRef.current = true;
    const stars = computeStars(board, pstateRef.current, seconds);
    const store = useUserStore.getState();
    store.recordBestTime('crossword', level.id, seconds);
    Alert.alert(
      '🎉 填字完成！',
      `第 ${level.id} 关 · ${seconds}s · 错误 ${pstateRef.current.errors} · ${stars} 星`,
      [{ text: '确定', onPress: () => onComplete && onComplete(stars) }]
    );
  }, [status, board, level, seconds, onComplete]);

  useEffect(() => {
    if (status !== 'lost') return;
    Alert.alert(
      '💔 失败',
      board.errorLimit > 0 && pstateRef.current.errors > board.errorLimit
        ? `错误次数超过限制 ${board.errorLimit}`
        : '时间用尽！',
      [
        { text: '重试', onPress: resetRound },
        { text: '选关', onPress: () => navigation.goBack() },
      ]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const resetRound = useCallback(() => {
    setPstate(createPlayState(board));
    setSeconds(0);
    setStatus('playing');
    reportedRef.current = false;
  }, [board]);

  // ---------- 操作 ----------
  const doSelect = useCallback((idx) => {
    if (statusRef.current !== 'playing') return;
    setPstate(s => selectCell(board, s, idx));
  }, [board]);

  const doInput = useCallback((ch) => {
    if (statusRef.current !== 'playing' || !ch) return;
    setPstate(s => {
      const r = inputChar(board, s, ch);
      return r.state;
    });
  }, [board]);

  const doDelete = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    setPstate(s => deleteChar(board, s));
  }, [board]);

  const doToggle = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    setPstate(s => toggleDir(board, s));
  }, [board]);

  const doHint = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    const s = pstateRef.current;
    if (board.hintCount > 0 && s.hintsUsed >= board.hintCount && !s.filled.has(s.selected)) {
      Alert.alert('提示', '提示次数已用尽');
      return;
    }
    setPstate(cur => {
      const next = useHint(board, cur);
      return next || cur;
    });
  }, [board]);

  // ---------- 渲染棋盘 ----------
  const word = currentWord(board, pstate);
  const wordCells = word ? new Set(word.cells) : new Set();

  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const isWhite = board.sol[idx] != null;
      if (!isWhite) {
        cells.push(<View key={idx} style={[styles.cell, styles.black, { width: cellPx, height: cellPx }]} />);
        continue;
      }
      const starts = board.cellStart.get(idx);
      const numLabel = starts && cellPx >= 26 ? board.words[starts[0]].num : '';
      const ch = pstate.filled.get(idx) || '';
      const selected = pstate.selected === idx;
      const inWord = wordCells.has(idx);
      cells.push(
        <TouchableOpacity
          key={idx}
          activeOpacity={0.7}
          onPress={() => doSelect(idx)}
          style={[
            styles.cell,
            styles.white,
            { width: cellPx, height: cellPx },
            inWord && styles.cellWord,
            selected && styles.cellSelected,
          ]}
        >
          {numLabel !== '' && cellPx >= 26 && (
            <Text style={styles.cellNum} numberOfLines={1}>{numLabel}</Text>
          )}
          <Text style={[styles.cellChar, { fontSize: cellPx * 0.5 }]}>{ch}</Text>
        </TouchableOpacity>
      );
    }
  }

  const timeText = board.timeLimit > 0
    ? `${Math.max(0, board.timeLimit - seconds)}s`
    : `${seconds}s`;
  const hintsLeft = board.hintCount > 0 ? `${board.hintCount - pstate.hintsUsed}` : '∞';

  return (
    <View style={styles.container}>
      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudItem}>第 {level.id} 关</Text>
        <Text style={[styles.hudItem, board.timeLimit > 0 && seconds > board.timeLimit * 0.8 && styles.hudDanger]}>
          ⏱ {timeText}
        </Text>
        <Text style={[styles.hudItem, board.errorLimit > 0 && pstate.errors >= board.errorLimit && styles.hudDanger]}>
          ❌ {pstate.errors}{board.errorLimit > 0 ? `/${board.errorLimit}` : ''}
        </Text>
        <Text style={styles.hudItem}>💡 {hintsLeft}</Text>
        <TouchableOpacity style={styles.hudBtn} onPress={() => setStatus(s => s === 'playing' ? 'paused' : 'playing')}>
          <Text style={styles.hudBtnText}>{status === 'paused' ? '▶' : '⏸'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.hudBtn} onPress={resetRound}>
          <Text style={styles.hudBtnText}>↺</Text>
        </TouchableOpacity>
      </View>

      {/* 当前词提示 */}
      <View style={styles.hintBar}>
        {word ? (
          <Text style={styles.hintText} numberOfLines={2}>
            {word.num} {word.dir === 'H' ? '横' : '纵'}（{HINT_LABEL[board.hintStyle] || '提示'}）：{word.hint}
          </Text>
        ) : (
          <Text style={styles.hintText}>点击白格开始填字</Text>
        )}
      </View>

      {/* 棋盘 */}
      <View style={[styles.board, { width: boardPx, height: boardPx }]}>
        {cells}
      </View>

      {/* 功能按钮 */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={doToggle}>
          <Text style={styles.actionText}>切换{pstate.dir === 'H' ? '纵' : '横'}向</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={doDelete}>
          <Text style={styles.actionText}>⌫ 删除</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.hintBtn]} onPress={doHint}>
          <Text style={styles.actionText}>💡 提示</Text>
        </TouchableOpacity>
      </View>

      {/* 系统键盘输入框 */}
      <TextInput
        style={styles.sysInput}
        placeholder="调用系统键盘输入汉字"
        value=""
        onChangeText={(t) => {
          const chars = [...t];
          for (const ch of chars) doInput(ch);
        }}
      />

      {/* 自定义常用字键盘 */}
      <ScrollView style={styles.kbWrap} keyboardShouldPersistTaps="handled">
        <View style={styles.kbGrid}>
          {board.keyboard.map((ch, i) => (
            <TouchableOpacity key={`${ch}-${i}`} style={styles.kbKey} onPress={() => doInput(ch)}>
              <Text style={styles.kbKeyText}>{ch}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {status === 'paused' && (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <Text style={styles.overlayTitle}>⏸ 已暂停</Text>
            <TouchableOpacity style={styles.overlayBtn} onPress={() => setStatus('playing')}>
              <Text style={styles.overlayBtnText}>继续</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.overlayBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.overlayBtnText}>退出选关</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', padding: SPACING.sm },
  hud: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', paddingHorizontal: SPACING.xs, paddingVertical: SPACING.xs,
  },
  hudItem: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  hudDanger: { color: COLORS.danger },
  hudBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  hudBtnText: { fontSize: 18, color: COLORS.primary },
  hintBar: {
    width: '100%', minHeight: 40, justifyContent: 'center',
    backgroundColor: COLORS.card, borderRadius: 10,
    paddingHorizontal: SPACING.sm, marginVertical: SPACING.xs,
  },
  hintText: { fontSize: 14, color: COLORS.text },
  board: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#111', borderRadius: 4, overflow: 'hidden' },
  cell: { borderWidth: 0.5, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
  black: { backgroundColor: '#111', borderColor: '#111' },
  white: { backgroundColor: '#FFFDF5' },
  cellWord: { backgroundColor: '#FFF3C4' },
  cellSelected: { backgroundColor: '#FFD54F' },
  cellNum: { position: 'absolute', top: 1, left: 2, fontSize: 9, color: '#888' },
  cellChar: { color: COLORS.text, fontWeight: '700' },
  actions: { flexDirection: 'row', marginTop: SPACING.sm, gap: SPACING.sm },
  actionBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  hintBtn: { borderColor: COLORS.warning },
  actionText: { fontSize: 14, color: COLORS.text },
  sysInput: {
    marginTop: SPACING.sm, height: 36, width: '100%',
    backgroundColor: COLORS.card, borderRadius: 8, paddingHorizontal: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, fontSize: 14,
  },
  kbWrap: { flex: 1, width: '100%', marginTop: SPACING.xs },
  kbGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  kbKey: {
    width: 36, height: 36, margin: 2, borderRadius: 6,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  kbKeyText: { fontSize: 18, color: COLORS.text },
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  overlayBox: { backgroundColor: COLORS.card, borderRadius: 14, padding: SPACING.lg, alignItems: 'center', width: 240 },
  overlayTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  overlayBtn: {
    width: '100%', paddingVertical: SPACING.sm, borderRadius: 8,
    backgroundColor: COLORS.primary, alignItems: 'center', marginTop: SPACING.sm,
  },
  overlayBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});

export default CrosswordGame;
