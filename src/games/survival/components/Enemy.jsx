// src/games/survival/components/Enemy.jsx


import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function Enemy({
  enemy,
}) {
  const size =
    enemy.type === 'tank'
      ? 42
      : 30;

  const hpPercent =
    enemy.maxHp > 0
      ? Math.max(
          0,
          enemy.hp /
            enemy.maxHp
        )
      : 0;

  let icon = '👾';

  if (
    enemy.type === 'tank'
  ) {
    icon = '👹';
  } else if (
    enemy.type === 'fast'
  ) {
    icon = '🦇';
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left:
            enemy.x -
            size / 2,

          top:
            enemy.y -
            size / 2,

          width: size,
          height: size,
        },
      ]}
    >
      {/* 血条 */}

      <View
        style={styles.hpBackground}
      >
        <View
          style={[
            styles.hp,
            {
              width:
                `${hpPercent * 100}%`,
            },
          ]}
        />
      </View>

      <Text
        style={[
          styles.enemy,
          {
            fontSize:
              size,
          },
        ]}
      >
        {icon}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      position: 'absolute',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    hpBackground: {
      position:
        'absolute',

      top: -7,

      width: 34,

      height: 4,

      backgroundColor:
        '#333',

      borderRadius: 2,

      overflow: 'hidden',
    },

    hp: {
      height: '100%',

      backgroundColor:
        '#35d04f',
    },

    enemy: {
      textAlign:
        'center',
    },
  });