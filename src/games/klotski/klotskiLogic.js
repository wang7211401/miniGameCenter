// src/games/klotski/klotskiLogic.js
import { levelConfigs } from './levels';
// 棋子类型
export const TYPES = {
    CAO_CAO: 'caocao',   // 2x2
    GUAN_YU: 'guanyu',   // 2x1 (横)
    ZHAO_YUN: 'zhaoyun', // 1x2 (竖)
    MA_CHAO: 'machao',   // 1x2 (竖)
    HUANG_ZHONG: 'huangzhong', // 1x2 (竖)
    ZHANG_FEI: 'zhangfei', // 1x2 (竖)
    SOLDIER: 'soldier',  // 1x1
};

// 棋子大小映射
export const SIZES = {
    [TYPES.CAO_CAO]: { w: 2, h: 2 },
    [TYPES.GUAN_YU]: { w: 2, h: 1 },
    [TYPES.ZHAO_YUN]: { w: 1, h: 2 },
    [TYPES.MA_CHAO]: { w: 1, h: 2 },
    [TYPES.HUANG_ZHONG]: { w: 1, h: 2 },
    [TYPES.ZHANG_FEI]: { w: 1, h: 2 },
    [TYPES.SOLDIER]: { w: 1, h: 1 },
};

export const getPiecesForLevel = (levelId) => {
    const config = levelConfigs[levelId];
    if (!config) {
        // 默认返回第一关（横刀立马）
        return levelConfigs[1] || [];
    }
    // 深拷贝避免修改原配置
    return config.map(piece => ({ ...piece }));
};

// 定义“横刀立马”布局
export const getInitialPieces = () => [
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
];

// 检查某个棋子能否向某方向移动
export const canMove = (pieces, pieceId, dx, dy) => {
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece) return false;

    const { x, y, type } = piece;
    const { w, h } = SIZES[type];
    const newX = x + dx;
    const newY = y + dy;

    // 边界检查
    if (newX < 0 || newX + w > 4) return false;
    if (newY < 0 || newY + h > 5) return false;

    // 碰撞检查
    for (let other of pieces) {
        if (other.id === pieceId) continue;
        const { x: ox, y: oy, type: oType } = other;
        const { w: ow, h: oh } = SIZES[oType];
        // 检查两个矩形是否重叠
        if (newX < ox + ow && newX + w > ox &&
            newY < oy + oh && newY + h > oy) {
            return false;
        }
    }
    return true;
};

// 执行移动，返回新的棋子数组
export const movePiece = (pieces, pieceId, dx, dy) => {
    if (!canMove(pieces, pieceId, dx, dy)) return null;
    return pieces.map(p => {
        if (p.id === pieceId) {
            return { ...p, x: p.x + dx, y: p.y + dy };
        }
        return p;
    });
};

// 检查是否获胜（曹操到达底部出口）
export const checkWin = (pieces) => {
    const cao = pieces.find(p => p.type === TYPES.CAO_CAO);
    if (!cao) return false;
    // 曹操的左上角在 (1, 3) 且大小为 2x2 时，即到达底部中央
    return cao.x === 1 && cao.y === 3;
};