// src/games/virus/constants.js
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
export const PLAYER_SIZE = 40;
export const BULLET_SIZE = 8;
export const VIRUS_SIZE = 30;
export const POWERUP_SIZE = 20;

export const PLAYER_SPEED = 0.3; // 每帧移动速度
export const BULLET_SPEED = 5;
export const VIRUS_SPEED = 0.8;
export const FIRE_RATE = 15; // 每多少帧射击一次
export const POWERUP_DURATION = 600; // 帧数，约10秒（60fps）
export const VIRUS_SCORE = 10;

// 火力等级
export const FIRE_LEVELS = {
  1: { bullets: 1, spread: 0, damage: 1 },
  2: { bullets: 3, spread: 15, damage: 1 },
  3: { bullets: 5, spread: 20, damage: 2 },
  4: { bullets: 7, spread: 25, damage: 2 },
};
export const MAX_FIRE_LEVEL = 4;