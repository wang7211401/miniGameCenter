// src/games/survival/systems/enemySystem.js

import {
  getDistance,
} from './collisionSystem';

export const ENEMY_TYPES = {
  normal: {
    type: 'normal',

    hp: 40,

    speed: 55,

    damage: 10,

    exp: 3,

    radius: 15,
  },

  fast: {
    type: 'fast',

    hp: 25,

    speed: 100,

    damage: 7,

    exp: 4,

    radius: 14,
  },

  tank: {
    type: 'tank',

    hp: 150,

    speed: 30,

    damage: 20,

    exp: 10,

    radius: 21,
  },
};

/**
 * 创建敌人
 */
export function createEnemy(
  type = 'normal',
  x = 0,
  y = 0,
  difficulty = 1
) {
  const config =
    ENEMY_TYPES[type] ??
    ENEMY_TYPES.normal;

  const hp =
    Math.round(
      config.hp *
        (1 +
          difficulty *
            0.08)
    );

  return {
    id:
      `enemy-${Date.now()}-${Math.random()}`,

    type,

    x,

    y,

    hp,

    maxHp: hp,

    speed:
      config.speed *
      (1 +
        difficulty *
          0.015),

    damage:
      config.damage *
      (1 +
        difficulty *
          0.03),

    exp: Math.round(
      config.exp *
        (1 +
          difficulty *
            0.05)
    ),

    radius:
      config.radius,
  };
}

/**
 * 随机敌人类型
 */
export function getRandomEnemyType(
  difficulty = 1
) {
  const random =
    Math.random();

  if (
    difficulty >= 5 &&
    random < 0.08
  ) {
    return 'tank';
  }

  if (
    random < 0.25
  ) {
    return 'fast';
  }

  return 'normal';
}

/**
 * 在玩家周围生成敌人
 */
export function spawnEnemyAroundPlayer({
  player,
  difficulty = 1,
  minDistance = 400,
  maxDistance = 700,
}) {
  const angle =
    Math.random() *
    Math.PI *
    2;

  const distance =
    minDistance +
    Math.random() *
      (maxDistance -
        minDistance);

  const x =
    player.x +
    Math.cos(angle) *
      distance;

  const y =
    player.y +
    Math.sin(angle) *
      distance;

  const type =
    getRandomEnemyType(
      difficulty
    );

  return createEnemy(
    type,
    x,
    y,
    difficulty
  );
}

/**
 * 敌人追踪玩家
 */
export function updateEnemyMovement(
  enemy,
  player,
  delta
) {
  const distance =
    getDistance(
      enemy,
      player
    );

  if (
    distance < 1
  ) {
    return enemy;
  }

  const dx =
    player.x -
    enemy.x;

  const dy =
    player.y -
    enemy.y;

  const length =
    Math.sqrt(
      dx * dx +
        dy * dy
    );

  const dt =
    delta / 1000;

  return {
    ...enemy,

    x:
      enemy.x +
      (dx / length) *
        enemy.speed *
        dt,

    y:
      enemy.y +
      (dy / length) *
        enemy.speed *
        dt,
  };
}

/**
 * 更新全部敌人
 */
export function updateEnemies(
  enemies,
  player,
  delta
) {
  return enemies.map(
    (enemy) =>
      updateEnemyMovement(
        enemy,
        player,
        delta
      )
  );
}

/**
 * 敌人是否攻击到玩家
 */
export function enemyHitsPlayer(
  enemy,
  player,
  playerRadius = 18
) {
  const distance =
    getDistance(
      enemy,
      player
    );

  return (
    distance <=
    playerRadius +
      (enemy.radius ?? 15)
  );
}