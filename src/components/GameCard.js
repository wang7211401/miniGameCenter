import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GameCard = ({ title, icon, onPress, completedCount, totalCount }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.progress}>
        {completedCount}/{totalCount}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    margin: SPACING.sm,
    width: '45%',
    aspectRatio: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconContainer: { marginBottom: SPACING.sm },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  progress: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
});

export default GameCard;