import SurvivalGameScreen from '@/games/survival/SurvivalGameScreen';
import { Stack } from 'expo-router';

export default function SurvivalPage() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      <SurvivalGameScreen />
    </>
  );
}