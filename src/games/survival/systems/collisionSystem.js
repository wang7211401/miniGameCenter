// src/games/survival/systems/collisionSystem.js

/**
 * 两点距离
 */
export function getDistance(
  a,
  b
) {
  const dx =
    a.x - b.x;

  const dy =
    a.y - b.y;

  return Math.sqrt(
    dx * dx +
      dy * dy
  );
}

/**
 * 圆形碰撞
 */
export function circleCollision(
  a,
  aRadius,
  b,
  bRadius
) {
  return (
    getDistance(a, b) <=
    aRadius + bRadius
  );
}

/**
 * 暴击判定
 */
export function rollCritical(
  chance = 0
) {
  return (
    Math.random() <
    Math.max(
      0,
      Math.min(1, chance)
    )
  );
}

/**
 * 计算伤害
 */
export function calculateDamage({
  baseDamage,
  critChance = 0,
  critMultiplier = 2,
}) {
  const critical =
    rollCritical(
      critChance
    );

  const damage = critical
    ? baseDamage *
      critMultiplier
    : baseDamage;

  return {
    damage: Math.max(
      1,
      Math.round(damage)
    ),

    critical,
  };
}

/**
 * 对敌人造成伤害
 */
export function damageEnemy(
  enemy,
  damageInfo
) {
  const hp =
    enemy.hp -
    damageInfo.damage;

  return {
    enemy: {
      ...enemy,

      hp: Math.max(
        0,
        hp
      ),
    },

    damage:
      damageInfo.damage,

    critical:
      damageInfo.critical,

    killed: hp <= 0,
  };
}

/**
 * 范围内敌人
 */
export function getEnemiesInRange(
  center,
  radius,
  enemies
) {
  return enemies.filter(
    (enemy) =>
      enemy.hp > 0 &&
      getDistance(
        center,
        enemy
      ) <= radius
  );
}

/**
 * 范围伤害
 */
export function applyAreaDamage({
  center,
  radius,
  enemies,
  damage,
  critChance = 0,
  critMultiplier = 2,
}) {
  const targets =
    getEnemiesInRange(
      center,
      radius,
      enemies
    );

  return targets.map(
    (enemy) => {
      const damageInfo =
        calculateDamage({
          baseDamage:
            damage,

          critChance,

          critMultiplier,
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

/**
 * 子弹碰撞
 */
export function checkProjectileCollision({
  projectile,
  enemies,
  projectileRadius = 6,
}) {
  for (
    const enemy of enemies
  ) {
    if (
      enemy.hp <= 0
    ) {
      continue;
    }

    if (
      projectile.hitEnemies?.includes(
        enemy.id
      )
    ) {
      continue;
    }

    const enemyRadius =
      enemy.radius ?? 15;

    if (
      circleCollision(
        projectile,
        projectileRadius,
        enemy,
        enemyRadius
      )
    ) {
      return enemy;
    }
  }

  return null;
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
 * 创建死亡奖励
 */
export function processEnemyDeath(
  enemy
) {
  return {
    enemyId: enemy.id,

    gem:
      createExpGem(
        enemy
      ),

    gold:
      enemy.gold ?? 0,
  };
}