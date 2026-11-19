// @ts-nocheck
// Test setup file to properly mock components that cause issues in tests
import { jest } from '@jest/globals';

// Extend Window interface for test environment
declare global {
  interface Window {
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?: string;
  }
}

// Mock react-map-gl/mapbox BEFORE any imports to fix ESM import validation
jest.mock('react-map-gl/mapbox', () => {
  const React = jest.requireActual('react') as typeof import('react');

  const MapMock = jest.fn(({ children, ...props }) =>
    React.createElement('div', { 'data-testid': 'mapbox-map', ...props }, children),
  );

  return {
    __esModule: true,
    default: MapMock,
    Map: MapMock,
    Marker: jest.fn(({ children, onClick, latitude, longitude }) =>
      React.createElement(
        'div',
        {
          'data-testid': 'marker',
          onClick,
          'data-lat': latitude,
          'data-lng': longitude,
        },
        children,
      ),
    ),
    NavigationControl: jest.fn((props) =>
      React.createElement('div', { 'data-testid': 'navigation-control', ...props }),
    ),
    GeolocateControl: jest.fn((props) =>
      React.createElement('div', { 'data-testid': 'geolocate-control', ...props }),
    ),
    Popup: jest.fn(({ children, onClose, latitude, longitude }: any) =>
      React.createElement(
        'div',
        { 'data-testid': 'popup', 'data-lng': longitude, 'data-lat': latitude },
        children,
        onClose && React.createElement('button', { onClick: onClose }, 'Close'),
      ),
    ),
  };
});

// Note: Node 18+ has native fetch, but jsdom environment (used by component tests) does NOT.
// We must mock it globally for tests.
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    clone: function () {
      return this;
    },
  } as unknown as Response),
);

// jsdom does not implement ResizeObserver (used by SocialFooter's scroll-state effect).
// A no-op stub keeps component tests from crashing on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver =
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverStub;

console.log('Setup file loaded!');

// Mock next/headers to fix ESM mocking issues for Supabase SSR
// This must be at module level to intercept the module chain before routes import @supabase/ssr
jest.mock('next/headers', () => {
  const mockCookies = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(() => []),
  };

  const mockHeaders = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  return {
    cookies: jest.fn(() => mockCookies),
    headers: jest.fn(() => mockHeaders),
  };
});

// Mock @supabase/ssr to fix ESM mocking issues
// This returns same mockSupabaseClient from our existing mocks
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    storage: {
      upload: jest.fn(),
      download: jest.fn(),
      getPublicUrl: jest.fn(),
      remove: jest.fn(),
    },
    channel: jest.fn(),
    rpc: jest.fn(),
  })),
  createBrowserClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    storage: {
      upload: jest.fn(),
      download: jest.fn(),
      getPublicUrl: jest.fn(),
      remove: jest.fn(),
    },
    channel: jest.fn(),
    rpc: jest.fn(),
  })),
}));

// Mock next/image properly
jest.mock('next/image', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { TRUCK_FALLBACK_IMAGE } = jest.requireActual(
    '@/lib/utils/photoTransform',
  ) as typeof import('@/lib/utils/photoTransform');

  const MockImage = (props: Record<string, unknown>) => {
    const { src, alt, fill, className, ...rest } = props;
    return React.createElement('img', {
      src: src || TRUCK_FALLBACK_IMAGE,
      alt,
      'data-fill': fill ? 'true' : 'false',
      className,
      ...rest,
    });
  };

  // Ensure proper export structure
  MockImage.displayName = 'MockImage';
  return {
    __esModule: true,
    default: MockImage,
    // Also export as named export to handle different import styles
    Image: MockImage,
  };
});

