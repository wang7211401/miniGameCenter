// src/games/survival/components/GameHUD.jsx


import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import WeaponBar from './WeaponBar';

export default function GameHUD({
  player,
  gameTime,
}) {
  const progress =
    player.expToNext > 0
      ? player.exp /
        player.expToNext
      : 0;

  const minutes =
    Math.floor(
      gameTime / 60
    );

  const seconds =
    Math.floor(
      gameTime % 60
    );

  const timeText =
    `${String(
      minutes
    ).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;

  return (
    <>
      <WeaponBar
        weapons={
          player.weapons
        }
      />

      <View
        style={styles.hud}
      >
        <View
          style={
            styles.levelContainer
          }
        >
          <Text
            style={styles.level}
          >
            LV.
            {player.level}
          </Text>

          <View
            style={
              styles.expBackground
            }
          >
            <View
              style={[
                styles.exp,
                {
                  width:
                    `${Math.min(
                      1,
                      progress
                    ) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        <View
          style={styles.hpBox}
        >
          <Text
            style={styles.hpText}
          >
            ❤️{' '}
            {Math.ceil(
              player.hp
            )}
            /
            {player.maxHp}
          </Text>
        </View>

        <Text
          style={styles.time}
        >
          {timeText}
        </Text>
      </View>
    </>
  );
}

const styles =
  StyleSheet.create({
    hud: {
      position:
        'absolute',

      top: 62,

      left: 10,

      right: 10,

      zIndex: 90,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    levelContainer: {
      flex: 1,

      marginRight: 10,
    },

    level: {
      color: '#fff',

      fontSize: 15,

      fontWeight:
        'bold',

      marginBottom: 4,
    },

    expBackground: {
      height: 8,

      backgroundColor:
        'rgba(0,0,0,0.6)',

      borderRadius: 5,

      overflow: 'hidden',
    },

    exp: {
      height: '100%',

      backgroundColor:
        '#36cfff',
    },

    hpBox: {
      paddingHorizontal: 10,

      paddingVertical: 5,

      backgroundColor:
        'rgba(0,0,0,0.65)',

      borderRadius: 10,
    },

    hpText: {
      color: '#fff',

      fontWeight:
        'bold',

      fontSize: 13,
    },

    time: {
      marginLeft: 10,

      color: '#fff',

      fontSize: 16,

      fontWeight:
        'bold',

      backgroundColor:
        'rgba(0,0,0,0.65)',

      paddingHorizontal: 8,

      paddingVertical: 5,

      borderRadius: 8,
    },
  });