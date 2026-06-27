import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';

interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

interface MapPickerProps {
  targetLocation: LocationCoordinate | null;
  onSelectLocation: (coordinate: LocationCoordinate) => void;
}

export default function MapPicker({ targetLocation, onSelectLocation }: MapPickerProps) {
  const handleMapPress = (e: MapPressEvent) => {
    onSelectLocation(e.nativeEvent.coordinate);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 6.9271,
          longitude: 79.8612,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        onPress={handleMapPress}>
        {targetLocation && (
          <Marker
            coordinate={targetLocation}
            title="Destination Stop"
            description="Geofence trigger location"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.15)',
  },
  map: {
    flex: 1,
  },
});
