import { isValidElement, type ReactNode } from 'react';

/** @returns true if `node` is null/undefined/primitive or the sentinel `MobileDefault` component.
 *
 * NOTE: If `MobileDefault` is ever wrapped in `React.memo()` or `React.forwardRef()`,
 * `node.type` becomes an object (not a function), and this returns `false`
 * (the slot would render). Guard against that if wrapping is added later. */
export function isEmptyDefault(node: ReactNode): boolean {
  if (!isValidElement(node)) return true;
  const type = node.type;
  if (typeof type === 'function') {
    const comp = type as { displayName?: string; name?: string };
    const name = comp.displayName || comp.name;
    if (name === 'MobileDefault') return true;
    if (name === 'MobileLayout') {
      const children = (node.props as { children?: ReactNode })?.children;
      return isEmptyDefault(children);
    }
  }
  return false;
}
