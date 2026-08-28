// src/games/virus/Game.jsx
import { useEffect, useRef, useState } from 'react';
import { Alert, PanResponder, Text, TouchableOpacity, View } from 'react-native';
import { Polygon, Rect, Svg, Image as SvgImage } from 'react-native-svg';
import useUserStore from '../../store/userSlice';
import { createPlayer } from './entities';
import styles from './styles';
import * as Systems from './systems';

// 生成带刺病毒（八芒星多边形）的坐标
const starPoints = (cx, cy, rOuter, rInner) => {
  const points = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    const r = i % 2 === 0 ? rOuter : rInner;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
};

const Renderer = (entities, screen, layout) => {
  if (!entities) return null;
  
  const { player, bullets, viruses, powerups } = entities;

  return (
    <Svg style={{ flex: 1 }}>
      {/* 玩家：换成飞机图片 */}
      {player && (
        <SvgImage
          x={player.x}
          y={player.y}
          width={player.w}
          height={player.h}
          // 注意：请将飞机图片放在 assets 文件夹下，或者修改为实际路径
          href={require('./assets/player.png')}
        />
      )}
      {/* 子弹 */}
      {bullets && bullets.map((b, idx) => (
        <Rect
          key={idx}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="#ffd700"
          rx={2}
        />
      ))}
      {/* 病毒：改成圆球带刺（八芒星 Polygon） */}
      {viruses && viruses.map((v, idx) => {
        const cx = v.x + v.w / 2;
        const cy = v.y + v.h / 2;
        const points = starPoints(cx, cy, v.w / 2, v.w / 4); // 外部半径，内部半径（形成尖刺）
        return (
          <Polygon
            key={idx}
            points={points}
            fill="#ff4757"
            stroke="#d63031"
            strokeWidth={1}
          />
        );
      })}
      {/* 道具 */}
      {powerups && powerups.map((p, idx) => (
        <Rect
          key={idx}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill={p.powerupType === 'fire' ? '#2ed573' : '#ff6b81'}
          rx={4}
        />
      ))}
    </Svg>
  );
};

const createEntities = () => {
  const player = createPlayer();
  return {
    player,
    bullets: [],
    viruses: [],
    powerups: [],
    gameOver: false,
    score: 0,
    fireFrame: 0,
    spawnFrame: 0,
    elapsedFrames: 0,
  };
};

const createTouch = event => {
  const nativeEvent = event.nativeEvent || event;
  return {
    type: 'move',
    locationX: nativeEvent.locationX ?? 0,
    locationY: nativeEvent.locationY ?? 0,
  };
};

const Game = ({ onGameOver }) => {
  const [running, setRunning] = useState(true);
  const [entities, setEntities] = useState(createEntities);
  const entitiesRef = useRef(entities);
  const touchesRef = useRef([]);
  const gameOverHandled = useRef(false);
  const recordVirusScore = useUserStore(state => state.recordVirusScore);

  const systems = [
    Systems.movePlayer,
    Systems.fireBullets,
    Systems.updateBullets,
    Systems.spawnVirus,
    Systems.updateViruses,
    Systems.updatePowerups,
    Systems.handleCollisions, // 现在会在这里更新分数
    Systems.collectPowerups,
    Systems.checkPlayerHit,
    Systems.updatePowerupTimer,
  ];

  useEffect(() => {
    let frameId;
    const update = () => {
      if (running) {
        const nextEntities = systems.reduce(
          (currentEntities, system) => system(currentEntities, { touches: touchesRef.current }),
          entitiesRef.current
        );
        entitiesRef.current = nextEntities;
        setEntities({
          ...nextEntities,
          player: { ...nextEntities.player },
          bullets: [...nextEntities.bullets],
          viruses: [...nextEntities.viruses],
          powerups: [...nextEntities.powerups],
        });

        if (nextEntities.gameOver && !gameOverHandled.current) {
          gameOverHandled.current = true;
          setRunning(false);
          const finalScore = nextEntities.score || 0;
          recordVirusScore(finalScore);
          Alert.alert('游戏结束', `得分：${finalScore}`, [
            { text: '重新开始', onPress: restart },
            { text: '返回', onPress: () => onGameOver && onGameOver() },
          ]);
        }
      }
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [running, recordVirusScore, onGameOver]);

  const restart = () => {
    gameOverHandled.current = false;
    const nextEntities = createEntities();
    entitiesRef.current = nextEntities;
    setEntities(nextEntities);
    setRunning(true);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => {
        touchesRef.current = [createTouch(event)];
      },
      onPanResponderMove: event => {
        touchesRef.current = [createTouch(event)];
      },
      onPanResponderRelease: () => {
        touchesRef.current = [];
      },
      onPanResponderTerminate: () => {
        touchesRef.current = [];
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.engine} {...panResponder.panHandlers}>
        {Renderer(entities)}
      </View>
      <View style={styles.hud}>
        <Text style={styles.scoreText}>得分: {entities.score || 0}</Text>
        <TouchableOpacity onPress={restart} style={styles.resetBtn}>
          <Text style={styles.resetText}>🔄 重开</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Game;