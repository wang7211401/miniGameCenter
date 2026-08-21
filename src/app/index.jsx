// src/app/index.jsx
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import GameCard from '../components/GameCard';
import { COLORS, SPACING } from '../constants/theme';
import { GAME_LEVELS } from '../data/levels';
import useUserStore from '../store/userSlice';

// 游戏列表数据
const games = [
  { id: 'sudoku', title: '数独', icon: '🧩' },
  { id: 'sokoban', title: '推箱子', icon: '📦' },
  { id: 'link', title: '连连看', icon: '🔗' },
  { id: 'sheep', title: '羊了个羊', icon: '🐑' },
  { id: 'tetris', title: '俄罗斯方块', icon: '🧱' },
  { id: 'match', title: '消消乐', icon: '🍬' },
];

export default function HomeScreen() {
  const router = useRouter();
  const getCompletedCount = useUserStore((state) => state.getCompletedCount);

  const handlePress = (gameId) => {
    router.push(`/game/${gameId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎮 游戏大厅</Text>
      <FlatList
        data={games}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const completed = getCompletedCount(item.id);
          const total = GAME_LEVELS[item.id]?.total || 10;
          return (
            <GameCard
              title={item.title}
              icon={<Text style={{ fontSize: 40 }}>{item.icon}</Text>}
              onPress={() => handlePress(item.id)}
              completedCount={completed}
              totalCount={total}
            />
          );
        }}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: SPACING.xl },
  header: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: SPACING.md },
  grid: { padding: SPACING.md },
});