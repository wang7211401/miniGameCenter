// src/games/jump/JumpGame.jsx

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CHARGE_SPEED,
  GRAVITY,
  MAX_POWER,
  MIN_POWER,
  PLAYER_SIZE,
  checkLanding,
  createInitialPlatforms,
  createPlatform,
  getDifficulty,
  getJumpVelocity,
  getLandingScore,
} from './jumpLogic';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get('window');

const GAME_WIDTH = Math.min(SCREEN_WIDTH, 420);
const GROUND_Y = SCREEN_HEIGHT - 160;

const PLAYER_START_X = GAME_WIDTH / 2 - PLAYER_SIZE / 2;

const createPlayer = () => ({
  x: PLAYER_START_X,
  y: GROUND_Y - PLAYER_SIZE,
  vx: 0,
  vy: 0,
  jumping: false,
});

export default function JumpGame() {
  const [gameState, setGameState] = useState('ready');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [power, setPower] = useState(MIN_POWER);
  const [perfectText, setPerfectText] = useState('');
  const gameStateRef = useRef(gameState);

  const [platforms, setPlatforms] = useState(
    () => createInitialPlatforms(14)
  );
  const platformsRef = useRef(platforms);

  const playerRef = useRef(createPlayer());

  const powerRef = useRef(MIN_POWER);

  const chargingRef = useRef(false);

  const animationRef = useRef(null);

  const lastTimeRef = useRef(null);

  const cameraYRef = useRef(0);

  const nextPlatformIdRef = useRef(20);

  const playerAnim = useRef(
    new Animated.ValueXY({
      x: PLAYER_START_X,
      y: GROUND_Y - PLAYER_SIZE,
    })
  ).current;

  const resetGame = useCallback(() => {
    const newPlatforms = createInitialPlatforms(14);

    setPlatforms(newPlatforms);
    platformsRef.current = newPlatforms;

    playerRef.current = createPlayer();

    powerRef.current = MIN_POWER;

    cameraYRef.current = 0;

    nextPlatformIdRef.current = 20;

    setPower(MIN_POWER);
    setScore(0);
    setCombo(0);
    setPerfectText('');
    chargingRef.current = false;

    playerAnim.setValue({
      x: PLAYER_START_X,
      y: GROUND_Y - PLAYER_SIZE,
    });

    gameStateRef.current = 'ready';
    setGameState('ready');
  }, [playerAnim]);

  const startGame = useCallback(() => {
    if (gameState === 'playing') {
      return;
    }

    if (gameState === 'gameover') {
      resetGame();
      setTimeout(() => {
        gameStateRef.current = 'playing';
        setGameState('playing');
      }, 50);
      return;
    }

    gameStateRef.current = 'playing';
    setGameState('playing');
  }, [gameState, resetGame]);

  // 开始蓄力
  const startCharge = useCallback(() => {
    if (gameStateRef.current !== 'playing') {
      if (gameStateRef.current === 'ready') {
        gameStateRef.current = 'playing';
        setGameState('playing');
      }
      return;
    }

    const player = playerRef.current;

    if (player.jumping) {
      return;
    }

    chargingRef.current = true;

    powerRef.current = MIN_POWER;
    setPower(MIN_POWER);
  }, [gameState, startGame]);

  // 松开，起跳
  const releaseCharge = useCallback(() => {
    if (!chargingRef.current) {
      return;
    }

    chargingRef.current = false;

    const player = playerRef.current;

    if (player.jumping) {
      return;
    }

    player.vy = getJumpVelocity(powerRef.current);

    // 根据蓄力时间决定水平移动
    const direction = getHorizontalDirection();

    player.vx =
      direction *
      (1.2 + powerRef.current * 0.12);

    player.jumping = true;
  }, []);

  // 根据玩家和目标平台决定水平移动方向
  const getHorizontalDirection = () => {
    const player = playerRef.current;

    const currentPlatforms = platformsRef.current;
    const currentPlatform =
      currentPlatforms.find((p) => {
        const bottom = player.y + PLAYER_SIZE;

        return (
          Math.abs(bottom - p.y) < 15 &&
          player.x + PLAYER_SIZE > p.x &&
          player.x < p.x + p.width
        );
      });

    if (!currentPlatform) {
      return Math.random() > 0.5 ? 1 : -1;
    }

    const index = currentPlatforms.findIndex(
      (p) => p.id === currentPlatform.id
    );

    const target = currentPlatforms[index + 1];

    if (!target) {
      return Math.random() > 0.5 ? 1 : -1;
    }

    const playerCenter =
      player.x + PLAYER_SIZE / 2;

    const targetCenter =
      target.x + target.width / 2;

    return targetCenter >= playerCenter ? 1 : -1;
  };

  // 游戏循环
  useEffect(() => {
    if (gameState !== 'playing') {
      return;
    }

    lastTimeRef.current = Date.now();

    const loop = () => {
      const now = Date.now();

      const delta =
        Math.min(now - lastTimeRef.current, 32) /
        16.67;

      lastTimeRef.current = now;

      const player = playerRef.current;

      // 蓄力
      if (chargingRef.current && !player.jumping) {
        powerRef.current +=
          CHARGE_SPEED * delta;

        if (powerRef.current > MAX_POWER) {
          powerRef.current = MAX_POWER;
        }

        setPower(powerRef.current);
      }

      // 玩家物理
      if (player.jumping) {
        const previousY = player.y;

        player.vy += GRAVITY * delta;

        player.y += player.vy * delta;

        player.x += player.vx * delta;

        // 边界反弹
        if (player.x <= 5) {
          player.x = 5;
          player.vx = Math.abs(player.vx);
        }

        if (
          player.x + PLAYER_SIZE >=
          GAME_WIDTH - 5
        ) {
          player.x =
            GAME_WIDTH - PLAYER_SIZE - 5;

          player.vx = -Math.abs(player.vx);
        }

        // 检查平台
        const landingPlatform =
          platforms.find((platform) =>
            checkLanding(
              player,
              platform,
              previousY
            )
          );

        if (landingPlatform) {
          player.y =
            landingPlatform.y - PLAYER_SIZE;

          player.vy = 0;
          player.vx *= 0.2;
          player.jumping = false;

          handleLanding(landingPlatform);
        }

        // 掉出屏幕
        if (
          player.y >
          GROUND_Y + 200
        ) {
          gameOver();
        }
      }

      // 镜头跟随
      const targetCamera =
        Math.max(
          0,
          GROUND_Y -
          player.y -
          SCREEN_HEIGHT * 0.35
        );

      cameraYRef.current +=
        (targetCamera -
          cameraYRef.current) *
        0.12;

      playerAnim.setValue({
        x: player.x,
        y:
          player.y +
          cameraYRef.current,
      });

      animationRef.current =
        requestAnimationFrame(loop);
    };

    animationRef.current =
      requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [gameState, platforms, playerAnim]);

  // 落地
  const handleLanding = (platform) => {
    const result = getLandingScore(
      playerRef.current,
      platform
    );

    let addedScore = result.score;

    let newCombo = combo + 1;

    if (result.perfect) {
      newCombo += 1;

      addedScore += Math.min(
        5,
        Math.floor(newCombo / 3)
      );

      setPerfectText('PERFECT!');

      setTimeout(() => {
        setPerfectText('');
      }, 500);
    } else {
      setPerfectText('');
    }

    if (platform.type === 'bonus') {
      addedScore += 5;

      setPerfectText('+5 BONUS');

      setTimeout(() => {
        setPerfectText('');
      }, 500);
    }

    if (platform.type === 'spring') {
      playerRef.current.vy =
        -18;
    }

    setCombo(newCombo);

    setScore((oldScore) => {
      const newScore =
        oldScore + addedScore;

      setBestScore((oldBest) =>
        Math.max(oldBest, newScore)
      );

      return newScore;
    });

    // 添加新平台
    setPlatforms((oldPlatforms) => {
      const highest =
        oldPlatforms.reduce(
          (prev, current) =>
            current.y < prev.y
              ? current
              : prev
        );

      const difficulty =
        getDifficulty(score);

      const newPlatform =
        createPlatform(
          `platform-${nextPlatformIdRef.current++}`,
          highest,
          difficulty
        );

      const nextPlatforms = [
        ...oldPlatforms,
        newPlatform,
      ].filter(
        (platform) =>
          platform.y +
          cameraYRef.current <
          SCREEN_HEIGHT + 200
      );

      platformsRef.current = nextPlatforms;
      return nextPlatforms;
    });
  };

  const gameOver = () => {
    if (gameStateRef.current !== 'playing') {
      return;
    }

    chargingRef.current = false;

    gameStateRef.current = 'gameover';
    setGameState('gameover');

    setCombo(0);

    setBestScore((oldBest) =>
      Math.max(oldBest, score)
    );
  };

  // 手势
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        true,

      onMoveShouldSetPanResponder: () =>
        true,

      onPanResponderGrant: () => {
        startCharge();
      },

      onPanResponderRelease: () => {
        releaseCharge();
      },

      onPanResponderTerminate: () => {
        releaseCharge();
      },
    })
  ).current;

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
    >
      {/* 背景 */}
      <View style={styles.background}>
        <View style={[styles.cloud, styles.cloud1]} />
        <View style={[styles.cloud, styles.cloud2]} />
        <View style={[styles.cloud, styles.cloud3]} />
      </View>

      {/* HUD */}
      <View style={styles.header}>
        <View>
          <Text style={styles.scoreLabel}>
            得分
          </Text>

          <Text style={styles.score}>
            {score}
          </Text>
        </View>

        <View style={styles.bestBox}>
          <Text style={styles.bestLabel}>
            最高分
          </Text>

          <Text style={styles.bestScore}>
            {bestScore}
          </Text>
        </View>
      </View>

      {/* Combo */}
      {combo >= 2 && (
        <View style={styles.comboBox}>
          <Text style={styles.comboText}>
            🔥 {combo} COMBO
          </Text>
        </View>
      )}

      {/* Perfect */}
      {perfectText !== '' && (
        <View style={styles.perfectBox}>
          <Text style={styles.perfectText}>
            {perfectText}
          </Text>
        </View>
      )}

      {/* 游戏世界 */}
      <View style={styles.world}>
        {platforms.map((platform) => {
          const top =
            platform.y +
            cameraYRef.current;

          if (
            top < -100 ||
            top > SCREEN_HEIGHT + 100
          ) {
            return null;
          }

          return (
            <View
              key={platform.id}
              style={[
                styles.platform,
                {
                  left: platform.x,
                  top,
                  width: platform.width,
                },
                platform.type ===
                'bonus' &&
                styles.bonusPlatform,
                platform.type ===
                'spring' &&
                styles.springPlatform,
              ]}
            >
              {platform.type ===
                'bonus' && (
                  <Text style={styles.platformIcon}>
                    ⭐
                  </Text>
                )}

              {platform.type ===
                'spring' && (
                  <Text style={styles.platformIcon}>
                    ⬆️
                  </Text>
                )}
            </View>
          );
        })}

        {/* 玩家 */}
        <Animated.View
          style={[
            styles.player,
            {
              transform: [
                {
                  translateX:
                    playerAnim.x.__getValue(),
                },
                {
                  translateY:
                    playerAnim.y.__getValue(),
                },
                {
                  rotate:
                    playerRef.current.jumping
                      ? '8deg'
                      : '0deg',
                },
              ],
            },
          ]}
        >
          <View style={styles.playerFace}>
            <View style={styles.eyeLeft} />
            <View style={styles.eyeRight} />
            <View style={styles.mouth} />
          </View>
        </Animated.View>
      </View>

      {/* 蓄力条 */}
      {gameState === 'playing' &&
        !playerRef.current.jumping && (
          <View style={styles.powerContainer}>
            <Text style={styles.powerText}>
              按住蓄力，松开跳跃
            </Text>

            <View style={styles.powerBar}>
              <View
                style={[
                  styles.powerProgress,
                  {
                    width: `${((power - MIN_POWER) /
                        (MAX_POWER -
                          MIN_POWER)) *
                      100
                      }%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

      {/* 开始界面 */}
      {gameState === 'ready' && (
        <View style={styles.overlay}>
          <View style={styles.startPanel}>
            <Text style={styles.title}>
              🦘 跳一跳
            </Text>

            <Text style={styles.subtitle}>
              参考经典跳一跳玩法
            </Text>

            <Text style={styles.tip}>
              按住屏幕蓄力
            </Text>

            <Text style={styles.tip}>
              松开屏幕跳跃
            </Text>

            <Pressable
              style={styles.startButton}
              onPress={startGame}
            >
              <Text style={styles.startButtonText}>
                开始游戏
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 游戏结束 */}
      {gameState === 'gameover' && (
        <View style={styles.overlay}>
          <View style={styles.gameOverPanel}>
            <Text style={styles.gameOverTitle}>
              游戏结束
            </Text>

            <Text style={styles.finalScore}>
              {score}
            </Text>

            <Text style={styles.finalLabel}>
              本次得分
            </Text>

            <Text style={styles.bestResult}>
              🏆 最高分：{bestScore}
            </Text>

            <Pressable
              style={styles.startButton}
              onPress={resetGame}
            >
              <Text style={styles.startButtonText}>
                再来一次
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#b8e7ff',
  },

  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#b8e7ff',
  },

  cloud: {
    position: 'absolute',
    width: 100,
    height: 35,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  cloud1: {
    top: 150,
    left: 20,
  },

  cloud2: {
    top: 280,
    right: 30,
    width: 130,
  },

  cloud3: {
    top: 420,
    left: 80,
    width: 80,
  },

  header: {
    position: 'absolute',
    top: 55,
    left: 20,
    right: 20,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  scoreLabel: {
    color: '#5b6f82',
    fontSize: 14,
    fontWeight: '600',
  },

  score: {
    marginTop: 2,
    color: '#1f3547',
    fontSize: 34,
    fontWeight: '900',
  },

  bestBox: {
    alignItems: 'flex-end',
  },

  bestLabel: {
    color: '#5b6f82',
    fontSize: 14,
  },

  bestScore: {
    marginTop: 2,
    color: '#1f3547',
    fontSize: 22,
    fontWeight: '800',
  },

  comboBox: {
    position: 'absolute',
    top: 125,
    alignSelf: 'center',
    zIndex: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },

  comboText: {
    color: '#e66a2c',
    fontWeight: '900',
    fontSize: 18,
  },

  perfectBox: {
    position: 'absolute',
    top: 175,
    alignSelf: 'center',
    zIndex: 30,
  },

  perfectText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ff8a00',
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowRadius: 6,
  },

  world: {
    ...StyleSheet.absoluteFillObject,
  },

  platform: {
    position: 'absolute',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6c91b5',

    borderWidth: 2,
    borderColor: '#4c718f',

    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 4,
  },

  bonusPlatform: {
    backgroundColor: '#f2b84b',
    borderColor: '#d89520',
  },

  springPlatform: {
    backgroundColor: '#69b978',
    borderColor: '#398b4a',
  },

  platformIcon: {
    position: 'absolute',
    alignSelf: 'center',
    top: -25,
    fontSize: 16,
  },

  player: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: 8,
    backgroundColor: '#222',

    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 5,
  },

  playerFace: {
    flex: 1,
    position: 'relative',
  },

  eyeLeft: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    top: 8,
    left: 8,
  },

  eyeRight: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    top: 8,
    right: 8,
  },

  mouth: {
    position: 'absolute',
    width: 10,
    height: 4,
    borderBottomWidth: 2,
    borderColor: '#fff',
    left: 10,
    top: 17,
  },

  powerContainer: {
    position: 'absolute',
    left: 35,
    right: 35,
    bottom: 50,
    zIndex: 30,
    alignItems: 'center',
  },

  powerText: {
    marginBottom: 8,
    color: '#425a6c',
    fontSize: 14,
    fontWeight: '700',
  },

  powerBar: {
    width: '100%',
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  powerProgress: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#ff9f43',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,50,70,0.25)',
  },

  startPanel: {
    width: '82%',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
  },

  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#263746',
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 25,
    color: '#718391',
    fontSize: 14,
  },

  tip: {
    marginTop: 6,
    color: '#4b5e6d',
    fontSize: 16,
  },

  startButton: {
    minWidth: 180,
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#2f80ed',
  },

  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  gameOverPanel: {
    width: '82%',
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
  },

  gameOverTitle: {
    color: '#273746',
    fontSize: 28,
    fontWeight: '900',
  },

  finalScore: {
    marginTop: 15,
    color: '#2f80ed',
    fontSize: 58,
    fontWeight: '900',
  },

  finalLabel: {
    color: '#84919c',
    fontSize: 14,
  },

  bestResult: {
    marginTop: 15,
    color: '#596b78',
    fontSize: 16,
    fontWeight: '700',
  },
});