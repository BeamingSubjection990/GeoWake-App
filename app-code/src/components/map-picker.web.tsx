import React, { useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';

interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

interface MapPickerProps {
  targetLocation: LocationCoordinate | null;
  onSelectLocation: (coordinate: LocationCoordinate) => void;
}

export default function MapPicker({ targetLocation, onSelectLocation }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sri Lanka geographic boundaries mapped to the grid coordinate selector space
  const MIN_LAT = 5.9;
  const MAX_LAT = 9.9;
  const MIN_LON = 79.5;
  const MAX_LON = 82.0;

  const handleWebClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // Click x coordinate relative to container
    const y = e.clientY - rect.top;  // Click y coordinate relative to container
    const width = rect.width;
    const height = rect.height;

    // Calculate percentage click location
    const xPercent = x / width;
    const yPercent = y / height;

    // Map the click percentage to geographic coordinate bounds of Sri Lanka
    const latitude = MAX_LAT - yPercent * (MAX_LAT - MIN_LAT);
    const longitude = MIN_LON + xPercent * (MAX_LON - MIN_LON);

    onSelectLocation({ latitude, longitude });
  };

  // Convert selected coordinate back to screen percentages to render marker dot
  const getMarkerPosition = () => {
    if (!targetLocation) return null;
    const { latitude, longitude } = targetLocation;
    
    // Clamp to bounds
    const lat = Math.max(MIN_LAT, Math.min(MAX_LAT, latitude));
    const lon = Math.max(MIN_LON, Math.min(MAX_LON, longitude));

    const yPercent = (MAX_LAT - lat) / (MAX_LAT - MIN_LAT);
    const xPercent = (lon - MIN_LON) / (MAX_LON - MIN_LON);

    return {
      top: `${yPercent * 100}%`,
      left: `${xPercent * 100}%`,
    };
  };

  const markerPos = getMarkerPosition();

  return (
    <View style={styles.container}>
      <View style={styles.webHeader}>
        <Text style={styles.webHeaderText}>📍 Simulated Map Picker (Web Mode)</Text>
        <Text style={styles.webHeaderSubText}>Click inside the grid to simulate a map tap on Sri Lanka.</Text>
      </View>

      <div
        ref={containerRef}
        onClick={handleWebClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          backgroundColor: '#1E293B',
          backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          cursor: 'crosshair',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Boundary guide indicators */}
        <div style={{ position: 'absolute', top: 10, left: 10, color: 'rgba(255,255,255,0.4)', fontSize: 10, pointerEvents: 'none' }}>
          9.9°N, 79.5°E
        </div>
        <div style={{ position: 'absolute', bottom: 10, right: 10, color: 'rgba(255,255,255,0.4)', fontSize: 10, pointerEvents: 'none' }}>
          5.9°N, 82.0°E
        </div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'rgba(255,255,255,0.08)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}>
          SRI LANKA
        </div>

        {/* Pulse Target Marker */}
        {markerPos && (
          <div
            style={{
              position: 'absolute',
              top: markerPos.top,
              left: markerPos.left,
              transform: 'translate(-50%, -50%)',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              border: '2px solid #ffffff',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
            }}
          />
        )}
      </div>

      {targetLocation && (
        <View style={styles.coordDisplay}>
          <Text style={styles.coordText}>
            Selected Lat: <Text style={styles.bold}>{targetLocation.latitude.toFixed(6)}</Text>
          </Text>
          <Text style={styles.coordText}>
            Selected Lon: <Text style={styles.bold}>{targetLocation.longitude.toFixed(6)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  webHeader: {
    gap: 2,
  },
  webHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  webHeaderSubText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  coordDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  coordText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  bold: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
