export const MOBILE_TAB_MIN_HEIGHT_PX = 64;

export const COLLAPSE_BTN_MIN_SIZE_PX = 44;

export function getMobileGridCols(_tabCount: number): string {
  return 'grid grid-cols-4 gap-2 justify-items-center';
}

export function getTabTouchTargetClass(): string {
  return 'flex flex-col items-center justify-center gap-0.5 min-h-16 w-full rounded-lg';
}

export function getCollapseBtnClass(): string {
  return 'self-center p-2 min-w-[44px] min-h-[44px] flex items-center justify-center';
}
