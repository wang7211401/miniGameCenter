// src/games/survival/systems/weaponSystem.js

import {
  calculateDamage,
  damageEnemy,
  getDistance,
  getEnemiesInRange,
} from './collisionSystem';

/**
 * 找最近敌人
 */
export function findNearestEnemy(
  player,
  enemies,
  range = Infinity
) {
  let target = null;

  let minDistance =
    range;

  for (
    const enemy of enemies
  ) {
    if (
      enemy.hp <= 0
    ) {
      continue;
    }

    const distance =
      getDistance(
        player,
        enemy
      );

    if (
      distance <
      minDistance
    ) {
      minDistance =
        distance;

      target = enemy;
    }
  }

  return target;
}

/**
 * 找范围内多个敌人
 */
export function findEnemiesInRangeSorted(
  player,
  enemies,
  range,
  count = Infinity
) {
  return enemies
    .filter(
      (enemy) =>
        enemy.hp > 0 &&
        getDistance(
          player,
          enemy
        ) <= range
    )
    .sort(
      (a, b) =>
        getDistance(
          player,
          a
        ) -
        getDistance(
          player,
          b
        )
    )
    .slice(
      0,
      count
    );
}

/**
 * 创建子弹
 */
export function createProjectile({
  player,
  target,
  weapon,
  angleOffset = 0,
}) {
  const dx =
    target.x -
    player.x;

  const dy =
    target.y -
    player.y;

  const angle =
    Math.atan2(
      dy,
      dx
    ) + angleOffset;

  const speed =
    weapon.speed ?? 400;

  return {
    id:
      `bullet-${Date.now()}-${Math.random()}`,

    x: player.x,

    y: player.y,

    vx:
      Math.cos(angle) *
      speed,

    vy:
      Math.sin(angle) *
      speed,

    damage:
      weapon.damage *
      (player.damageMultiplier ?? 1),

    weaponId:
      weapon.id,

    life:
      weapon.life ?? 1800,

    piercing:
      weapon.piercing ?? 0,

    area:
      weapon.area ?? 0,

    critChance:
      weapon.critChance ??
      player.critChance ??
      0.05,

    critMultiplier:
      weapon.critMultiplier ??
      player.critMultiplier ??
      2,

    hitEnemies: [],
  };
}

/**
 * 创建多发子弹
 */
export function createProjectiles({
  player,
  target,
  weapon,
}) {
  const count =
    weapon.projectileCount ??
    1;

  if (
    count <= 1
  ) {
    return [
      createProjectile({
        player,
        target,
        weapon,
      }),
    ];
  }

  const result = [];

  const spread =
    Math.PI / 9;

  for (
    let i = 0;
    i < count;
    i++
  ) {
    const angleOffset =
      (i -
        (count - 1) / 2) *
      spread;

    result.push(
      createProjectile({
        player,
        target,
        weapon,
        angleOffset,
      })
    );
  }

  return result;
}

/**
 * 更新子弹
 */
export function updateProjectile(
  projectile,
  delta
) {
  const dt =
    delta / 1000;

  return {
    ...projectile,

    x:
      projectile.x +
      projectile.vx *
        dt,

    y:
      projectile.y +
      projectile.vy *
        dt,

    life:
      projectile.life -
      delta,
  };
}

/**
 * 更新武器冷却
 */
export function updateWeaponCooldown(
  weapon,
  delta
) {
  return {
    ...weapon,

    cooldown:
      Math.max(
        0,
        (weapon.cooldown ??
          0) - delta
      ),
  };
}

/**
 * 发射远程武器
 */
export function fireProjectileWeapon({
  player,
  enemies,
  weapon,
}) {
  if (
    weapon.cooldown >
    0
  ) {
    return {
      projectiles: [],
      weapon,
    };
  }

  const target =
    findNearestEnemy(
      player,
      enemies,
      weapon.range ??
        Infinity
    );

  if (!target) {
    return {
      projectiles: [],
      weapon,
    };
  }

  const projectiles =
    createProjectiles({
      player,
      target,
      weapon,
    });

  return {
    projectiles,

    weapon: {
      ...weapon,

      cooldown:
        weapon.cooldownTime ??
        1000,
    },
  };
}

/**
 * 雷电
 */
export function castLightning({
  player,
  enemies,
  weapon,
}) {
  if (
    weapon.cooldown >
    0
  ) {
    return {
      results: [],
      weapon,
    };
  }

  const targets =
    findEnemiesInRangeSorted(
      player,
      enemies,
      weapon.range ??
        300,

      weapon.projectileCount ??
        1
    );

  if (
    targets.length === 0
  ) {
    return {
      results: [],
      weapon,
    };
  }

  const results = [];

  for (
    const enemy of targets
  ) {
    const damageInfo =
      calculateDamage({
        baseDamage:
          weapon.damage,

        critChance:
          weapon.critChance ??
          player.critChance,

        critMultiplier:
          weapon.critMultiplier ??
          player.critMultiplier,
      });

    const result =
      damageEnemy(
        enemy,
        damageInfo
      );

    results.push({
      enemyId:
        enemy.id,

      enemy:
        result.enemy,

      damage:
        result.damage,

      critical:
        result.critical,

      killed:
        result.killed,
    });
  }

  return {
    results,

    weapon: {
      ...weapon,

      cooldown:
        weapon.cooldownTime ??
        1000,
    },
  };
}

/**
 * 炸弹爆炸
 */
export function explodeBomb({
  projectile,
  enemies,
  player,
}) {
  return getEnemiesInRange(
    projectile,
    projectile.area ??
      80,
    enemies
  ).map(
    (enemy) => {
      const damageInfo =
        calculateDamage({
          baseDamage:
            projectile.damage,

          critChance:
            projectile.critChance ??
            player.critChance,

          critMultiplier:
            projectile.critMultiplier ??
            player.critMultiplier,
        });

      const result =
        damageEnemy(
          enemy,
          damageInfo
        );

      return {
        enemyId:
          enemy.id,

        enemy:
          result.enemy,

        damage:
          result.damage,

        critical:
          result.critical,

        killed:
          result.killed,
      };
    }
  );
}