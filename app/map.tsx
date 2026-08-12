import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ArrowRight, MapPin, Navigation } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemePalette } from '@/constants/Colors';
import { useLocationStore } from '@/store/location';
import MapPicker from '@/components/MapPicker';
import { useCustomAlert } from '@/contexts/CustomAlertContext';

export default function MapPickerScreen() {
  const router = useRouter();
  const { colors: Colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(Colors, isDark, insets), [Colors, isDark, insets]);
  const { showAlert } = useCustomAlert();
  
  const { setDisplayAddress } = useLocationStore();

  const [region, setRegion] = useState<any>({
    latitude: 30.0444,
    longitude: 31.2357,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [markerCoord, setMarkerCoord] = useState<{latitude: number, longitude: number}>({ latitude: 30.0444, longitude: 31.2357 });
  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [pickedAddress, setPickedAddress] = useState<string>('جاري تحديد الموقع...');
  const [isLocating, setIsLocating] = useState(true);
  const [locateMeCounter, setLocateMeCounter] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          status = (await Location.requestForegroundPermissionsAsync()).status;
        }
        
        if (status !== 'granted') {
          setIsLocating(false);
          setPickedAddress('يرجى تحديد موقعك على الخريطة');
          return;
        }

        let location = await Location.getLastKnownPositionAsync({});
        
        if (!location) {
           location = await Location.getCurrentPositionAsync({
             accuracy: Location.Accuracy.Balanced
           });
        }

        if (location) {
          const currentCoord = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setRegion({
            ...currentCoord,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
          setMarkerCoord(currentCoord);
          setLocateMeCounter(c => c + 1);
          await reverseGeocode(currentCoord.latitude, currentCoord.longitude);
        }
      } catch (e) {
        console.warn('Error fetching initial location:', e);
        setPickedAddress('يرجى تحديد موقعك على الخريطة');
      } finally {
        setIsLocating(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => {
      reverseGeocode(markerCoord.latitude, markerCoord.longitude);
    }, 500);
    return () => clearTimeout(timeout);
  }, [markerCoord.latitude, markerCoord.longitude]);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      setAddressLoading(true);
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const parts = [place.street || place.name, place.city || place.subregion, place.country].filter(Boolean);
        setPickedAddress(parts.join('، '));
      } else {
        setPickedAddress('لم نتمكن من تحديد تفاصيل الموقع');
      }
    } catch (e) {
      setPickedAddress('لم نتمكن من تحديد تفاصيل الموقع');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDisplayAddress(pickedAddress);
    router.back();
  };

  const goToCurrentLocation = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsLocating(true);
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const currentCoord = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setRegion({
        ...currentCoord,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setMarkerCoord(currentCoord);
      setLocateMeCounter(c => c + 1);
      await reverseGeocode(currentCoord.latitude, currentCoord.longitude);
    } catch (e) {
      showAlert('خطأ', 'لا يمكن جلب موقعك الحالي');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>حدد موقع التوصيل</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل الخريطة...</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <MapPicker
            fullScreen={true}
            region={region}
            setRegion={setRegion}
            markerCoord={markerCoord}
            setMarkerCoord={setMarkerCoord}
            isLocating={isLocating}
            onLocateMe={goToCurrentLocation}
            locateMeTrigger={locateMeCounter}
          />

          {/* Current Location Button */}
          <TouchableOpacity style={styles.myLocationBtn} onPress={goToCurrentLocation} disabled={isLocating}>
            {isLocating ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Navigation color={Colors.text} size={24} />
            )}
          </TouchableOpacity>

          {/* Bottom Info Card */}
          <View style={styles.bottomCard}>
            <Text style={styles.addressTitle}>موقع التوصيل</Text>
            <View style={styles.addressRow}>
              <MapPin color={Colors.textMuted} size={18} />
              {addressLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />
              ) : (
                <Text style={styles.addressText} numberOfLines={2}>{pickedAddress}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>تأكيد الموقع</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function getStyles(Colors: ThemePalette, isDark: boolean, insets: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Math.max(insets.top, 16) + 8,
      paddingBottom: 16,
      backgroundColor: Colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      zIndex: 10,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: Colors.text,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: Colors.textMuted,
    },
    mapContainer: {
      flex: 1,
      position: 'relative',
    },
    myLocationBtn: {
      position: 'absolute',
      left: 16,
      bottom: 200 + Math.max(insets.bottom, 16),
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: Colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    bottomCard: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: Colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: Math.max(insets.bottom, 16) + 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 10,
    },
    addressTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.textMuted,
      marginBottom: 8,
      textAlign: 'right',
    },
    addressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginBottom: 24,
    },
    addressText: {
      fontSize: 16,
      fontWeight: '700',
      color: Colors.text,
      marginRight: 8,
      flex: 1,
      textAlign: 'right',
    },
    confirmBtn: {
      backgroundColor: Colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
    },
    confirmBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
