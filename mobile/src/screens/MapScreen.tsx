/**
 * MapScreen — React Native
 * Interactive map with satellite tile overlays using react-native-maps
 * GIBS WMTS tiles loaded via UrlTile component
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Text, ScrollView,
  Animated, Platform,
} from 'react-native';
import MapView, { Marker, UrlTile, Callout, Region } from 'react-native-maps';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Dubai region
const DUBAI_REGION: Region = {
  latitude: 25.2048,
  longitude: 55.2708,
  latitudeDelta: 5,
  longitudeDelta: 5,
};

// GIBS satellite layer definitions — matching web version
const SATELLITE_LAYERS = [
  {
    id: 'none',
    name: '🗺️ Map Only',
    urlTemplate: null,
  },
  {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    name: '🌍 True Color (Daily)',
    // WMTS URL for react-native-maps UrlTile
    // {z}/{x}/{y} placeholders used by UrlTile
    urlTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
  },
  {
    id: 'MODIS_Terra_CorrectedReflectance_Bands721',
    name: '🔥 Fire/False Color',
    urlTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_Bands721/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
  },
  {
    id: 'VIIRS_SNPP_DayNightBand_ENCC',
    name: '🌙 Night Lights',
    urlTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_ENCC/default/{date}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
  },
  {
    id: 'MODIS_Terra_Aerosol',
    name: '💨 Dust/Aerosol',
    urlTemplate:
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Aerosol/default/{date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
  },
];

interface MapFeature {
  id: string;
  title: string;
  source: string;
  location: { name: string; lat: number; lng: number };
  isMilitary: boolean;
  category: string;
  publishedAt: string;
  url: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  military: '#dc2626',
  security: '#ea580c',
  politics: '#7c3aed',
  economy: '#059669',
  general: '#2563eb',
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<typeof SATELLITE_LAYERS[0]>(SATELLITE_LAYERS[0]);
  const [showLayerPicker, setShowLayerPicker] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);
  const [militaryOnly, setMilitaryOnly] = useState(false);
  const panelAnim = useRef(new Animated.Value(0)).current;

  // Get today's date for tile URLs (yesterday for GIBS lag)
  const getImageDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const imageDate = getImageDate();

  // Build tile URL with date substituted
  const getTileUrl = (layer: typeof SATELLITE_LAYERS[0]) => {
    if (!layer.urlTemplate) return null;
    return layer.urlTemplate.replace('{date}', imageDate);
  };

  // Fetch map data from backend
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/map-data`, {
          params: { hours: 48, military: militaryOnly },
        });
        setFeatures(response.data.features || []);
      } catch (err) {
        console.error('Failed to fetch map features:', err);
      }
    };

    fetchFeatures();
    const interval = setInterval(fetchFeatures, 120000); // Every 2 minutes
    return () => clearInterval(interval);
  }, [militaryOnly]);

  // Animate layer picker
  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: showLayerPicker ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [showLayerPicker, panelAnim]);

  const handleMarkerPress = (feature: MapFeature) => {
    setSelectedFeature(feature);
    mapRef.current?.animateToRegion(
      {
        latitude: feature.location.lat,
        longitude: feature.location.lng,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      },
      800
    );
  };

  const tileUrl = getTileUrl(selectedLayer);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DUBAI_REGION}
        mapType="standard"
        showsUserLocation
        showsCompass
        rotateEnabled={false}
      >
        {/* Satellite tile overlay (GIBS) */}
        {tileUrl && (
          <UrlTile
            urlTemplate={tileUrl}
            maximumZ={selectedLayer.id.includes('Aerosol') ? 6 : 9}
            opacity={0.75}
            tileSize={256}
            shouldReplaceMapContent={false}
          />
        )}

        {/* News event markers */}
        {features.map((feature) => {
          const color = CATEGORY_COLORS[feature.category] || CATEGORY_COLORS.general;
          return (
            <Marker
              key={feature.id}
              coordinate={{ latitude: feature.location.lat, longitude: feature.location.lng }}
              onPress={() => handleMarkerPress(feature)}
              pinColor={feature.isMilitary ? '#dc2626' : color}
            >
              <View style={[styles.markerDot, { backgroundColor: color }]}>
                {feature.isMilitary && <Text style={styles.markerPulse}>!</Text>}
              </View>
              <Callout style={styles.callout}>
                <View style={styles.calloutContent}>
                  <Text style={styles.calloutCategory}>{feature.category.toUpperCase()}</Text>
                  <Text style={styles.calloutTitle} numberOfLines={3}>{feature.title}</Text>
                  <Text style={styles.calloutMeta}>📍 {feature.location.name}</Text>
                  <Text style={styles.calloutMeta}>📡 {feature.source}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Top controls */}
      <View style={styles.topControls}>
        {/* Layer picker button */}
        <TouchableOpacity
          style={styles.layerBtn}
          onPress={() => setShowLayerPicker(!showLayerPicker)}
        >
          <Text style={styles.layerBtnText}>🛰️ {selectedLayer.name} ▾</Text>
        </TouchableOpacity>

        {/* Military toggle */}
        <TouchableOpacity
          style={[styles.filterBtn, militaryOnly && styles.filterBtnActive]}
          onPress={() => setMilitaryOnly(!militaryOnly)}
        >
          <Text style={[styles.filterBtnText, militaryOnly && styles.filterBtnTextActive]}>
            🚨 Military
          </Text>
        </TouchableOpacity>
      </View>

      {/* Layer picker panel */}
      {showLayerPicker && (
        <Animated.View
          style={[
            styles.layerPanel,
            {
              opacity: panelAnim,
              transform: [{ translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
            },
          ]}
        >
          <Text style={styles.panelTitle}>NASA GIBS Layers (Free · Daily)</Text>
          <Text style={styles.panelSubtitle}>Near-real-time imagery — not live</Text>
          {SATELLITE_LAYERS.map((layer) => (
            <TouchableOpacity
              key={layer.id}
              style={[styles.layerOption, selectedLayer.id === layer.id && styles.layerOptionActive]}
              onPress={() => {
                setSelectedLayer(layer);
                setShowLayerPicker(false);
              }}
            >
              <Text style={[styles.layerOptionText, selectedLayer.id === layer.id && styles.layerOptionTextActive]}>
                {layer.name}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.panelNote}>
            Imagery date: {imageDate}
          </Text>
        </Animated.View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(CATEGORY_COLORS).slice(0, 3).map(([cat, color]) => (
          <View key={cat} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{cat}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  map: { flex: 1 },
  markerDot: {
    width: 14, height: 14,
    borderRadius: 7,
    borderWidth: 2, borderColor: 'white',
    justifyContent: 'center', alignItems: 'center',
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5,
  },
  markerPulse: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  callout: { width: 220 },
  calloutContent: { padding: 10 },
  calloutCategory: { fontSize: 10, color: '#7c3aed', fontWeight: 'bold', marginBottom: 4 },
  calloutTitle: { fontSize: 12, fontWeight: '600', color: '#1e293b', marginBottom: 4, lineHeight: 16 },
  calloutMeta: { fontSize: 10, color: '#64748b', marginBottom: 2 },
  topControls: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 16,
    left: 12, right: 12,
    flexDirection: 'row', gap: 8,
  },
  layerBtn: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  layerBtnText: { color: 'white', fontSize: 12, fontWeight: '600' },
  filterBtn: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  filterBtnActive: { backgroundColor: 'rgba(220,38,38,0.3)', borderColor: '#dc2626' },
  filterBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  filterBtnTextActive: { color: '#fca5a5' },
  layerPanel: {
    position: 'absolute', top: Platform.OS === 'ios' ? 100 : 66,
    left: 12, right: 12,
    backgroundColor: '#1e293b',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#334155',
    elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  panelTitle: { color: 'white', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  panelSubtitle: { color: '#64748b', fontSize: 11, marginBottom: 12 },
  layerOption: {
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, marginBottom: 4,
  },
  layerOptionActive: { backgroundColor: '#2563eb' },
  layerOptionText: { color: '#94a3b8', fontSize: 13 },
  layerOptionTextActive: { color: 'white', fontWeight: '600' },
  panelNote: { color: '#475569', fontSize: 10, marginTop: 8, textAlign: 'center' },
  legend: {
    position: 'absolute', bottom: 16, left: 12,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 10, padding: 10, gap: 6,
    borderWidth: 1, borderColor: '#334155',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#94a3b8', fontSize: 11, textTransform: 'capitalize' },
});
