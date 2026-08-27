// src/games/survival/data/upgrades.js

import {
  WEAPON_IDS,
} from './weapons';

export const UPGRADE_TYPES = {
  WEAPON: 'weapon',
  PASSIVE: 'passive',
};

export const UPGRADE_DEFINITIONS = [
  {
    id: 'upgrade-fireball',

    type: UPGRADE_TYPES.WEAPON,

    weaponId:
      WEAPON_IDS.FIREBALL,

    name: '火球强化',

    icon: '🔥',

    description:
      '强化火球攻击力和攻击速度',
  },

  {
    id: 'upgrade-lightning',

    type: UPGRADE_TYPES.WEAPON,

    weaponId:
      WEAPON_IDS.LIGHTNING,

    name: '雷电',

    icon: '⚡',

    description:
      '解锁或强化雷电攻击',
  },

  {
    id: 'upgrade-knife',

    type: UPGRADE_TYPES.WEAPON,

    weaponId:
      WEAPON_IDS.KNIFE,

    name: '飞刀',

    icon: '🗡️',

    description:
      '解锁或强化穿透飞刀',
  },

  {
    id: 'upgrade-bomb',

    type: UPGRADE_TYPES.WEAPON,

    weaponId:
      WEAPON_IDS.BOMB,

    name: '炸弹',

    icon: '💣',

    description:
      '解锁或强化范围爆炸',
  },

  {
    id: 'upgrade-damage',

    type: UPGRADE_TYPES.PASSIVE,

    name: '力量',

    icon: '⚔️',

    description:
      '所有武器伤害 +15%',
  },

  {
    id: 'upgrade-speed',

    type: UPGRADE_TYPES.PASSIVE,

    name: '疾跑',

    icon: '👟',

    description:
      '移动速度 +15%',
  },

  {
    id: 'upgrade-hp',

    type: UPGRADE_TYPES.PASSIVE,

    name: '生命强化',

    icon: '❤️',

    description:
      '最大生命值 +20，同时恢复生命',
  },

  {
    id: 'upgrade-magnet',

    type: UPGRADE_TYPES.PASSIVE,

    name: '磁力',

    icon: '🧲',

    description:
      '经验吸收范围 +60',
  },

  {
    id: 'upgrade-crit',

    type: UPGRADE_TYPES.PASSIVE,

    name: '暴击',

    icon: '🎯',

    description:
      '暴击率 +5%',
  },
];

/**
 * 随机选择升级
 */
export function getRandomUpgrades(
  count = 3
) {
  const list = [
    ...UPGRADE_DEFINITIONS,
  ];

  for (
    let i = list.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
          (i + 1)
      );

    [
      list[i],
      list[j],
    ] = [
      list[j],
      list[i],
    ];
  }

  return list.slice(
    0,
    count
  );
}