// src/games/breaker/BreakerGame.jsx

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  BALL_SIZE,
  BRICK_HEIGHT,
  MAX_LIVES,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  createBall,
  createBricks,
  createPaddle,
  getBrickScore,
  getCollisionSide,
  increaseBallSpeed,
  isColliding,
  normalizeBallVelocity
} from './breakerLogic';

const { width, height } =
  Dimensions.get('window');

const GAME_WIDTH = Math.min(
  width,
  420
);

// window height includes system bars on Android; leave room for the bottom inset.
const GAME_HEIGHT = Math.max(
  420,
  height - 120
);

export default function BreakerGame({ levelId = 1, onComplete }) {
  const [gameState, setGameState] =
    useState('ready');

  const [score, setScore] =
    useState(0);

  const [bestScore, setBestScore] =
    useState(0);

  const [lives, setLives] =
    useState(MAX_LIVES);

  const [level, setLevel] =
    useState(levelId);

  const [combo, setCombo] =
    useState(0);

  const [completed, setCompleted] =
    useState(false);

  const [bricks, setBricks] =
    useState(() =>
      createBricks(
        GAME_WIDTH,
        levelId
      )
    );

  const paddleRef = useRef(
    createPaddle(
      GAME_WIDTH,
      GAME_HEIGHT
    )
  );

  const ballRef = useRef(
    createBall(
      GAME_WIDTH,
      GAME_HEIGHT,
      levelId
    )
  );

  const bricksRef =
    useRef(bricks);

  const scoreRef =
    useRef(0);

  const livesRef =
    useRef(MAX_LIVES);

  const levelRef =
    useRef(levelId);

  const comboRef =
    useRef(0);

  const animationRef =
    useRef(null);

  const lastTimeRef =
    useRef(null);

  const lifeLossHandledRef =
    useRef(false);

  const targetPaddleXRef =
    useRef(paddleRef.current.x);

  const [, forceRender] =
    useState(0);

  const restartGame =
    useCallback(() => {
      const newBricks =
        createBricks(
          GAME_WIDTH,
          levelId
        );

      bricksRef.current =
        newBricks;

      setBricks(newBricks);

      paddleRef.current =
        createPaddle(
          GAME_WIDTH,
          GAME_HEIGHT
        );
      targetPaddleXRef.current = paddleRef.current.x;

      ballRef.current =
        createBall(
          GAME_WIDTH,
          GAME_HEIGHT,
          levelId
        );

      scoreRef.current = 0;
      livesRef.current =
        MAX_LIVES;
      levelRef.current = levelId;
      comboRef.current = 0;
      lifeLossHandledRef.current = false;

      setScore(0);
      setLives(MAX_LIVES);
      setLevel(levelId);
      setCombo(0);
      setCompleted(false);

      setGameState('playing');
    }, [levelId]);

  const startGame =
    useCallback(() => {
      if (
        gameState === 'ready'
      ) {
        restartGame();
      }
    }, [
      gameState,
      restartGame,
    ]);

  // 游戏结束
  const gameOver =
    useCallback(() => {
      setGameState('gameover');

      setBestScore(
        (oldBest) =>
          Math.max(
            oldBest,
            scoreRef.current
          )
      );
    }, []);

  // 丢球
  const loseLife =
    useCallback(() => {
      if (lifeLossHandledRef.current || livesRef.current <= 0) {
        return;
      }

      lifeLossHandledRef.current = true;
      livesRef.current = Math.max(0, livesRef.current - 1);

      setLives(
        livesRef.current
      );

      comboRef.current = 0;
      setCombo(0);

      if (
        livesRef.current <= 0
      ) {
        gameOver();
        return;
      }

      // 重置球
      ballRef.current =
        createBall(
          GAME_WIDTH,
          GAME_HEIGHT,
          levelRef.current
        );
      lifeLossHandledRef.current = false;
    }, [gameOver]);

  const completeLevel =
    useCallback(() => {
      if (completed) return;

      setCompleted(true);
      setGameState('levelcomplete');
      Alert.alert(
        '🎉 关卡完成',
        `第 ${levelId} 关得分：${scoreRef.current}`,
        [
          {
            text: '进入下一关',
            onPress: () => onComplete?.(3, 'next'),
          },
          {
            text: '取消',
            style: 'cancel',
            onPress: () => onComplete?.(3, 'list'),
          },
        ],
        { cancelable: false }
      );
    }, [completed, levelId, onComplete]);

  // 游戏循环
  useEffect(() => {
    if (
      gameState !== 'playing'
    ) {
      return;
    }

    lastTimeRef.current =
      Date.now();

    const loop = () => {
      const now = Date.now();

      const delta = Math.min(
        (now -
          lastTimeRef.current) /
          16.67,
        2
      );

      lastTimeRef.current =
        now;

      const ball =
        ballRef.current;

      const paddle =
        paddleRef.current;

      paddle.x +=
        (targetPaddleXRef.current - paddle.x) * 0.35;

      const currentBricks =
        bricksRef.current;

      const previousX =
        ball.x;

      const previousY =
        ball.y;

      // 移动球
      ball.x +=
        ball.vx * delta;

      ball.y +=
        ball.vy * delta;

      // 左墙
      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx =
          Math.abs(ball.vx);
      }

      // 右墙
      if (
        ball.x +
          BALL_SIZE >=
        GAME_WIDTH
      ) {
        ball.x =
          GAME_WIDTH -
          BALL_SIZE;

        ball.vx =
          -Math.abs(ball.vx);
      }

      // 顶部
      if (ball.y <= 45) {
        ball.y = 45;
        ball.vy =
          Math.abs(ball.vy);
      }

      // 挡板碰撞
      const paddleLeft =
        paddle.x;

      const paddleRight =
        paddle.x +
        paddle.width;

      const paddleTop =
        paddle.y;

      const paddleBottom =
        paddle.y +
        paddle.height;

      const ballLeft =
        ball.x;

      const ballRight =
        ball.x +
        BALL_SIZE;

      const ballBottom =
        ball.y +
        BALL_SIZE;

      const hitPaddle =
        ballRight >=
          paddleLeft &&
        ballLeft <=
          paddleRight &&
        ballBottom >=
          paddleTop &&
        ball.y <=
          paddleBottom &&
        ball.vy > 0;

      if (hitPaddle) {
        ball.y =
          paddleTop -
          BALL_SIZE;

        ball.vy =
          -Math.abs(
            ball.vy
          );

        // 根据击球位置改变水平速度
        const paddleCenter =
          paddle.x +
          paddle.width / 2;

        const ballCenter =
          ball.x +
          BALL_SIZE / 2;

        const offset =
          (ballCenter -
            paddleCenter) /
          (paddle.width / 2);

        ball.vx =
          offset * 6;

        normalizeBallVelocity(
          ball
        );
      }

      // 砖块碰撞
      let brickDestroyed =
        false;

      const updatedBricks =
        currentBricks.map(
          (brick) => {
            if (
              !brick.alive
            ) {
              return brick;
            }

            if (
              !isColliding(
                ball,
                brick
              )
            ) {
              return brick;
            }

            const side =
              getCollisionSide(
                ball,
                brick,
                previousX,
                previousY
              );

            if (
              side ===
              'horizontal'
            ) {
              ball.vx =
                -ball.vx;
            } else {
              ball.vy =
                -ball.vy;
            }

            // 多血砖块
            const newHp =
              brick.hp - 1;

            if (
              newHp <= 0
            ) {
              brickDestroyed =
                true;

              comboRef.current += 1;

              const newCombo =
                comboRef.current;

              setCombo(newCombo);

              const comboBonus =
                Math.min(
                  30,
                  newCombo * 2
                );

              const addedScore =
                getBrickScore(
                  brick
                ) +
                comboBonus;

              scoreRef.current +=
                addedScore;

              setScore(
                scoreRef.current
              );

              return {
                ...brick,
                hp: 0,
                alive: false,
              };
            }

            return {
              ...brick,
              hp: newHp,
            };
          }
        );

      if (
        brickDestroyed
      ) {
        increaseBallSpeed(
          ball,
          levelRef.current
        );
      }

      bricksRef.current =
        updatedBricks;

      setBricks(
        updatedBricks
      );

      // 检查是否清空
      const remaining =
        updatedBricks.some(
          (brick) =>
            brick.alive
        );

      if (!remaining) {
        completeLevel();
        return;
      }

      // 球掉下去
      if (
        ball.y >
        GAME_HEIGHT + 30
      ) {
        loseLife();
        forceRender(
          (value) => value + 1
        );
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      forceRender(
        (value) => value + 1
      );

      animationRef.current =
        requestAnimationFrame(
          loop
        );
    };

    animationRef.current =
      requestAnimationFrame(
        loop
      );

    return () => {
      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [
    gameState,
    loseLife,
    completeLevel,
  ]);

  // 移动挡板
  const movePaddle =
    useCallback((x) => {
      if (!Number.isFinite(x)) {
        return;
      }

      const paddle =
        paddleRef.current;

      const nextX =
        x -
        paddle.width / 2;

      const boundedX = Math.max(
        0,
        Math.min(
          GAME_WIDTH -
            paddle.width,
          nextX
        )
      );

      targetPaddleXRef.current = boundedX;
    }, []);

  // 手势
  const panResponder =
    useRef(
      PanResponder.create({
        onStartShouldSetPanResponder:
          () => true,

        onMoveShouldSetPanResponder:
          () => true,

        onPanResponderGrant:
          (event) => {
              movePaddle(event.nativeEvent?.locationX);
          },

        onPanResponderMove:
          (event) => {
              movePaddle(event.nativeEvent?.locationX);
          },

        onPanResponderRelease:
          () => {},

        onPanResponderTerminate:
          () => {},
      })
    ).current;

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
    >
      {/* HUD */}
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>
            得分
          </Text>

          <Text style={styles.score}>
            {score}
          </Text>
        </View>

        <View style={styles.levelBox}>
          <Text style={styles.label}>
            关卡
          </Text>

          <Text style={styles.level}>
            {level}
          </Text>
        </View>

        <View>
          <Text style={styles.label}>
            最高
          </Text>

          <Text style={styles.best}>
            {bestScore}
          </Text>
        </View>
      </View>

      {/* 生命 */}
      <View style={styles.lives}>
        <Text style={styles.lifeText}>
          {'❤️'.repeat(Math.max(0, lives))}
        </Text>
      </View>

      {/* Combo */}
      {combo >= 2 && (
        <View style={styles.combo}>
          <Text style={styles.comboText}>
            🔥 COMBO × {combo}
          </Text>
        </View>
      )}

      {/* 游戏区域 */}
      <View style={styles.gameArea}>
        {/* 砖块 */}
        {bricks.map(
          (brick) => {
            if (
              !brick.alive
            ) {
              return null;
            }

            return (
              <View
                key={brick.id}
                style={[
                  styles.brick,
                  {
                    left: brick.x,
                    top: brick.y,
                    width:
                      brick.width,
                    height:
                      brick.height,
                  },
                  brick.type ===
                    'gold' &&
                    styles.goldBrick,
                  brick.type ===
                    'blue' &&
                    styles.blueBrick,
                ]}
              >
                {brick.hp > 1 && (
                  <Text
                    style={
                      styles.hpText
                    }
                  >
                    {brick.hp}
                  </Text>
                )}
              </View>
            );
          }
        )}

        {/* 球 */}
        <View
          style={[
            styles.ball,
            {
              left:
                ballRef.current.x,
              top:
                ballRef.current.y,
            },
          ]}
        />

        {/* 挡板 */}
        <View
          style={[
            styles.paddle,
            {
              left:
                paddleRef.current.x,
              top:
                paddleRef.current.y,
            },
          ]}
        />
      </View>

      {/* 底部提示 */}
      {gameState ===
        'playing' && (
        <View style={styles.tip}>
          <Text style={styles.tipText}>
            👆 左右拖动控制挡板
          </Text>
        </View>
      )}

      {/* 开始 */}
      {gameState ===
        'ready' && (
        <View
          style={styles.overlay}
        >
          <View
            style={
              styles.panel
            }
          >
            <Text
              style={
                styles.title
              }
            >
              🧱 打砖块
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              经典街机打砖块
            </Text>

            <Text
              style={styles.instruction}
            >
              👆 左右拖动挡板
            </Text>

            <Text
              style={styles.instruction}
            >
              🎯 击碎所有砖块
            </Text>

            <Text
              style={styles.instruction}
            >
              🔥 连击可以获得额外分数
            </Text>

            <Pressable
              style={
                styles.button
              }
              onPress={
                startGame
              }
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                开始游戏
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 游戏结束 */}
      {gameState ===
        'gameover' && (
        <View
          style={styles.overlay}
        >
          <View
            style={
              styles.panel
            }
          >
            <Text
              style={
                styles.gameOverTitle
              }
            >
              游戏结束
            </Text>

            <Text
              style={
                styles.finalScore
              }
            >
              {score}
            </Text>

            <Text
              style={
                styles.finalLabel
              }
            >
              本次得分
            </Text>

            <Text
              style={
                styles.bestResult
              }
            >
              🏆 最高分：
              {bestScore}
            </Text>

            <Pressable
              style={
                styles.button
              }
              onPress={
                restartGame
              }
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                再来一次
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#101827',
      overflow: 'hidden',
    },

    header: {
      position:
        'absolute',
      top: 48,
      left: 20,
      right: 20,
      zIndex: 30,

      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'flex-start',
    },

    label: {
      color:
        '#8c9aaf',
      fontSize: 12,
      fontWeight:
        '600',
    },

    score: {
      marginTop: 2,
      color: '#fff',
      fontSize: 30,
      fontWeight:
        '900',
    },

    levelBox: {
      alignItems:
        'center',
    },

    level: {
      marginTop: 2,
      color:
        '#ffd166',
      fontSize: 24,
      fontWeight:
        '900',
    },

    best: {
      marginTop: 2,
      color:
        '#fff',
      fontSize: 20,
      fontWeight:
        '800',
    },

    lives: {
      position:
        'absolute',
      top: 110,
      left: 20,
      zIndex: 30,
    },

    lifeText: {
      fontSize: 18,
    },

    combo: {
      position:
        'absolute',
      top: 105,
      alignSelf:
        'center',
      zIndex: 30,

      paddingHorizontal:
        15,
      paddingVertical:
        6,

      borderRadius:
        18,

      backgroundColor:
        'rgba(255,180,0,0.15)',
    },

    comboText: {
      color:
        '#ffd166',
      fontSize: 16,
      fontWeight:
        '900',
    },

    gameArea: {
      position:
        'absolute',

      top: 0,
      left: 0,

      width:
        GAME_WIDTH,

      height:
        GAME_HEIGHT,
    },

    brick: {
      position:
        'absolute',

      height:
        BRICK_HEIGHT,

      borderRadius: 5,

      backgroundColor:
        '#e85d75',

      borderWidth: 1,

      borderColor:
        '#ff8fa3',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    goldBrick: {
      backgroundColor:
        '#e9a93a',

      borderColor:
        '#ffd166',
    },

    blueBrick: {
      backgroundColor:
        '#4f7cff',

      borderColor:
        '#88a7ff',
    },

    hpText: {
      color:
        '#fff',

      fontSize: 11,

      fontWeight:
        '900',
    },

    ball: {
      position:
        'absolute',

      width:
        BALL_SIZE,

      height:
        BALL_SIZE,

      borderRadius:
        BALL_SIZE / 2,

      backgroundColor:
        '#fff',

      shadowColor:
        '#fff',

      shadowOpacity:
        0.8,

      shadowRadius:
        8,

      elevation: 6,
    },

    paddle: {
      position:
        'absolute',

      width:
        PADDLE_WIDTH,

      height:
        PADDLE_HEIGHT,

      borderRadius:
        PADDLE_HEIGHT / 2,

      backgroundColor:
        '#5eead4',

      borderWidth: 2,

      borderColor:
        '#d5fff8',

      shadowColor:
        '#5eead4',

      shadowOpacity:
        0.5,

      shadowRadius:
        8,

      elevation: 5,
    },

    tip: {
      position:
        'absolute',

      bottom: 25,

      left: 0,
      right: 0,

      alignItems:
        'center',

      zIndex: 20,
    },

    tipText: {
      color:
        '#728096',

      fontSize: 13,
    },

    overlay: {
      ...StyleSheet
        .absoluteFillObject,

      zIndex: 100,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(5,10,20,0.65)',
    },

    panel: {
      width: '84%',

      padding: 28,

      borderRadius: 24,

      alignItems:
        'center',

      backgroundColor:
        '#f8fafc',
    },

    title: {
      color:
        '#182334',

      fontSize: 34,

      fontWeight:
        '900',
    },

    subtitle: {
      marginTop: 8,
      marginBottom: 24,

      color:
        '#758196',

      fontSize: 14,
    },

    instruction: {
      marginTop: 8,

      color:
        '#435066',

      fontSize: 15,
    },

    button: {
      minWidth: 180,

      marginTop: 28,

      paddingVertical: 14,

      paddingHorizontal: 30,

      borderRadius: 25,

      alignItems:
        'center',

      backgroundColor:
        '#4f7cff',
    },

    buttonText: {
      color:
        '#fff',

      fontSize: 18,

      fontWeight:
        '800',
    },

    gameOverTitle: {
      color:
        '#182334',

      fontSize: 28,

      fontWeight:
        '900',
    },

    finalScore: {
      marginTop: 15,

      color:
        '#4f7cff',

      fontSize: 58,

      fontWeight:
        '900',
    },

    finalLabel: {
      color:
        '#8993a3',

      fontSize: 14,
    },

    bestResult: {
      marginTop: 15,

      color:
        '#596579',

      fontSize: 16,

      fontWeight:
        '700',
    },
  });