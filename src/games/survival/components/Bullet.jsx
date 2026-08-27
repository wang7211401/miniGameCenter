// src/games/survival/components/Bullet.jsx


import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

const BULLET_CONFIG = {
  fireball: {
    icon: '🔥',
    size: 22,
  },

  knife: {
    icon: '🗡️',
    size: 24,
  },

  bomb: {
    icon: '💣',
    size: 25,
  },
};

export default function Bullet({
  bullet,
}) {
  const config =
    BULLET_CONFIG[
      bullet.weaponId
    ] ?? {
      icon: '•',
      size: 12,
    };

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left:
            bullet.x -
            config.size / 2,

          top:
            bullet.y -
            config.size / 2,

          width:
            config.size,

          height:
            config.size,
        },
      ]}
    >
      <Text
        style={{
          fontSize:
            config.size,
        }}
      >
        {config.icon}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      position:
        'absolute',

      alignItems:
        'center',

      justifyContent:
        'center',
    },
  });