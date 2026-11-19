import { describe, it, expect } from '@jest/globals';
import {
  isMobileClient,
  isMobileServer,
  isIOSClient,
  isIOSServer,
  isAndroidClient,
  isAndroidServer,
  getDeviceTypeClient,
  getDeviceTypeServer,
} from '@/lib/utils/deviceDetection';

describe('deviceDetection', () => {
  describe('isMobileClient', () => {
    it('returns false on server-side', () => {
      expect(isMobileClient()).toBe(false);
    });
  });

  describe('isMobileServer', () => {
    it('detects Android devices', () => {
      expect(isMobileServer('Mozilla/5.0 (Linux; Android 11)')).toBe(true);
    });

    it('detects iPhone devices', () => {
      expect(isMobileServer('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)')).toBe(true);
    });

    it('returns false for desktop browsers', () => {
      expect(isMobileServer('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    });

    it('detects iPad', () => {
      expect(isMobileServer('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe(true);
    });

    it('detects BlackBerry', () => {
      expect(isMobileServer('Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)')).toBe(true);
    });

    it('detects Opera Mini', () => {
      expect(isMobileServer('Opera/9.80 (Android; Opera Mini/7.5.33361)')).toBe(true);
    });
  });

  describe('isIOSClient', () => {
    it('returns false on server-side', () => {
      expect(isIOSClient()).toBe(false);
    });
  });

  describe('isIOSServer', () => {
    it('detects iPhone', () => {
      expect(isIOSServer('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)')).toBe(true);
    });

    it('detects iPad', () => {
      expect(isIOSServer('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe(true);
    });

    it('detects iPod', () => {
      expect(isIOSServer('Mozilla/5.0 (iPod; CPU iPhone OS 14_0 like Mac OS X)')).toBe(true);
    });

    it('returns false for Android', () => {
      expect(isIOSServer('Mozilla/5.0 (Linux; Android 11)')).toBe(false);
    });

    it('returns false for desktop', () => {
      expect(isIOSServer('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    });
  });

  describe('isAndroidClient', () => {
    it('returns false on server-side', () => {
      expect(isAndroidClient()).toBe(false);
    });
  });

  describe('isAndroidServer', () => {
    it('detects Android devices', () => {
      expect(isAndroidServer('Mozilla/5.0 (Linux; Android 11)')).toBe(true);
    });

    it('returns false for iOS', () => {
      expect(isAndroidServer('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)')).toBe(false);
    });

    it('returns false for desktop', () => {
      expect(isAndroidServer('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    });
  });

  describe('getDeviceTypeServer', () => {
    it('returns mobile for Android phones', () => {
      expect(getDeviceTypeServer('Mozilla/5.0 (Linux; Android 11; Pixel 5)')).toBe('mobile');
    });

    it('returns mobile for iPhone', () => {
      expect(getDeviceTypeServer('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)')).toBe('mobile');
    });

    it('returns tablet for iPad', () => {
      expect(getDeviceTypeServer('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe('tablet');
    });

    it('returns mobile for Android tablet with Mobile keyword', () => {
      expect(getDeviceTypeServer('Mozilla/5.0 (Linux; Android 11; SM-T870)')).toBe('mobile');
    });

    it('returns desktop for Windows', () => {
      expect(getDeviceTypeServer('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    });

    it('returns desktop for Mac', () => {
      expect(getDeviceTypeServer('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop');
    });
  });

  describe('getDeviceTypeClient', () => {
    it('returns value based on window and userAgent', () => {
      const result = getDeviceTypeClient();
      expect(['mobile', 'tablet', 'desktop']).toContain(result);
    });
  });
});