// src/app/game/[gameId]/[levelId].jsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import BreakerGame from '../../../games/breaker/BreakerGame'; // 新增
import { levels as breakerLevels } from '../../../games/breaker/levels';
import IdiomGame from '../../../games/idiom/IdiomGame';
import KlotskiGame from '../../../games/klotski/KlotskiGame';
import LinkGame from '../../../games/link/LinkGame'; // 新增
import MatchGame from '../../../games/match/MatchGame';
import NumpuzzleGame from '../../../games/numpuzzle/NumpuzzleGame';
import puzzleGame from '../../../games/puzzle/PuzzleGame';
import ScrewGame from '../../../games/screw/ScrewGame';
import SheepGame from '../../../games/sheep/SheepGame'; // 新增
import SokobanGame from '../../../games/sokoban/SokobanGame';
import SudokuGame from '../../../games/sudoku/SudokuGame';
import TetrisGame from '../../../games/tetris/TetrisGame';
import useUserStore from '../../../store/userSlice';

export default function GameScreen() {
  const { gameId, levelId } = useLocalSearchParams();
  const router = useRouter();
  const setProgress = useUserStore(state => state.setProgress);

  const handleComplete = (stars, action = 'list') => {
    const currentLevel = parseInt(levelId, 10);
    setProgress(gameId, currentLevel, stars);

    if (gameId === 'breaker' && action === 'next') {
      const nextLevel = currentLevel + 1;
      if (breakerLevels.some(level => level.id === nextLevel)) {
        router.replace(`/game/${gameId}/${nextLevel}`);
        return;
      }
    }

    router.replace(`/game/${gameId}`);
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
    case 'screw':
      GameComponent = ScrewGame;
      break;
    case 'idiom':
      GameComponent = IdiomGame;
      break;
    case 'breaker':
      GameComponent = BreakerGame;
      break;
    case 'klotski':
      GameComponent = KlotskiGame;
      break;
    case 'puzzle':
      GameComponent = puzzleGame;
      break;
    case 'numpuzzle':
      GameComponent = NumpuzzleGame;
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