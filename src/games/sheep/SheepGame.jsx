// src/games/sheep/SheepGame.jsx
import { useEffect, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { levels } from './levels';
import { countTotalCards, generateLevel, getAvailableCards, isCardBlocked } from './sheepLogic';

const { width, height } = Dimensions.get('window');

const EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🍑', '🍒', '🥝', '🍍', '🥭', '🍌'];

const SheepGame = ({ levelId, onComplete }) => {
  const [grids, setGrids] = useState([]);
  const [removedSet, setRemovedSet] = useState(new Set());
  const [slot, setSlot] = useState([]);
  const [totalCards, setTotalCards] = useState(0);
  const [availableKeys, setAvailableKeys] = useState(new Set());
  const [startTime, setStartTime] = useState(null);
  const [gameOver, setGameOver] = useState(false);

  // 动态计算卡片大小和层偏移
  const cols = grids[0]?.[0]?.length || 4;
  const rows = grids[0]?.length || 4;
  const padding = 20;
  const maxCardSize = 60;
  const minCardSize = 36;
  let cardSize = Math.min((width - padding) / cols, maxCardSize);
  cardSize = Math.max(cardSize, minCardSize);
  const layerOffset = cardSize * 0.15;

  useEffect(() => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;
    const newGrids = generateLevel(level.layers, level.rows, level.cols, level.numTypes);
    setGrids(newGrids);
    setRemovedSet(new Set());
    setSlot([]);
    const total = countTotalCards(newGrids);
    setTotalCards(total);
    setStartTime(Date.now());
    setGameOver(false);
  }, [levelId]);

  useEffect(() => {
    if (!grids.length) return;
    const available = getAvailableCards(grids, removedSet);
    const keys = new Set(available.map(c => c.key));
    setAvailableKeys(keys);
  }, [grids, removedSet]);

  const handleCardPress = (layer, row, col, key, type) => {
    if (gameOver) return;
    if (removedSet.has(key)) return;
    if (isCardBlocked(grids, layer, row, col)) return;

    if (slot.length >= 7) {
      Alert.alert('槽位已满', '无法继续添加卡片');
      return;
    }

    const newSlot = [...slot, type];
    setSlot(newSlot);

    const newRemoved = new Set(removedSet);
    newRemoved.add(key);
    setRemovedSet(newRemoved);

    // 检查三消
    const countMap = {};
    newSlot.forEach(t => { countMap[t] = (countMap[t] || 0) + 1; });
    let foundThree = false;
    for (let t in countMap) {
      if (countMap[t] >= 3) {
        let removed = 0;
        const filtered = newSlot.filter(item => {
          if (item === parseInt(t) && removed < 3) {
            removed++;
            return false;
          }
          return true;
        });
        setSlot(filtered);
        foundThree = true;
        break;
      }
    }

    if (newRemoved.size === totalCards) {
      const elapsed = (Date.now() - startTime) / 1000;
      let stars = 3;
      if (elapsed > 60) stars = 2;
      if (elapsed > 120) stars = 1;
      Alert.alert('🎉 过关！', `用时 ${Math.round(elapsed)} 秒，获得 ${stars} 星`);
      onComplete && onComplete(stars);
      setGameOver(true);
      return;
    }

    const available = getAvailableCards(grids, newRemoved);
    if (available.length === 0 && newRemoved.size < totalCards) {
      Alert.alert('💔 无可用卡片', '游戏结束，请重试');
      const level = levels.find(l => l.id === levelId);
      const newGrids = generateLevel(level.layers, level.rows, level.cols, level.numTypes);
      setGrids(newGrids);
      setRemovedSet(new Set());
      setSlot([]);
      setTotalCards(countTotalCards(newGrids));
      setStartTime(Date.now());
      setGameOver(false);
    }
  };

  const renderCard = (layer, row, col) => {
    const val = grids[layer]?.[row]?.[col];
    if (!val) return null;
    const key = `${layer},${row},${col}`;
    const isRemoved = removedSet.has(key);
    const isBlocked = isCardBlocked(grids, layer, row, col);
    const isAvailable = availableKeys.has(key) && !isRemoved;

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.card,
          {
            width: cardSize,
            height: cardSize,
            opacity: isRemoved ? 0 : 1,
            backgroundColor: isAvailable ? '#FFA500' : (isBlocked ? '#D3D3D3' : '#FFD700'),
            borderColor: isAvailable ? '#B8860B' : '#999',
          },
        ]}
        onPress={() => {
          if (isAvailable) {
            handleCardPress(layer, row, col, key, val);
          }
        }}
        disabled={!isAvailable}
      >
        <Text style={[styles.cardText, { fontSize: cardSize * 0.5 }]}>{EMOJIS[(val - 1) % EMOJIS.length]}</Text>
      </TouchableOpacity>
    );
  };

  const renderLayer = (layer) => {
    const grid = grids[layer];
    if (!grid) return null;
    const offset = layer * layerOffset;
    // 偏移方向可以是右下，制造立体感
    return (
      <View key={layer} style={[styles.layer, { top: offset, left: offset, zIndex: layer }]}>
        {grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((_, c) => renderCard(layer, r, c))}
          </View>
        ))}
      </View>
    );
  };

  const boardWidth = cols * (cardSize + 4);
  const boardHeight = rows * (cardSize + 4);

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', paddingTop: SPACING.md },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  boardContainer: { justifyContent: 'center', alignItems: 'center', width: '100%' },
  board: { position: 'relative' },
  layer: { position: 'absolute' },
  row: { flexDirection: 'row' },
  card: {
    margin: 2,
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