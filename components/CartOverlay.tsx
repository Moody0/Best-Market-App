import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, Modal, Pressable, Dimensions, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Trash2, Plus, Minus, ShoppingCart, Tag, X, ArrowRight, ArrowLeft, Package } from 'lucide-react-native';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useShallow } from 'zustand/react/shallow';
import api from '@/lib/api';
import StepIndicator from '@/components/StepIndicator';
import ConfirmModal from '@/components/ConfirmModal';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useCustomAlert } from '@/contexts/CustomAlertContext';
import * as Haptics from 'expo-haptics';
import Reanimated, { FadeInDown, FadeOutLeft, LinearTransition, useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';

const CartItem = React.memo(({ item, Colors, styles, updateQuantity, onPromptDelete }: any) => {
  const plusScale = useSharedValue(1);
  const minusScale = useSharedValue(1);

  const plusStyle = useAnimatedStyle(() => ({ transform: [{ scale: plusScale.value }] }));
  const minusStyle = useAnimatedStyle(() => ({ transform: [{ scale: minusScale.value }] }));

  // Fix Image URL
  const imageString = item.image_url || item.image;
  const imageUrl = imageString && imageString !== 'undefined' && imageString !== 'null'
    ? (imageString.startsWith('http') || imageString.startsWith('/')
      ? imageString 
      : `http://bestmarketsy.com/storage/${imageString}`)
    : null;

  return (
    <Reanimated.View 
      style={styles.cartItem}
      layout={LinearTransition} 
      entering={FadeInDown} 
      exiting={FadeOutLeft}
    >
      <View style={styles.imageBox}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        ) : (
          <Package color={Colors.textMuted} size={32} />
        )}
      </View>
      
      <View style={styles.itemInfo}>
        <View style={styles.itemHeaderRow}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <TouchableOpacity 
            activeOpacity={0.7}
            style={styles.deleteBtnInline}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onPromptDelete(item.product_id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 color={Colors.textMuted} size={18} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.itemPrice}>
          {Number(item.price).toLocaleString()} ل.س
        </Text>

        <View style={styles.actionRow}>
          <View style={styles.quantityPill}>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateQuantity(item.product_id, item.quantity + 1);
              }}
              onPressIn={() => plusScale.value = withSpring(0.85)}
              onPressOut={() => plusScale.value = withSpring(1)}
              activeOpacity={0.8}
            >
              <Reanimated.View style={[styles.qtyBtn, plusStyle]}>
                <Plus color={Colors.text} size={16} />
              </Reanimated.View>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (item.quantity === 1) {
                  onPromptDelete(item.product_id);
                } else {
                  updateQuantity(item.product_id, item.quantity - 1);
                }
              }}
              onPressIn={() => minusScale.value = withSpring(0.85)}
              onPressOut={() => minusScale.value = withSpring(1)}
              activeOpacity={0.8}
            >
              <Reanimated.View style={[styles.qtyBtn, minusStyle]}>
                <Minus color={item.quantity > 1 ? Colors.text : Colors.textMuted} size={16} />
              </Reanimated.View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Reanimated.View>
  );
});

