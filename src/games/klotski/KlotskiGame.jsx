// src/games/klotski/KlotskiGame.jsx
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { checkWin, getPiecesForLevel, movePiece, SIZES, TYPES } from './klotskiLogic';
import { levels } from './levels';

// 棋子颜色映射
const COLORS_MAP = {
    [TYPES.CAO_CAO]: '#e74c3c',
    [TYPES.GUAN_YU]: '#2ecc71',
    [TYPES.ZHAO_YUN]: '#3498db',
    [TYPES.MA_CHAO]: '#f39c12',
    [TYPES.HUANG_ZHONG]: '#9b59b6',
    [TYPES.ZHANG_FEI]: '#1abc9c',
    [TYPES.SOLDIER]: '#95a5a6',
};

const KlotskiGame = ({ levelId, onComplete }) => {
     const [pieces, setPieces] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [moves, setMoves] = useState(0);
    const [levelName, setLevelName] = useState('');

     // 加载关卡
    useEffect(() => {
        const level = levels.find(l => l.id === levelId);
        if (level) setLevelName(level.name);
        const initialPieces = getPiecesForLevel(levelId);
        setPieces(initialPieces);
        setSelectedId(null);
        setMoves(0);
    }, [levelId]);

    const handlePiecePress = (id) => {
        if (selectedId === id) {
            setSelectedId(null);
            return;
        }
        setSelectedId(id);
    };

    const handleDirectionPress = (dx, dy) => {
        if (!selectedId) return;
        const newPieces = movePiece(pieces, selectedId, dx, dy);
        if (newPieces) {
            setPieces(newPieces);
            setMoves(moves + 1);
            // setSelectedId(null);
            // 检查胜利
            if (checkWin(newPieces)) {
                Alert.alert(
                    '🎉 恭喜通关！',
                    `你用了 ${moves + 1} 步完成了“横刀立马”！`,
                    [{ text: '确定', onPress: () => onComplete && onComplete(3) }]
                );
            }
        } else {
            // 简单的无效移动提示
            // Alert.alert('无法移动', '该方向被阻挡或超出边界');
        }
    };

    const resetGame = () => {
        setPieces(getPiecesForLevel(levelId));
        setSelectedId(null);
        setMoves(0);
    };

    // 渲染单个棋子
    const renderPiece = (piece) => {
        const { id, type, x, y } = piece;
        const { w, h } = SIZES[type];
        const isSelected = selectedId === id;
        const color = COLORS_MAP[type] || '#ccc';
        const cellSize = 60; // 每个小格的大小
        const gap = 4;

        return (
            <TouchableOpacity
                key={id}
                style={[
                    styles.piece,
                    {
                        left: x * (cellSize + gap) + gap / 2,
                        top: y * (cellSize + gap) + gap / 2,
                        width: w * cellSize + (w - 1) * gap,
                        height: h * cellSize + (h - 1) * gap,
                        backgroundColor: color,
                        borderColor: isSelected ? '#fff' : 'transparent',
                        borderWidth: isSelected ? 3 : 0,
                    },
                ]}
                onPress={() => handlePiecePress(id)}
                activeOpacity={0.8}
            >
                <Text style={styles.pieceLabel}>
                    {type === TYPES.CAO_CAO ? '曹操' :
                     type === TYPES.GUAN_YU ? '关羽' :
                     type === TYPES.ZHAO_YUN ? '赵云' :
                     type === TYPES.MA_CHAO ? '马超' :
                     type === TYPES.HUANG_ZHONG ? '黄忠' :
                     type === TYPES.ZHANG_FEI ? '张飞' : '卒'}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{levelName || '华容道'}</Text>
                <Text style={styles.moves}>步数: {moves}</Text>
            </View>

            <View style={styles.boardWrapper}>
                <View style={styles.board}>
                    {/* 出口标记 */}
                    <View style={styles.exit} />
                    {pieces.map(renderPiece)}
                </View>
            </View>

            <View style={styles.controls}>
                <View style={styles.controlsRow}>
                    <TouchableOpacity style={styles.controlBtn} onPress={() => handleDirectionPress(0, -1)}>
                        <Text style={styles.controlText}>↑</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.controlsRow}>
                    <TouchableOpacity style={styles.controlBtn} onPress={() => handleDirectionPress(-1, 0)}>
                        <Text style={styles.controlText}>←</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.controlBtn, styles.resetBtn]} onPress={resetGame}>
                        <Text style={styles.controlText}>🔄</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlBtn} onPress={() => handleDirectionPress(1, 0)}>
                        <Text style={styles.controlText}>→</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.controlsRow}>
                    <TouchableOpacity style={styles.controlBtn} onPress={() => handleDirectionPress(0, 1)}>
                        <Text style={styles.controlText}>↓</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.hint}>提示：先点击选中棋子，再点方向移动</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        paddingTop: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    moves: {
        fontSize: 18,
        color: COLORS.textLight,
    },
    board: {
        width: 4 * 64 + 3 * 4, // 4 * (cellSize + gap) - gap
        height: 5 * 64 + 4 * 4,
        backgroundColor: '#8B7355',
        borderRadius: 8,
        padding: 4,
        position: 'relative',
    },
    boardWrapper: {
        width: '100%',
        alignItems: 'center',
        marginTop: SPACING.sm,
        marginBottom: SPACING.md,
    },
    piece: {
        position: 'absolute',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
    pieceLabel: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 1,
    },
    exit: {
        position: 'absolute',
        bottom: -2,
        left: '50%',
        marginLeft: -30,
        width: 60,
        height: 6,
        backgroundColor: '#f1c40f',
        borderRadius: 3,
        zIndex: -1,
    },
    controls: {
        marginTop: SPACING.lg,
        alignItems: 'center',
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    controlBtn: {
        width: 60,
        height: 60,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 4,
    },
    resetBtn: {
        backgroundColor: '#e67e22',
    },
    controlText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    hint: {
        marginTop: SPACING.md,
        color: COLORS.textLight,
        fontSize: 14,
    },
});

export default KlotskiGame;