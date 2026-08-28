// src/games/virus/systems.js
import {
    BULLET_SPEED,
    FIRE_LEVELS,
    FIRE_RATE,
    MAX_FIRE_LEVEL,
    POWERUP_DURATION,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    VIRUS_SPEED
} from './constants';
import { createBullet, createPowerup, createVirus } from './entities';

// 玩家移动（修复不跟手问题）
export const movePlayer = (entities, { touches }) => {
  const player = entities.player;
  if (!player) return entities;

  const touch = touches.find(t => t.type === 'move');
  if (touch) {
    const { locationX, locationY } = touch;
    
    player.x = locationX - player.w / 2;
    player.y = locationY - player.h / 2;

    // 边界约束
    player.x = Math.max(0, Math.min(SCREEN_WIDTH - player.w, player.x));
    player.y = Math.max(0, Math.min(SCREEN_HEIGHT - player.h, player.y));
  }
  return entities;
};

// 自动射击（保持不变）
export const fireBullets = (entities) => {
  const player = entities.player;
  if (!player) return entities;
  entities.fireFrame = (entities.fireFrame || 0) + 1;
  if (entities.fireFrame % FIRE_RATE !== 0) return entities;

  const level = player.fireLevel;
  const config = FIRE_LEVELS[level] || FIRE_LEVELS[1];
  const { bullets, spread, damage } = config;

  const centerX = player.x + player.w / 2;
  const centerY = player.y;

  for (let i = 0; i < bullets; i++) {
    let angleOffset = 0;
    if (bullets > 1) {
      angleOffset = (i / (bullets - 1) - 0.5) * spread * Math.PI / 180;
    }
    const vx = Math.sin(angleOffset) * BULLET_SPEED * 0.5;
    const vy = -Math.cos(angleOffset) * BULLET_SPEED;
    const bullet = createBullet(
      centerX - 4 + (i - (bullets-1)/2) * 4, 
      centerY, 
      vx, 
      vy, 
      damage
    );
    entities.bullets.push(bullet);
  }
  return entities;
};

// 更新子弹（保持不变）
export const updateBullets = (entities) => {
  const bullets = entities.bullets || [];
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx || 0;
    b.y += b.vy || 0;
    if (b.y < -10 || b.y > SCREEN_HEIGHT + 10 || b.x < -10 || b.x > SCREEN_WIDTH + 10) {
      bullets.splice(i, 1);
    }
  }
  return entities;
};

// 生成病毒（保持不变）
export const spawnVirus = (entities) => {
  entities.elapsedFrames = (entities.elapsedFrames || 0) + 1;
  entities.spawnFrame = (entities.spawnFrame || 0) + 1;
  const level = Math.floor(entities.elapsedFrames / 600) + 1;
  const spawnInterval = Math.max(18, 60 - (level - 1) * 4);
  if (entities.spawnFrame % spawnInterval === 0) {
    const spawnCount = 1 + Math.floor((level - 1) / 3);
    for (let i = 0; i < spawnCount; i++) {
      const size = 30 + Math.min(level - 1, 10) * 3;
      const x = Math.random() * Math.max(1, SCREEN_WIDTH - size);
      const y = -size;
      const virus = createVirus(x, y, level);
      entities.viruses.push(virus);
    }
  }
  return entities;
};

// 更新病毒（保持不变）
export const updateViruses = (entities) => {
  const viruses = entities.viruses || [];
  for (let i = viruses.length - 1; i >= 0; i--) {
    const v = viruses[i];
    v.y += v.speed || VIRUS_SPEED;
    if (v.y > SCREEN_HEIGHT + 20) {
      viruses.splice(i, 1);
    }
  }
  return entities;
};

// 碰撞检测：子弹 vs 病毒（增加分数逻辑）
export const handleCollisions = (entities) => {
  const { bullets, viruses, player } = entities;
  if (!bullets || !viruses) return entities;

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    for (let j = viruses.length - 1; j >= 0; j--) {
      const virus = viruses[j];
      if (bullet.x < virus.x + virus.w &&
          bullet.x + bullet.w > virus.x &&
          bullet.y < virus.y + virus.h &&
          bullet.y + bullet.h > virus.y) {
        virus.hp -= bullet.damage;
        bullets.splice(i, 1);
        if (virus.hp <= 0) {
          viruses.splice(j, 1);
          
          // 修复积分不更新的问题：消灭病毒时增加分数
          entities.score = (entities.score || 0) + (virus.scoreValue || 10);

          if (Math.random() < 0.15) {
            const powerup = createPowerup(virus.x, virus.y, 'fire');
            entities.powerups.push(powerup);
          }
        }
        break;
      }
    }
  }
  return entities;
};

// 玩家与病毒碰撞（保持不变）
export const checkPlayerHit = (entities) => {
  const { player, viruses } = entities;
  if (!player) return entities;
  for (let v of viruses) {
    if (player.x < v.x + v.w &&
        player.x + player.w > v.x &&
        player.y < v.y + v.h &&
        player.y + player.h > v.y) {
      entities.gameOver = true;
      break;
    }
  }
  return entities;
};

// 拾取道具（保持不变）
export const collectPowerups = (entities) => {
  const { player, powerups } = entities;
  if (!player || !powerups) return entities;
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    if (player.x < p.x + p.w &&
        player.x + player.w > p.x &&
        player.y < p.y + p.h &&
        player.y + player.h > p.y) {
      if (p.powerupType === 'fire') {
        player.fireLevel = Math.min(player.fireLevel + 1, MAX_FIRE_LEVEL);
        player.powerupTimer = POWERUP_DURATION;
      } else if (p.powerupType === 'bomb') {
        activateBomb(entities);
      }
      powerups.splice(i, 1);
    }
  }
  return entities;
};

const activateBomb = (entities) => {
  const { viruses, bullets } = entities;
  viruses.length = 0;
  bullets.length = 0;
};

export const updatePowerups = (entities) => {
  const powerups = entities.powerups || [];
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += 1;
    if (p.y > SCREEN_HEIGHT + 20) {
      powerups.splice(i, 1);
    }
  }
  return entities;
};

export const updatePowerupTimer = (entities) => {
  const player = entities.player;
  if (!player) return entities;
  if (player.powerupTimer > 0) {
    player.powerupTimer--;
    if (player.powerupTimer === 0) {
      player.fireLevel = Math.max(1, player.fireLevel - 1);
    }
  }
  return entities;
};