// Mock lucide-react icons properly - include all icons used across the codebase
jest.mock('lucide-react', () => {
  const React = jest.requireActual('react') as typeof import('react');

  // Create a mock function that returns an SVG element for any icon
  const createIconMock = (iconName: string) => {
    const iconComponent = (props: Record<string, unknown>) => {
      return React.createElement('svg', {
        'data-testid': `icon-${iconName.toLowerCase()}`,
        ...props,
      });
    };
    iconComponent.displayName = iconName;
    return iconComponent;
  };

  // Create proxy that handles all icon accesses
  const iconProxy = new Proxy(
    {},
    {
      get(_target: unknown, prop: string) {
        return createIconMock(prop);
      },
    },
  );

  // Explicitly export all icons to satisfy ESM import validation
  const allIcons = [
    'Heart',
    'Pizza',
    'Coffee',
    'Soup',
    'CookingPot',
    'Fish',
    'Sandwich',
    'Cake',
    'Salad',
    'Wine',
    'Apple',
    'ChefHat',
    'Beef',
    'Drumstick',
    'Facebook',
    'Instagram',
    'Twitter',
    'Globe',
    'Navigation',
    'Share2',
    'Check',
    'MapPin',
    'Flame',
    'Clock',
    'ClockIcon',
    'Store',
    'ExternalLink',
    'Calendar',
    'Users',
    'TrendingUp',
    'TrendingUpIcon',
    'Info',
    'Star',
    'BarChart3',
    'Settings',
    'Utensils',
    'Mail',
    'HelpCircle',
    'HelpCircleIcon',
    'Copy',
    'ArrowLeft',
    'ArrowUpDown',
    'ChevronLeft',
    'ChevronRight',
    'User',
    'Bell',
    'BellIcon',
    'BellOffIcon',
    'Shield',
    'Palette',
    'X',
    'Truck',
    'CheckCircle',
    'CheckCircleIcon',
    'XCircle',
    'Loader2',
    'Eye',
    'EyeOff',
    'AlertCircle',
    'Chrome',
    'Upload',
    'SettingsIcon',
    'Grid3X3',
    'Grid3X3Icon',
    'Search',
    'SlidersHorizontal',
    'Bookmark',
    'ClipboardList',
    'ShieldCheck',
    'FileText',
    'Map',
    'ChevronUp',
  ];

  const explicitExports: Record<string, any> = {};
  for (const icon of allIcons) {
    explicitExports[icon] = createIconMock(icon);
  }

  return {
    __esModule: true,
    default: iconProxy,
    ...explicitExports,
    ...iconProxy,
  };
});

// Mock Button component
jest.mock('@/components/ui/button', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    Button: (props: Record<string, unknown>) => {
      const { children, onClick, variant, size, className } = props;
      return React.createElement(
        'button',
        {
          'data-variant': variant,
          'data-size': size,
          className,
          onClick,
        },
        children,
      );
    },
  };
});

// Mock ClaimTruckModal component
jest.mock('@/components/owner/ClaimTruckModal', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    ClaimTruckModal: (props: { isOpen: boolean; onClose: () => void }) => {
      if (props.isOpen) {
        return React.createElement('div', { 'data-testid': 'claim-modal' }, 'Claim Modal');
      }
      return null;
    },
  };
});

// Mock other shadcn/ui components that might be used
jest.mock('@/components/ui/accordion', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    Accordion: (props: Record<string, unknown>) => React.createElement('div', props),
    AccordionItem: (props: Record<string, unknown>) => React.createElement('div', props),
    AccordionTrigger: (props: Record<string, unknown>) => React.createElement('button', props),
    AccordionContent: (props: Record<string, unknown>) => React.createElement('div', props),
  };
});

// Mock dialog components if used
jest.mock('@/components/ui/dialog', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    Dialog: (props: Record<string, unknown>) => React.createElement('div', props),
    DialogTrigger: (props: Record<string, unknown>) => React.createElement('button', props),
    DialogContent: (props: Record<string, unknown>) => React.createElement('div', props),
    DialogHeader: (props: Record<string, unknown>) => React.createElement('div', props),
    DialogTitle: (props: Record<string, unknown>) => React.createElement('h2', props),
    DialogDescription: (props: Record<string, unknown>) => React.createElement('p', props),
    DialogClose: (props: Record<string, unknown>) => React.createElement('button', props),
    DialogFooter: (props: Record<string, unknown>) => React.createElement('div', props),
  };
});

// Mock other common components that might be used
jest.mock('@/components/ui/badge', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    Badge: (props: Record<string, unknown>) => React.createElement('span', props),
  };
});

// Mock input component
jest.mock('@/components/ui/input', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    Input: (props: Record<string, unknown>) => React.createElement('input', props),
  };
});

// Mock tabs components
jest.mock('@/components/ui/tabs', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    Tabs: (props: Record<string, unknown>) => React.createElement('div', props),
    TabsList: (props: Record<string, unknown>) => React.createElement('div', props),
    TabsTrigger: (props: Record<string, unknown>) => React.createElement('button', props),
    TabsContent: (props: Record<string, unknown>) => React.createElement('div', props),
  };
});

