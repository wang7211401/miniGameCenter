// src/games/virus/entities.js
import { BULLET_SIZE, PLAYER_SIZE, POWERUP_SIZE, VIRUS_SCORE, VIRUS_SIZE } from './constants';

export const createPlayer = () => ({
  type: 'player',
  x: 150,
  y: 300,
  w: PLAYER_SIZE,
  h: PLAYER_SIZE,
  speed: 0,
  fireLevel: 1,
  powerupTimer: 0,
});

export const createBullet = (x, y, vx, vy, damage = 1) => ({
  type: 'bullet',
  x,
  y,
  w: BULLET_SIZE,
  h: BULLET_SIZE * 2,
  vx: vx || 0,
  vy: vy || -5,
  damage,
});

export const createVirus = (x, y, level = 1) => {
  const size = VIRUS_SIZE + Math.min(level - 1, 10) * 3;
  const hp = 1 + Math.floor((level - 1) / 2);

  return ({
  type: 'virus',
  x,
  y,
  w: size,
  h: size,
  hp,
  maxHp: hp,
  speed: 0.8 + Math.min(level - 1, 10) * 0.08,
  scoreValue: VIRUS_SCORE + (level - 1) * 2,
  });
};

export const createPowerup = (x, y, type) => ({
  type: 'powerup',
  x,
  y,
  w: POWERUP_SIZE,
  h: POWERUP_SIZE,
  powerupType: type, // 'fire' or 'bomb'
});

// 大招（弹幕清除）
export const createBomb = (x, y) => ({
  type: 'bomb',
  x,
  y,
  radius: 0,
  maxRadius: 200,
  active: false,
});