const CartFooter = React.memo(({ onProceedToCheckout }: { onProceedToCheckout: () => void }) => {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  
  const { 
    items,
    getSubtotal, 
    getDiscountAmount, 
    getDeliveryFee, 
    getFinalTotal, 
    appliedCoupon,
    applyCoupon,
    removeCoupon
  } = useCartStore(useShallow(state => ({
    items: state.items,
    getSubtotal: state.getSubtotal,
    getDiscountAmount: state.getDiscountAmount,
    getDeliveryFee: state.getDeliveryFee,
    getFinalTotal: state.getFinalTotal,
    appliedCoupon: state.appliedCoupon,
    applyCoupon: state.applyCoupon,
    removeCoupon: state.removeCoupon,
  })));

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const subtotal = useMemo(() => getSubtotal(), [items, getSubtotal]);
  const discountAmount = useMemo(() => getDiscountAmount(), [items, appliedCoupon, getDiscountAmount]);
  const deliveryFee = useMemo(() => getDeliveryFee(), [items, getDeliveryFee]);
  const finalTotal = useMemo(() => getFinalTotal(), [items, appliedCoupon, getFinalTotal]);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsApplyingCoupon(true);
    setCouponMsg(null);
    
    setTimeout(async () => {
      try {
        const res = await applyCoupon(couponInput);
        setCouponMsg({ text: res.message, isError: !res.success });
        if (res.success) {
          setCouponInput('');
        }
      } catch (err) {
        setCouponMsg({ text: 'حدث خطأ غير متوقع', isError: true });
      } finally {
        setIsApplyingCoupon(false);
      }
    }, 600);
  };

  const handleRemoveCoupon = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeCoupon();
    setCouponMsg(null);
  };

  return (
    <>
      <View style={styles.couponContainer}>
        <View style={styles.couponHeader}>
          <Tag color={Colors.textMuted} size={16} />
          <Text style={styles.couponTitle}>كود الخصم / الكوبون</Text>
        </View>
        
        {appliedCoupon ? (
          <View style={styles.appliedCouponRow}>
            <View style={styles.appliedBadge}>
              <Text style={styles.appliedCodeText}>{appliedCoupon}</Text>
              <View style={styles.appliedDiscountBadge}>
                <Text style={styles.appliedDiscountText}>-{discountAmount.toLocaleString()} ل.س</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.removeCouponBtn} onPress={handleRemoveCoupon}>
              <X color={Colors.danger} size={18} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.couponInputRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="أدخل كود الخصم"
              placeholderTextColor={Colors.textMuted}
              value={couponInput}
              onChangeText={setCouponInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[styles.applyBtn, (!couponInput.trim() || isApplyingCoupon) && { opacity: 0.5 }]} 
              onPress={handleApplyCoupon}
              disabled={!couponInput.trim() || isApplyingCoupon}
            >
              <Text style={styles.applyBtnText}>{isApplyingCoupon ? 'جاري...' : 'تطبيق'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {couponMsg && (
          <Text style={[styles.couponMsgText, couponMsg.isError ? styles.errorMsg : styles.successMsg]}>
            {couponMsg.text}
          </Text>
        )}
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
          <Text style={styles.summaryValue}>{subtotal.toLocaleString()} ل.س</Text>
        </View>

        {discountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>الخصم ({appliedCoupon})</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>-{discountAmount.toLocaleString()} ل.س</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>التوصيل</Text>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>مجاني</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>الإجمالي الكلي</Text>
          <Text style={styles.totalAmount}>{finalTotal.toLocaleString()} <Text style={styles.currencyText}>ل.س</Text></Text>
        </View>

        <TouchableOpacity 
          style={styles.checkoutBtn} 
          onPress={onProceedToCheckout}
          activeOpacity={0.9}
        >
          <Text style={styles.checkoutText}>تأكيد الطلب والمتابعة</Text>
          <ArrowLeft color="#fff" size={20} />
        </TouchableOpacity>
      </View>
    </>
  );
});

// Design Tokens for Cart

export default function CartOverlay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { showAlert } = useCustomAlert();

  const { 
    items, 
    updateQuantity, 
    loadCart,
    toggleCart,
    isCartOpen,
  } = useCartStore(useShallow(state => ({
    items: state.items,
    updateQuantity: state.updateQuantity,
    loadCart: state.loadCart,
    toggleCart: state.toggleCart,
    isCartOpen: state.isCartOpen,
  })));

  const [deletePromptId, setDeletePromptId] = useState<number | null>(null);

  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isCartOpen) {
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [isCartOpen]);

  const handleClose = useCallback(() => {
    toggleCart(false);
  }, [toggleCart]);

  // Intercept hardware back button for fade out
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isCartOpen) {
        handleClose();
        return true; // Prevent default behavior
      }
      return false;
    });
    return () => subscription.remove();
  }, [handleClose, isCartOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    flex: 1,
    backgroundColor: Colors.background,
  }));

  // Phone Verification State
  const { user, setAuth } = useAuthStore(useShallow(state => ({ user: state.user, setAuth: state.setAuth })));
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    loadCart();
  }, []);



  const handleCloseModal = () => {
    setShowPhoneModal(false);
    setPhoneStep('phone');
    setPhoneError('');
    setPhoneInput('');
    setOtpInput('');
  };

  const handleProceedToCheckout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user) {
      router.push('/login');
      return;
    }
    if (!user.phone) {
      setShowPhoneModal(true);
      return;
    }
    router.push('/checkout');
  };

  const handleSendPhoneOTP = async () => {
    if (!phoneInput || phoneInput.length < 9) {
      setPhoneError('يرجى إدخال رقم هاتف صحيح');
      return;
    }
    setIsVerifying(true);
    setPhoneError('');
    try {
      const fullPhone = '+963' + phoneInput;
      
      // Check if phone is already registered first
      const checkRes = await api.post('/auth/check-phone', { phone: fullPhone });
      if (checkRes.data.exists) {
        setPhoneError('رقم الهاتف هذا مسجل مسبقاً بحساب آخر.');
        setIsVerifying(false);
        return;
      }
      
      await api.post('/auth/otp/send', { phone: fullPhone });
      setPhoneStep('otp');
    } catch (err: any) {
      setPhoneError(err.response?.data?.message || 'حدث خطأ أثناء إرسال الرمز');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    setOtpInput(cleanValue);
    if (cleanValue.length === 6) {
      // Auto submit when 6 digits are entered
      handleVerifyPhoneOTP(cleanValue);
    }
  };

  const handleVerifyPhoneOTP = async (code?: string) => {
    const finalOtp = code || otpInput;
    if (finalOtp.length !== 6) {
      setPhoneError('يرجى إدخال الرمز المكون من 6 أرقام');
      return;
    }
    setIsVerifying(true);
    setPhoneError('');
    try {
      const fullPhone = '+963' + phoneInput;
      const res = await api.post('/user/link-phone', { phone: fullPhone, otp: finalOtp });
      
      // Update local user state
      if (res.data.user) {
        const currentToken = useAuthStore.getState().token;
        if (currentToken) {
          setAuth(currentToken, res.data.user);
        }
      }
      
      setShowPhoneModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Automatically proceed to checkout
      setTimeout(() => {
        router.push('/checkout');
      }, 500);
      
    } catch (err: any) {
      let msg = err.response?.data?.message;
      if (err.response?.status === 404 || (msg && msg.includes('route'))) {
        msg = 'عذراً، الخادم قيد التحديث. يرجى المحاولة لاحقاً.';
      }
      setPhoneError(msg || 'رمز التحقق غير صحيح');
    } finally {
      setIsVerifying(false);
    }
  };


  const renderCartItem = useCallback(({ item }: any) => (
    <View style={{ paddingBottom: 16 }}>
      <CartItem item={item} Colors={Colors} styles={styles} updateQuantity={updateQuantity} onPromptDelete={setDeletePromptId} />
    </View>
  ), [Colors, styles, updateQuantity]);

  const keyExtractor = useCallback((item: any) => item.product_id.toString(), []);

  const renderFooter = useCallback(() => (
    <CartFooter onProceedToCheckout={handleProceedToCheckout} />
  ), [handleProceedToCheckout]);

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Reanimated.View style={[animatedStyle]}>
          <View style={[styles.emptyContainer, { paddingTop: insets.top, paddingBottom: insets.bottom, flex: 1, backgroundColor: Colors.background }]}>
            <View style={[styles.header, { position: 'absolute', top: insets.top, left: 0, right: 0 }]}>
              <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
                <ArrowRight color={Colors.text} size={24} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>السلة فارغة</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={styles.emptyCircle}>
              <ShoppingCart color={Colors.primary} size={48} />
            </View>
            <Text style={styles.emptyTitle}>سلة المشتريات فارغة</Text>
            <Text style={styles.emptyText}>لم تقم بإضافة أي منتجات للسلة بعد. تصفح الأقسام وابدأ التسوق!</Text>
            <TouchableOpacity 
              style={styles.shopBtn} 
              onPress={() => {
                handleClose();
                router.push('/products');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.shopBtnText}>تصفح المنتجات الآن</Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Reanimated.View style={[animatedStyle]}>
        <View style={[styles.container, { paddingTop: insets.top, flex: 1, backgroundColor: Colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
              <ArrowRight color={Colors.text} size={24} />
            </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>سلة المشتريات</Text>
        <View style={styles.itemCountBadge}>
          <Text style={styles.itemCountText}>{items.length} منتجات</Text>
        </View>
      </View>

      <StepIndicator currentStep={1} />
      
      <FlatList
        style={styles.contentScroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderCartItem}
        removeClippedSubviews={true}
        windowSize={5}
        initialNumToRender={5}
        ListFooterComponent={renderFooter}
      />

      {/* Phone Verification Modal */}
      {showPhoneModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تأكيد رقم الهاتف</Text>
            <Text style={styles.modalSub}>
              {phoneStep === 'phone' 
                ? 'يرجى إدخال رقم هاتفك لمتابعة الطلب، سيتم استخدامه للتواصل معك عند التوصيل.'
                : `تم إرسال رمز التحقق إلى رقمك ${phoneInput}`}
            </Text>

            {phoneStep === 'phone' ? (
              <View style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="رقم الهاتف (بدون 0)"
                  placeholderTextColor={Colors.textMuted}
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <Text style={styles.countryCode}>+963</Text>
              </View>
            ) : (
              <View style={styles.otpContainer}>
                {/* Visual Boxes */}
                {Array(6).fill(0).map((_, i) => {
                  const digit = otpInput[i] || '';
                  return (
                    <View key={i} style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}>
                      <Text style={styles.otpBoxText}>{digit}</Text>
                    </View>
                  );
                })}
                {/* Hidden Input overlaid on top */}
                <TextInput
                  style={styles.hiddenOtpInput}
                  maxLength={6}
                  keyboardType="number-pad"
                  value={otpInput}
                  onChangeText={handleOtpChange}
                  autoFocus
                  textContentType="oneTimeCode"
                />
              </View>
            )}

            {phoneError ? <Text style={styles.modalError}>{phoneError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowPhoneModal(false);
                  setPhoneStep('phone');
                  setPhoneError('');
                  setPhoneInput('');
                  setOtpInput('');
                }}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              
              {phoneStep === 'phone' && (
                <TouchableOpacity 
                  style={styles.modalConfirmBtn}
                  onPress={handleSendPhoneOTP}
                  disabled={isVerifying}
                >
                  <Text style={styles.modalConfirmText}>
                    {isVerifying ? 'جاري التحقق...' : 'إرسال الرمز'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      <ConfirmModal
        visible={deletePromptId !== null}
        title="تأكيد الإزالة"
        message="هل تريد بالتأكيد إزالة هذا المنتج من السلة؟"
        confirmText="إزالة"
        onConfirm={() => {
          if (deletePromptId !== null) {
            updateQuantity(deletePromptId, 0);
            setDeletePromptId(null);
          }
        }}
        onCancel={() => setDeletePromptId(null)}
        isDestructive={true}
      />
        </View>
      </Reanimated.View>
    </View>
  );
}

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  emptyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  shopBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100, // Fully rounded for CTA
  },
  shopBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  backBtn: {
    padding: 8,
    marginRight: -8,
  },
  itemCountBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  itemCountText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  itemsListContainer: {
    gap: 16,
    paddingTop: 16,
    marginBottom: 24,
  },
  cartItem: {
    flexDirection: 'row', 
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 16,
    position: 'relative',
  },
  deleteBtn: {
    position: 'absolute',
    top: 12,
    left: 12, // top left corner in LTR/RTL depending on what left maps to. For RTL this might be the actual physical left.
    padding: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    zIndex: 10,
  },
  imageBox: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#fff', 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deleteBtnInline: {
    padding: 4,
    marginLeft: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'left',
    flex: 1,
    lineHeight: 22,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'left',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  quantityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 100,
    padding: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 12,
    minWidth: 16,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  couponContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 32,
    marginBottom: 24,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  couponInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: Colors.text,
    textAlign: 'left',
    fontSize: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  appliedCouponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appliedCodeText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  appliedDiscountBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  appliedDiscountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  removeCouponBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  couponMsgText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'left',
    fontWeight: '600',
  },
  successMsg: {
    color: Colors.success,
  },
  errorMsg: {
    color: Colors.danger,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  freeBadgeText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  totalLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  totalAmount: {
    color: Colors.primary,
    fontSize: 26,
    fontWeight: '900',
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 100, // Pill shaped CTA
    gap: 12,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'left',
  },
  modalSub: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
    textAlign: 'left',
    lineHeight: 22,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalInput: {
    flex: 1,
    height: 54,
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'left',
  },
  countryCode: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  modalError: {
    color: Colors.danger,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'left',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalConfirmBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    position: 'relative',
    direction: 'ltr',
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
  },
  otpBoxText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  hiddenOtpInput: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0,
    color: 'transparent',
  },
});

