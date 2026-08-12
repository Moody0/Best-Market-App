import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Animated, Image, PanResponder, FlatList } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ShoppingCart, Heart, Minus, Plus, Share2 } from 'lucide-react-native';
import { Share as NativeShare } from 'react-native';
import api from '@/lib/api';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useShallow } from 'zustand/react/shallow';
import * as Haptics from 'expo-haptics';
import Skeleton from '@/components/Skeleton';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import ProductCard from '@/components/ProductCard';
import { normalizeImageUrl } from '@/lib/ImagePrefetchManager';
import { useCustomAlert } from '@/contexts/CustomAlertContext';

const { width, height } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { showAlert } = useCustomAlert();
  
  const { id, category_id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { items, addItem, updateQuantity, removeItem } = useCartStore(useShallow(state => ({
    items: state.items,
    addItem: state.addItem,
    updateQuantity: state.updateQuantity,
    removeItem: state.removeItem,
  })));
  const token = useAuthStore(state => state.token);
  const cartItem = items.find((i) => i.product_id === Number(id));
  const isInCart = !!cartItem;

  const [localQuantity, setLocalQuantity] = useState(1);
  const currentQuantity = isInCart ? cartItem.quantity : localQuantity;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const scrollOffset = useRef(0);
  useEffect(() => {
    scrollY.addListener(({ value }) => {
      scrollOffset.current = value;
    });
    return () => scrollY.removeAllListeners();
  }, [scrollY]);

  const panY = useRef(new Animated.Value(height)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return scrollOffset.current <= 0 && gestureState.dy > 15 && Math.abs(gestureState.dx) < 20;
      },
      onPanResponderMove: Animated.event([null, { dy: panY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.8) {
          Animated.timing(panY, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
          }).start(() => router.back());
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const imageUrls = useMemo(() => {
    if (!product) return [''];
    let urls: string[] = [];
    let imageString = product.image || product.image_url;
    
    if (typeof imageString === 'string') {
      imageString = imageString.trim();
      if (imageString.startsWith('[')) {
        try {
          const parsed = JSON.parse(imageString);
          if (Array.isArray(parsed) && parsed.length > 0) {
            urls = parsed;
          }
        } catch (e) {}
      } else if (imageString !== '') {
        urls = [imageString];
      }
    } else if (Array.isArray(imageString) && imageString.length > 0) {
      urls = imageString;
    }
    
    if (urls.length === 0) {
      return [''];
    }
    
    return urls.map((url: string) => {
      const rawUrl = url.startsWith('http') ? url : `https://bestmarketsy.com/storage/${url}`;
      return encodeURI(rawUrl.replace(/^http:\/\//i, 'https://'));
    });
  }, [product?.image, product?.image_url]);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    
    // Slide the product sheet up when the screen mounts
    Animated.spring(panY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      mass: 1,
      stiffness: 100,
    }).start();

    fetchProduct();
    return () => { isMounted.current = false; };
  }, [id]);

  const fetchProduct = async () => {
    setError(false);
    
    // 🚀 Parallel Request: Fetch related products instantly if we already know the category from the previous screen
    if (category_id) {
      setRelatedLoading(true);
      api.get(`/products?category_id=${category_id}`)
        .then(relatedRes => {
          const list = relatedRes.data?.data || relatedRes.data || [];
          const filtered = list.filter((p: any) => String(p.id) !== String(id));
          if (isMounted.current) {
            setRelatedProducts(filtered);
            setRelatedLoading(false);
          }
        })
        .catch(err => {
          console.error('Error fetching related products in parallel:', err);
          if (isMounted.current) setRelatedLoading(false);
        });
    }

    try {
      const res = await api.get(`/products/${id}`);
      const productData = res.data;
      if (isMounted.current) {
        setProduct(productData);
        setIsFavorite(productData.is_favorite || false);
        setLoading(false);
      }

      // Fallback: If we didn't have the category_id upfront, fetch it sequentially now
      if (!category_id && productData.category_id) {
        setRelatedLoading(true);
        api.get(`/products?category_id=${productData.category_id}`)
          .then(relatedRes => {
            const list = relatedRes.data?.data || relatedRes.data || [];
            const filtered = list.filter((p: any) => String(p.id) !== String(id));
            if (isMounted.current) {
              setRelatedProducts(filtered);
              setRelatedLoading(false);
            }
          })
          .catch(err => {
            console.error('Error fetching related products:', err);
            if (isMounted.current) setRelatedLoading(false);
          });
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      if (isMounted.current) {
        setError(true);
        setLoading(false);
      }
    }
  };

  const toggleFavorite = async () => {
    if (!token) {
      showAlert('تنبيه', 'يجب تسجيل الدخول لإضافة المنتجات إلى المفضلة', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الدخول', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTogglingFav(true);
    const newFavState = !isFavorite;
    try {
      setIsFavorite(newFavState);
      await api.post(`/favorites/${id}/toggle`);
    } catch (error) {
      setIsFavorite(!newFavState);
      console.error('Error toggling favorite:', error);
    } finally {
      setTogglingFav(false);
    }
  };

  const handleIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isInCart) {
      updateQuantity(product.id, currentQuantity + 1);
    } else {
      setLocalQuantity(q => Math.min(q + 1, 99));
    }
  };

  const handleShare = async () => {
    try {
      await NativeShare.share({ message: `اكتشف هذا المنتج: ${product.name} على تطبيقنا!` });
    } catch (error) { console.error(error); }
  };

  const handleDecrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isInCart) {
      if (currentQuantity === 1) {
        removeItem(product.id);
      } else {
        updateQuantity(product.id, currentQuantity - 1);
      }
    } else {
      if (localQuantity > 1) {
        setLocalQuantity(q => q - 1);
      }
    }
  };

  const handlePrimaryAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isInCart) {
      router.push('/cart');
      return;
    }

    addItem({
      product_id: product.id,
      name: product.name,
      price: product.discount_price || product.price,
      image_url: imageUrls[0],
      quantity: localQuantity
    });
    
    setLocalQuantity(1);
  };



  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => router.back()} />
        <View style={[styles.container, styles.center, { flex: undefined, height: height * 0.9, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }]}>
          <Text style={[styles.errorText, { marginBottom: 16 }]}>حدث خطأ في الاتصال بالخادم</Text>
          <TouchableOpacity onPress={fetchProduct} style={{ backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>إعادة المحاولة</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => router.back()} />
        <View style={[styles.container, { flex: undefined, height: height * 0.9, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }]}>
          <Skeleton height={height * 0.45} borderRadius={0} />
          <View style={styles.contentOverlay}>
            <Skeleton width="70%" height={32} style={{ marginBottom: 12, marginTop: 16 }} />
            <Skeleton width="40%" height={24} style={{ marginBottom: 24 }} />
            <Skeleton width="100%" height={80} borderRadius={12} />
          </View>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => router.back()} />
        <View style={[styles.container, styles.center, { flex: undefined, height: height * 0.9, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }]}>
          <Text style={styles.errorText}>المنتج غير موجود</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }



  // Header opacity animation based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, height * 0.25],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Background opacity animation based on drag (panY)
  const bgOpacity = panY.interpolate({
    inputRange: [0, height * 0.8],
    outputRange: [0.5, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: bgOpacity }]} />
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => {
        Animated.timing(panY, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }).start(() => router.back());
      }} />
      <Animated.View 
        {...panResponder.panHandlers}
        style={[styles.container, { flex: undefined, maxHeight: height * 0.9, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', transform: [{ translateY: panY }] }]}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Dynamic Animated Header Background */}
        <Animated.View style={[styles.animatedHeaderBg, { opacity: headerOpacity, backgroundColor: Colors.background }]} />

        {/* Floating Header Actions */}
        <View style={[styles.header, { top: 16 }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
            <View style={styles.headerBtn}>
              <X color={Colors.text} size={24} />
            </View>
          </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.8}>
            <View style={styles.headerBtn}>
              <Share2 color={Colors.text} size={20} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/cart')} activeOpacity={0.8}>
            <View style={styles.headerBtn}>
              <ShoppingCart color={Colors.text} size={22} />
              {items.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{items.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 90 }}
      >
        {/* Hero Image Container */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / width);
              if (slide !== activeImageIndex) {
                setActiveImageIndex(slide);
              }
            }}
            scrollEventThrottle={16}
          >
            {imageUrls.map((imgUri, idx) => (
              <Reanimated.View key={idx} sharedTransitionTag={idx === 0 ? 'product-image-' + id : undefined} style={[styles.image, { width, backgroundColor: Colors.surface }]}>
                <Image 
                  source={imageError || !imgUri ? require('@/assets/images/grocery_placeholder.jpg') : { uri: imgUri }} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="contain" 
                  onError={() => setImageError(true)}
                />
              </Reanimated.View>
            ))}
          </ScrollView>
          
          {imageUrls.length > 1 && (
            <View style={styles.paginationContainer}>
              {imageUrls.map((_, i) => (
                <View 
                  key={i} 
                  style={[styles.paginationDot, i === activeImageIndex && styles.paginationDotActive]} 
                />
              ))}
            </View>
          )}
          {product.discount_percentage ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>خصم {product.discount_percentage}%</Text>
            </View>
          ) : null}
        </View>

        {/* Content Card Overlaying the Image */}
        <View style={styles.contentOverlay}>
          {/* Product Info Row */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{product.name}</Text>
            </View>
            <TouchableOpacity onPress={toggleFavorite} style={styles.favBtn} activeOpacity={0.7}>
              <Heart color={isFavorite ? Colors.danger : Colors.textMuted} fill={isFavorite ? Colors.danger : "transparent"} size={26} />
            </TouchableOpacity>
          </View>

          {/* Description Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.description}>
              {product.description || 'هذا المنتج لا يحتوي على تفاصيل إضافية في الوقت الحالي. نضمن لك أعلى معايير الجودة في جميع منتجاتنا.'}
            </Text>
          </View>

          {/* Related Products Section */}
          {relatedLoading ? (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>منتجات قد تعجبك أيضاً</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
                {[1, 2, 3].map((key) => (
                  <Skeleton key={key} width={150} height={210} borderRadius={16} />
                ))}
              </ScrollView>
            </View>
          ) : relatedProducts.length > 0 ? (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>منتجات قد تعجبك أيضاً</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
                data={relatedProducts.slice(0, 10)}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <ProductCard product={item} compact />}
              />
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.bottomBarContent}>
          
          <View style={styles.bottomActionCol}>
            {isInCart ? (
              <View style={styles.stepperContainer}>
                <TouchableOpacity style={styles.stepperBtn} onPress={handleIncrement} activeOpacity={0.7}>
                  <Plus color="#fff" size={20} />
                </TouchableOpacity>
                <View style={styles.stepperValueBox}>
                  <Text style={styles.stepperValue}>{currentQuantity}</Text>
                </View>
                <TouchableOpacity style={styles.stepperBtn} onPress={handleDecrement} activeOpacity={0.7}>
                  <Minus color="#fff" size={20} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.addToCartBtnSolid, 
                  !product.is_active && { backgroundColor: Colors.border, opacity: 0.8 }
                ]}
                onPress={handlePrimaryAction}
                disabled={!product.is_active}
                activeOpacity={0.8}
              >
                <Text style={styles.addToCartTextSolid}>إضافة للسلة</Text>
                <View style={styles.plusCircle}>
                   <Plus color="#fff" size={16} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.bottomPriceCol}>
            <View style={styles.bottomPriceRow}>
              {product.discount_price && product.discount_price < product.price ? (
                <>
                  <Text style={styles.bottomPriceText}>
                    {Number.isInteger(product.discount_price) ? product.discount_price : Number(product.discount_price).toFixed(2)}
                  </Text>
                  <Text style={styles.bottomCurrencyText}>
                    ل.س {product.unit ? `/ ${product.unit}` : ''}
                  </Text>
                  <Text style={styles.bottomOldPriceText}>
                    {Number.isInteger(product.price) ? product.price : Number(product.price).toFixed(2)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.bottomPriceText}>
                    {Number.isInteger(product.price) ? product.price : Number(product.price).toFixed(2)}
                  </Text>
                  <Text style={styles.bottomCurrencyText}>
                    ل.س {product.unit ? `/ ${product.unit}` : ''}
                  </Text>
                </>
              )}
            </View>
          </View>

        </View>
      </View>
    </Animated.View>
  </View>
  );
}

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedHeaderBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 9,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  paginationDotActive: {
    backgroundColor: '#f97316',
    width: 16,
  },
  header: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  imageContainer: {
    width: width,
    height: height * 0.35,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: Colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  discountText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  contentOverlay: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'left',
    lineHeight: 36,
  },
  unitText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'left',
    marginTop: 4,
    fontWeight: '500',
  },
  favBtn: {
    padding: 8,
    marginTop: -4,
  },
  sectionContainer: {
    marginBottom: 8,
  },
  description: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'left',
    fontWeight: '400',
  },
  relatedSection: {
    marginTop: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'left',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomPriceCol: {
    flex: 1.1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  qtyBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
    alignSelf: 'flex-end',
  },
  qtyBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  bottomPriceText: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
  },
  bottomCurrencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  bottomOldPriceText: {
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
    fontWeight: '500',
    marginLeft: 8,
  },
  bottomActionCol: {
    flex: 1.4,
    justifyContent: 'center',
  },
  addToCartBtnSolid: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  addToCartTextSolid: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  plusCircle: {
    width: 24,
    height: 24,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 52,
    paddingHorizontal: 6,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  stepperValueBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 16,
  }
});
