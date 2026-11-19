export default function MobileDefault() {
  // Default mobile route component — renders nothing.
  // Used as fallback by ClientLayoutWrapper to detect missing @mobile pages.
  // The isEmptyDefault() check in ClientLayoutWrapper looks for this displayName.
}
MobileDefault.displayName = 'MobileDefault';
