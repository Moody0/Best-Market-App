import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, I18nManager, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, useAnimatedScrollHandler, interpolate, interpolateColor, Extrapolation, runOnJS, SharedValue, useAnimatedRef, scrollTo, runOnUI } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import CachedImage from '@/components/CachedImage';
import { normalizeImageUrl } from '@/lib/ImagePrefetchManager';
import { useAppTheme } from '@/hooks/useAppTheme';

const { width } = Dimensions.get('window');

interface Banner {
  id: number;
  image_url: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  link?: string; // fallback
  action_type?: string;
  action_url?: string;
  is_active?: boolean;
}

const BannerCarousel = React.memo(function BannerCarousel({ banners, height = 380 }: { banners: Banner[], height?: number }) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const progressValue = useSharedValue(1); // Start at index 1 because of the prepended clone
  const activeIndexRef = useRef(1);
  const lastInteraction = useRef(Date.now());
  const isReady = useRef(false);

  // Filter only active banners if is_active is provided
  const activeBanners = React.useMemo(() => {
    if (!banners) return [];
    return banners.filter(b => b.is_active !== false);
  }, [banners]);

  // Create an extended array for the infinite loop illusion: [last, ...all, first]
  const extendedBanners = React.useMemo(() => {
    if (activeBanners.length === 0) return [];
    if (activeBanners.length === 1) return activeBanners;
    return [activeBanners[activeBanners.length - 1], ...activeBanners, activeBanners[0]];
  }, [activeBanners]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      progressValue.value = Math.abs(event.contentOffset.x) / width;
    },
  });

  useEffect(() => {
    if (extendedBanners.length <= 1) return;
    
    const timer = setTimeout(() => {
      if (scrollViewRef.current) {
        const targetX = width * (I18nManager.isRTL ? (Platform.OS === 'android' ? 1 : -1) : 1);
        runOnUI((ref: any, x: number) => {
          scrollTo(ref, x, 0, false);
        })(scrollViewRef, targetX);
        isReady.current = true;
      }
    }, 100);

    const interval = setInterval(() => {
      if (!isReady.current || Date.now() - lastInteraction.current < 2500) return;
      
      let next = activeIndexRef.current + 1;
      activeIndexRef.current = next;
      
      const targetX = next * width * (I18nManager.isRTL ? (Platform.OS === 'android' ? 1 : -1) : 1);
      
      runOnUI((ref: any, x: number) => {
        scrollTo(ref, x, 0, true);
      })(scrollViewRef, targetX);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [extendedBanners.length]);

  if (activeBanners.length === 0) return null;

  return (
    <View style={[styles.container, { height }]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        onScrollBeginDrag={() => {
          lastInteraction.current = Date.now() + 5000;
        }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(Math.abs(e.nativeEvent.contentOffset.x) / width);
          activeIndexRef.current = index;
          lastInteraction.current = Date.now();

          if (index === 0) {
            // Reached the prepended clone (swipe right past start), teleport to real last item
            const realLastIndex = extendedBanners.length - 2;
            const targetX = realLastIndex * width * (I18nManager.isRTL ? (Platform.OS === 'android' ? 1 : -1) : 1);
            runOnUI((ref: any, x: number) => {
              scrollTo(ref, x, 0, false);
            })(scrollViewRef, targetX);
            activeIndexRef.current = realLastIndex;
            progressValue.value = realLastIndex;
          } else if (index === extendedBanners.length - 1) {
            // Reached the appended clone (swipe left past end), teleport to real first item
            const realFirstIndex = 1;
            const targetX = realFirstIndex * width * (I18nManager.isRTL ? (Platform.OS === 'android' ? 1 : -1) : 1);
            runOnUI((ref: any, x: number) => {
              scrollTo(ref, x, 0, false);
            })(scrollViewRef, targetX);
            activeIndexRef.current = realFirstIndex;
            progressValue.value = realFirstIndex;
          }
        }}
      >
        {extendedBanners.map((item, index) => {
          const imageUrl = normalizeImageUrl(item.image_url);
          return (
            <TouchableOpacity 
              key={`${item.id}-${index}`}
              activeOpacity={1} 
              style={[styles.slide, { height }]}
              onPress={() => {
                if (item.action_type === 'link' && item.action_url) {
                  router.push(item.action_url as any);
                } else if (item.action_type === 'category' && item.action_url) {
                  router.push(`/products?category=${item.action_url}` as any);
                } else if (item.action_type === 'product' && item.action_url) {
                  router.push(`/product/${item.action_url}` as any);
                } else if (item.link) {
                  router.push(item.link as any);
                }
              }}
            >
              <View style={styles.bannerWrapper}>
                <CachedImage uri={imageUrl} style={styles.image} resizeMode="stretch" />
              </View>
            </TouchableOpacity>
          );
        })}
      </Animated.ScrollView>

      <View style={styles.dotsContainer}>
        <View style={[styles.dotsWrapper, { backgroundColor: colors.surface, opacity: 0.9 }]}>
          {banners.map((_, index) => (
            <AnimatedDot 
              key={index} 
              index={index} 
              progressValue={progressValue} 
              length={banners.length}
              dotColor={colors.text}
              inactiveColor={colors.textSecondary}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

function AnimatedDot({ index, progressValue, length, dotColor, inactiveColor }: { index: number, progressValue: SharedValue<number>, length: number, dotColor: string, inactiveColor: string }) {
  const animatedStyle = useAnimatedStyle(() => {
    let progress = progressValue.value;
    if (typeof progress !== 'number' || isNaN(progress)) {
      progress = 1;
    }

    // Offset progress by -1 because the first visible item is actually index 1 in extendedBanners
    let val = (progress - 1) % length;
    if (val < 0) val += length;
    
    let distance = Math.abs(val - index);
    if (distance > length / 2) {
      distance = length - distance;
    }
    
    if (isNaN(distance)) distance = 0;
    
    const dotWidth = interpolate(distance, [0, 1], [18, 6], Extrapolation.CLAMP);
    const backgroundColor = interpolateColor(
      distance,
      [0, 1],
      [dotColor, inactiveColor]
    );

    return {
      width: dotWidth,
      backgroundColor,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  slide: {
    width: width,
  },
  bannerWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },

  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  dotsWrapper: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  }
});

export default BannerCarousel;

