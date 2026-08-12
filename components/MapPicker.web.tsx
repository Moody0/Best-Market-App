import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Locate } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapPickerProps {
  region: any;
  setRegion: (region: any) => void;
  markerCoord: { latitude: number; longitude: number };
  setMarkerCoord: (coord: { latitude: number; longitude: number }) => void;
  isLocating: boolean;
  onLocateMe: () => void;
}

export default function MapPicker({
  region,
  setRegion,
  markerCoord,
  setMarkerCoord,
  isLocating,
  onLocateMe,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [region.latitude, region.longitude],
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Custom Icon
    const icon = L.divIcon({
      html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;">
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
          <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24C32 7.164 24.836 0 16 0z" fill="#f97316"/>
          <circle cx="16" cy="15" r="7" fill="#1A1A1A"/>
          <circle cx="16" cy="15" r="3" fill="#f97316"/>
        </svg>
      </div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    markerRef.current = L.marker([markerCoord.latitude, markerCoord.longitude], { icon, draggable: true }).addTo(map);
    
    markerRef.current.on('dragend', () => {
      const pos = markerRef.current!.getLatLng();
      setMarkerCoord({ latitude: pos.lat, longitude: pos.lng });
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      markerRef.current!.setLatLng(e.latlng);
      setMarkerCoord({ latitude: e.latlng.lat, longitude: e.latlng.lng });
      map.panTo(e.latlng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update map and marker if props change externally (like via "Locate me")
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const currentMapCenter = mapRef.current.getCenter();
      if (Math.abs(currentMapCenter.lat - region.latitude) > 0.001 || Math.abs(currentMapCenter.lng - region.longitude) > 0.001) {
         mapRef.current.setView([region.latitude, region.longitude], 17);
      }
      markerRef.current.setLatLng([markerCoord.latitude, markerCoord.longitude]);
    }
  }, [region.latitude, region.longitude, markerCoord.latitude, markerCoord.longitude]);


  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapHeader}>
        <Text style={styles.inputLabel}>تحديد الموقع على الخريطة</Text>
        <TouchableOpacity onPress={onLocateMe} style={styles.locateBtn} disabled={isLocating}>
          {isLocating ? <ActivityIndicator size="small" color={Colors.primary} /> : <Locate color={Colors.primary} size={16} />}
          <Text style={styles.locateBtnText}>موقعي</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.mapWrapper}>
        {/* @ts-ignore */}
        <div ref={containerRef} style={{ width: '100%', height: '100%', zIndex: 0 }} />
      </View>
      <Text style={styles.mapHint}>اضغط أو اسحب الدبوس لتحديد موقعك بدقة</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    marginBottom: 20,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  mapWrapper: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapHint: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  locateBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
