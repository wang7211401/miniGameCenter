// src/app/_layout.jsx
import { COLORS } from '@/constants/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.primary },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            headerBackTitle: '返回',
          }}
        >
          <Stack.Screen name="index" options={{ title: '🎮 游戏大厅', headerShown: false }} />
          <Stack.Screen name="game/[gameId]" options={{ title: '选择关卡' }} />
          <Stack.Screen name="game/[gameId]/[levelId]" options={{ title: '游戏进行中' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}