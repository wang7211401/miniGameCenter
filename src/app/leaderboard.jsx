import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING } from '../constants/theme';
import useUserStore from '../store/userSlice';

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState('tetris');
  const scoreHistory = useUserStore(state => state.scoreHistory);
  const survivalHistory = useUserStore(state => state.survivalHistory);
  const scores = useMemo(
    () => [...(scoreHistory || [])].sort((a, b) => b.score - a.score),
    [scoreHistory]
  );
  const survivalTimes = useMemo(
    () => [...(survivalHistory || [])].sort((a, b) => b.seconds - a.seconds),
    [survivalHistory]
  );
  const tabs = [
    { id: 'tetris', label: '俄罗斯方块', data: scores, empty: '还没有俄罗斯方块成绩' },
    { id: 'survival', label: '生存挑战', data: survivalTimes, empty: '还没有生存挑战成绩' },
  ];
  const currentTab = tabs.find(tab => tab.id === activeTab) || tabs[0];
  const isSurvival = currentTab.id === 'survival';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>排行榜</Text>
      <View style={styles.tabs}>
        {tabs.map(tab => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {currentTab.data.length === 0 ? (
        <Text style={styles.empty}>{currentTab.empty}</Text>
      ) : (
        <>
          <View style={styles.bestScore}>
            <Text style={styles.bestLabel}>{isSurvival ? '最长存活' : '历史最高分'}</Text>
            <Text style={styles.bestValue}>
              {isSurvival ? formatDuration(currentTab.data[0].seconds) : `${currentTab.data[0].score} 分`}
            </Text>
          </View>
          <FlatList
            data={currentTab.data}
            keyExtractor={(item, index) => `${item.playedAt}-${index}`}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <View style={styles.row}>
                <Text style={styles.rank}>{index + 1}</Text>
                <Text style={styles.score}>
                  {isSurvival ? formatDuration(item.seconds) : `${item.score} 分`}
                </Text>
                <Text style={styles.date}>
                  {new Date(item.playedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 6,
  },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textLight, fontSize: 15, fontWeight: 'bold' },
  activeTabText: { color: '#fff' },
  empty: {
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.xl,
    fontSize: 16,
  },
  bestScore: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  bestLabel: { color: '#fff', fontSize: 14 },
  bestValue: { color: '#fff', fontSize: 30, fontWeight: 'bold', marginTop: 4 },
  list: { gap: SPACING.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 8,
  },
  rank: { width: 40, color: COLORS.primary, fontSize: 20, fontWeight: 'bold' },
  score: { flex: 1, color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  date: { color: COLORS.textLight, fontSize: 13 },
});
