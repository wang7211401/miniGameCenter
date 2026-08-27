// src/games/survival/gameLogic.js

import {
  createWeapon,
} from './data/weapons';

/**
 * 游戏地图
 */
export const GAME_WIDTH = 2000;

export const GAME_HEIGHT = 2000;

/**
 * 初始玩家
 */
export function createInitialPlayer() {
  return {
    x:
      GAME_WIDTH / 2,

    y:
      GAME_HEIGHT / 2,

    hp: 100,

    maxHp: 100,

    speed: 220,

    level: 1,

    exp: 0,

    expToNext: 10,

    magnetRange: 100,

    critChance: 0.05,

    critMultiplier: 2,

    damageMultiplier: 1,

    damageReduction: 0,

    weapons: [
      createWeapon(
        'fireball',
        1
      ),
    ],
  };
}

/**
 * 时间格式
 */
export function formatTime(
  seconds
) {
  const total =
    Math.floor(seconds);

  const minutes =
    Math.floor(
      total / 60
    );

  const secs =
    total % 60;

  return `${String(
    minutes
  ).padStart(2, '0')}:${String(
    secs
  ).padStart(2, '0')}`;
}

/**
 * 创建经验宝石
 */
export function createExpGem(
  enemy
) {
  return {
    id:
      `gem-${enemy.id}-${Date.now()}-${Math.random()}`,

    x: enemy.x,

    y: enemy.y,

    value:
      enemy.exp ?? 1,
  };
}

/**
 * 经验需求
 */
export function getNextExp(
  level
) {
  return Math.floor(
    10 *
      Math.pow(
        1.35,
        level - 1
      )
  );
}

/**
 * 应用升级
 */
export function levelUpPlayer(
  player
) {
  const nextLevel =
    player.level + 1;

  return {
    ...player,

    level:
      nextLevel,

    expToNext:
      getNextExp(
        nextLevel
      ),
  };
}

/**
 * 创建随机敌人位置
 */
export function getSpawnPosition(
  player,
  minDistance = 450,
  maxDistance = 750
) {
  const angle =
    Math.random() *
    Math.PI *
    2;

  const distance =
    minDistance +
    Math.random() *
      (maxDistance -
        minDistance);

  return {
    x:
      player.x +
      Math.cos(angle) *
        distance,

    y:
      player.y +
      Math.sin(angle) *
        distance,
  };
}

/**
 * 升级武器
 */
export function upgradeWeaponStats(
  weapon
) {
  return {
    ...weapon,

    level:
      weapon.level + 1,

    damage:
      Math.round(
        weapon.damage *
          1.3
      ),

    cooldownTime:
      Math.max(
        250,
        weapon.cooldownTime *
          0.9
      ),

    cooldown: 0,

    piercing:
      weapon.piercing +
      (weapon.level >= 2
        ? 1
        : 0),

    area:
      weapon.area > 0
        ? weapon.area + 15
        : 0,

    projectileCount:
      weapon.level >= 3
        ? weapon.projectileCount +
          1
        : weapon.projectileCount,
  };
}