// src/games/survival/components/Player.jsx

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function Player({
  x,
  y,
  size = 40,
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
        },
      ]}
    >
      <Text
        style={[
          styles.player,
          {
            fontSize:
              size,
          },
        ]}
      >
        🧙
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

    player: {
      textAlign:
        'center',
    },
  });