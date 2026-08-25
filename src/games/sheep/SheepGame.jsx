import { useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { levels } from './levels';
import { countTotalCards, generateLevel, getAvailableCards, isCardBlocked } from './sheepLogic';

const { width, height } = Dimensions.get('window');

// Define emojis explicitly to ensure consistency
const EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🍑', '🍒', '🥝', '🍍', '🥭', '🍌'];

const SheepGame = ({ levelId, onComplete }) => {
  const [grids, setGrids] = useState([]);
  const [removedSet, setRemovedSet] = useState(new Set());
  const [slot, setSlot] = useState([]);
  const [totalCards, setTotalCards] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Initialize Level
  useEffect(() => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;

    // Generate new level
    const newGrids = generateLevel(level.layers, level.rows, level.cols, level.numTypes);
    setGrids(newGrids);
    setRemovedSet(new Set());
    setSlot([]);
    const total = countTotalCards(newGrids);
    setTotalCards(total);
    setStartTime(Date.now());
    setGameOver(false);
  }, [levelId]);

  // Memoize available cards to prevent recalculating on every render unless grids/removedSet change
  const availableKeys = useMemo(() => {
    if (!grids.length) return new Set();
    const available = getAvailableCards(grids, removedSet);
    return new Set(available.map(c => c.key));
  }, [grids, removedSet]);

  const handleCardPress = (layer, row, col, key, type) => {
    if (gameOver || isAnimating) return;
    if (removedSet.has(key)) return;

    // Double-check blocking status locally for performance
    if (isCardBlocked(grids, layer, row, col, removedSet)) return;

    // Slot full check
    if (slot.length >= 7) {
      Alert.alert('槽位已满', '无法继续添加卡片');
      return;
    }

    setIsAnimating(true);

    // 1. Add to slot
    const newSlot = [...slot, type];

    // 2. Mark as removed from board
    const newRemoved = new Set(removedSet);
    newRemoved.add(key);

    // 3. Check for Triplet Elimination
    const countMap = {};
    newSlot.forEach(t => { countMap[t] = (countMap[t] || 0) + 1; });

    let finalSlot = newSlot;
    let foundThree = false;

    for (let t in countMap) {
      if (countMap[t] >= 3) {
        // Remove 3 instances of this type
        let removed = 0;
        const filtered = finalSlot.filter(item => {
          if (item === parseInt(t) && removed < 3) {
            removed++;
            return false;
          }
          return true;
        });
        finalSlot = filtered;
        foundThree = true;
        break; // Only remove one triplet per click to match standard rules
      }
    }

    // Update State
    setSlot(finalSlot);
    setRemovedSet(newRemoved);
    setIsAnimating(false);

    // 4. Check Win Condition
    if (newRemoved.size === totalCards && finalSlot.length === 0) {
      handleWin();
      return;
    }

    // 5. Check Loss Condition (No moves left)
    // We need to wait for state update to calculate new available cards, 
    // but we can pass the newRemoved set directly to the logic function for immediate check
    const nextAvailable = getAvailableCards(grids, newRemoved);
    if (nextAvailable.length === 0 && newRemoved.size < totalCards) {
      Alert.alert('💔 无可用卡片', '游戏结束，请重试');
      // Reset Level
      const level = levels.find(l => l.id === levelId);
      const newGrids = generateLevel(level.layers, level.rows, level.cols, level.numTypes);
      setGrids(newGrids);
      setRemovedSet(new Set());
      setSlot([]);
      setTotalCards(countTotalCards(newGrids));
      setStartTime(Date.now());
      setGameOver(false);
    }else if (newRemoved.size === totalCards && finalSlot.length > 0) {
      Alert.alert('💔 无法完全消除', '槽位还有卡片未配成三张，请重试');
      // 重置关卡（与上述重置逻辑相同）
      const level = levels.find(l => l.id === levelId);
      const newGrids = generateLevel(level.layers, level.rows, level.cols, level.numTypes);
      setGrids(newGrids);
      setRemovedSet(new Set());
      setSlot([]);
      setTotalCards(countTotalCards(newGrids));
      setStartTime(Date.now());
      setGameOver(false);
      return;
    }
  };

  const handleWin = () => {
    const elapsed = (Date.now() - startTime) / 1000;
    let stars = 3;
    if (elapsed > 60) stars = 2;
    if (elapsed > 120) stars = 1;

    setGameOver(true);
    setTimeout(() => {
      Alert.alert('🎉 过关！', `用时 ${Math.round(elapsed)} 秒，获得 ${stars} 星`, [
        { text: '确定', onPress: () => onComplete && onComplete(stars) }
      ]);
    }, 300);
  };

  // Dynamic Sizing
  const cols = grids[0]?.[0]?.length || 4;
  const rows = grids[0]?.length || 4;
  const padding = 20;
  const maxCardSize = 60;
  const minCardSize = 36;

  let cardSize = Math.min((width - padding * 2 - 40) / cols, maxCardSize);
  cardSize = Math.max(cardSize, minCardSize);

  // Visual layer offset for 3D effect
  const layerOffset = cardSize * 0.2;

  const renderCard = (layer, row, col) => {
    const val = grids[layer]?.[row]?.[col];
    if (!val) return null; // Empty cell

    const key = `${layer},${row},${col}`;
    const isRemoved = removedSet.has(key);
    const isAvailable = availableKeys.has(key);

    // If removed, render nothing or a ghost element to maintain layout if needed. 
    // Here we return null to hide it completely, which works because the grid structure is absolute.
    if (isRemoved) return null;

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.card,
          {
            width: cardSize,
            height: cardSize,
            // Visual hierarchy: Available cards pop out, blocked are dull
            backgroundColor: isAvailable ? '#FFD700' : '#E0E0E0',
            borderColor: isAvailable ? '#B8860B' : '#CCC',
            borderWidth: 2,
            shadowOpacity: isAvailable ? 0.3 : 0.1,
            shadowOffset: { width: 0, height: 2 },
          },
        ]}
        onPress={() => handleCardPress(layer, row, col, key, val)}
        disabled={!isAvailable}
        activeOpacity={isAvailable ? 0.7 : 1}
      >
        <Text style={[styles.cardText, { fontSize: cardSize * 0.5 }]}>{EMOJIS[(val - 1) % EMOJIS.length]}</Text>
      </TouchableOpacity>
    );
  };

  const renderLayer = (layerIndex) => {
    const grid = grids[layerIndex];
    if (!grid) return null;

    // Calculate offset for 3D stacking
    const offset = layerIndex * layerOffset;

    return (
      <View
        key={layerIndex}
        style={[
          styles.layer,
          {
            top: offset,
            left: offset,
            zIndex: layerIndex // Higher index = higher in stack
          }
        ]}
      >
        {grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((_, c) => renderCard(layerIndex, r, c))}
          </View>
        ))}
      </View>
    );
  };

  // Calculate board container size
  const boardWidth = cols * (cardSize + 4) + (grids.length - 1) * layerOffset;
  const boardHeight = rows * (cardSize + 4) + (grids.length - 1) * layerOffset;

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