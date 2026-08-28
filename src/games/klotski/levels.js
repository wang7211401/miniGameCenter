// src/games/klotski/levels.js
import { TYPES } from './klotskiLogic';

// 关卡列表（用于显示名称和选择）
export const levels = [
    { id: 1, name: '横刀立马' },
    { id: 2, name: '指挥若定' },
    { id: 3, name: '兵分三路' },
    { id: 4, name: '屯兵东路' },
    { id: 5, name: '将拥曹营' },
];

// 各关卡的棋子初始布局（坐标 x:列, y:行，从 0 开始）
export const levelConfigs = {
    1: [ // 横刀立马
        { id: 'caocao', type: TYPES.CAO_CAO, x: 1, y: 0 },
        { id: 'guanyu', type: TYPES.GUAN_YU, x: 1, y: 2 },
        { id: 'zhangfei', type: TYPES.ZHANG_FEI, x: 0, y: 0 },
        { id: 'zhaoyun', type: TYPES.ZHAO_YUN, x: 3, y: 0 },
        { id: 'machao', type: TYPES.MA_CHAO, x: 0, y: 2 },
        { id: 'huangzhong', type: TYPES.HUANG_ZHONG, x: 3, y: 2 },
        { id: 'soldier1', type: TYPES.SOLDIER, x: 0, y: 4 },
        { id: 'soldier2', type: TYPES.SOLDIER, x: 1, y: 4 },
        { id: 'soldier3', type: TYPES.SOLDIER, x: 2, y: 4 },
        { id: 'soldier4', type: TYPES.SOLDIER, x: 3, y: 4 },
    ],
    2: [ // 指挥若定
        { id: 'caocao', type: TYPES.CAO_CAO, x: 1, y: 0 },
        { id: 'guanyu', type: TYPES.GUAN_YU, x: 0, y: 2 },
        { id: 'zhangfei', type: TYPES.ZHANG_FEI, x: 3, y: 0 },
        { id: 'zhaoyun', type: TYPES.ZHAO_YUN, x: 0, y: 0 },
        { id: 'machao', type: TYPES.MA_CHAO, x: 1, y: 3 },
        { id: 'huangzhong', type: TYPES.HUANG_ZHONG, x: 2, y: 3 },
        { id: 'soldier1', type: TYPES.SOLDIER, x: 0, y: 4 },
        { id: 'soldier2', type: TYPES.SOLDIER, x: 3, y: 3 },
        { id: 'soldier3', type: TYPES.SOLDIER, x: 0, y: 3 },
        { id: 'soldier4', type: TYPES.SOLDIER, x: 3, y: 4 },
    ],
    3: [ // 兵分三路
        { id: 'caocao', type: TYPES.CAO_CAO, x: 1, y: 1 },
        { id: 'guanyu', type: TYPES.GUAN_YU, x: 1, y: 3 },
        { id: 'zhangfei', type: TYPES.ZHANG_FEI, x: 0, y: 0 },
        { id: 'zhaoyun', type: TYPES.ZHAO_YUN, x: 3, y: 0 },
        { id: 'machao', type: TYPES.MA_CHAO, x: 0, y: 2 },
        { id: 'huangzhong', type: TYPES.HUANG_ZHONG, x: 3, y: 2 },
        { id: 'soldier1', type: TYPES.SOLDIER, x: 0, y: 4 },
        { id: 'soldier2', type: TYPES.SOLDIER, x: 2, y: 4 },
        { id: 'soldier3', type: TYPES.SOLDIER, x: 3, y: 4 },
        { id: 'soldier4', type: TYPES.SOLDIER, x: 1, y: 4 },
    ],
    4: [ // 屯兵东路
        { id: 'caocao', type: TYPES.CAO_CAO, x: 1, y: 0 },
        { id: 'guanyu', type: TYPES.GUAN_YU, x: 0, y: 2 },
        { id: 'zhangfei', type: TYPES.ZHANG_FEI, x: 3, y: 0 },
        { id: 'zhaoyun', type: TYPES.ZHAO_YUN, x: 0, y: 0 },
        { id: 'machao', type: TYPES.MA_CHAO, x: 2, y: 2 },
        { id: 'huangzhong', type: TYPES.HUANG_ZHONG, x: 3, y: 2 },
        { id: 'soldier1', type: TYPES.SOLDIER, x: 0, y: 4 },
        { id: 'soldier2', type: TYPES.SOLDIER, x: 1, y: 4 },
        { id: 'soldier3', type: TYPES.SOLDIER, x: 2, y: 4 },
        { id: 'soldier4', type: TYPES.SOLDIER, x: 3, y: 4 },
    ],
    5: [ // 将拥曹营
        { id: 'caocao', type: TYPES.CAO_CAO, x: 1, y: 0 },
        { id: 'guanyu', type: TYPES.GUAN_YU, x: 1, y: 2 },
        { id: 'zhangfei', type: TYPES.ZHANG_FEI, x: 0, y: 0 },
        { id: 'zhaoyun', type: TYPES.ZHAO_YUN, x: 3, y: 0 },
        { id: 'machao', type: TYPES.MA_CHAO, x: 0, y: 3 },
        { id: 'huangzhong', type: TYPES.HUANG_ZHONG, x: 3, y: 2 },
        { id: 'soldier1', type: TYPES.SOLDIER, x: 0, y: 2 },
        { id: 'soldier2', type: TYPES.SOLDIER, x: 1, y: 4 },
        { id: 'soldier3', type: TYPES.SOLDIER, x: 2, y: 4 },
        { id: 'soldier4', type: TYPES.SOLDIER, x: 3, y: 4 },
    ],
};