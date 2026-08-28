// src/app/game/virus.jsx
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Game from '../../games/virus/Game';

export default function VirusScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Game onGameOver={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
});