import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Clock, Package, CheckCircle, Truck, XCircle, MapPin, Zap } from 'lucide-react-native';
import api from '@/lib/api';
import LiveTrackingMap from '@/components/LiveTrackingMap';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';

const StatusConfig: any = {
  'pending': { label: 'تم الطلب', color: '#F59E0B', icon: Clock },
  'processing': { label: 'قيد التحضير', color: '#3B82F6', icon: Package },
  'ready': { label: 'جاهز', color: '#8B5CF6', icon: Package },
  'out_for_delivery': { label: 'في الطريق', color: '#10B981', icon: Truck },
  'delivered': { label: 'تم التسليم', color: '#10B981', icon: CheckCircle },
  'cancelled': { label: 'ملغي', color: '#EF4444', icon: XCircle },
};

export default function OrderDetailScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);

  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchOrder();
    
    // Poll for status updates every 10 seconds
    const interval = setInterval(() => {
      fetchOrder();
    }, 10000);

    return () => clearInterval(interval);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    setCancelling(true);
    try {
      await api.post(`/orders/${id}/cancel`);
      fetchOrder(); // refresh data
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>الطلب غير موجود</Text>
      </View>
    );
  }

  const status = StatusConfig[order.status] || StatusConfig['pending'];
  const Icon = status.icon;

  const OrderTimeline = ({ currentStatus }: { currentStatus: string }) => {
    const steps = [
      { key: 'pending', label: 'تم الطلب' },
      { key: 'processing', label: 'قيد التحضير' },
      { key: 'out_for_delivery', label: 'في الطريق' },
      { key: 'delivered', label: 'تم التوصيل' }
    ];
    
    let normalizedStatus = currentStatus?.trim()?.toLowerCase() || 'pending';
    // If the status is 'ready' on the backend, map it to 'processing' visually since we removed the 'ready' step
    if (normalizedStatus === 'ready') normalizedStatus = 'processing';

    const currentIndex = steps.findIndex(s => s.key === normalizedStatus) === -1 ? 0 : steps.findIndex(s => s.key === normalizedStatus);
    if (normalizedStatus === 'cancelled') return null;

    return (
      <View style={styles.timelineContainer}>
        {/* Background Line */}
        <View style={styles.timelineLineBg} />
        {/* Active Line Wrapper to match steps direction */}
        <View style={styles.timelineActiveWrapper}>
          <View style={[styles.timelineLineActive, { width: `${(currentIndex / (steps.length - 1)) * 100}%` }]} />
        </View>
        
        <View style={styles.timelineStepsWrapper}>
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentIndex;
            const isActive = idx === currentIndex;
            return (
              <View key={step.key} style={styles.timelineStep}>
                <View style={[styles.timelineIconWrapper, isCompleted ? styles.timelineIconCompleted : styles.timelineIconPending]}>
                  {isCompleted ? (
                    <CheckCircle color="#fff" size={14} />
                  ) : (
                    <View style={styles.timelineDot} />
                  )}
                </View>
                <Text style={[styles.timelineText, isActive ? styles.textPrimary : (isCompleted ? styles.textWhite : styles.textGray)]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const DeliveryETA = ({ orderData }: { orderData: any }) => {
    const currentStatus = orderData.status?.trim()?.toLowerCase();
    if (currentStatus === 'delivered' || currentStatus === 'cancelled') return null;

    return (
      <View style={styles.etaContainer}>
        <View style={styles.etaLeft}>
          <View style={styles.etaIconWrapper}>
            <Clock color={Colors.primary} size={20} />
          </View>
          <View>
            <Text style={styles.etaTitle}>الوقت المتوقع للوصول</Text>
            <Text style={styles.etaSubtitle}>
              {currentStatus === 'out_for_delivery' ? 'المندوب في الطريق إليك!' : 'نعمل بأقصى سرعة لتجهيز طلبك'}
            </Text>
          </View>
        </View>
        <View style={styles.etaRight}>
          <Text style={styles.etaMins}>30 - 45</Text>
          <Text style={styles.etaLabel}>دقيقة</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفاصيل الطلب #{order.id}</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Section */}
        <View style={styles.statusSection}>
          <View style={styles.statusHeaderRow}>
            <Text style={styles.statusSectionTitle}>حالة الطلب</Text>
            {order.status === 'pending' && (
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={cancelOrder}
                disabled={cancelling}
              >
                {cancelling ? <ActivityIndicator color={Colors.danger} size="small" /> : <Text style={styles.cancelBtnText}>إلغاء الطلب</Text>}
              </TouchableOpacity>
            )}
          </View>
          
          <OrderTimeline currentStatus={order.status} />
          <DeliveryETA orderData={order} />
          
          {order.status?.trim()?.toLowerCase() === 'out_for_delivery' && (
            <TouchableOpacity 
              style={styles.trackBtn}
              onPress={() => setShowMap(true)}
            >
              <MapPin color="#fff" size={20} />
              <Text style={styles.trackBtnText}>تتبع المندوب على الخريطة</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>موقع التوصيل</Text>
          <View style={styles.infoCard}>
            <MapPin color={Colors.textMuted} size={20} style={{ marginLeft: 12 }} />
            <Text style={styles.infoText}>{order.delivery_address || order.shipping_address || 'لم يتم تحديد عنوان'}</Text>
          </View>
          
          {order.notes && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>ملاحظات الطلب</Text>
              <View style={[styles.infoCard, { backgroundColor: Colors.surfaceAlt }]}>
                <Text style={styles.infoText}>{order.notes}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>عناصر الطلب ({order.items?.length || 0})</Text>
          <View style={styles.itemsCard}>
            {order.items?.map((item: any, index: number) => {
              let image = item.product?.image || item.product?.image_url;
              if (typeof image === 'string' && image.startsWith('[')) {
                try {
                  const parsed = JSON.parse(image);
                  if (Array.isArray(parsed) && parsed.length > 0) image = parsed[0];
                } catch (e) {}
              }
              const rawUrl = image?.startsWith('http') 
                ? image 
                : `https://bestmarketsy.com/storage/${image}`;
              const imageUrl = encodeURI(rawUrl.replace(/^http:\/\//i, 'https://'));

              return (
                <View key={item.id} style={[styles.itemRow, index > 0 && styles.itemBorder]}>
                  <View style={styles.itemImageContainer}>
                    {image ? (
                      <Image source={{ uri: imageUrl }} style={styles.itemImage} />
                    ) : (
                      <Package color={Colors.textMuted} size={20} />
                    )}
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.product?.name || `منتج #${item.product_id}`}</Text>
                    <Text style={styles.itemQty}>{item.price} ل.س × {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemTotal}>{item.price * item.quantity} ل.س</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الملخص</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>المجموع الفرعي:</Text>
              <Text style={styles.summaryValue}>{parseFloat(order.total_amount).toLocaleString()} ل.س</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>رسوم التوصيل:</Text>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>مجاني</Text>
              </View>
            </View>
            <View style={[styles.summaryRow, styles.finalRow]}>
              <Text style={styles.finalLabel}>الإجمالي الكلي:</Text>
              <Text style={styles.finalValue}>{parseFloat(order.total_amount).toLocaleString()} ل.س</Text>
            </View>
            
            {/* Best Points */}
            <View style={styles.pointsFooter}>
              <View style={styles.pointsLeft}>
                <View style={styles.zapIconWrapper}>
                  <Zap color={Colors.primary} size={16} />
                </View>
                <Text style={styles.pointsLabel}>
                  {order.status === 'delivered' ? 'نقاط مكتسبة:' : 'نقاط ستحصل عليها:'}
                </Text>
              </View>
              <Text style={styles.pointsValue}>
                {Math.floor(parseFloat(order.total_amount) / 100)} <Text style={styles.pointsLabel}>نقطة</Text>
              </Text>
            </View>
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <LiveTrackingMap
          customerLat={Number(order.latitude) || 33.5138}
          customerLng={Number(order.longitude) || 36.2765}
          driverLat={Number(order.delivery?.current_lat) || 33.5138}
          driverLng={Number(order.delivery?.current_lng) || 36.2765}
          onClose={() => setShowMap(false)}
        />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  backBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  trackBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineContainer: {
    position: 'relative',
    marginVertical: 16,
    alignItems: 'center',
  },
  timelineLineBg: {
    position: 'absolute',
    top: 14,
    left: '5%',
    right: '5%',
    height: 2,
    backgroundColor: Colors.border,
    zIndex: 0,
  },
  timelineActiveWrapper: {
    position: 'absolute',
    top: 14,
    left: '5%',
    right: '5%',
    flexDirection: 'row',
    zIndex: 0,
  },
  timelineLineActive: {
    height: 2,
    backgroundColor: Colors.primary,
  },
  timelineStepsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 1,
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineIconCompleted: {
    backgroundColor: Colors.primary,
  },
  timelineIconPending: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  timelineText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  textPrimary: { color: Colors.primary },
  textWhite: { color: Colors.text },
  textGray: { color: Colors.textSecondary },
  etaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  etaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  etaIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  etaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  etaSubtitle: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  etaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  etaTime: {
    textAlign: 'center',
  },
  etaMins: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
  },
  etaLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  cancelBtnText: {
    color: Colors.danger,
    fontWeight: 'bold',
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  itemsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemImageContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemQty: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  itemTotal: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  summaryValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  finalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 0,
  },
  finalLabel: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  finalValue: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 18,
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  freeBadgeText: {
    color: Colors.success,
    fontWeight: 'bold',
    fontSize: 14,
  },
  pointsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    marginTop: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginHorizontal: -16,
    marginBottom: -16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pointsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zapIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textMuted,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  }
});
