import { describe, it, expect, afterEach } from '@jest/globals';
import { getUserLocationHelper, requestDeviceLocation } from '@/lib/utils/foodTruckHelpers';

const AUGUSTA = { latitude: 33.4735, longitude: -82.0105 };

type PermissionState = 'granted' | 'prompt' | 'denied';

let positionRequests = 0;

function installNavigator(permissionState: PermissionState | null): void {
  positionRequests = 0;
  const geolocation = {
    getCurrentPosition: (onSuccess: (position: GeolocationPosition) => void): void => {
      positionRequests += 1;
      onSuccess({ coords: { ...AUGUSTA, accuracy: 50 } } as GeolocationPosition);
    },
  };
  const permissions =
    permissionState === null
      ? undefined
      : { query: async (): Promise<{ state: PermissionState }> => ({ state: permissionState }) };
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: geolocation,
    configurable: true,
  });
  Object.defineProperty(globalThis.navigator, 'permissions', {
    value: permissions,
    configurable: true,
  });
}

function clearNavigator(): void {
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    value: undefined,
    configurable: true,
  });
  Object.defineProperty(globalThis.navigator, 'permissions', {
    value: undefined,
    configurable: true,
  });
}

describe('getUserLocationHelper', () => {
  afterEach(() => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(globalThis.navigator, 'permissions', {
      value: undefined,
      configurable: true,
    });
  });

  it('returns the device location when permission is already granted', async () => {
    installNavigator('granted');
    await expect(getUserLocationHelper()).resolves.toEqual(AUGUSTA);
  });

  it('does not ask for the location when permission has not been granted', async () => {
    installNavigator('prompt');
    await expect(getUserLocationHelper()).resolves.toBeNull();
    expect(positionRequests).toBe(0);
  });

  it('does not ask for the location when the browser cannot report permission', async () => {
    installNavigator(null);
    await expect(getUserLocationHelper()).resolves.toBeNull();
    expect(positionRequests).toBe(0);
  });
});

describe('requestDeviceLocation', () => {
  afterEach(clearNavigator);

  it('asks for the location even when permission has not been granted yet', async () => {
    installNavigator('prompt');
    await expect(requestDeviceLocation()).resolves.toEqual({
      lat: AUGUSTA.latitude,
      lng: AUGUSTA.longitude,
    });
    expect(positionRequests).toBe(1);
  });

  it('returns null when the visitor declines', async () => {
    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_onSuccess: unknown, onError: () => void): void => onError(),
      },
      configurable: true,
    });
    await expect(requestDeviceLocation()).resolves.toBeNull();
  });

  it('returns null when the browser has no geolocation', async () => {
    clearNavigator();
    await expect(requestDeviceLocation()).resolves.toBeNull();
  });
});
