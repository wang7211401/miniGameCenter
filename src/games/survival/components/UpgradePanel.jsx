// src/games/survival/components/UpgradePanel.jsx


import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function UpgradePanel({
  upgrades = [],
  onChoose,
}) {
  return (
    <View
      style={styles.overlay}
    >
      <View
        style={styles.panel}
      >
        <Text
          style={
            styles.title
          }
        >
          🎉 升级！
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          选择一个强化
        </Text>

        <View
          style={
            styles.list
          }
        >
          {upgrades.map(
            (upgrade) => (
              <Pressable
                key={
                  upgrade.id
                }
                style={({ pressed }) => [
                  styles.card,

                  pressed &&
                    styles.pressed,
                ]}
                onPress={() =>
                  onChoose(
                    upgrade
                  )
                }
              >
                <Text
                  style={
                    styles.icon
                  }
                >
                  {
                    upgrade.icon
                  }
                </Text>

                <Text
                  style={
                    styles.name
                  }
                >
                  {
                    upgrade.name
                  }
                </Text>

                <Text
                  style={
                    styles.description
                  }
                >
                  {
                    upgrade.description
                  }
                </Text>
              </Pressable>
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    overlay: {
      position:
        'absolute',

      top: 0,

      left: 0,

      right: 0,

      bottom: 0,

      zIndex: 500,

      backgroundColor:
        'rgba(0,0,0,0.78)',

      alignItems:
        'center',

      justifyContent:
        'center',

      padding: 20,
    },

    panel: {
      width: '100%',

      maxWidth: 500,

      backgroundColor:
        '#1c1c28',

      borderRadius: 20,

      padding: 20,
    },

    title: {
      color: '#fff',

      fontSize: 30,

      fontWeight:
        'bold',

      textAlign:
        'center',
    },

    subtitle: {
      color:
        '#aaa',

      fontSize: 15,

      textAlign:
        'center',

      marginTop: 5,

      marginBottom: 18,
    },

    list: {
      gap: 12,
    },

    card: {
      minHeight: 90,

      borderRadius: 14,

      backgroundColor:
        '#29293a',

      borderWidth: 1,

      borderColor:
        '#44445c',

      padding: 12,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    pressed: {
      opacity: 0.7,

      transform: [
        {
          scale: 0.98,
        },
      ],
    },

    icon: {
      fontSize: 35,

      width: 55,

      textAlign:
        'center',
    },

    name: {
      color: '#fff',

      fontSize: 18,

      fontWeight:
        'bold',

      marginBottom: 4,
    },

    description: {
      color:
        '#aaa',

      fontSize: 12,

      flex: 1,
    },
  });