// src/app/game/[gameId]/[levelId].jsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import LinkGame from '../../../games/link/LinkGame'; // 新增
import MatchGame from '../../../games/match/MatchGame';
import SheepGame from '../../../games/sheep/SheepGame'; // 新增
import SokobanGame from '../../../games/sokoban/SokobanGame';
import SudokuGame from '../../../games/sudoku/SudokuGame';
import TetrisGame from '../../../games/tetris/TetrisGame';
import useUserStore from '../../../store/userSlice';

export default function GameScreen() {
  const { gameId, levelId } = useLocalSearchParams();
  const router = useRouter();
  const setProgress = useUserStore(state => state.setProgress);

  const handleComplete = (stars) => {
    setProgress(gameId, parseInt(levelId), stars);
    router.push(`/game/${gameId}`);
  };

  let GameComponent;
  switch (gameId) {
    case 'sudoku':
      GameComponent = SudokuGame;
      break;
    case 'sokoban':
      GameComponent = SokobanGame;
      break;
    case 'link':
      GameComponent = LinkGame;
      break;
    case 'sheep':
      GameComponent = SheepGame;
      break;
    case 'tetris':
      GameComponent = TetrisGame;
      break;
    case 'match':
      GameComponent = MatchGame;
      break;

    default:
      return (
        <View style={styles.container}>
          <Text>游戏 {gameId} 尚未实现</Text>
        </View>
      );
  }

  return <GameComponent levelId={parseInt(levelId)} onComplete={handleComplete} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});