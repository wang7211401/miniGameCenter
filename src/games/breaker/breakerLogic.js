// src/games/breaker/breakerLogic.js

export const BALL_SIZE = 14;
export const PADDLE_WIDTH = 90;
export const PADDLE_HEIGHT = 14;
export const BRICK_WIDTH = 48;
export const BRICK_HEIGHT = 20;
export const BRICK_GAP = 5;
export const BALL_SPEED = 5;
export const MAX_LIVES = 3;
export const BRICK_ROWS = 6;
export const BRICK_COLS = 6;
import { levels } from './levels';

export function getLevelConfig(level = 1) {
  return levels[Math.min(level, levels.length) - 1] || {
    rows: 8,
    gap: 6,
    ballSpeed: 6.6,
    hpRows: 3,
  };
}

export function createBall(gameWidth, gameHeight, level = 1) {
  const { ballSpeed } = getLevelConfig(level);
  return {
    x: gameWidth / 2 - BALL_SIZE / 2,
    y: gameHeight - 100,
    vx: ballSpeed * 0.75,
    vy: -ballSpeed,
  };
}

export function createPaddle(gameWidth, gameHeight) {
  return {
    x: gameWidth / 2 - PADDLE_WIDTH / 2,
    y: gameHeight - 55,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };
}

export function createBricks(gameWidth, level = 1) {
  const config = getLevelConfig(level);
  const totalWidth = BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * config.gap;
  const startX = (gameWidth - totalWidth) / 2;
  const bricks = [];

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      let hp = row < config.hpRows ? 2 : 1;
      if (level >= 5 && row === config.hpRows && Math.random() > 0.5) hp = 2;

      bricks.push({
        id: `${level}-${row}-${col}`,
        x: startX + col * (BRICK_WIDTH + config.gap),
        y: 80 + row * (BRICK_HEIGHT + config.gap),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        hp,
        maxHp: hp,
        type: row === 0 ? 'gold' : row % 3 === 0 ? 'blue' : 'normal',
        alive: true,
      });
    }
  }

  return bricks;
}

export function isColliding(ball, brick) {
  return (
    ball.x + BALL_SIZE >= brick.x &&
    ball.x <= brick.x + brick.width &&
    ball.y + BALL_SIZE >= brick.y &&
    ball.y <= brick.y + brick.height
  );
}

export function getCollisionSide(ball, brick, previousX, previousY) {
  const previousRight = previousX + BALL_SIZE;
  const previousBottom = previousY + BALL_SIZE;
  if (previousBottom <= brick.y || previousY >= brick.y + brick.height) return 'vertical';
  if (previousRight <= brick.x || previousX >= brick.x + brick.width) return 'horizontal';
  return 'vertical';
}

export function getBrickScore(brick) {
  if (brick.type === 'gold') return 30;
  if (brick.type === 'blue') return 20;
  return 10;
}

export function increaseBallSpeed(ball, level) {
  const maxSpeed = 8 + level * 0.3;
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed >= maxSpeed || speed === 0) return;
  const ratio = (speed + 0.12) / speed;
  ball.vx *= ratio;
  ball.vy *= ratio;
}

export function normalizeBallVelocity(ball) {
  const minVertical = 1.5;
  if (Math.abs(ball.vy) < minVertical) ball.vy = ball.vy >= 0 ? minVertical : -minVertical;
}
