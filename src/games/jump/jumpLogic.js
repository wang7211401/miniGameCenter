// src/games/jump/jumpLogic.js

export const GAME_WIDTH = 360;
export const PLAYER_SIZE = 30;

export const PLATFORM_WIDTH = 72;
export const PLATFORM_HEIGHT = 14;

// 玩家物理参数
export const GRAVITY = 0.55;
export const JUMP_POWER = 11.5;

// 蓄力
export const MIN_POWER = 6;
export const MAX_POWER = 17;
export const CHARGE_SPEED = 0.16;

// 初始平台
export const createStartPlatform = () => ({
  id: 'platform-0',
  x: 145,
  y: 520,
  width: PLATFORM_WIDTH,
  height: PLATFORM_HEIGHT,
  type: 'normal',
});

// 生成随机平台
export function createPlatform(id, previous, difficulty = 0) {
  const maxDistance = Math.min(150, 95 + difficulty * 3);
  const minDistance = 65;

  const distance =
    minDistance + Math.random() * (maxDistance - minDistance);

  // 控制平台水平位置
  const maxX = GAME_WIDTH - PLATFORM_WIDTH - 20;

  const direction = Math.random() > 0.5 ? 1 : -1;

  let x =
    previous.x +
    direction * (30 + Math.random() * 80);

  // 防止超出屏幕
  x = Math.max(15, Math.min(maxX, x));

  // 特殊平台概率
  let type = 'normal';

  const random = Math.random();

  if (random < 0.08) {
    type = 'bonus';
  } else if (random < 0.14) {
    type = 'spring';
  }

  return {
    id,
    x,
    y: previous.y - distance,
    width: PLATFORM_WIDTH,
    height: PLATFORM_HEIGHT,
    type,
  };
}

// 创建一组平台
export function createInitialPlatforms(count = 12) {
  const platforms = [createStartPlatform()];

  for (let i = 1; i < count; i++) {
    const previous = platforms[i - 1];

    platforms.push(
      createPlatform(
        `platform-${i}`,
        previous,
        i
      )
    );
  }

  return platforms;
}

// 检查玩家是否落到平台
export function checkLanding(player, platform, previousY) {
  const playerBottom = player.y + PLAYER_SIZE;

  const platformTop = platform.y;

  // 玩家必须正在向下运动
  if (player.vy < 0) {
    return false;
  }

  // 玩家脚部必须穿过平台顶部
  const crossed =
    previousY + PLAYER_SIZE <= platformTop &&
    playerBottom >= platformTop;

  if (!crossed) {
    return false;
  }

  // X 轴碰撞
  const playerLeft = player.x;
  const playerRight = player.x + PLAYER_SIZE;

  const platformLeft = platform.x;
  const platformRight = platform.x + platform.width;

  return (
    playerRight > platformLeft &&
    playerLeft < platformRight
  );
}

// 计算落点中心距离
export function getLandingScore(player, platform) {
  const playerCenter = player.x + PLAYER_SIZE / 2;
  const platformCenter = platform.x + platform.width / 2;

  const distance = Math.abs(
    playerCenter - platformCenter
  );

  const ratio = Math.max(
    0,
    1 - distance / (platform.width / 2)
  );

  if (ratio > 0.85) {
    return {
      score: 3,
      perfect: true,
    };
  }

  if (ratio > 0.45) {
    return {
      score: 2,
      perfect: false,
    };
  }

  return {
    score: 1,
    perfect: false,
  };
}

// 蓄力对应跳跃速度
export function getJumpVelocity(power) {
  return -(JUMP_POWER + power * 0.42);
}

// 根据分数计算难度
export function getDifficulty(score) {
  return Math.floor(score / 10);
}