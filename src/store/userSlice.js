
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const useUserStore = create(
  persist(
    (set, get) => ({
      // 存储结构：{ gameId: { currentLevel: number, stars: { levelId: number } } }
      progress: {},
      scoreHistory: [],
      virusHistory: [],
      survivalHistory: [],
      recordTetrisScore: (score) => {
        if (!Number.isFinite(score) || score < 0) return;
        const entry = {
          score: Math.floor(score),
          playedAt: new Date().toISOString(),
        };
        set((state) => ({
          scoreHistory: [...state.scoreHistory, entry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 20),
        }));
      },
      getTetrisScores: () => get().scoreHistory,
      recordVirusScore: (score) => {
        if (!Number.isFinite(score) || score < 0) return;
        const entry = {
          score: Math.floor(score),
          playedAt: new Date().toISOString(),
        };
        set((state) => ({
          virusHistory: [...(state.virusHistory || []), entry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 20),
        }));
      },
      getVirusScores: () => get().virusHistory,
      recordSurvivalTime: (seconds) => {
        if (!Number.isFinite(seconds) || seconds < 0) return;
        const entry = {
          seconds: Math.floor(seconds),
          playedAt: new Date().toISOString(),
        };
        set((state) => ({
          survivalHistory: [...(state.survivalHistory || []), entry]
            .sort((a, b) => b.seconds - a.seconds)
            .slice(0, 20),
        }));
      },
      getSurvivalTimes: () => get().survivalHistory,
      setProgress: (gameId, levelId, stars) => {
        const current = get().progress[gameId] || { currentLevel: 1, stars: {} };
        const updatedStars = { ...current.stars, [levelId]: stars };
        let newCurrentLevel = current.currentLevel;
        if (stars > 0 && levelId >= newCurrentLevel) {
          newCurrentLevel = levelId + 1;
        }
        set({
          progress: {
            ...get().progress,
            [gameId]: { currentLevel: newCurrentLevel, stars: updatedStars },
          },
        });
      },
      // 设置某关卡的星星（通关时调用）
      setLevelStars: (gameId, levelId, stars) => {
        const gameProgress = get().progress[gameId] || { currentLevel: 1, stars: {} };
        const updatedStars = { ...gameProgress.stars, [levelId]: stars };
        // 计算当前解锁的最高关卡：从星星记录中找最大已获星关卡+1，但也要保证至少为1
        let maxUnlocked = 1;
        for (const [lvl, star] of Object.entries(updatedStars)) {
          if (star > 0 && parseInt(lvl) >= maxUnlocked) {
            maxUnlocked = parseInt(lvl) + 1;
          }
        }
        // 但为了向后兼容，如果当前关卡小于maxUnlocked，则更新
        const newCurrentLevel = Math.max(gameProgress.currentLevel || 1, maxUnlocked);
        set({
          progress: {
            ...get().progress,
            [gameId]: {
              currentLevel: newCurrentLevel,
              stars: updatedStars,
            },
          },
        });
      },
      
      // 获取某关卡星星数
      getLevelStars: (gameId, levelId) => {
        const game = get().progress[gameId];
        return game?.stars?.[levelId] || 0;
      },
      getStarsForLevel: (gameId, levelId) => {
        const game = get().progress[gameId];
        return game?.stars?.[levelId] || 0;
      },
      // 判断某关卡是否解锁
      isLevelUnlocked: (gameId, levelId) => {
        const game = get().progress[gameId];
        // 如果游戏没有任何记录，则解锁第1关
        if (!game) return levelId === 1;
        // 否则，关卡号 <= currentLevel 即为解锁
        return levelId <= game.currentLevel;
      },
      
      // 获取某游戏已通关的关卡数（星星>0的关卡）
      getCompletedCount: (gameId) => {
        const game = get().progress[gameId];
        if (!game) return 0;
        return Object.values(game.stars).filter(s => s > 0).length;
      },
      
      // 重置游戏进度（可选）
      resetGame: (gameId) => {
        const { [gameId]: _, ...rest } = get().progress;
        set({ progress: rest });
      },
    }),
    {
      name: 'game-progress-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useUserStore;