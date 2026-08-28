import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import LevelCard from '../../components/LevelCard';
import { COLORS, SPACING } from '../../constants/theme';
import { levels as breakerLevels } from '../../games/breaker/levels';
import { levels as idiomLevels } from '../../games/idiom/levels';
import { levels as klotskiLevels } from '../../games/klotski/levels';
import { levels as linkLevels } from '../../games/link/levels'; // 新增
import { levels as matchLevels } from '../../games/match/levels';
import { levels as screwLevels } from '../../games/screw/levels';
import { levels as sheepLevels } from '../../games/sheep/levels'; // 新增
import { levels as sokobanLevels } from '../../games/sokoban/levels';
import { levels as sudokuLevels } from '../../games/sudoku/levels';
import { levels as tetrisLevels } from '../../games/tetris/levels';
import useUserStore from '../../store/userSlice';

const levelMap = {
  sudoku: sudokuLevels,
  sokoban: sokobanLevels,
  link: linkLevels,
  sheep: sheepLevels,
  match: matchLevels,
  tetris: tetrisLevels,
  screw: screwLevels,
  idiom: idiomLevels,
  breaker: breakerLevels,
  klotski: klotskiLevels,
  // 后续添加其他游戏
};

export default function LevelListScreen() {
  const { gameId } = useLocalSearchParams();
  const router = useRouter();
  const levels = levelMap[gameId] || [];
  
  // 从 store 中获取正确的方法名
  const getStarsForLevel = useUserStore(state => state.getStarsForLevel);
  const isLevelUnlocked = useUserStore(state => state.isLevelUnlocked);

  const handleLevelPress = (level) => {
    router.push(`/game/${gameId}/${level.id}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{gameId.toUpperCase()} 关卡</Text>
      {levels.length === 0 ? (
        <Text style={styles.empty}>该游戏暂无关卡数据</Text>
      ) : (
        <FlatList
          data={levels}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const stars = getStarsForLevel(gameId, item.id) || 0;
            const unlocked = isLevelUnlocked(gameId, item.id);
            return (
              <LevelCard
                level={item.id}
                stars={stars}
                unlocked={unlocked}
                onPress={() => handleLevelPress(item)}
              />
            );
          }}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 24, fontWeight: 'bold', padding: SPACING.md, textAlign: 'center' },
  list: { padding: SPACING.md },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16, color: COLORS.textLight },
});