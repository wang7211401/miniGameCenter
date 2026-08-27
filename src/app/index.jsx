// src/app/index.jsx
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import GameCard from '../components/GameCard';
import { COLORS, SPACING } from '../constants/theme';
import { levels as linkLevels } from '../games/link/levels';
import { levels as matchLevels } from '../games/match/levels';
import { levels as screwLevels } from '../games/screw/levels';
import { levels as sheepLevels } from '../games/sheep/levels';
import { levels as sokobanLevels } from '../games/sokoban/levels';
import { levels as sudokuLevels } from '../games/sudoku/levels';
import useUserStore from '../store/userSlice';

// 游戏列表数据
const games = [
  { id: 'sudoku', title: '数独', icon: '🧩', totalLevels: sudokuLevels.length },
  { id: 'sokoban', title: '推箱子', icon: '📦', totalLevels: sokobanLevels.length },
  { id: 'link', title: '连连看', icon: '🔗', totalLevels: linkLevels.length },
  { id: 'sheep', title: '羊了个羊', icon: '🐑', totalLevels: sheepLevels.length },
  { id: 'tetris', title: '俄罗斯方块', icon: '🧱', freePlay: true },
  { id: 'match', title: '消消乐', icon: '🍬', totalLevels: matchLevels.length },
  { id: 'survival', title: '生存挑战', icon: '⚔️', freePlay: true },
  { id: '2048', title: '2048', icon: '🔢', freePlay: true },  // 新增
  { id: 'screw', title: '螺丝特工队', icon: '🔩', totalLevels: screwLevels.length },
];

export default function HomeScreen() {
  const router = useRouter();
  const getCompletedCount = useUserStore((state) => state.getCompletedCount);

  const handlePress = (gameId) => {
    if (gameId === 'survival') {
      router.push('/game/survival');
      return;
    }
    if (gameId === 'tetris') {
      router.push('/game/tetris');
      return;
    }

    if (gameId === '2048') {
      router.push('/game/2048');
      return;
    }

    router.push(`/game/${gameId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎮 游戏大厅</Text>
      <Text style={styles.leaderboardLink} onPress={() => router.push('/leaderboard')}>
        🏆 排行榜
      </Text>
      <FlatList
        data={games}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const completed = getCompletedCount(item.id);
          const total = item.totalLevels || 0;
          return (
            <GameCard
              title={item.title}
              icon={<Text style={{ fontSize: 40 }}>{item.icon}</Text>}
              onPress={() => handlePress(item.id)}
              completedCount={completed}
              totalCount={total}
              progressLabel={item.freePlay ? '自由模式 · 查看排行榜' : `已过 ${completed}/${total} 关`}
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
  leaderboardLink: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: SPACING.sm },
  grid: { padding: SPACING.md },
});