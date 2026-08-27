// src/games/survival/components/WeaponBar.jsx


import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function WeaponBar({
  weapons = [],
}) {
  return (
    <View
      style={styles.container}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {weapons.map(
          (weapon) => (
            <View
              key={
                weapon.id
              }
              style={
                styles.weapon
              }
            >
              <Text
                style={
                  styles.icon
                }
              >
                {
                  weapon.icon
                }
              </Text>

              <Text
                style={
                  styles.level
                }
              >
                Lv.
                {
                  weapon.level
                }
              </Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      position:
        'absolute',

      top: 70,

      right: 8,

      right: 8,

      zIndex: 100,
    },

    content: {
      gap: 6,
    },

    weapon: {
      width: 48,

      height: 48,

      borderRadius: 10,

      backgroundColor:
        'rgba(0,0,0,0.65)',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        'rgba(255,255,255,0.2)',
    },

    icon: {
      fontSize: 24,
    },

    level: {
      color: '#fff',

      fontSize: 9,

      fontWeight:
        'bold',
    },
  });