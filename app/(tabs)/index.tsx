import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, FlatList, Modal, Pressable, ScrollView, Image, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Line, Svg, Ellipse, G } from 'react-native-svg';
import { MapPin, Flame, Tag, Copy, Check, ChevronDown, X, Navigation, Map, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '@/lib/api';
import BannerCarousel from '@/components/BannerCarousel';
import CategoryRow from '@/components/CategoryRow';
import ProductCard from '@/components/ProductCard';
import CachedImage from '@/components/CachedImage';
import TypewriterPlaceholder from '@/components/TypewriterPlaceholder';
import Skeleton from '@/components/Skeleton';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useLocationStore } from '@/store/location';
import * as Haptics from 'expo-haptics';
import { normalizeImageUrl } from '@/lib/ImagePrefetchManager';
import Reanimated, { FadeInDown, useSharedValue, useAnimatedStyle, useAnimatedProps, withTiming, withSequence, Easing, withSpring, runOnJS } from 'react-native-reanimated';
import * as Location from 'expo-location';

export default function HomeScreen() {
  const searchIconRef = React.useRef<any>(null);
  const stickySearchIconRef = React.useRef<any>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = useCartStore(state => state.items);
  const token = useAuthStore(state => state.token);
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const { displayAddress, setLocationModalVisible } = useLocationStore();

  const scrollY = React.useRef(new Animated.Value(0)).current;

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [150, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const stickyHeaderTranslateY = scrollY.interpolate({
    inputRange: [150, 200],
    outputRange: [-100, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.get('/home');
      const homeData = res.data;
      setData(homeData);
      
      if (homeData.banners && Array.isArray(homeData.banners)) {
        homeData.banners.forEach((b: any) => {
          if (b.image_url) {
            Image.prefetch(normalizeImageUrl(b.image_url));
          }
        });
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchHomeData(true),
      new Promise(resolve => setTimeout(resolve, 800)) // Ensure spinner shows for at least 800ms
    ]);
    setRefreshing(false);
  }, []);

  const handleCopyCoupon = (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCopiedCoupon(true);
    Alert.alert('تم النسخ', `تم نسخ كود الخصم (${code}) بنجاح!`);
    setTimeout(() => setCopiedCoupon(false), 3000);
  };


  const weeklyOffers = useMemo(() => data?.weekly_offers || data?.best_sellers?.slice(0, 6) || [], [data]);
  const dailyEssentials = useMemo(() => data?.daily_essentials || data?.categories?.[0]?.products || [], [data]);
  const categoryNames = useMemo(() => data?.categories?.map((c: any) => c.name) || ['منتج', 'لحوم', 'منظفات'], [data]);

  const scrollEventHandler = useMemo(
    () => Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: true }
    ),
    [scrollY]
  );

  const renderProductItem = useCallback(({ item, index }: any) => (
    <Reanimated.View entering={FadeInDown.delay(index * 100).springify()}>
      <ProductCard product={item} compact />
    </Reanimated.View>
  ), []);

  const extractWeeklyKey = useCallback((item: any, idx: number) => `weekly-${item.id}-${idx}`, []);
  const extractFeatKey = useCallback((item: any, idx: number) => `feat-${item.id}-${idx}`, []);

  const handleCategorySelect = useCallback((id: number) => {
    setSelectedCatId(id);
    router.push(`/products?category=${id}`);
  }, [router]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16, paddingHorizontal: 16 }]}>
        <Skeleton height={48} borderRadius={12} style={{ marginBottom: 20 }} />
        <Skeleton height={180} borderRadius={20} style={{ marginBottom: 24 }} />
        <Skeleton width="40%" height={24} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 32 }}>
          <Skeleton width={64} height={64} borderRadius={32} />
          <Skeleton width={64} height={64} borderRadius={32} />
          <Skeleton width={64} height={64} borderRadius={32} />
          <Skeleton width={64} height={64} borderRadius={32} />
        </View>
        <Skeleton width="45%" height={24} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Skeleton width={150} height={210} borderRadius={16} />
          <Skeleton width={150} height={210} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>فشل في تحميل البيانات</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHomeData(false)}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.flex1}>
      {/* Absolute Compact Sticky Header (Fades in when scrolled) */}
      <Animated.View style={[
        styles.stickyHeaderWrapper, 
        { 
          opacity: stickyHeaderOpacity, 
          transform: [{ translateY: stickyHeaderTranslateY }],
          paddingTop: insets.top 
        }
      ]}>
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
              onPress={() => router.push('/map')}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={styles.stickyDeliverText} numberOfLines={1} ellipsizeMode="tail">التوصيل</Text>
              <MapPin color={Colors.primary} size={14} />
              <ChevronDown color={Colors.primary} size={14} style={{ marginLeft: -2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 90 }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollEventHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[Colors.primary]} 
            tintColor={Colors.primary}
            progressBackgroundColor={Colors.surface}
          />
        }
      >
        {/* Top Section Wrapper (Full Bleed Background Banner) */}
        <View style={{ width: '100%', height: 440, marginBottom: 20 }}>

          {/* Background Banner Carousel */}
          <BannerCarousel banners={data.banners} height={440} />

          {/* Foreground Overlay Header */}
          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', top: insets.top + 8, width: '100%', zIndex: 10, elevation: 10 }}
          >

            {/* Location & Logo Row */}
            <View style={styles.locationRow}>
              <TouchableOpacity
                style={styles.locationInfo}
                onPress={() => router.push('/map')}
                activeOpacity={0.7}
              >
                <View style={styles.addressRow}>
                  <AnimatedMapPin color="#fff" size={14} />
                  <Text style={styles.addressTextWhite} numberOfLines={1}>{displayAddress}</Text>
                  <ChevronDown color="#fff" size={14} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Search Row */}
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

        {/* Categories Circle Row */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>الأقسام</Text>
            <TouchableOpacity onPress={() => router.push('/categories')} style={styles.viewAllBtn} activeOpacity={0.7}>
              <Text style={styles.seeAllText}>عرض الكل</Text>
              <ChevronLeft color={Colors.primary} size={16} />
            </TouchableOpacity>
          </View>
          <CategoryRow
            categories={data.categories}
            selectedCategoryId={selectedCatId}
            onSelectCategory={handleCategorySelect}
          />
        </View>

        {/* Weekly Offers Section ("عروض الأسبوع") */}
        {weeklyOffers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>عروض الأسبوع</Text>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productRow}
              decelerationRate="fast"
              snapToInterval={162}
              data={weeklyOffers}
              keyExtractor={extractWeeklyKey}
              initialNumToRender={3}
              windowSize={3}
              maxToRenderPerBatch={5}
              removeClippedSubviews={true}
              renderItem={({ item, index }: any) => (
                <Reanimated.View entering={FadeInDown.delay(index * 100).springify()}>
                  <ProductCard product={{...item, discount_percentage: item.discount_percentage || 1}} numColumns={2} />
                </Reanimated.View>
              )}
            />
          </View>
        )}

        {/* Daily Essentials ("أساسياتك اليومية") */}
        {dailyEssentials.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>أساسيات البيت اليومية</Text>
              <TouchableOpacity onPress={() => router.push('/products')} style={styles.viewAllBtn} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>عرض الكل</Text>
                <ChevronLeft color={Colors.primary} size={16} />
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productRow}
              decelerationRate="fast"
              snapToInterval={162}
              data={dailyEssentials}
              keyExtractor={(item, index) => `daily-${item.id}-${index}`}
              initialNumToRender={3}
              windowSize={3}
              maxToRenderPerBatch={5}
              removeClippedSubviews={true}
              renderItem={({ item, index }: any) => (
                <Reanimated.View entering={FadeInDown.delay(index * 100).springify()}>
                  <ProductCard product={item} numColumns={2} />
                </Reanimated.View>
              )}
            />
          </View>
        )}

        {/* Promo Code Discount Banner */}
        {data.promo_section && (
          <View style={[styles.promoBannerContainer, { padding: 0, overflow: 'hidden', minHeight: 180, position: 'relative', backgroundColor: (data.promo_section.image_url || data.promo_section.image) ? '#1e293b' : Colors.surface }]}>
            {/* Background Image if available */}
            {(data.promo_section.image_url || data.promo_section.image) ? (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}>
                <CachedImage 
                  uri={normalizeImageUrl(data.promo_section.image_url || data.promo_section.image)}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
                />
              </View>
            ) : null}
            
            <View style={[styles.promoContent, { padding: 20 }]}>
              <View style={[styles.promoHeader, { alignItems: 'flex-start' }]}>
                {!(data.promo_section.image_url || data.promo_section.image) && (
                  <View style={styles.tagIconWrapper}>
                    <Tag color={Colors.primary} size={20} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {data.promo_section.subtitle && (
                    <Text style={[styles.promoSubtitle, (data.promo_section.image_url || data.promo_section.image) && { color: '#fbbf24' }]}>
                      {data.promo_section.subtitle}
                    </Text>
                  )}
                  <Text style={[styles.promoTitle, (data.promo_section.image_url || data.promo_section.image) && { color: '#ffffff', fontSize: 22, marginTop: 4 }]}>
                    {data.promo_section.title?.replace(/<[^>]+>/g, '')?.trim() || 'خصم مميز لك!'}
                  </Text>
                  {data.promo_section.description && (
                    <Text style={[styles.promoSubtitle, { marginTop: 6, color: (data.promo_section.image_url || data.promo_section.image) ? 'rgba(255,255,255,0.85)' : Colors.textMuted }]} numberOfLines={3}>
                      {data.promo_section.description}
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 12 }}>
                {data.promo_section.promo_code && (
                  <View style={[styles.codeRow, { marginTop: 0, flex: 1 }]}>
                    <TouchableOpacity style={[styles.copyBtn, (data.promo_section.image_url || data.promo_section.image) && { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={() => handleCopyCoupon(data.promo_section.promo_code)} activeOpacity={0.8}>
                      {copiedCoupon ? (
                        <>
                          <Check color={Colors.success} size={16} />
                          <Text style={[styles.copyBtnText, { color: Colors.success }]}>تم النسخ</Text>
                        </>
                      ) : (
                        <>
                          <Copy color={(data.promo_section.image_url || data.promo_section.image) ? '#fff' : Colors.primary} size={16} />
                          <Text style={[styles.copyBtnText, (data.promo_section.image_url || data.promo_section.image) && { color: '#fff' }]}>نسخ</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <View style={[styles.codeBox, { flex: 1, backgroundColor: (data.promo_section.image_url || data.promo_section.image) ? 'rgba(255,255,255,0.95)' : Colors.background }]}>
                      <Text style={[styles.codeText, { fontSize: 16 }]} numberOfLines={1}>{data.promo_section.promo_code}</Text>
                    </View>
                  </View>
                )}

                {data.promo_section.button_link && (
                  <TouchableOpacity 
                    style={[styles.copyBtn, { backgroundColor: Colors.primary, paddingHorizontal: 16, height: 44, borderRadius: 12, paddingVertical: 0, justifyContent: 'center' }]} 
                    onPress={() => router.push(data.promo_section.button_link as any)}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{data.promo_section.button_text || 'تسوق الآن'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Best Sellers ("الأكثر مبيعاً") */}
        {data.best_sellers && data.best_sellers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>الأكثر مبيعاً</Text>
              <TouchableOpacity onPress={() => router.push('/products')} style={styles.viewAllBtn} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>عرض الكل</Text>
                <ChevronLeft color={Colors.primary} size={16} />
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productRow}
              decelerationRate="fast"
              snapToInterval={162}
              data={data.best_sellers}
              keyExtractor={(item, index) => `best-${item.id}-${index}`}
              initialNumToRender={3}
              windowSize={3}
              maxToRenderPerBatch={5}
              removeClippedSubviews={true}
              renderItem={({ item, index }: any) => (
                <Reanimated.View entering={FadeInDown.delay(index * 100).springify()}>
                  <ProductCard product={item} numColumns={2} />
                </Reanimated.View>
              )}
            />
          </View>
        )}

        {/* Featured Categories from API */}
        {data.featured_categories?.map((cat: any) => (
          <View key={`feat-cat-${cat.id}`} style={styles.section}>
            <View style={[styles.sectionHeader, { alignItems: 'center' }]}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 4, height: 18, backgroundColor: Colors.primary, borderRadius: 2 }} />
                <View>
                  <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>{cat.name}</Text>
                  {cat.subtitle ? <Text style={{ color: Colors.textMuted, fontSize: 12, textAlign: 'right', marginTop: 2 }}>{cat.subtitle}</Text> : null}
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push(`/products?category=${cat.id}`)} style={styles.viewAllBtn} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>عرض الكل</Text>
                <ChevronLeft color={Colors.primary} size={16} />
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productRow}
              decelerationRate="fast"
              snapToInterval={162}
              data={cat.products}
              keyExtractor={extractFeatKey}
              initialNumToRender={3}
              windowSize={3}
              maxToRenderPerBatch={5}
              removeClippedSubviews={true}
              renderItem={renderProductItem}
            />
          </View>
        ))}



        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

function AnimatedMapPin({ color, size }: { color: string; size: number }) {
  const jump = useSharedValue(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        jump.value = withSequence(
          withTiming(-4, { duration: 250, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 250, easing: Easing.in(Easing.quad) }),
          withTiming(-2, { duration: 200, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) })
        );
      }, 3000);
    }, 500); // Slight offset so it doesn't jump exactly with other animations
    
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
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

const AnimatedSearchIcon = React.forwardRef(({ color, size, autoSpin }: { color: string; size: number, autoSpin?: boolean }, ref) => {
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
    const interval = setInterval(() => {
      targetRotation.current += 180;
      rotation.value = withTiming(targetRotation.current, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [autoSpin]);

  const animatedProps = useAnimatedProps(() => {
    const rad = (rotation.value * Math.PI) / 180;
    return {
      ry: Math.max(0.01, 8 * Math.abs(Math.cos(rad))), // Use 0.01 to prevent rendering glitches at 0
    };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Static handle */}
        <Line x1="21" y1="21" x2="16.65" y2="16.65" />
        
        {/* Animated Ellipse rotated by 45 degrees so its X-axis aligns with the handle.
            By animating ry, it spins around the handle's axis perfectly connected! */}
        <G rotation="45" origin="11, 11">
          <AnimatedEllipse cx="11" cy="11" rx="8" animatedProps={animatedProps} />
        </G>
      </Svg>
    </View>
  );
});

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  flex1: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stickyHeaderWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  stickyHeaderContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  stickySearchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradientHeader: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
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
  },
  deliverToTextWhite: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 2,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  addressTextWhite: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    maxWidth: 200,
    flexShrink: 1,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Blaka_400Regular',
    marginTop: -10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchBarWhite: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchPlaceholder: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '65%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
    backgroundColor: Colors.input,
    borderRadius: 16,
  },
  sheetBody: {
    flex: 1,
    marginTop: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'left',
    marginBottom: 16,
  },
  addressListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: Colors.input,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addressListTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  addressListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'right',
  },
  addressListSub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  actionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12,
    backgroundColor: Colors.input,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionListText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    marginRight: 12,
  },
  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'right',
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 4,
  },
  flameText: {
    color: '#FF4500',
    fontSize: 11,
    fontWeight: '700',
  },
  productRow: {
    paddingHorizontal: 10,
    flexDirection: 'row',
  },
  promoBannerContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  promoContent: {
    gap: 14,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  promoSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.input,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeBox: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  codeText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'SpaceMono',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  copyBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 16,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
});


