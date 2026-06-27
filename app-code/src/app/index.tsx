import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CombinedPermissionState = 'Checking...' | 'Granted' | 'Denied';
type PermissionStatusType = Location.PermissionStatus | 'not-supported' | null;

// Target destination coordinates for testing (e.g. near Colombo/Malabe, Sri Lanka)
const TARGET_LAT = 6.9147;
const TARGET_LON = 79.9733;
const ALARM_RADIUS_METERS = 1000;
const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

// Haversine formula to calculate distance in meters between two coordinates
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Define background task at root level (global scope)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;
      const distance = getHaversineDistance(latitude, longitude, TARGET_LAT, TARGET_LON);
      
      console.log(
        `[Background Location] Current: (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) | Distance to target: ${distance.toFixed(1)}m`
      );

      if (distance < ALARM_RADIUS_METERS) {
        console.log('ALARM WAKE UP: Arriving soon!');
      }
    }
  }
});

export default function HomeScreen() {
  const theme = useTheme();
  const [permissionState, setPermissionState] = useState<CombinedPermissionState>('Checking...');
  const [fgStatus, setFgStatus] = useState<PermissionStatusType>(null);
  const [bgStatus, setBgStatus] = useState<PermissionStatusType>(null);
  const [isCommuting, setIsCommuting] = useState<boolean>(false);
  const [webLocationSubscription, setWebLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  const checkAndRequestPermissions = async () => {
    try {
      setPermissionState('Checking...');

      // 1. Check and request Foreground Location permissions
      const { status: currentFgStatus } = await Location.getForegroundPermissionsAsync();
      setFgStatus(currentFgStatus);

      let finalFgStatus = currentFgStatus;
      if (currentFgStatus !== 'granted') {
        const { status: reqFgStatus } = await Location.requestForegroundPermissionsAsync();
        finalFgStatus = reqFgStatus;
        setFgStatus(reqFgStatus);
      }

      // If foreground is denied, we can't request background
      if (finalFgStatus !== 'granted') {
        setPermissionState('Denied');
        return;
      }

      // 2. Check and request Background Location permissions (not supported on web)
      if (Platform.OS === 'web') {
        setBgStatus('not-supported');
        setPermissionState('Granted');
        return;
      }

      const { status: currentBgStatus } = await Location.getBackgroundPermissionsAsync();
      setBgStatus(currentBgStatus);

      let finalBgStatus = currentBgStatus;
      if (currentBgStatus !== 'granted') {
        const { status: reqBgStatus } = await Location.requestBackgroundPermissionsAsync();
        finalBgStatus = reqBgStatus;
        setBgStatus(reqBgStatus);
      }

      if (finalBgStatus === 'granted') {
        setPermissionState('Granted');
      } else {
        setPermissionState('Denied');
      }
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      setPermissionState('Denied');
    }
  };

  // Check if the background task is currently active/tracking
  const checkIfCommuting = async () => {
    try {
      if (Platform.OS !== 'web') {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        setIsCommuting(hasStarted);
      }
    } catch (error) {
      console.error('Error checking active location tasks:', error);
    }
  };

  useEffect(() => {
    checkAndRequestPermissions();
  }, []);

  useEffect(() => {
    if (permissionState === 'Granted') {
      checkIfCommuting();
    }
  }, [permissionState]);

  // Clean up the web location subscription when unmounting
  useEffect(() => {
    return () => {
      if (webLocationSubscription) {
        webLocationSubscription.remove();
      }
    };
  }, [webLocationSubscription]);

  // Toggle starting or stopping background updates
  const handleToggleCommute = async () => {
    try {
      if (Platform.OS === 'web') {
        if (isCommuting) {
          if (webLocationSubscription) {
            webLocationSubscription.remove();
            setWebLocationSubscription(null);
          }
          setIsCommuting(false);
          console.log('Successfully stopped web location tracking.');
        } else {
          console.log('Starting web location tracking...');
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 5000, // Update every 5 seconds
              distanceInterval: 10, // Update every 10 meters
            },
            (locationObject) => {
              const { latitude, longitude } = locationObject.coords;
              const distance = getHaversineDistance(latitude, longitude, TARGET_LAT, TARGET_LON);
              
              console.log(
                `[Web Location] Current: (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) | Distance to target: ${distance.toFixed(1)}m`
              );

              if (distance < ALARM_RADIUS_METERS) {
                console.log('ALARM WAKE UP: Arriving soon!');
              }
            }
          );
          setWebLocationSubscription(subscription);
          setIsCommuting(true);
          console.log('Successfully started web location tracking.');
        }
        return;
      }

      // Mobile (Android/iOS) background updates
      if (isCommuting) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        setIsCommuting(false);
        console.log('Successfully stopped background location tracking.');
      } else {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
          foregroundService: {
            notificationTitle: 'GeoWake Commute Active 🚌',
            notificationBody: 'Monitoring location to alert you near your destination.',
            notificationColor: '#10B981',
          },
        });
        setIsCommuting(true);
        console.log('Successfully started background location tracking.');
      }
    } catch (error) {
      console.error('Error toggling location updates:', error);
    }
  };

  // Configure UI representation based on permission status
  const getStatusConfig = () => {
    switch (permissionState) {
      case 'Granted':
        return {
          color: '#10B981', // green
          icon: '✅',
          desc: 'Permissions granted! GeoWake is ready to track transit stops in the background.',
        };
      case 'Denied':
        return {
          color: '#EF4444', // red
          icon: '❌',
          desc: 'GeoWake needs location permissions (including background) to send transit wake-up alerts.',
        };
      case 'Checking...':
      default:
        return {
          color: theme.textSecondary,
          icon: '⏳',
          desc: 'Verifying location access permissions...',
        };
    }
  };

  const statusConfig = getStatusConfig();

  const getStatusColor = (status: PermissionStatusType) => {
    if (status === 'granted') return '#10B981';
    if (status === 'denied') return '#EF4444';
    if (status === 'not-supported') return theme.textSecondary;
    return theme.textSecondary;
  };

  const getStatusLabel = (status: PermissionStatusType) => {
    if (!status) return 'PENDING';
    if (status === 'not-supported') return 'NOT SUPPORTED (WEB)';
    return status.toUpperCase();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            GeoWake 🚌
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            Your Smart Transit Wake-up Alarm
          </ThemedText>

          {/* Permissions Status Card */}
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle" style={styles.cardIcon}>
                {statusConfig.icon}
              </ThemedText>
              <View style={styles.statusTextContainer}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Permission Status
                </ThemedText>
                <ThemedText
                  type="subtitle"
                  style={[styles.statusText, { color: statusConfig.color }]}>
                  {permissionState}
                </ThemedText>
              </View>
            </View>

            <ThemedText type="default" style={styles.cardDesc}>
              {statusConfig.desc}
            </ThemedText>

            {permissionState === 'Checking...' && (
              <ActivityIndicator
                size="small"
                color={theme.text}
                style={styles.loader}
              />
            )}

            {permissionState === 'Denied' && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.backgroundSelected }]}
                onPress={checkAndRequestPermissions}>
                <ThemedText type="smallBold" style={{ color: theme.text }}>
                  Grant Location Permissions
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {/* Commute Management Section */}
          {permissionState === 'Granted' && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.cardHeader}>
                <ThemedText type="subtitle" style={styles.cardIcon}>
                  {isCommuting ? '🛰️' : '💤'}
                </ThemedText>
                <View style={styles.statusTextContainer}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Commute Status
                  </ThemedText>
                  <ThemedText
                    type="subtitle"
                    style={[
                      styles.statusText,
                      { color: isCommuting ? '#10B981' : theme.textSecondary },
                    ]}>
                    {isCommuting ? 'Active Tracking' : 'Idle'}
                  </ThemedText>
                </View>
              </View>

              <ThemedText type="default" style={styles.cardDesc}>
                {isCommuting
                  ? `Active tracking to target coordinates (${TARGET_LAT}, ${TARGET_LON}). You'll receive logs when you are within ${ALARM_RADIUS_METERS}m.`
                  : 'Start tracking to begin monitoring distance to your destination stop.'}
              </ThemedText>

              <TouchableOpacity
                style={[
                  styles.commuteButton,
                  { backgroundColor: isCommuting ? '#EF4444' : '#10B981' },
                ]}
                onPress={handleToggleCommute}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  {isCommuting ? '⏹️ Stop Commute' : '▶️ Start Commute'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Detailed Permissions Status */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Foreground Location
              </ThemedText>
              <ThemedText
                type="smallBold"
                style={{ color: getStatusColor(fgStatus) }}>
                {getStatusLabel(fgStatus)}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Background Location
              </ThemedText>
              <ThemedText
                type="smallBold"
                style={{ color: getStatusColor(bgStatus) }}>
                {getStatusLabel(bgStatus)}
              </ThemedText>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
    marginTop: -Spacing.two,
    marginBottom: Spacing.two,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardIcon: {
    fontSize: 32,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 22,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
  },
  loader: {
    marginTop: Spacing.two,
    alignSelf: 'flex-start',
  },
  button: {
    paddingVertical: Spacing.two + 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  commuteButton: {
    paddingVertical: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  detailsContainer: {
    width: '100%',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    marginTop: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
    paddingVertical: Spacing.two,
  },
});
