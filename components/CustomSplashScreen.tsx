import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useAppTheme } from '@/hooks/useAppTheme';

interface CustomSplashScreenProps {
  onAnimationComplete: () => void;
}

const LOGO_WIDTH = 350;
const LOGO_HEIGHT = 140;

export default function CustomSplashScreen({ onAnimationComplete }: CustomSplashScreenProps) {
  const { isDark } = useAppTheme();
  
  const containerOpacity = useSharedValue(1);
  const fillProgress = useSharedValue(0);

  useEffect(() => {
    // 1. Simulate "downloading" fill effect (0% to 100%)
    fillProgress.value = withTiming(1, { 
      duration: 2500, // Takes 2.5 seconds to "download"
      easing: Easing.inOut(Easing.ease) 
    });

    // 2. Wait for fill to complete, then smoothly fade out the entire splash screen
    containerOpacity.value = withDelay(
      2800, // Wait until fill is done
      withTiming(0, { duration: 600 }, (finished) => {
        if (finished) {
          runOnJS(onAnimationComplete)();
        }
      })
    );
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: containerOpacity.value,
      transform: [
        {
          scale: interpolate(containerOpacity.value, [0, 1], [1.1, 1]),
        },
      ],
    };
  });

  const fillAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: fillProgress.value * LOGO_HEIGHT,
    };
  });

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: isDark ? '#121212' : '#FFFFFF' },
        containerAnimatedStyle
      ]}
    >
      <View style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT }}>
        {/* Background "Empty" Logo */}
        <Image 
          source={require('../assets/images/splash-logo-transparent.png')} 
          style={[styles.logo, { tintColor: isDark ? '#333333' : '#E5E7EB' }]}
          resizeMode="contain"
        />

        {/* Foreground "Filled" Logo */}
        <Animated.View style={[styles.fillContainer, fillAnimatedStyle]}>
          <Image 
            source={require('../assets/images/splash-logo-transparent.png')} 
            style={[styles.logoFilled, { bottom: 0 }]}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    position: 'absolute',
  },
  fillContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  logoFilled: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    position: 'absolute',
  }
});
