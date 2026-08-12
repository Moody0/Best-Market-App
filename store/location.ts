import { create } from 'zustand';
import api from '@/lib/api';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

interface LocationState {
  displayAddress: string;
  setDisplayAddress: (address: string) => void;
  isLocationModalVisible: boolean;
  setLocationModalVisible: (visible: boolean) => void;
  addresses: any[];
  setAddresses: (addresses: any[]) => void;
  fetchAddress: (token: string | null) => Promise<void>;
  requestAndSetLocation: (isManualClick?: boolean) => Promise<void>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  displayAddress: 'حدد موقع التوصيل',
  setDisplayAddress: (displayAddress) => set({ displayAddress }),
  isLocationModalVisible: false,
  setLocationModalVisible: (isLocationModalVisible) => set({ isLocationModalVisible }),
  addresses: [],
  setAddresses: (addresses) => set({ addresses }),

  fetchAddress: async (token) => {
    if (!token) {
      get().requestAndSetLocation();
      return;
    }
    try {
      const res = await api.get('/addresses');
      const data = res.data.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        set({ addresses: data });
        const defaultAddr = data.find((a: any) => a.is_default) || data[0];
        set({ displayAddress: defaultAddr.details || 'حدد موقع التوصيل' });
      } else {
        set({ addresses: [] });
        get().requestAndSetLocation();
      }
    } catch (e) {
      get().requestAndSetLocation();
    }
  },

  requestAndSetLocation: async (isManualClick = false) => {
    if (isManualClick) {
      try { Haptics.selectionAsync(); } catch (e) {}
      set({ displayAddress: 'جاري تحديد الموقع...' });
    }
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        set({ displayAddress: 'حدد موقع التوصيل' });
        if (isManualClick) Alert.alert('تنبيه', 'يرجى إعطاء صلاحية الوصول للموقع في الإعدادات');
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        const addressParts = [place.street || place.name, place.city || place.subregion, place.country].filter(Boolean);
        const addressStr = addressParts.join('، ');
        set({ displayAddress: addressStr || 'حدد موقع التوصيل' });
        if (isManualClick) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        set({ displayAddress: 'حدد موقع التوصيل' });
        if (isManualClick) Alert.alert('تنبيه', 'لم نتمكن من تحديد تفاصيل موقعك بدقة');
      }
    } catch (e) {
      console.warn('Error fetching location:', e);
      set({ displayAddress: 'حدد موقع التوصيل' });
      if (isManualClick) Alert.alert('تنبيه', 'لا يمكن جلب موقعك الحالي. تأكد من تفعيل خدمات الموقع (GPS).');
    }
  },
}));
