import React, { useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import WebView from 'react-native-webview';
import { X, MapPin } from 'lucide-react-native';

interface LiveTrackingMapProps {
  customerLat: number;
  customerLng: number;
  driverLat: number;
  driverLng: number;
  onClose: () => void;
}

export default function LiveTrackingMap({ customerLat, customerLng, driverLat, driverLng, onClose }: LiveTrackingMapProps) {
  const webViewRef = useRef<WebView>(null);
  const initialCoords = useRef({ customerLat, customerLng, driverLat, driverLng }).current;
  const htmlContent = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #121212; }
        #map { width: 100%; height: 100%; }
        .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        window.customerLat = ${initialCoords.customerLat};
        window.customerLng = ${initialCoords.customerLng};
        window.driverLat = ${initialCoords.driverLat};
        window.driverLng = ${initialCoords.driverLng};

        window.map = L.map('map', { zoomControl: false }).fitBounds([
          [window.customerLat, window.customerLng],
          [window.driverLat, window.driverLng]
        ], { padding: [50, 50] });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(window.map);

        const customerIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const carIcon = L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        window.customerMarker = L.marker([window.customerLat, window.customerLng], { icon: customerIcon }).addTo(window.map);
        window.driverMarker = L.marker([window.driverLat, window.driverLng], { icon: carIcon }).addTo(window.map);
        window.routeLine = L.polyline([], { color: '#3b82f6', weight: 5, opacity: 0.8 }).addTo(window.map);

        window.updateMap = function(cLat, cLng, dLat, dLng) {
          window.customerLat = cLat;
          window.customerLng = cLng;
          window.driverLat = dLat;
          window.driverLng = dLng;

          window.customerMarker.setLatLng([cLat, cLng]);
          window.driverMarker.setLatLng([dLat, dLng]);
          
          window.map.fitBounds([
            [cLat, cLng],
            [dLat, dLng]
          ], { padding: [50, 50], animate: true });

          fetch(\`https://router.project-osrm.org/route/v1/driving/\${dLng},\${dLat};\${cLng},\${cLat}?overview=full&geometries=geojson\`)
            .then(res => res.json())
            .then(data => {
              if (data.routes && data.routes[0]) {
                const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                window.routeLine.setLatLngs(coords);
              }
            })
            .catch(err => console.error(err));
        };

        // Initial route fetch
        window.updateMap(window.customerLat, window.customerLng, window.driverLat, window.driverLng);
      </script>
    </body>
    </html>
  `, []);

  const webViewSource = useMemo(() => ({ html: htmlContent }), [htmlContent]);

  useEffect(() => {
    if (webViewRef.current) {
      const script = `
        if (typeof window.updateMap === 'function') {
          window.updateMap(${customerLat}, ${customerLng}, ${driverLat}, ${driverLng});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [customerLat, customerLng, driverLat, driverLng]);

  return (
    <View style={styles.container}>
      {/* @ts-ignore - react-native-webview type mismatch */}
      <WebView
        ref={webViewRef}
        source={webViewSource}
        style={styles.map}
        scrollEnabled={false}
        bounces={false}
      />

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <X color="#fff" size={24} />
      </TouchableOpacity>

      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <MapPin color="#F97316" size={20} />
          <Text style={styles.headerText}>تتبع المندوب مباشرة</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  map: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerCard: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
