import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

const LevelCard = ({ level, stars, unlocked, onPress }) => {
  const starString = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  return (
    <TouchableOpacity
      style={[styles.card, !unlocked && styles.locked]}
      onPress={unlocked ? onPress : null}
      disabled={!unlocked}
    >
      <Text style={styles.levelNumber}>第 {level} 关</Text>
      <Text style={styles.stars}>{unlocked ? starString : '🔒'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS,
    padding: SPACING.md,
    marginVertical: SPACING.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locked: { opacity: 0.5 },
  levelNumber: { fontSize: 16, fontWeight: '500' },
  stars: { fontSize: 18 },
});

export default LevelCard;