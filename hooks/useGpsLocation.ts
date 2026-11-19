import { useState, useEffect, useCallback } from 'react';
import { logDebug, logError, logWarning } from '@/lib/logging';
import { classifyGeolocationError, getGeolocationErrorMessage } from '@/lib/utils/geolocationError';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  permission: 'granted' | 'denied' | 'prompt' | 'unsupported';
}

interface PermissionsWithQuery extends Permissions {
  query(permissionDesc: PermissionDescriptor): Promise<PermissionStatus>;
}

export const useGPSLocation = () => {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    permission: 'prompt',
  });

  // Check if geolocation is supported
  const isGeolocationSupported = useCallback((): boolean => {
    return 'geolocation' in navigator;
  }, []);

  // Check current permission state
  const getPermissionState = useCallback(async (): Promise<LocationState['permission']> => {
    if (!isGeolocationSupported()) {
      return 'unsupported';
    }

    try {
      // Note: This API is not supported in all browsers, so we'll handle it carefully
      if ('permissions' in navigator) {
        const permission = await (navigator.permissions as PermissionsWithQuery).query({
          name: 'geolocation',
        });
        return permission.state as LocationState['permission'];
      }
      return 'prompt'; // Default to prompt if we can't check
    } catch {
      return 'prompt'; // Default to prompt if there's an error checking
    }
  }, []);

  // Get current position with improved accuracy
  const getCurrentLocation = useCallback(
    async (
      enableHighAccuracy: boolean = true,
    ): Promise<{ latitude: number; longitude: number; accuracy: number | null } | null> => {
      logDebug('[GPS HOOK] getCurrentLocation called', { enableHighAccuracy });

      if (!isGeolocationSupported()) {
        logError('Geolocation not supported', 'useGpsLocation');
        setLocation((prev) => ({
          ...prev,
          error: 'Geolocation is not supported by your browser',
          loading: false,
          permission: 'unsupported',
        }));
        return null;
      }

      logDebug('[GPS HOOK] Geolocation is supported, requesting permission...');
      setLocation((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const permission = await getPermissionState();
        logDebug('[GPS HOOK] Permission state', permission);
        setLocation((prev) => ({
          ...prev,
          permission,
        }));

        if (permission === 'denied') {
          logDebug('[GPS HOOK] Permission denied by user');
          setLocation((prev) => ({
            ...prev,
            loading: false,
            error: 'Location access denied by user',
            permission: 'denied',
          }));
          return null;
        }

        logDebug('[GPS HOOK] Permission granted, getting high-accuracy position...');

        // Use watchPosition to get multiple readings and pick the best one
        let bestPosition: GeolocationPosition | null = null;
        let watchId: number | null = null;

        const result = await new Promise<GeolocationPosition | null>((resolve) => {
          const timeout = setTimeout(() => {
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
            }
            logDebug('[GPS HOOK] Timeout reached, using best position', bestPosition?.coords);
            resolve(bestPosition);
          }, 10_000); // Wait up to 10 seconds for better accuracy

          // eslint-disable-next-line sonarjs/no-intrusive-permissions -- This hook is specifically for geolocation functionality
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              logDebug('[GPS HOOK] Position update', position.coords);

              // Keep the most accurate position
              if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
                bestPosition = position;
                logDebug('[GPS HOOK] New best accuracy', { meters: position.coords.accuracy });
              }

              // If we get very accurate position (< 20 meters), use it immediately
              if (position.coords.accuracy < 20) {
                clearTimeout(timeout);
                if (watchId !== null) {
                  navigator.geolocation.clearWatch(watchId);
                }
                logDebug('[GPS HOOK] Excellent accuracy achieved', {
                  meters: position.coords.accuracy,
                });
                resolve(position);
              }
            },
            (error) => {
              clearTimeout(timeout);
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
              }
              const classification = classifyGeolocationError(error);
              if (classification.isExpected) {
                logWarning('useGpsLocation.watchPosition:', error);
              } else {
                logError('useGpsLocation.watchPosition', error);
              }
              resolve(bestPosition); // Use best position we got before error
            },
            {
              enableHighAccuracy: true,
              timeout: 30_000,
              maximumAge: 0,
            },
          );
        });

        if (!result) {
          throw new Error('Unable to get GPS position');
        }

        const locationData = {
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy: result.coords.accuracy,
        };

        logDebug('[GPS HOOK] Final position', locationData);

        setLocation((prev) => ({
          ...prev,
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy: result.coords.accuracy,
          loading: false,
          error: null,
        }));

        return locationData;
      } catch (error: unknown) {
        const classification = classifyGeolocationError(error);
        if (classification.isExpected) {
          logWarning('useGpsLocation.getCurrentLocation:', error);
        } else {
          logError('useGpsLocation.getCurrentLocation', error);
        }

        const errorMessage = getGeolocationErrorMessage(error);

        setLocation((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));

        logDebug('[GPS HOOK] Returning null due to error', errorMessage);
        return null;
      }
    },
    [getPermissionState, isGeolocationSupported],
  );

  // Watch position for continuous updates - with accuracy filtering
  const watchPosition = useCallback((enableHighAccuracy: boolean = true) => {
    if (!isGeolocationSupported()) {
      setLocation((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        permission: 'unsupported',
      }));
      return null;
    }

    setLocation((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    // eslint-disable-next-line sonarjs/no-intrusive-permissions -- This hook is specifically for geolocation functionality
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Only update if the new position is more accurate than the current position
        setLocation(
          (prev) =>
            // If there's no previous location or the new location is more accurate (lower accuracy number is better)
            prev.latitude === null ||
            prev.longitude === null ||
            position.coords.accuracy < (prev.accuracy || Infinity)
              ? {
                  ...prev,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  loading: false,
                  error: null,
                }
              : prev, // Keep the more accurate previous location
        );
      },
      (error: unknown) => {
        const classification = classifyGeolocationError(error);
        if (classification.isExpected) {
          logWarning('useGpsLocation.watchPosition:', error);
        } else {
          logError('useGpsLocation.watchPosition', error);
        }

        const errorMessage = getGeolocationErrorMessage(error);

        setLocation((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      },
      {
        enableHighAccuracy,
        timeout: 15_000, // Increased timeout to get better accuracy
        maximumAge: 0, // Don't use cached position
      },
    );

    return watchId;
  }, []);

  // Clear watch
  const clearWatch = useCallback((watchId: number) => {
    if (isGeolocationSupported()) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Get initial permission state on mount
  useEffect(() => {
    const checkPermission = async () => {
      const permission = await getPermissionState();
      setLocation((prev) => ({
        ...prev,
        permission,
      }));
    };

    void checkPermission();
  }, [getPermissionState]);

  return {
    ...location,
    getCurrentLocation,
    getPermissionState,
    watchPosition,
    clearWatch,
    isGeolocationSupported: isGeolocationSupported(),
  };
};