// Mock alert components
jest.mock('@/components/ui/alert', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    Alert: (props: Record<string, unknown>) => React.createElement('div', props),
    AlertDescription: (props: Record<string, unknown>) => React.createElement('div', props),
  };
});

// Mock openrouter module to avoid actual API calls
jest.mock('@/lib/openrouter', () => ({
  callOpenRouter: jest.fn(),
}));

// NOTE: Removed global jest.mock('@/lib/supabase/utils/server') from setup.ts
// because it conflicts with jest.unstable_mockModule() in ESM test files.
// Individual test files that need this mock should use jest.unstable_mockModule()
// at the top level before any describe() blocks.

// Mock TruckAccordionItem component
jest.mock('@/components/trucks/TruckAccordionItem', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    TruckAccordionItem: React.forwardRef(
      ({ truck, isFavorited, onToggleFavorite }: any, ref: any) =>
        React.createElement(
          'div',
          { ref, 'data-testid': `truck-accordion-item-${truck.id}` },
          React.createElement('span', { 'data-testid': 'truck-name' }, truck.name),
          React.createElement(
            'button',
            {
              'data-testid': 'favorite-button',
              onClick: () => onToggleFavorite(truck.id),
            },
            isFavorited ? '❤️' : '🤍',
          ),
        ),
    ),
  };
});

// Mock AuthProvider to avoid useAuth dependency in useFavorites
jest.mock('@/app/auth/AuthProvider', () => {
  const React = jest.requireActual('react') as typeof import('react');

  const mockUser = { id: 'test-user-id', email: 'test@example.com' };
  const mockAuthContextValue = {
    user: mockUser,
    loading: false,
    signOut: jest.fn().mockResolvedValue(undefined),
  };

  const MockAuthContext = React.createContext(mockAuthContextValue);

  const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(MockAuthContext.Provider, { value: mockAuthContextValue }, children);
  };

  return {
    __esModule: true,
    AuthContext: MockAuthContext,
    useAuth: jest.fn(() => mockAuthContextValue),
    signOut: jest.fn().mockResolvedValue(undefined),
    AuthProvider: MockAuthProvider,
    default: MockAuthProvider,
  };
});

// Create global mocks for useFavorites that can be accessed by tests
const mockToggleFavoriteGlobal = jest.fn().mockResolvedValue({ success: true });
const mockIsFavoritedGlobal = jest.fn(() => false);

// Export to global scope for test files to access
(global as any).__mockToggleFavorite = mockToggleFavoriteGlobal;
(global as any).__mockIsFavorited = mockIsFavoritedGlobal;

// Mock useFavorites hook to avoid AuthProvider dependency
jest.mock('@/hooks/useFavorites', () => {
  const mockUseFavorites = jest.fn(() => ({
    favoriteIds: new Set(),
    toggleFavorite: mockToggleFavoriteGlobal,
    isFavorited: mockIsFavoritedGlobal,
    loading: false,
    error: undefined,
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
    refreshFavorites: jest.fn(),
    isAuthenticated: true,
  }));

  return {
    __esModule: true,
    default: mockUseFavorites,
    useFavorites: mockUseFavorites,
  };
});

// Polyfill crypto.subtle for jsdom (jsdom overrides globalThis.crypto without subtle)
// lib/privacy/emailHash.ts uses Web Crypto API (crypto.subtle.digest) for browser-safe SHA-256
if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.subtle === 'undefined') {
  Object.defineProperty(globalThis.crypto, 'subtle', {
    value: (jest.requireActual('node:crypto') as typeof import('node:crypto')).webcrypto.subtle,
    writable: false,
    configurable: true,
  });
}

// Polyfill structuredClone for jsdom (jsdom does not provide it)
// lib/services/postProcessor.ts uses structuredClone to snapshot parsed data
// for persistence. JSON-clone is sufficient for those plain-JSON payloads
// (no Dates, no undefined-carrying fields).
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value)) as unknown;
}

// Mock @hookform/resolvers/zod for form validation
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: jest.fn(),
}));

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(),
    handleSubmit: jest.fn((fn) => fn),
    formState: { errors: {} },
  })),
}));
