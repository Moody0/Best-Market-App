import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, MapPin, Plus, Trash2, Locate } from 'lucide-react-native';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import api from '@/lib/api';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const MapPicker = React.lazy(() => import('@/components/MapPicker'));
import { useCustomAlert } from '@/contexts/CustomAlertContext';
import { useAuthStore } from '@/store/auth';
import { Redirect } from 'expo-router';

export default function AddressesScreen() {
  const token = useAuthStore(state => state.token);

  if (!token) {
    return <Redirect href="/login" />;
  }
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { showAlert } = useCustomAlert();

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<'map' | 'form'>('map');
  const [isAdding, setIsAdding] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 34.7324,
    longitude: 36.7137,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [markerCoord, setMarkerCoord] = useState({ latitude: 34.7324, longitude: 36.7137 });
  const [isLocating, setIsLocating] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    city: '',
    street: '',
    building: '',
    floor: '',
    apartment: ''
  });
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const handleMapConfirm = async () => {
    setIsReverseGeocoding(true);
    let addressName = addresses.length === 0 ? 'المنزل' : 'عنوان جديد';
    let detailsString = '';

    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status === 'granted') {
        let [geo] = await Location.reverseGeocodeAsync({
          latitude: markerCoord.latitude,
          longitude: markerCoord.longitude,
        });
        if (geo) {
          const city = geo.city || geo.region || geo.subregion || '';
          const street = geo.street || geo.name || geo.district || '';
          
          if (addresses.length > 0 && (street || city)) {
             addressName = [street, city].filter(Boolean).join('، ');
          }
          
          detailsString = [city, street].filter(Boolean).join(' - ');
        }
      } else {
        console.log('Location permission denied, skipping reverse geocoding');
      }
    } catch (e) {
      console.log('Reverse geocode error', e);
    }
    
    if (!detailsString) {
      detailsString = 'عنوان مضاف من الخريطة';
    }

    try {
      await api.post('/addresses', {
        title: addressName,
        details: detailsString,
        latitude: String(markerCoord.latitude),
        longitude: String(markerCoord.longitude),
        is_default: addresses.length === 0
      });
      
      setShowModal(false);
      fetchAddresses();
      showAlert('نجاح', 'تم إضافة العنوان بنجاح');
    } catch (error) {
      console.error(error);
      showAlert('خطأ', 'حدث خطأ أثناء إضافة العنوان');
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await api.get('/addresses');
      const data = res.data.data || res.data;
      if (Array.isArray(data)) {
        setAddresses(data);
      } else {
        setAddresses([]);
      }
    } catch (error: any) {
      console.log('Error fetching addresses (possibly guest):', error.message);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleLocateMe = async () => {
    try {
      setIsLocating(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('تنبيه', 'الرجاء إعطاء صلاحية الوصول للموقع', [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'الإعدادات', onPress: () => Linking.openSettings() }
        ]);
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

  const deleteAddress = (id: number) => {
    showAlert('حذف العنوان', 'هل أنت متأكد من حذف هذا العنوان؟', [
      { text: 'إلغاء', style: 'cancel' },
      { 
        text: 'حذف', 
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/addresses/${id}`);
          } catch (e) {
            // local state update if API fails or mock
          }
          setAddresses(prev => prev.filter(a => a.id !== id));
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderAddress = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.labelContainer}>
          <MapPin color={Colors.primary} size={18} />
          <Text style={styles.label}>{item.title}</Text>
        </View>
        <TouchableOpacity onPress={() => deleteAddress(item.id)}>
          <Trash2 color={Colors.danger} size={18} />
        </TouchableOpacity>
      </View>
      <Text style={styles.addressText}>{item.details}</Text>
      {item.is_default && <Text style={styles.instructionsText}>ملاحظات: {item.instructions}</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>عناويني المحفوظة</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        renderItem={renderAddress}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MapPin color={Colors.textMuted} size={64} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>لم تقم بإضافة أي عناوين بعد</Text>
          </View>
        }
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setStep('map');
            setShowModal(true);
          }}
          activeOpacity={0.7}
        >
          <Plus color="#fff" size={20} />
          <Text style={styles.addBtnText}>إضافة عنوان جديد</Text>
        </TouchableOpacity>
      </View>

      {/* Add Address Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.fullMapContainer}>
          <Suspense fallback={<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color={Colors.primary} /></View>}>
            <MapPicker
              region={mapRegion}
              setRegion={setMapRegion}
              markerCoord={markerCoord}
              setMarkerCoord={setMarkerCoord}
              isLocating={isLocating}
              onLocateMe={handleLocateMe}
              fullScreen={true}
            />
          </Suspense>

          <View style={[styles.mapOverlayHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.mapBackCircle}>
              <ArrowRight color={Colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.mapHeaderText}>تأكيد الموقع</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Floating Locate Me Button */}
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleLocateMe();
            }} 
            style={[styles.floatingLocateBtn, { bottom: insets.bottom + 100 }]}
            activeOpacity={0.7}
          >
            {isLocating ? <ActivityIndicator color={Colors.primary} /> : <Locate color={Colors.primary} size={24} />}
          </TouchableOpacity>

          {/* Bottom Sheet Bar */}
          <View style={[styles.mapBottomBar, { paddingBottom: insets.bottom + 20 }]}>
             <TouchableOpacity 
               style={styles.mapConfirmBtn} 
               onPress={() => {
                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                 handleMapConfirm();
               }} 
               activeOpacity={0.7} 
               disabled={isReverseGeocoding}
             >
               {isReverseGeocoding ? (
                 <ActivityIndicator color="#fff" />
               ) : (
                 <Text style={styles.mapConfirmBtnText}>تأكيد الموقع وحفظ</Text>
               )}
             </TouchableOpacity>
          </View>
        </View>
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
    paddingVertical: 14,
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  backBtn: {
    padding: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  addressText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 6,
  },
  instructionsText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'left',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: Colors.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'left',
  },
  input: {
    backgroundColor: Colors.input,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    color: Colors.text,
    textAlign: 'left',
    fontSize: 14,
    outlineStyle: 'none' as any,
  },
  fullMapContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapOverlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mapBackCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.input,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  floatingLocateBtn: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 4,
  },
  mapBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surfaceAlt,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.border,
    elevation: 10,
  },
  mapConfirmBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapConfirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
