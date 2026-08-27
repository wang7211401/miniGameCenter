// src/games/survival/components/VirtualJoystick.jsx
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

const SIZE = 130;
const RADIUS = 48;
const STICK_SIZE = 60;
const DEAD_ZONE = 0.12;

export default function VirtualJoystick({ onMove, onRelease }) {
  const [active, setActive] = useState(false);
  const stickOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastValueRef = useRef({ x: 0, y: 0 });
  const onMoveRef = useRef(onMove);
  const onReleaseRef = useRef(onRelease);

  useEffect(() => {
    onMoveRef.current = onMove;
    onReleaseRef.current = onRelease;
  }, [onMove, onRelease]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        setActive(true);
        stickOffset.stopAnimation();
        stickOffset.setValue({ x: 0, y: 0 });
        onMoveRef.current(0, 0);
        lastValueRef.current = { x: 0, y: 0 };
      },

      onPanResponderMove: (_, gestureState) => {
        let dx = gestureState.dx;
        let dy = gestureState.dy;
        const inputLength = Math.sqrt(dx * dx + dy * dy);

        if (inputLength > RADIUS) {
          dx = (dx / inputLength) * RADIUS;
          dy = (dy / inputLength) * RADIUS;
        }

        stickOffset.setValue({ x: dx, y: dy });

        const clampedLength = Math.sqrt(dx * dx + dy * dy);
        const rawMagnitude = Math.min(inputLength / RADIUS, 1);
        const magnitude = rawMagnitude <= DEAD_ZONE
          ? 0
          : (rawMagnitude - DEAD_ZONE) / (1 - DEAD_ZONE);
        const directionX = clampedLength === 0 ? 0 : dx / clampedLength;
        const directionY = clampedLength === 0 ? 0 : dy / clampedLength;
        const normX = directionX * magnitude;
        const normY = directionY * magnitude;

        const last = lastValueRef.current;
        if (Math.abs(normX - last.x) > 0.015 || Math.abs(normY - last.y) > 0.015) {
          onMoveRef.current(normX, normY);
          lastValueRef.current = { x: normX, y: normY };
        }
      },

      onPanResponderRelease: () => {
        setActive(false);
        Animated.spring(stickOffset, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          friction: 5,
          tension: 40,
        }).start();
        onReleaseRef.current?.();
        lastValueRef.current = { x: 0, y: 0 };
        onMoveRef.current(0, 0);
      },

      onPanResponderTerminate: () => {
        setActive(false);
        Animated.spring(stickOffset, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          friction: 5,
          tension: 40,
        }).start();
        onReleaseRef.current?.();
        onMoveRef.current(0, 0);
        lastValueRef.current = { x: 0, y: 0 };
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      stickOffset.stopAnimation();
    };
  }, [stickOffset]);

  return (
    <View {...responder.panHandlers} style={[styles.container, active && styles.active]}>
      <View style={styles.base} />
      <Animated.View
        style={[
          styles.stick,
          {
            transform: [
              { translateX: stickOffset.x },
              { translateY: stickOffset.y },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 25,
    left: 25,
    width: SIZE,
    height: SIZE,
    zIndex: 200,
  },
  active: {
    opacity: 1,
  },
  base: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  stick: {
    position: 'absolute',
    width: STICK_SIZE,
    height: STICK_SIZE,
    borderRadius: STICK_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    top: (SIZE - STICK_SIZE) / 2,
    left: (SIZE - STICK_SIZE) / 2,
  },
});