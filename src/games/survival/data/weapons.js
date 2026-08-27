// src/games/survival/data/weapons.js

export const WEAPON_IDS = {
  FIREBALL: 'fireball',
  LIGHTNING: 'lightning',
  KNIFE: 'knife',
  BOMB: 'bomb',
};

export const WEAPON_DEFINITIONS = {
  [WEAPON_IDS.FIREBALL]: {
    id: WEAPON_IDS.FIREBALL,

    name: '火球',
    icon: '🔥',

    description: '自动发射火球攻击最近的敌人',

    damage: 20,

    cooldownTime: 900,

    speed: 420,

    range: 600,

    projectileCount: 1,

    piercing: 0,

    area: 0,

    critChance: 0.08,

    critMultiplier: 2,

    maxLevel: 5,
  },

  [WEAPON_IDS.LIGHTNING]: {
    id: WEAPON_IDS.LIGHTNING,

    name: '雷电',
    icon: '⚡',

    description: '召唤雷电同时攻击附近多个敌人',

    damage: 28,

    cooldownTime: 1400,

    speed: 0,

    range: 320,

    projectileCount: 3,

    piercing: 0,

    area: 0,

    critChance: 0.12,

    critMultiplier: 2,

    maxLevel: 5,
  },

  [WEAPON_IDS.KNIFE]: {
    id: WEAPON_IDS.KNIFE,

    name: '飞刀',
    icon: '🗡️',

    description: '快速投掷飞刀，可以穿透敌人',

    damage: 15,

    cooldownTime: 500,

    speed: 700,

    range: 650,

    projectileCount: 1,

    piercing: 2,

    area: 0,

    critChance: 0.1,

    critMultiplier: 2,

    maxLevel: 5,
  },

  [WEAPON_IDS.BOMB]: {
    id: WEAPON_IDS.BOMB,

    name: '炸弹',
    icon: '💣',

    description: '投掷炸弹，命中后造成范围伤害',

    damage: 35,

    cooldownTime: 1800,

    speed: 260,

    range: 500,

    projectileCount: 1,

    piercing: 0,

    area: 90,

    critChance: 0.1,

    critMultiplier: 2,

    maxLevel: 5,
  },
};

/**
 * 创建玩家武器
 */
export function createWeapon(
  weaponId,
  level = 1
) {
  const definition =
    WEAPON_DEFINITIONS[weaponId];

  if (!definition) {
    return null;
  }

  const levelMultiplier =
    1 + (level - 1) * 0.35;

  return {
    ...definition,

    level,

    damage: Math.round(
      definition.damage *
        levelMultiplier
    ),

    cooldown: 0,

    cooldownTime:
      Math.max(
        250,
        definition.cooldownTime -
          (level - 1) * 80
      ),

    projectileCount:
      definition.projectileCount +
      Math.floor(
        (level - 1) / 3
      ),

    piercing:
      definition.piercing +
      Math.floor(
        (level - 1) / 2
      ),

    area:
      definition.area > 0
        ? definition.area +
          (level - 1) * 15
        : 0,

    critChance:
      definition.critChance +
      (level - 1) * 0.02,

    critMultiplier:
      definition.critMultiplier +
      (level - 1) * 0.15,
  };
}

/**
 * 升级已有武器
 */
export function upgradeWeapon(
  weapon
) {
  const nextLevel =
    weapon.level + 1;

  return createWeapon(
    weapon.id,
    nextLevel
  );
}