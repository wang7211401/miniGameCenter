import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

const Button = ({ title, onPress, type = 'primary', style }) => {
  const backgroundColor = type === 'primary' ? COLORS.primary : COLORS.secondary;
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }, style]}
      onPress={onPress}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS,
    alignItems: 'center',
  },
  text: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

export default Button;