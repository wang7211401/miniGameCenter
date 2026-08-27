// src/app/game/2048.jsx
import { COLORS } from '@/constants/theme';
import Game2048 from '@/games/2048/Game2048';
import { StyleSheet, View } from 'react-native';

export default function Game2048Screen() {
  return (
    <View style={styles.container}>
      <Game2048 />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});