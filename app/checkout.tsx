import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, MapPin, CheckCircle, Truck, PhoneCall, BellOff, DoorOpen, Banknote, Locate } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useShallow } from 'zustand/react/shallow';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import api from '@/lib/api';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import MapPicker from '@/components/MapPicker';
import StepIndicator from '@/components/StepIndicator';
import { useCustomAlert } from '@/contexts/CustomAlertContext';

const mapHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { margin: 0; padding: 0; background-color: #1E1E1E; }
        #map { width: 100vw; height: 100vh; }
        .leaflet-control-container { display: none; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', {
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
            attributionControl: false
        }).setView([34.7324, 36.7138], 15);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);

        var customIcon = L.divIcon({
            html: '<div style="background-color: #F97316; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>',
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        L.marker([34.7324, 36.7138], {icon: customIcon}).addTo(map);
    </script>
</body>
</html>
`;

const AddressFormContent = React.memo(({ setStep, markerCoord, onAddressSaved, Colors, styles }: any) => {
  const [newNote, setNewNote] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSave = async () => {
    setIsSavingAddress(true);
    setLocalError('');
    try {
      let finalTitle = 'موقع جديد';
      try {
        let [geo] = await Location.reverseGeocodeAsync({
          latitude: markerCoord.latitude,
          longitude: markerCoord.longitude,
        });
        if (geo) {
          const city = geo.city || geo.region || geo.subregion || '';
          const street = geo.street || geo.name || geo.district || '';
          if (city || street) {
            finalTitle = [city, street].filter(Boolean).join(' - ');
          }
        }
      } catch (geocodingError) {
        console.log('Reverse geocoding failed', geocodingError);
      }

      await api.post('/addresses', {
        title: finalTitle,
        details: newNote.trim() || 'لا يوجد ملاحظات',
        latitude: String(markerCoord.latitude),
        longitude: String(markerCoord.longitude),
        is_default: true
      });
      await onAddressSaved();
    } catch (e) {
      setLocalError('حدث خطأ أثناء حفظ العنوان');
    } finally {
      setIsSavingAddress(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.modalOverlay}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>تفاصيل العنوان</Text>
          <TouchableOpacity onPress={() => setStep('map')}>
            <Text style={styles.closeBtnText}>رجوع</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          {localError ? <Text style={{color: Colors.danger, marginBottom: 12}}>{localError}</Text> : null}
          <Text style={styles.inputLabel}>ملاحظة للمندوب (اختياري)</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="مثال: جانب الصيدلية، الطابق الثاني..."
            placeholderTextColor={Colors.textMuted}
            value={newNote}
            onChangeText={setNewNote}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity 
            activeOpacity={0.8}
            style={[styles.saveAddressBtn, { marginTop: 24, marginBottom: 40 }]}
            onPress={handleSave}
            disabled={isSavingAddress}
          >
            {isSavingAddress ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveAddressText}>حفظ وإتمام الطلب</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
});

export default function CheckoutScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { showAlert } = useCustomAlert();

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { items, getSubtotal, getDiscountAmount, getFinalTotal, clearCart, appliedCoupon } = useCartStore(useShallow(state => ({
    items: state.items,
    getSubtotal: state.getSubtotal,
    getDiscountAmount: state.getDiscountAmount,
    getFinalTotal: state.getFinalTotal,
    clearCart: state.clearCart,
    appliedCoupon: state.appliedCoupon,
  })));
  const user = useAuthStore(state => state.user);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // Map Picker Modal State
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'map' | 'form'>('map');
  const [mapRegion, setMapRegion] = useState({
    latitude: 34.7324,
    longitude: 36.7137,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [markerCoord, setMarkerCoord] = useState({ latitude: 34.7324, longitude: 36.7137 });
  const [isLocating, setIsLocating] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');

  const subtotal = useMemo(() => getSubtotal(), [items, getSubtotal]);
  const discountAmount = useMemo(() => getDiscountAmount(), [items, appliedCoupon, getDiscountAmount]);
  const finalTotal = useMemo(() => getFinalTotal(), [items, appliedCoupon, getFinalTotal]);

  const fetchAddresses = async () => {
    try {
      const res = await api.get('/addresses');
      const data = res.data.data || res.data;
      if (Array.isArray(data)) {
        setAddresses(data);
        if (data.length === 0) {
          setShowModal(true);
          setStep('map');
          handleLocateMe();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAddresses();
    } else {
      setLoadingAddresses(false);
    }
  }, [user]);

  const handleLocateMe = async () => {
    try {
      setIsLocating(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('تنبيه', 'الرجاء إعطاء صلاحية الوصول للموقع');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setMapRegion({ ...mapRegion, ...coords });
      setMarkerCoord(coords);
    } catch (error) {
      console.log(error);
      showAlert('خطأ', 'تعذر الحصول على الموقع الحالي');
    } finally {
      setIsLocating(false);
    }
  };

  const onAddressSaved = async () => {
    setShowModal(false);
    await fetchAddresses();
  };

  const handleCheckout = async () => {
    if (addresses.length === 0) {
      setError('الرجاء إضافة عنوان توصيل أولاً');
      return;
    }

    if (items.length === 0) {
      setError('السلة فارغة');
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const defaultAddress = addresses.find(a => a.is_default) || addresses[0];
      const addressString = `${defaultAddress.title} (${defaultAddress.details})`;

      const orderData = {
        shipping_address: addressString,
        latitude: defaultAddress.latitude,
        longitude: defaultAddress.longitude,
        notes: '',
        delivery_time: 'في أسرع وقت',
        payment_method: paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'بطاقة إلكترونية',
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        })),
        coupon_code: appliedCoupon || null,
        discount_amount: discountAmount,
        total_amount: finalTotal,
      };

      const points = Math.floor(finalTotal / 100);
      setEarnedPoints(points);

      const response = await api.post('/orders', orderData);
      const newOrderId = response.data.id || response.data.order?.id || response.data.data?.id || '';
      setOrderId(String(newOrderId));
      
      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoading(false);
      setSuccess(true);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert('خطأ في الطلب', err.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب');
      setError(err.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerRight}>
            <View style={styles.headerTitles}>
              <Text style={styles.headerTitle}>تم الطلب</Text>
            </View>
          </View>
        </View>

        <StepIndicator currentStep={3} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <CheckCircle color={Colors.success} size={80} style={{ marginBottom: 24 }} />
          <Text style={styles.successTitle}>تم استلام طلبك بنجاح!</Text>
          {orderId ? (
            <View style={{ backgroundColor: Colors.surfaceAlt, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginVertical: 16, borderWidth: 1, borderColor: Colors.border }}>
              <Text style={{ color: Colors.text, fontSize: 18, fontWeight: 'bold' }}>رقم الطلب: #{orderId}</Text>
            </View>
          ) : null}
          <Text style={styles.successText}>سيتم التوصيل إلى عنوانك خلال 15-25 دقيقة.</Text>

          {earnedPoints > 0 && (
            <View style={{ backgroundColor: '#FFF4E6', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12 }}>
              <Text style={{ color: '#EA580C', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                ستحصل على {earnedPoints} نقطة بعد اكتمال الطلب ضمن خليك BEST! 🌟
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, { alignSelf: 'center', width: '80%', marginTop: 16, borderRadius: 100 }]} 
            onPress={() => router.replace('/orders')}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { textAlign: 'center' }]}>متابعة طلباتي</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowRight color={Colors.text} size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>إتمام الطلب</Text>
          </View>
        </View>
      </View>

      <StepIndicator currentStep={2} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 120 }}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loadingAddresses ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : addresses.length === 0 ? (
          /* First Time Address Prompt */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>أين نوصل طلبك؟</Text>
            <View style={{ padding: 16, paddingTop: 0 }}>
              <Text style={{ color: Colors.textMuted, marginBottom: 16 }}>
                يرجى إضافة عنوان التوصيل باستخدام الخريطة لتتمكن من إتمام الطلب.
              </Text>
              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.saveAddressBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowModal(true);
                  setStep('map');
                  handleLocateMe();
                }}
              >
                <Locate color="#fff" size={20} />
                <Text style={[styles.saveAddressText, { marginLeft: 8 }]}>تحديد موقع التوصيل</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Address Card (Map + Details) */
          <View style={styles.card}>
            <View style={styles.mapPlaceholder}>
              <WebView
                source={{ html: mapHtml }}
                style={styles.webview}
                scrollEnabled={false}
                pointerEvents="none"
              />
              <View style={styles.mapGradientOverlay} />
            </View>

            <View style={styles.addressInfoBox}>
              <View style={styles.addressInfoLeft}>
                <Text style={styles.addressTitle}>{addresses.find(a => a.is_default)?.title || addresses[0]?.title || 'المنزل'}</Text>
                <Text style={styles.addressSub}>{addresses.find(a => a.is_default)?.details || addresses[0]?.details}</Text>
              </View>
              <View style={styles.addressInfoRight}>
                <MapPin color={Colors.text} size={20} style={{ marginBottom: 'auto' }} />
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 }}>
              <Text style={[styles.addressSub, { marginBottom: 0 }]}>رقم الموبايل: {'\u200E' + (user?.phone?.replace('+963', '+963 ') || '+963 9XX XXX XXX')}</Text>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/profile/addresses');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.changeBtnText}>تغيير</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Delivery Info Card */}
        <View style={styles.card}>
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryTextCol}>
              <Text style={styles.deliveryTitle}>التوصيل</Text>
              <Text style={styles.deliverySub}>يصل خلال 15 - 25 دقيقة تقريباً</Text>
            </View>
            <Truck color={Colors.text} size={24} />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>طريقة الدفع</Text>
          <TouchableOpacity 
            style={[styles.paymentRow, paymentMethod === 'cod' && styles.paymentRowSelected]}
            onPress={() => setPaymentMethod('cod')}
            activeOpacity={0.9}
          >
            <View style={styles.paymentRight}>
              <Banknote color={paymentMethod === 'cod' ? Colors.primary : Colors.text} size={24} />
              <View>
                <Text style={styles.paymentTitle}>الدفع عند الاستلام</Text>
                <Text style={styles.paymentSub}>نقداً عند الاستلام</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, paymentMethod === 'cod' && styles.radioCircleSelected]}>
              {paymentMethod === 'cod' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ملخص الطلب</Text>
          <View style={styles.summaryContainer}>
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
              <Text style={styles.totalAmount}>{finalTotal.toLocaleString()} ل.س</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <TouchableOpacity 
          style={[styles.placeOrderBtn, addresses.length === 0 && { backgroundColor: Colors.surfaceAlt }]} 
          onPress={handleCheckout} 
          disabled={loading || addresses.length === 0}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>تأكيد الطلب • {finalTotal.toLocaleString()} ل.س</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Address Picker Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        {step === 'map' ? (
          <View style={{ flex: 1, backgroundColor: Colors.background }}>
            <MapPicker
              region={mapRegion}
              setRegion={setMapRegion}
              markerCoord={markerCoord}
              setMarkerCoord={setMarkerCoord}
              isLocating={isLocating}
              onLocateMe={handleLocateMe}
              fullScreen={true}
            />

            <View style={[styles.modalHeaderMap, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalBackCircle}>
                <ArrowRight color={Colors.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>تحديد الموقع</Text>
              <View style={{ width: 44 }} />
            </View>

            <TouchableOpacity onPress={handleLocateMe} style={[styles.floatingLocateBtn, { bottom: insets.bottom + 100 }]}>
              {isLocating ? <ActivityIndicator color={Colors.primary} /> : <Locate color={Colors.primary} size={24} />}
            </TouchableOpacity>

            <View style={[styles.modalBottomBar, { paddingBottom: insets.bottom + 20 }]}>
               <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => setStep('form')} activeOpacity={0.9}>
                 <Text style={styles.modalConfirmBtnText}>تأكيد وإدخال التفاصيل</Text>
               </TouchableOpacity>
            </View>
          </View>
        ) : (
          <AddressFormContent 
            setStep={setStep} 
            markerCoord={markerCoord} 
            onAddressSaved={onAddressSaved}
            Colors={Colors} 
            styles={styles} 
          />
        )}
      </Modal>
    </View>
  );
}

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitles: {
    alignItems: 'flex-start',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapPlaceholder: {
    height: 140,
    backgroundColor: '#fff', 
    position: 'relative',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mapGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  addressInfoBox: {
    flexDirection: 'row',
    padding: 16,
  },
  addressInfoRight: {
    marginLeft: 16,
    paddingTop: 4,
  },
  addressInfoLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  addressTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  addressSub: {
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: 4,
  },
  changeBtn: {
  },
  changeBtnText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveAddressBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveAddressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  deliveryTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  deliveryTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  deliverySub: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    padding: 16,
    paddingBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 0,
  },
  paymentRowSelected: {
  },
  paymentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  paymentTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentSub: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  summaryContainer: {
    padding: 16,
    paddingTop: 0,
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
    marginBottom: 8,
  },
  totalLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  totalAmount: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtnText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  modalBody: {
    flex: 1,
  },
  inputLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalHeaderMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  modalBackCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  floatingLocateBtn: {
    position: 'absolute',
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  modalBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalConfirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  placeOrderBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 100, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  successText: {
    fontSize: 15,
    color: Colors.textMuted,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  }
});
