import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, Dimensions, Platform, Image, InteractionManager } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, MapPin } from 'lucide-react-native';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import Skeleton from '@/components/Skeleton';
import * as Haptics from 'expo-haptics';
import CachedImage from '@/components/CachedImage';
import TypewriterPlaceholder from '@/components/TypewriterPlaceholder';
import { useLocationStore } from '@/store/location';
import { useCategoriesStore } from '@/store/categories';
import Reanimated, { useSharedValue, useAnimatedStyle, interpolate, Extrapolation, useAnimatedScrollHandler, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedMapPin, AnimatedSearchIcon } from '@/components/AnimatedIcons';

const getNormalizedUrl = (imgStr?: string) => {
  if (!imgStr) return '';
  const rawUrl = imgStr.startsWith('http') 
    ? imgStr 
    : `https://bestmarketsy.com/storage/${imgStr}`;
  return encodeURI(rawUrl.replace(/^http:\/\//i, 'https://'));
};

export default function CategoriesScreen() {
  const { categories, loading, error, fetchCategories } = useCategoriesStore();
  const { displayAddress, setLocationModalVisible } = useLocationStore();
  const router = useRouter();
  const { colors: Colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(Colors, isDark), [Colors, isDark]);
  const insets = useSafeAreaInsets();
  const searchIconRef = useRef<{ spin: () => void }>(null);
  const stickySearchIconRef = useRef<{ spin: () => void }>(null);

  const scrollY = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const isVisible = scrollY.value > 120;
    return {
      opacity: 1,
      transform: [{ 
        translateY: withSpring(isVisible ? 0 : -150, { mass: 1, damping: 20, stiffness: 200 }) 
      }]
    };
  });

  const scrollEventHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchCategories();
    });
    return () => task.cancel();
  }, []);

  const categoryNames = useMemo(() => categories.length > 0 ? categories.map((c) => c.name) : ['منتج', 'لحوم', 'منظفات'], [categories]);

  if (error) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 16 }]}>
        <Text style={{ color: Colors.danger, marginBottom: 16 }}>حدث خطأ في الاتصال</Text>
        <TouchableOpacity style={{ padding: 12, backgroundColor: Colors.primary, borderRadius: 8 }} onPress={() => fetchCategories(true)}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { padding: 16, paddingTop: insets.top + 16 }]}>
        <Skeleton width="50%" height={32} style={{ marginBottom: 24, alignSelf: 'center' }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
          <Skeleton width="45%" height={120} borderRadius={16} />
          <Skeleton width="45%" height={120} borderRadius={16} />
          <Skeleton width="45%" height={120} borderRadius={16} />
          <Skeleton width="45%" height={120} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 16 }]}>
        <Text style={{ color: Colors.textMuted, fontSize: 16 }}>لا توجد أقسام متاحة حالياً</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex1}>
      <Reanimated.View style={[styles.stickyHeaderWrapper, headerAnimatedStyle, { paddingTop: insets.top }]}>
        <View style={styles.stickyHeaderContent}>
          <View style={[styles.stickySearch, { width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
            
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={() => router.push('/search')}
              activeOpacity={0.7}
            >
                 <AnimatedSearchIcon ref={stickySearchIconRef} color={Colors.textMuted} size={16} />
                 <TypewriterPlaceholder words={categoryNames} onCycleStart={() => stickySearchIconRef.current?.spin()} />
            </TouchableOpacity>

            <View style={{ width: 1, height: 20, backgroundColor: Colors.border, marginHorizontal: 12 }} />
            
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/map');
              }}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={styles.stickyDeliverText} numberOfLines={1} ellipsizeMode="tail">التوصيل</Text>
              <MapPin color={Colors.primary} size={14} />
              <ChevronDown color={Colors.primary} size={14} style={{ marginLeft: -2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </Reanimated.View>

      <Reanimated.FlatList 
        data={categories}
        keyExtractor={(cat: any) => `sec-${cat.id}`}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollEventHandler}
        scrollEventThrottle={16}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <View style={{ width: '100%', height: 220, marginBottom: 20 }}>
            <LinearGradient
              colors={[isDark ? 'rgba(249, 115, 22, 0.5)' : 'rgba(249, 115, 22, 0.25)', Colors.background]}
              locations={[0, 0.9]}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            
            <View
              pointerEvents="box-none"
              style={{ position: 'absolute', top: insets.top + 8, width: '100%', zIndex: 10, elevation: 10 }}
            >
              <View style={styles.locationRow}>
                <TouchableOpacity
                  style={styles.locationInfo}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/map');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.addressRow}>
                    <AnimatedMapPin color={Colors.primary} size={14} />
                    <Text style={[styles.addressTextWhite, { color: Colors.primary }]} numberOfLines={1}>{displayAddress}</Text>
                    <ChevronDown color={Colors.primary} size={14} style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.headerRow}>
                <TouchableOpacity
                  style={styles.searchBarWhite}
                  onPress={() => router.push('/search')}
                  activeOpacity={0.9}
                >
                  <AnimatedSearchIcon ref={searchIconRef} color={Colors.textMuted} size={18} />
                  <TypewriterPlaceholder words={categoryNames} onCycleStart={() => searchIconRef.current?.spin()} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        renderItem={({ item: cat }: any) => {
          const childrenToRender = cat.children && cat.children.length > 0 ? cat.children : [cat];
          
          return (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  {cat.parsedImageString && (
                    <CachedImage 
                      uri={getNormalizedUrl(cat.parsedImageString)} 
                      style={styles.sectionTitleIcon} 
                      resizeMode="contain" 
                    />
                  )}
                  <Text style={styles.sectionTitle}>{cat.name}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.viewAllBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/products?category=${cat.id}`);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>عرض الكل</Text>
                  <ChevronLeft color={Colors.primary} size={16} />
                </TouchableOpacity>
              </View>

              <View style={styles.gridContainer}>
                {childrenToRender.map((child: any, index: number) => {
                   const childImg = child.parsedImageString || child.image || child.image_url;
                   return (
                     <TouchableOpacity 
                       key={`child-${child.id || index}`}
                       style={styles.childCard}
                       onPress={() => {
                         Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                         router.push(`/products?category=${child.id}`);
                       }}
                       activeOpacity={0.8}
                     >
                       <View style={styles.childImageContainer}>
                         {childImg ? (
                           <View style={{ padding: 8, width: '100%', height: '100%' }}>
                             <CachedImage uri={getNormalizedUrl(childImg)} style={styles.childImage} resizeMode="contain" />
                           </View>
                         ) : (
                           <Image source={require('@/assets/images/grocery_placeholder.jpg')} style={styles.childImage} resizeMode="cover" />
                         )}
                       </View>
                       <Text style={styles.childName} numberOfLines={2}>{child.name}</Text>
                     </TouchableOpacity>
                   );
                })}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const getStyles = (Colors: ThemePalette, isDark: boolean) => {
  const { width } = Dimensions.get('window');
  const gapSize = 12;
  const cardWidth = Math.floor((width - 32 - (gapSize * 2)) / 3);

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  flex1: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stickyHeaderWrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    backgroundColor: Colors.background,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  stickyHeaderContent: {
    paddingHorizontal: 16,
  },
  stickySearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.input,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
  },
  stickyDeliverText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    maxWidth: 120,
    flexShrink: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  locationInfo: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  addressTextWhite: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    maxWidth: 200,
    flexShrink: 1,
  },
  headerRow: {
    paddingHorizontal: 16,
  },
  searchBarWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
    gap: 8,
  },
  sectionContainer: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
  },
  sectionTitleIcon: {
    width: 32,
    height: 32,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: gapSize,
  },
  childCard: {
    width: cardWidth,
    alignItems: 'center',
    marginBottom: 20,
  },
  childImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(249, 115, 22, 0.12)' : 'rgba(249, 115, 22, 0.06)',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  childImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.input,
    borderRadius: 16,
  },
  childName: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 16,
  }
});
};
