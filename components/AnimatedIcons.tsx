import React, { useEffect } from 'react';
import { View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import Svg, { Line, G, Ellipse } from 'react-native-svg';
import Reanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing, 
  useAnimatedProps 
} from 'react-native-reanimated';

export function AnimatedMapPin({ color, size }: { color: string; size: number }) {
  const jump = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      jump.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 250, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 250, easing: Easing.in(Easing.quad) }),
          withTiming(-2, { duration: 200, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 2100 }) // Pause for the remainder of the 3s loop
        ),
        -1, // Infinite
        false // Do not reverse
      );
    }, 500); // Slight offset
    
    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: jump.value }],
    };
  });

  return (
    <Reanimated.View style={animatedStyle}>
      <MapPin color={color} size={size} />
    </Reanimated.View>
  );
}

const AnimatedEllipse = Reanimated.createAnimatedComponent(Ellipse);

export const AnimatedSearchIcon = React.forwardRef(({ color, size, autoSpin }: { color: string; size: number, autoSpin?: boolean }, ref) => {
  const rotation = useSharedValue(0);
  const targetRotation = React.useRef(0);

  React.useImperativeHandle(ref, () => ({
    spin: () => {
      targetRotation.current += 180;
      rotation.value = withTiming(targetRotation.current, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }
  }));

  useEffect(() => {
    if (!autoSpin) return;
    rotation.value = withRepeat(
      withSequence(
        withTiming(180, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(180, { duration: 1700 }),
        withTiming(360, { duration: 800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(360, { duration: 1700 })
      ),
      -1,
      false
    );
  }, [autoSpin]);

  const animatedProps = useAnimatedProps(() => {
    const rad = (rotation.value * Math.PI) / 180;
    return {
      ry: Math.max(0.01, 8 * Math.abs(Math.cos(rad))), 
    };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Line x1="21" y1="21" x2="16.65" y2="16.65" />
        <G rotation="45" origin="11, 11">
          <AnimatedEllipse cx="11" cy="11" rx="8" animatedProps={animatedProps} />
        </G>
      </Svg>
    </View>
  );
});
