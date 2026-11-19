export function isDefined<T>(v: T | null | undefined): v is T {
  return v != undefined;
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}
