import { isValidElement, type ReactNode } from 'react';
import { isEmptyDefault } from './isEmptyDefault';

const DESKTOP_CONTENT_ROUTE_PREFIXES = ['/blog'];
const EVENT_DETAIL_ROUTE_PATTERN = /^\/events\/[^/]+\/[^/]+\/?$/;

function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const REACT_LAZY_TYPE = Symbol.for('react.lazy');
const DEFAULT_SEGMENT = '__DEFAULT__';

function isLazyNode(node: ReactNode): boolean {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as { readonly $$typeof?: symbol }).$$typeof === REACT_LAZY_TYPE
  );
}

function hasRenderableMobileSlot(node: ReactNode): boolean {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return false;
  }
  if (isLazyNode(node)) return true;

  if (typeof node === 'string') return node.trim().length > 0;
  if (typeof node === 'number') return true;
  if (Array.isArray(node)) return node.some((child) => hasRenderableMobileSlot(child));
  if (!isValidElement(node) || isEmptyDefault(node)) return false;

  const children = (node.props as { readonly children?: ReactNode }).children;
  if (children === undefined) return typeof node.type !== 'string';
  return hasRenderableMobileSlot(children);
}

export function shouldUseMobileSlotForPath(pathname: string | null): boolean {
  if (!pathname) {
    return true;
  }

  if (EVENT_DETAIL_ROUTE_PATTERN.test(pathname)) return false;
  return !DESKTOP_CONTENT_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix));
}

export function shouldRenderMobileSlot(
  pathname: string | null,
  isMobileDevice: boolean,
  mobile: ReactNode,
): boolean {
  return isMobileDevice && shouldUseMobileSlotForPath(pathname) && hasRenderableMobileSlot(mobile);
}

export const MOBILE_MIRROR_GROUP = '(mirror)';

export function isMobileMirrorRoute(mobileSegments: readonly string[] | null): boolean {
  return mobileSegments?.includes(MOBILE_MIRROR_GROUP) ?? false;
}

function isRouteGroup(segment: string): boolean {
  return segment.startsWith('(') && segment.endsWith(')');
}

export function mobileSlotMatchesRoute(
  mobileSegments: readonly string[],
  routeSegments: readonly string[],
): boolean {
  if (mobileSegments.includes(DEFAULT_SEGMENT)) return false;
  const mobile = mobileSegments.filter((segment) => !isRouteGroup(segment));
  const route = routeSegments.filter((segment) => !isRouteGroup(segment));
  return mobile.length === route.length && mobile.every((segment, i) => segment === route[i]);
}
