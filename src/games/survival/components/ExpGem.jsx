// src/games/survival/components/ExpGem.jsx


import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ExpGem({
  gem,
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left:
            gem.x - 10,

          top:
            gem.y - 10,
        },
      ]}
    >
      <Text
        style={styles.gem}
      >
        💎
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      position:
        'absolute',

      width: 20,

      height: 20,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    gem: {
      fontSize: 16,
    },
  });