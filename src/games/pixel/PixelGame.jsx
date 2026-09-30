// src/games/pixel/PixelGame.jsx
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
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
  fillCell,
  floodFill,
  generateLevel,
  selectColor,
  useHint,
} from './pixelLogic';

const { width } = Dimensions.get('window');

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const PixelGame = ({ levelId, onComplete }) => {
  const level = getLevelConfig(levelId || 1);
  const navigation = useNavigation();

  const board = useMemo(() => generateLevel(level, level.id * 1000003 + 17), [level]);
  const size = board.size;
  const total = size * size;

  const [pstate, setPstate] = useState(() => createPlayState(board));
  const [status, setStatus] = useState('playing'); // playing/paused/won/lost
  const [seconds, setSeconds] = useState(0);
  const [scale, setScale] = useState(1);
  const statusRef = useRef(status);
  statusRef.current = status;
  const pstateRef = useRef(pstate);
  pstateRef.current = pstate;
  const reportedRef = useRef(false);
  const longFireRef = useRef(false);
  const longTimerRef = useRef(null);

  const basePx = Math.floor(Math.min(width - 16, 480) / size);
  const cellPx = Math.max(8, Math.floor(basePx * scale));

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
    if (status === 'playing' && pstate.won) setStatus('won');
  }, [pstate, status]);

  useEffect(() => {
    if (status !== 'won' || reportedRef.current) return;
    reportedRef.current = true;
    const stars = computeStars(board, pstateRef.current, seconds);
    useUserStore.getState().recordBestTime('pixel', level.id, seconds);
    const acc = pstateRef.current.correct + pstateRef.current.errors > 0
      ? Math.round((pstateRef.current.correct / (pstateRef.current.correct + pstateRef.current.errors)) * 100)
      : 100;
    Alert.alert(
      '🎉 像素图完成！',
      `《${board.name}》· 第 ${level.id} 关 · ${fmt(seconds)} · 精确度 ${acc}% · ${stars} 星`,
      [{ text: '确定', onPress: () => onComplete && onComplete(stars) }]
    );
  }, [status, board, level, seconds, onComplete]);

  const resetRound = useCallback(() => {
    setPstate(createPlayState(board));
    setSeconds(0);
    setScale(1);
    setStatus('playing');
    reportedRef.current = false;
  }, [board]);

  useEffect(() => {
    if (status !== 'lost') return;
    Alert.alert('💔 失败', '时间用尽！', [
      { text: '重试', onPress: resetRound },
      { text: '选关', onPress: () => navigation.goBack() },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ---------- 操作 ----------
  const doSelect = useCallback(c => {
    if (statusRef.current !== 'playing') return;
    setPstate(s => selectColor(s, c));
  }, []);

  const doFill = useCallback(idx => {
    if (statusRef.current !== 'playing') return;
    setPstate(s => fillCell(board, s, idx));
  }, [board]);

  const doFlood = useCallback(idx => {
    if (statusRef.current !== 'playing') return;
    setPstate(s => floodFill(board, s, idx));
  }, [board]);

  const doHint = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    setPstate(s => useHint(board, s));
  }, [board]);

  const onCellPressIn = useCallback(idx => {
    if (!level.longPress) return;
    longFireRef.current = false;
    longTimerRef.current = setTimeout(() => {
      longFireRef.current = true;
      doFlood(idx);
    }, 350);
  }, [level.longPress, doFlood]);

  const onCellPressOut = useCallback(() => {
    if (longTimerRef.current) { clearTimeout(longTimerRef.current); longTimerRef.current = null; }
  }, []);

  const onCellPress = useCallback(idx => {
    if (longFireRef.current) { longFireRef.current = false; return; }
    doFill(idx);
  }, [doFill]);

  useEffect(() => () => { if (longTimerRef.current) clearTimeout(longTimerRef.current); }, []);

  // ---------- 派生数据 ----------
  const remaining = useMemo(() => {
    const rem = new Array(board.colors + 1).fill(0);
    for (let i = 0; i < total; i++) if (!pstate.filled[i]) rem[board.target[i]]++;
    return rem;
  }, [board, pstate.filled, total]);

  const progressPct = Math.floor((pstate.filledCount / total) * 100);
  const timeShown = board.timeLimit > 0 ? Math.max(0, board.timeLimit - seconds) : seconds;

  // ---------- 棋盘渲染 ----------
  const rows = useMemo(() => {
    const showNum = cellPx >= 12;
    const out = [];
    for (let r = 0; r < size; r++) {
      const cells = [];
      for (let c = 0; c < size; c++) {
        const i = r * size + c;
        const filled = status === 'won' || pstate.filled[i];
        const num = board.target[i];
        const wrong = pstate.lastWrongIdx === i;
        cells.push(
          <TouchableOpacity
            key={c}
            activeOpacity={0.7}
            onPress={() => onCellPress(i)}
            onPressIn={() => onCellPressIn(i)}
            onPressOut={onCellPressOut}
            style={[styles.cell, {
              width: cellPx, height: cellPx,
              backgroundColor: filled ? board.palette[num - 1] : '#FFFFFF',
              borderColor: wrong ? COLORS.danger : '#D8D8DC',
            }]}
          >
            {!filled && showNum && (
              <Text style={{ fontSize: Math.max(7, cellPx * 0.45), color: '#555' }}>{num}</Text>
            )}
          </TouchableOpacity>
        );
      }
      out.push(<View key={r} style={styles.row}>{cells}</View>);
    }
    return out;
  }, [board, pstate.filled, pstate.lastWrongIdx, cellPx, size, status, onCellPress, onCellPressIn, onCellPressOut]);

  return (
    <View style={styles.container}>
      {/* ---------- HUD ---------- */}
      <View style={styles.hud}>
        <Text style={styles.hudText}>第 {level.id} 关</Text>
        <Text style={[styles.hudText, board.timeLimit > 0 && timeShown <= 60 && { color: COLORS.danger }]}>
          {board.timeLimit > 0 ? `⏳ ${fmt(timeShown)}` : `⏱ ${fmt(seconds)}`}
        </Text>
        {level.errorStats && <Text style={styles.hudText}>❌ {pstate.errors}</Text>}
        {level.showProgress && <Text style={styles.hudText}>{progressPct}%</Text>}
        <TouchableOpacity onPress={() => setStatus(status === 'paused' ? 'playing' : 'paused')} style={styles.hudBtn}>
          <Text>{status === 'paused' ? '▶️' : '⏸'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={resetRound} style={styles.hudBtn}>
          <Text>🔄</Text>
        </TouchableOpacity>
      </View>

      {level.showProgress && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      )}

      {/* ---------- 缩放 ---------- */}
      {level.zoom && (
        <View style={styles.zoomRow}>
          <TouchableOpacity onPress={() => setScale(s => Math.max(0.75, s - 0.25))} style={styles.zoomBtn}>
            <Text style={styles.zoomBtnText}>－</Text>
          </TouchableOpacity>
          <Text style={styles.hudText}>{Math.round(scale * 100)}%</Text>
          <TouchableOpacity onPress={() => setScale(s => Math.min(2.5, s + 0.25))} style={styles.zoomBtn}>
            <Text style={styles.zoomBtnText}>＋</Text>
          </TouchableOpacity>
          {board.hints > 0 && (
            <TouchableOpacity onPress={doHint} disabled={pstate.hintsLeft <= 0} style={[styles.zoomBtn, { marginLeft: 12 }]}>
              <Text style={styles.zoomBtnText}>💡 提示 {pstate.hintsLeft}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {!level.zoom && board.hints > 0 && (
        <View style={styles.zoomRow}>
          <TouchableOpacity onPress={doHint} disabled={pstate.hintsLeft <= 0} style={styles.zoomBtn}>
            <Text style={styles.zoomBtnText}>💡 提示 {pstate.hintsLeft}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ---------- 棋盘 ---------- */}
      <ScrollView
        style={styles.boardScroll}
        contentContainerStyle={styles.boardScrollContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.board}>{rows}</View>
      </ScrollView>

      {status === 'won' && (
        <View style={styles.wonBanner}>
          <Text style={styles.wonText}>🎉 《{board.name}》完成！</Text>
        </View>
      )}
      {status === 'paused' && (
        <TouchableOpacity style={styles.pauseMask} onPress={() => setStatus('playing')}>
          <Text style={styles.pauseText}>⏸ 已暂停{'\n'}点击继续</Text>
        </TouchableOpacity>
      )}

      {/* ---------- 调色板 ---------- */}
      <View style={styles.paletteWrap}>
        <Text style={styles.paletteTip}>
          当前颜色：{pstate.selected} 号{level.longPress ? ' · 长按可连填同数字区域' : ''}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.palette}>
          {board.palette.map((hex, i) => {
            const color = i + 1;
            const selected = pstate.selected === color;
            const done = remaining[color] === 0;
            return (
              <TouchableOpacity
                key={color}
                onPress={() => doSelect(color)}
                style={[styles.chip, {
                  backgroundColor: hex,
                  borderColor: selected ? COLORS.primary : '#CCC',
                  borderWidth: selected ? 3 : 1,
                  opacity: done ? 0.45 : 1,
                }]}
              >
                <Text style={styles.chipNum}>{color}</Text>
                <Text style={styles.chipRemain}>{remaining[color]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hud: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  hudText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  hudBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
  },
  progressBar: { height: 6, backgroundColor: '#E5E5EA', marginHorizontal: SPACING.md, borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: COLORS.success, borderRadius: 3 },
  zoomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.xs, gap: 12,
  },
  zoomBtn: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
    backgroundColor: COLORS.card, alignItems: 'center',
  },
  zoomBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  boardScroll: { flex: 1 },
  boardScrollContent: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  board: { borderWidth: 1, borderColor: '#C8C8CC', backgroundColor: '#FFF' },
  row: { flexDirection: 'row' },
  cell: { borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  wonBanner: {
    position: 'absolute', top: 90, left: 20, right: 20, padding: 12,
    backgroundColor: COLORS.success, borderRadius: 12, alignItems: 'center',
  },
  wonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  pauseMask: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  pauseText: { color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  paletteWrap: { backgroundColor: COLORS.card, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  paletteTip: { textAlign: 'center', fontSize: 12, color: COLORS.textLight, marginBottom: SPACING.xs },
  palette: { paddingHorizontal: SPACING.md, gap: 8 },
  chip: {
    width: 52, height: 52, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  chipNum: { fontSize: 16, fontWeight: '800', color: '#222', textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 2 },
  chipRemain: { fontSize: 10, color: '#333' },
});

export default PixelGame;
