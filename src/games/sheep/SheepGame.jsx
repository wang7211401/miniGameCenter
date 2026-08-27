// src/games/sheep/SheepGame.jsx

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { getLevelConfig } from './levels';
import { countTotalCards, generateLevel, getAvailableCards } from './sheepLogic';

const { width } = Dimensions.get('window');

const EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🍑', '🍒', '🥝', '🍍', '🥭', '🍌'];

function removeCompletedTriplets(cards) {
  const counts = new Map();
  cards.forEach(type => counts.set(type, (counts.get(type) || 0) + 1));

  const remaining = [...cards];
  for (const [type, count] of counts) {
    const tripletCount = Math.floor(count / 3);
    let toRemove = tripletCount * 3;
    if (toRemove === 0) continue;

    for (let index = remaining.length - 1; index >= 0 && toRemove > 0; index--) {
      if (remaining[index] === type) {
        remaining.splice(index, 1);
        toRemove -= 1;
      }
    }
  }
  return remaining;
}

const SheepGame = ({ levelId, onComplete }) => {
  // ---------- 状态 ----------
  const [grids, setGrids] = useState([]);
  const [removedSet, setRemovedSet] = useState(new Set());
  const [slot, setSlot] = useState([]);
  const [totalCards, setTotalCards] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [available, setAvailable] = useState([]); // 缓存可用卡片

  const winTimeoutRef = useRef(null);
  const completedRef = useRef(false);

  // ---------- 初始化关卡 ----------
  const resetLevel = useCallback(() => {
    const config = getLevelConfig(levelId);
    const newGrids = generateLevel(config.layers, config.rows, config.cols, config.numTypes);
    setGrids(newGrids);
    setRemovedSet(new Set());
    setSlot([]);
    setTotalCards(countTotalCards(newGrids));
    setStartTime(Date.now());
    setGameOver(false);
    setIsAnimating(false);
    completedRef.current = false;
    // 后续 useEffect 会重新计算 available
  }, [levelId]);

  useEffect(() => {
    resetLevel();
    return () => {
      if (winTimeoutRef.current) clearTimeout(winTimeoutRef.current);
    };
  }, [resetLevel]);

  // ---------- 更新可用卡片（缓存） ----------
  useEffect(() => {
    if (!grids.length) return;
    const av = getAvailableCards(grids, removedSet);
    setAvailable(av);
  }, [grids, removedSet]);

  // ---------- 核心点击处理 ----------
  const handleCardPress = useCallback((layer, row, col, key, type) => {
    if (gameOver || isAnimating) return;

    // 检查是否真正可用（利用缓存 available）
    const isValid = available.some(c => c.key === key);
    if (!isValid) return;

    if (slot.length >= 7) {
      Alert.alert('槽位已满', '无法继续添加卡片');
      return;
    }

    setIsAnimating(true);

    // 更新棋盘（深拷贝）
    const newGrids = grids.map(layerGrid => layerGrid.map(row => [...row]));
    newGrids[layer][row][col] = 0;

    // 更新移除集合
    const newRemoved = new Set(removedSet);
    newRemoved.add(key);

    // 更新槽位并消除三元组
    const newSlot = [...slot, type];
    const finalSlot = removeCompletedTriplets(newSlot);

    // 批量更新状态
    setGrids(newGrids);
    setRemovedSet(newRemoved);
    setSlot(finalSlot);
    setIsAnimating(false);

    // 胜利判定
    if (newRemoved.size === totalCards && finalSlot.length === 0) {
      handleWin();
      return;
    }

    // 失败判定（无可用卡片且未完成）
    const nextAvailable = getAvailableCards(newGrids, newRemoved);
    if (nextAvailable.length === 0 && newRemoved.size < totalCards) {
      Alert.alert('💔 无可用卡片', '游戏结束，请重试');
      resetLevel();
      return;
    }
    if (newRemoved.size === totalCards && finalSlot.length > 0) {
      Alert.alert('💔 无法完全消除', '槽位还有卡片未配成三张，请重试');
      resetLevel();
      return;
    }
  }, [grids, removedSet, slot, totalCards, gameOver, isAnimating, available, resetLevel]);

  // ---------- 胜利处理 ----------
  const handleWin = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    let stars = 3;
    if (elapsed > 60) stars = 2;
    if (elapsed > 120) stars = 1;
    setGameOver(true);
    winTimeoutRef.current = setTimeout(() => {
      Alert.alert('🎉 过关！', `用时 ${Math.round(elapsed)} 秒，获得 ${stars} 星`, [
        { text: '确定', onPress: () => onComplete && onComplete(stars) }
      ]);
    }, 300);
  }, [startTime, onComplete]);

  // ---------- 动态尺寸 ----------
  const cols = grids[0]?.[0]?.length || 4;
  const rows = grids[0]?.length || 4;
  const padding = 20;
  const maxCardSize = 65;
  const minCardSize = 36;
  let cardSize = Math.min((width - padding * 2 - 40) / cols, maxCardSize);
  cardSize = Math.max(cardSize, minCardSize);
  const layerOffset = cardSize * 0.2;

  // ---------- 渲染卡片 ----------
  const renderCard = useCallback((layer, row, col) => {
    const val = grids[layer]?.[row]?.[col];
    const key = `${layer},${row},${col}`;
    if (val === 0 || removedSet.has(key)) {
      return <View key={key} style={{ width: cardSize, height: cardSize, margin: 2 }} pointerEvents="none" />;
    }
    const isAvailable = available.some(c => c.key === key);

    // 不可用卡片不能拦截下面层的触摸事件。
    // 原来的 TouchableOpacity 即使 onPress 中 return，也会先吃掉触摸，
    // 导致下面真正可用的卡片无法点击。
    if (!isAvailable) {
      return (
        <View
          key={key}
          style={[
            styles.card,
            {
              width: cardSize,
              height: cardSize,
              margin: 2,
              backgroundColor: '#E0E0E0',
              borderColor: '#CCC',
              borderWidth: 2,
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 2 },
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.cardText, { fontSize: cardSize * 0.5 }]}>
            {EMOJIS[(val - 1) % EMOJIS.length]}
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.card,
          {
            width: cardSize,
            height: cardSize,
            margin: 2,
            backgroundColor: isAvailable ? '#FFD700' : '#E0E0E0',
            borderColor: isAvailable ? '#B8860B' : '#CCC',
            borderWidth: 2,
            shadowOpacity: isAvailable ? 0.3 : 0.1,
            shadowOffset: { width: 0, height: 2 },
          },
        ]}
        onPress={() => handleCardPress(layer, row, col, key, val)}
        activeOpacity={0.7}
      >
        <Text style={[styles.cardText, { fontSize: cardSize * 0.5 }]}>
          {EMOJIS[(val - 1) % EMOJIS.length]}
        </Text>
      </TouchableOpacity>
    );
  }, [grids, removedSet, available, cardSize, handleCardPress]);

  // ---------- 渲染层 ----------
  const renderLayer = useCallback((layerIndex) => {
    const grid = grids[layerIndex];
    if (!grid) return null;
    const offset = layerIndex * layerOffset;
    return (
      <View
        key={layerIndex}
        pointerEvents="box-none"
        style={[styles.layer, { top: offset, left: offset, zIndex: layerIndex }]}
      >
        {grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((_, c) => renderCard(layerIndex, r, c))}
          </View>
        ))}
      </View>
    );
  }, [grids, layerOffset, renderCard]);

  // 计算棋盘尺寸
  const boardWidth = cols * (cardSize + 4) + (grids.length - 1) * layerOffset;
  const boardHeight = rows * (cardSize + 4) + (grids.length - 1) * layerOffset;

  // ---------- 主界面 ----------
  return (
    <View style={styles.container}>
      <Text style={styles.title}>羊了个羊 - 第{levelId}关</Text>
      <View style={[styles.boardContainer, { height: boardHeight + (grids.length - 1) * layerOffset + 20 }]}>
        <View style={[styles.board, { width: boardWidth, height: boardHeight }]}>
          {grids.map((_, idx) => renderLayer(idx))}
        </View>
      </View>
      <View style={styles.slotContainer}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={i} style={[styles.slot, slot[i] && styles.slotFilled]}>
            {slot[i] && <Text style={styles.slotText}>{EMOJIS[(slot[i] - 1) % EMOJIS.length]}</Text>}
          </View>
        ))}
      </View>
      <Text style={styles.remain}>剩余卡片: {totalCards - removedSet.size}</Text>
    </View>
  );
};

// ---- 样式（与原版一致，略作调整） ----
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', paddingTop: SPACING.md },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  boardContainer: { justifyContent: 'center', alignItems: 'center', width: '100%' },
  board: { position: 'relative' },
  layer: { position: 'absolute' },
  row: { flexDirection: 'row' },
  card: {
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cardText: { fontWeight: 'bold' },
  slotContainer: {
    flexDirection: 'row',
    marginVertical: SPACING.md,
    paddingHorizontal: 10,
    backgroundColor: '#E8E8E8',
    borderRadius: 8,
    paddingVertical: 8,
  },
  slot: {
    width: 44,
    height: 44,
    marginHorizontal: 4,
    backgroundColor: '#CCC',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotFilled: { backgroundColor: '#FFF' },
  slotText: { fontSize: 20 },
  remain: { fontSize: 16, marginBottom: 8 },
});

export default SheepGame;