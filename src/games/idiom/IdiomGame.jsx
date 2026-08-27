// src/games/idiom/IdiomGame.jsx
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { checkAnswer, shuffleString } from './idiomLogic';
import { levels } from './levels';

const { width } = Dimensions.get('window');

const IdiomGame = ({ levelId, onComplete }) => {
  const [shuffled, setShuffled] = useState([]);
  const [selected, setSelected] = useState([]);
  const [correctIdiom, setCorrectIdiom] = useState('');
  const [startTime, setStartTime] = useState(Date.now());
  const [gameOver, setGameOver] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // 加载关卡
  useEffect(() => {
    const level = levels.find(l => l.id === levelId);
    if (!level) {
      Alert.alert('错误', '关卡不存在');
      return;
    }
    const idiom = level.idiom;
    setCorrectIdiom(idiom);
    const shuffledChars = shuffleString(idiom);
    setShuffled(shuffledChars);
    setSelected([]);
    setStartTime(Date.now());
    setGameOver(false);
    setAttempts(0);
  }, [levelId]);

  // 点击字块
  const handleCharPress = (char, index) => {
    if (gameOver) return;
    // 如果该字已经被选过，不能再次点击
    // 但我们直接移除该字（使用 index），确保不重复
    const newShuffled = [...shuffled];
    const removed = newShuffled.splice(index, 1);
    setShuffled(newShuffled);
    setSelected([...selected, removed[0]]);
  };

  // 点击已选字（取消选择）
  const handleSelectedPress = (index) => {
    if (gameOver) return;
    const newSelected = [...selected];
    const removed = newSelected.splice(index, 1);
    setSelected(newSelected);
    setShuffled([...shuffled, removed[0]]);
  };

  // 提交答案
  const handleSubmit = () => {
    if (gameOver) return;
    if (selected.length !== correctIdiom.length) {
      Alert.alert('提示', '请先选择所有字');
      return;
    }
    const isCorrect = checkAnswer(selected, correctIdiom);
    if (isCorrect) {
      setGameOver(true);
      const elapsed = (Date.now() - startTime) / 1000;
      let stars = 3;
      if (elapsed > 30) stars = 2;
      if (elapsed > 60) stars = 1;
      Alert.alert('🎉 拼对了！', `用时 ${Math.floor(elapsed)} 秒，获得 ${stars} 星`);
      onComplete && onComplete(stars);
    } else {
      setAttempts(attempts + 1);
      Alert.alert('❌ 顺序不对', '再试试吧！');
      // 可重置已选（但保留尝试次数）
      // 为了更友好，重置所有选中的字回到乱序区
      setShuffled([...shuffled, ...selected]);
      setSelected([]);
    }
  };

  // 计算字块宽度
  const charWidth = Math.min((width - SPACING.md * 4) / correctIdiom.length, 60);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📚 成语消消乐</Text>
      <Text style={styles.hint}>请按正确顺序点击字拼出成语</Text>
      <View style={styles.shuffledArea}>
        {shuffled.map((char, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.charBox, { width: charWidth, height: charWidth }]}
            onPress={() => handleCharPress(char, index)}
          >
            <Text style={styles.charText}>{char}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.selectedArea}>
        {selected.map((char, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.selectedBox, { width: charWidth, height: charWidth }]}
            onPress={() => handleSelectedPress(index)}
          >
            <Text style={styles.selectedText}>{char}</Text>
          </TouchableOpacity>
        ))}
        {/* 占位空格 */}
        {selected.length < correctIdiom.length &&
          Array.from({ length: correctIdiom.length - selected.length }).map((_, i) => (
            <View
              key={`empty-${i}`}
              style={[styles.emptyBox, { width: charWidth, height: charWidth }]}
            />
          ))}
      </View>

      <Text style={styles.attempts}>尝试次数：{attempts}</Text>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.submitText}>✅ 提交</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.resetBtn, { marginTop: SPACING.sm }]}
        onPress={() => {
          // 重置本关
          const level = levels.find(l => l.id === levelId);
          if (level) {
            const shuffledChars = shuffleString(level.idiom);
            setShuffled(shuffledChars);
            setSelected([]);
            setAttempts(0);
            setStartTime(Date.now());
          }
        }}
      >
        <Text style={styles.resetText}>🔄 重玩</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.md,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  hint: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
  },
  shuffledArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  charBox: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  charText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 70,
    marginVertical: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
  },
  selectedBox: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  selectedText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyBox: {
    margin: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  attempts: {
    fontSize: 14,
    color: COLORS.textLight,
    marginVertical: SPACING.sm,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.md,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetBtn: {
    backgroundColor: '#666',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  resetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default IdiomGame;