import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Package, CheckCircle, Truck, XCircle, RefreshCw, ArrowRight } from 'lucide-react-native';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as Haptics from 'expo-haptics';

const StatusConfig: any = {
  'pending': { label: 'تم الطلب', color: '#F59E0B', icon: Clock },
  'processing': { label: 'قيد التحضير', color: '#3B82F6', icon: Package },
  'ready': { label: 'جاهز', color: '#8B5CF6', icon: Package },
  'out_for_delivery': { label: 'في الطريق', color: '#10B981', icon: Truck },
  'delivered': { label: 'تم التسليم', color: '#10B981', icon: CheckCircle },
  'cancelled': { label: 'ملغي', color: '#EF4444', icon: XCircle },
};

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const addItem = useCartStore((state) => state.addItem);
  
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/orders');
      setOrders(res.data.data || res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [user]);

  const handleReorder = (order: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!order.items) return;
    
    order.items.forEach((item: any) => {
      const productObj = item.product || {};
      addItem({
        product_id: productObj.id || item.product_id,
        name: productObj.name || item.product_name || `منتج #${item.product_id}`,
        price: Number(productObj.price || item.price),
        image_url: productObj.image || '',
        quantity: Number(item.quantity) || 1
      });
    });

    useCartStore.getState().toggleCart(true);
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>يرجى تسجيل الدخول لعرض طلباتك</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/login')}>
          <Text style={styles.btnText}>تسجيل الدخول</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderOrder = ({ item }: { item: any }) => {
    const status = StatusConfig[item.status] || StatusConfig['pending'];
    const Icon = status.icon;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          Haptics.selectionAsync();
          router.push(`/order/${item.id}`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>طلب #{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <Icon color={status.color} size={14} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        
        {/* Product Images Stack */}
        {item.items && item.items.length > 0 && (
          <View style={styles.imagesStack}>
            {item.items.slice(0, 4).map((orderItem: any, index: number) => {
              let image = orderItem.product?.image || orderItem.product?.image_url;
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
                <View key={index} style={[styles.imageCircle, { zIndex: 4 - index }]}>
                  {image ? (
                    <Image source={{ uri: imageUrl }} style={styles.productImage} />
                  ) : (
                    <Package color={Colors.textMuted} size={16} />
                  )}
                </View>
              );
            })}
            {item.items.length > 4 && (
              <View style={styles.moreItemsBadge}>
                <Text style={styles.moreItemsText}>+{item.items.length - 4}</Text>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.cardBody}>
          <View>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('ar-SY')}</Text>
            <Text style={styles.total}>{parseFloat(item.total_amount).toLocaleString()} ل.س</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.reorderBtn} 
            onPress={() => handleReorder(item)}
          >
            <RefreshCw color={Colors.primary} size={16} />
            <Text style={styles.reorderBtnText}>إعادة طلب</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }} activeOpacity={0.7}>
          <ArrowRight color={Colors.text} size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلباتي</Text>
        <View style={{ width: 44 }} />
      </View>
      
      {orders.length === 0 ? (
        <View style={styles.center}>
          <Package color={Colors.textMuted} size={64} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>ليس لديك أي طلبات سابقة</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOrder}
          contentContainerStyle={[styles.list, { paddingBottom: 40 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        />
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  date: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  total: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagesStack: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imageCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.input,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8, // Negative margin for overlap
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  moreItemsBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.input,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  moreItemsText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  reorderBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  }
});
