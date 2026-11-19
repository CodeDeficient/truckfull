'use client';

import { usePathname, useSelectedLayoutSegments } from 'next/navigation';
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AuthProvider } from '@/app/auth/AuthProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { MaterialSymbolsLoader } from '@/components/MaterialSymbolsLoader';
import {
  isMobileMirrorRoute,
  mobileSlotMatchesRoute,
  shouldRenderMobileSlot,
  shouldUseMobileSlotForPath,
} from '@/lib/utils/mobileSlotRouting';
import { MobileShell } from '@/components/layout/MobileShell';
import { AutoClaimChecker } from '@/components/auth/AutoClaimChecker';

const GOOGLEBOT_USER_AGENT = /Googlebot/i;
const MOBILE_USER_AGENT = /Mobi|Android|iPhone|iPad|iPod/i;
const EVENT_DETAIL_PATH = /^\/events\/[^/]+\/[^/]+\/?$/;
const EVENTS_LIST_PATH = /^\/events(?:\/[^/]+)?\/?$/;

interface ClientLayoutWrapperProps {
  readonly children: ReactNode;
  readonly hasMobileSlot: boolean;
  readonly mobile?: ReactNode;
}

function subscribeToDeviceClass(): () => void {
  return () => {};
}

function getBrowserIsMobile(): boolean {
  const userAgent = navigator.userAgent;
  return !GOOGLEBOT_USER_AGENT.test(userAgent) && MOBILE_USER_AGENT.test(userAgent);
}

function selectSlotContent(
  showMobile: boolean,
  mirrorsDesktop: boolean,
  children: ReactNode,
  mobile: ReactNode,
): ReactNode {
  if (!showMobile) return children;
  return mirrorsDesktop ? <MobileShell>{children}</MobileShell> : mobile;
}

function MountGate({ children }: { readonly children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

export default function ClientLayoutWrapper({
  children,
  hasMobileSlot,
  mobile,
}: ClientLayoutWrapperProps) {
  const pathname = usePathname();
  const clientIsMobileDevice = useSyncExternalStore(
    subscribeToDeviceClass,
    getBrowserIsMobile,
    () => true,
  );
  const mobileSegments = useSelectedLayoutSegments('mobile');
  const slotMatchesRoute = mobileSlotMatchesRoute(mobileSegments, useSelectedLayoutSegments());
  const mirrorsDesktop = isMobileMirrorRoute(mobileSegments);
  const [clientHasMobileSlot, setClientHasMobileSlot] = useState(hasMobileSlot);
  const previousPathname = useRef(pathname);
  const isInitialSlotEffect = useRef(true);

  useLayoutEffect(() => {
    if (isInitialSlotEffect.current) {
      isInitialSlotEffect.current = false;
      return;
    }

    const wasEventDetail = EVENT_DETAIL_PATH.test(previousPathname.current);
    const isEventIndex = EVENTS_LIST_PATH.test(pathname);
    previousPathname.current = pathname;
    setClientHasMobileSlot(
      (shouldRenderMobileSlot(pathname, true, mobile) && slotMatchesRoute) ||
        (wasEventDetail && isEventIndex),
    );
  }, [mobile, pathname, slotMatchesRoute]);

  const renderMobileSlot =
    clientIsMobileDevice && clientHasMobileSlot && shouldUseMobileSlotForPath(pathname);

  // Hide the instant skeleton as soon as React hydrates
  useEffect(() => {
    const skeleton = document.querySelector('#instant-skeleton');
    if (skeleton) {
      skeleton.classList.add('hidden');
    }
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        disableTransitionOnChange
      >
        {selectSlotContent(renderMobileSlot, mirrorsDesktop, children, mobile)}
        <MountGate>
          <AutoClaimChecker />
        </MountGate>
      </ThemeProvider>
      <MaterialSymbolsLoader />
    </AuthProvider>
  );
}
