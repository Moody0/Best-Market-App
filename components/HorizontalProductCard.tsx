import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ShoppingCart, Heart, Plus, Minus, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import api from '@/lib/api';
import { normalizeImageUrl } from '@/lib/ImagePrefetchManager';
import CachedImage from '@/components/CachedImage';
import * as Haptics from 'expo-haptics';
import { useCustomAlert } from '@/contexts/CustomAlertContext';

interface Product {
  id: number;
  name: string;
  price: number;
  old_price?: number;
  image_url: string;
  image?: string;
  discount_percentage?: number;
  unit?: string;
  weight?: string;
  is_favorite?: boolean;
}

export default React.memo(function HorizontalProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const addItem = useCartStore(state => state.addItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const quantity = useCartStore(state => state.itemQuantities?.[product.id] || 0);
  const token = useAuthStore(state => state.token);
  const { showAlert } = useCustomAlert();

  const [isFavorite, setIsFavorite] = useState(Boolean(product.is_favorite));

  useEffect(() => {
    setIsFavorite(Boolean(product.is_favorite));
  }, [product.is_favorite]);

  const imageUrl = normalizeImageUrl(product.image || product.image_url);

  const toggleFavorite = useCallback(async (e: any) => {
    e.stopPropagation();
    if (!token) {
      showAlert('تنبيه', 'يجب تسجيل الدخول لإضافة المنتجات إلى المفضلة', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الدخول', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newFavState = !isFavorite;
    setIsFavorite(newFavState);
    try {
      await api.post(`/favorites/${product.id}/toggle`);
    } catch (err) {
      setIsFavorite(!newFavState);
    }
  }, [token, isFavorite, product.id, showAlert, router]);

  const handleAddToCart = useCallback((e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: imageUrl,
      quantity: 1,
    });
  }, [product.id, product.name, product.price, imageUrl, addItem]);

  const handleIncrement = useCallback((e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQuantity(product.id, quantity + 1);
  }, [product.id, quantity, updateQuantity]);

  const handleDecrement = useCallback((e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (quantity === 1) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, quantity - 1);
    }
  }, [product.id, quantity, updateQuantity, removeItem]);

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/product/${product.id}`)}
      activeOpacity={1}
    >
      <View style={styles.imageContainer}>
        <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
        <CachedImage uri={imageUrl} style={styles.image} resizeMode="contain" />
        {product.discount_percentage ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discount_percentage}%-</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={toggleFavorite}
            activeOpacity={0.7}
          >
            <Heart 
              color={isFavorite ? colors.danger : colors.textMuted} 
              fill={isFavorite ? colors.danger : 'transparent'} 
              size={18} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {Number.isInteger(product.price) ? product.price : Number(product.price).toFixed(2)} ل.س
            </Text>
            {product.old_price && (
              <Text style={styles.oldPrice}>
                {Number.isInteger(product.old_price) ? product.old_price : Number(product.old_price).toFixed(2)} ل.س
              </Text>
            )}
          </View>

          {quantity > 0 ? (
            <View style={styles.stepperContainer}>
              <TouchableOpacity style={styles.stepperBtn} onPress={handleIncrement}>
                <Plus color="#fff" size={14} />
              </TouchableOpacity>
              <Text style={styles.stepperQty}>{quantity}</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={handleDecrement}>
                {quantity === 1 ? (
                  <Trash2 color={colors.danger} size={14} />
                ) : (
                  <Minus color="#fff" size={14} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addToCartButton}
              onPress={handleAddToCart}
              activeOpacity={0.8}
            >
              <ShoppingCart color="#fff" size={14} />
              <Text style={styles.addToCartText}>أضف</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const getStyles = (colors: ThemePalette) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    height: 120,
  },
  imageContainer: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    borderRightWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  unitText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  price: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  oldPrice: {
    color: colors.textMuted,
    fontSize: 11,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  addToCartButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  addToCartText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 4,
    paddingVertical: 4,
    width: 80,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperQty: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
