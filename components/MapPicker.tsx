import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Dimensions } from 'react-native';
import WebView from 'react-native-webview';
import { Locate } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MapPickerProps {
  region: any;
  setRegion: (region: any) => void;
  markerCoord: { latitude: number; longitude: number };
  setMarkerCoord: (coord: { latitude: number; longitude: number }) => void;
  isLocating: boolean;
  onLocateMe: () => void;
  fullScreen?: boolean;
  locateMeTrigger?: number;
}

export default function MapPicker({
  region,
  setRegion,
  markerCoord,
  setMarkerCoord,
  isLocating,
  onLocateMe,
  fullScreen = false,
  locateMeTrigger = 0,
}: MapPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const isMapDriven = useRef(false);
  const initialRegion = useRef({ latitude: region.latitude, longitude: region.longitude }).current;

  const htmlContent = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        #map { width: 100%; height: 100%; }
        
        /* Hide Leaflet attribution for cleaner look */
        .leaflet-control-attribution { display: none !important; }
        .leaflet-control-zoom { display: none !important; }
        
        /* CSS-fixed center pin — never moves, perfectly smooth */
        #center-pin {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -100%);
          z-index: 9999;
          pointer-events: none;
          transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
        }
        #center-pin.dragging {
          transform: translate(-50%, -115%);
        }
        
        /* Subtle dot shadow on ground */
        #pin-shadow {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 6px;
          background: rgba(0,0,0,0.25);
          border-radius: 50%;
          z-index: 9998;
          pointer-events: none;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #pin-shadow.dragging {
          width: 8px;
          height: 4px;
          background: rgba(0,0,0,0.15);
        }
      </style>
    </head>
    <body>
      <!-- Fixed center pin overlay (not a Leaflet marker!) -->
      <div id="center-pin">
        <svg width="40" height="50" viewBox="0 0 40 50" fill="none">
          <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 30 20 30s20-15 20-30C40 8.954 31.046 0 20 0z" fill="#f97316"/>
          <circle cx="20" cy="19" r="8" fill="#1A1A1A"/>
          <circle cx="20" cy="19" r="4" fill="#f97316"/>
        </svg>
      </div>
      <div id="pin-shadow"></div>
      
      <div id="map"></div>
      <script>
        var pin = document.getElementById('center-pin');
        var shadow = document.getElementById('pin-shadow');
        var debounceTimer = null;
        
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          zoomSnap: 0.5,
          zoomDelta: 0.5,
          wheelPxPerZoomLevel: 120,
          inertia: true,
          inertiaDeceleration: 3000,
          inertiaMaxSpeed: 1500,
          easeLinearity: 0.25,
          worldCopyJump: true,
          maxBoundsViscosity: 1.0,
          tap: true,
          tapTolerance: 15,
          touchZoom: 'center',
          bounceAtZoomLimits: false
        }).setView([${initialRegion.latitude}, ${initialRegion.longitude}], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          minZoom: 5,
          updateWhenZooming: false,
          updateWhenIdle: true,
          keepBuffer: 4
        }).addTo(map);
        
        map.on('movestart', function() {
          pin.classList.add('dragging');
          shadow.classList.add('dragging');
        });
        
        map.on('moveend', function() {
          pin.classList.remove('dragging');
          shadow.classList.remove('dragging');
          
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(function() {
            var c = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'coord', lat: c.lat, lng: c.lng }));
          }, 150);
        });

        map.on('click', function(e) {
          map.flyTo(e.latlng, map.getZoom(), { duration: 0.4, easeLinearity: 0.5 });
        });

        window.flyTo = function(data) {
          map.stop(); // Stop any ongoing inertia
          map.setView([data.lat, data.lng], 17, { animate: true, duration: 0.5 });
        }

        document.addEventListener('message', function(event) {
          try {
            var d = JSON.parse(event.data);
            if (d.type === 'flyTo') window.flyTo(d);
          } catch(e) {}
        });
        
        window.addEventListener('message', function(event) {
          try {
            var d = JSON.parse(event.data);
            if (d.type === 'flyTo') window.flyTo(d);
          } catch(e) {}
        });
      </script>
    </body>
    </html>
  `, []);

  const sendFlyTo = useCallback((lat: number, lng: number) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof window !== 'undefined' && typeof window.flyTo === 'function') {
          window.flyTo({ lat: ${lat}, lng: ${lng} });
        }
        true;
      `);
    }
  }, []);

  const handleLocateMe = useCallback(() => {
    onLocateMe();
  }, [onLocateMe]);

  const lastExternalCoord = useRef({ lat: region.latitude, lng: region.longitude });
  
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'coord') {
        isMapDriven.current = true;
        setMarkerCoord({ latitude: data.lat, longitude: data.lng });
        setTimeout(() => { isMapDriven.current = false; }, 100);
      }
    } catch (e) {}
  }, [setMarkerCoord]);

  React.useEffect(() => {
    if (isMapDriven.current) return;
    const newLat = markerCoord.latitude;
    const newLng = markerCoord.longitude;
    sendFlyTo(newLat, newLng);
  }, [locateMeTrigger, sendFlyTo]);

  const webViewSource = useMemo(() => ({ html: htmlContent, baseUrl: 'https://localhost' }), [htmlContent]);

  const webViewProps = {
    ref: webViewRef,
    source: webViewSource as any,
    scrollEnabled: false,
    originWhitelist: ['*'] as string[],
    javaScriptEnabled: true,
    domStorageEnabled: true,
    mixedContentMode: 'always' as const,
    allowFileAccess: true,
    allowUniversalAccessFromFileURLs: true,
    overScrollMode: 'never' as const,
    onMessage: handleMessage,
    onLoadEnd: () => {
      sendFlyTo(markerCoord.latitude, markerCoord.longitude);
    },
  };

  if (fullScreen) {
    return (
      <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
        {/* @ts-ignore - react-native-webview type mismatch */}
        <WebView
          {...webViewProps}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        />
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapHeader}>
        <Text style={styles.inputLabel}>تحديد الموقع على الخريطة</Text>
        <TouchableOpacity onPress={handleLocateMe} style={styles.locateBtn} disabled={isLocating}>
          {isLocating ? <ActivityIndicator size="small" color={Colors.primary} /> : <Locate color={Colors.primary} size={16} />}
          <Text style={styles.locateBtnText}>موقعي</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.mapWrapper}>
        {/* @ts-ignore - react-native-webview type mismatch */}
        <WebView
          {...webViewProps}
          style={styles.map}
        />
      </View>
      <Text style={styles.mapHint}>حرّك الخريطة لتحديد موقعك بدقة</Text>
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
  map: {
    width: '100%',
    height: '100%',
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
