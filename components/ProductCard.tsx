import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Minus, Trash2, BadgePercent } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import { normalizeImageUrl } from '@/lib/ImagePrefetchManager';
import CachedImage from '@/components/CachedImage';
import * as Haptics from 'expo-haptics';
import { useCustomAlert } from '@/contexts/CustomAlertContext';

const { width } = Dimensions.get('window');
const gridCardWidth = width / 2 - 24;
const compactCardWidth = 150;

interface Product {
  id: number;
  name: string;
  price: number;
  old_price?: number;
  discount_price?: number;
  image_url: string;
  image?: string;
  discount_percentage?: number;
  unit?: string;
  weight?: string;
  is_favorite?: boolean;
}

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  numColumns?: number;
}

export default React.memo(function ProductCard({ product, compact, numColumns = 2 }: ProductCardProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  
  const cardWidth = compact ? compactCardWidth : (width / numColumns) - 20;

  const memoizedStyles = useMemo(() => ({
    card: [styles.card, { width: cardWidth }],
    imageContainer: [styles.imageContainer, { height: cardWidth }],
    addBtn: [styles.addBtn, numColumns === 3 && { width: 28, height: 28, borderRadius: 6 }],
    stepperContainer: [styles.stepperContainer, numColumns === 3 && { height: 28, paddingHorizontal: 0, borderRadius: 6 }],
    stepperBtn: [styles.stepperBtn, numColumns === 3 && { width: 24, height: 24 }],
    stepperQty: [styles.stepperQty, numColumns === 3 && { fontSize: 12, marginHorizontal: 4 }],
    name: [styles.name, numColumns === 3 && { fontSize: 12, lineHeight: 18 }, compact && { fontSize: 13 }],
    priceInteger: [styles.priceInteger, numColumns === 3 && { fontSize: 18 }],
    priceDecimal: [styles.priceDecimal, numColumns === 3 && { fontSize: 11 }],
    currency: [styles.currency, numColumns === 3 && { fontSize: 9, marginLeft: 2 }],
    oldPrice: [styles.oldPrice, numColumns === 3 && { fontSize: 10 }]
  }), [styles, cardWidth, numColumns, compact]);

  const addItem = useCartStore(state => state.addItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const quantity = useCartStore(state => state.itemQuantities?.[product.id] || 0);
  
  const token = useAuthStore(state => state.token);
  const { showAlert } = useCustomAlert();

  const imageUrl = normalizeImageUrl(product.image || product.image_url);


  const handleIncrement = useCallback((e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (quantity === 0) {
      addItem({
        product_id: product.id,
        name: product.name,
        price: product.discount_price || product.price,
        image_url: imageUrl,
        quantity: 1,
      });
    } else {
      updateQuantity(product.id, quantity + 1);
    }
  }, [product.id, product.name, product.price, product.discount_price, imageUrl, quantity, addItem, updateQuantity]);

  const handleDecrement = useCallback((e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (quantity === 1) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, quantity - 1);
    }
  }, [product.id, quantity, removeItem, updateQuantity]);

  return (
    <Pressable 
      style={memoizedStyles.card as any}
      onPress={() => router.push(`/product/${product.id}?category_id=${(product as any).category_id || ''}`)}
    >
      <View style={memoizedStyles.imageContainer as any}>
        <Animated.View sharedTransitionTag={'product-image-' + product.id} style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }}>
          <CachedImage 
            uri={imageUrl} 
            style={styles.image} 
            resizeMode="contain" 
          />
        </Animated.View>

        {product.discount_percentage ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>عرض بيست</Text>
            <BadgePercent color="#fff" size={14} style={{ marginLeft: 4 }} />
          </View>
        ) : null}
        {/* Floating Add/Stepper Button (Bottom Right) */}
        <View style={styles.floatingActionContainer}>
          {quantity === 0 ? (
            <TouchableOpacity 
              style={memoizedStyles.addBtn as any}
              onPress={handleIncrement}
              activeOpacity={0.8}
            >
              <Plus color={colors.primary} size={numColumns === 3 ? 16 : 20} />
            </TouchableOpacity>
          ) : (
            <View style={memoizedStyles.stepperContainer as any}>
              <TouchableOpacity style={memoizedStyles.stepperBtn as any} onPress={handleIncrement} activeOpacity={0.7}>
                <Plus color={colors.primary} size={numColumns === 3 ? 14 : 16} />
              </TouchableOpacity>
              <Text style={memoizedStyles.stepperQty as any}>{quantity}</Text>
              <TouchableOpacity style={memoizedStyles.stepperBtn as any} onPress={handleDecrement} activeOpacity={0.7}>
                {quantity === 1 ? (
                  <Trash2 color={colors.primary} size={numColumns === 3 ? 12 : 14} />
                ) : (
                  <Minus color={colors.primary} size={numColumns === 3 ? 14 : 16} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Card Info Body */}
      <View style={[styles.info, { flex: 1, justifyContent: 'space-between' }]}>
        <View>
          <Text style={memoizedStyles.name as any} numberOfLines={2}>
            {product.name}
          </Text>
        </View>

        <View style={styles.priceRow}>
          {product.discount_price && product.discount_price < product.price ? (
            <>
              <Text style={memoizedStyles.priceInteger as any}>{Math.floor(product.discount_price)}</Text>
              <Text style={memoizedStyles.priceDecimal as any}>
                ,{Math.round((product.discount_price % 1) * 100).toString().padEnd(2, '0')}
              </Text>
              <Text style={memoizedStyles.currency as any}>
                ل.س {product.unit ? `/ ${product.unit}` : ''}
              </Text>
              <Text style={memoizedStyles.oldPrice as any}>
                {Number(product.price).toFixed(0)} ل.س
              </Text>
            </>
          ) : (
            <>
              <Text style={memoizedStyles.priceInteger as any}>{Math.floor(product.price)}</Text>
              <Text style={memoizedStyles.priceDecimal as any}>
                ,{Math.round((product.price % 1) * 100).toString().padEnd(2, '0')}
              </Text>
              <Text style={memoizedStyles.currency as any}>
                ل.س {product.unit ? `/ ${product.unit}` : ''}
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const getStyles = (colors: ThemePalette) => StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    marginBottom: 20,
    marginHorizontal: 6,
    overflow: 'visible',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF', // Pure white to blend with product jpegs
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },

  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8, // Moved to left for RTL layout
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  discountText: {
    color: '#fff',
    fontFamily: 'Cairo_600SemiBold', // Thinner text
    fontSize: 11,
  },
  /* Floating Action Button (Add / Stepper) */
  floatingActionContainer: {
    position: 'absolute',
    bottom: 8, // Strictly inside the image container at the bottom right
    right: 8,
    zIndex: 10,
  },
  addBtn: {
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperQty: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 8,
  },
  /* Info Section */
  info: {
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'left',
    lineHeight: 20,
  },
  /* Price Row (Left to Right Layout naturally by using flexDirection row) */
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  priceInteger: {
    color: colors.primary, // Orange color
    fontSize: 22,
    fontWeight: '900',
  },
  priceDecimal: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginRight: 1,
  },
  currency: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    marginRight: 4,
  },
  oldPrice: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
});
