export function escapeIlike(value: string): string {
  let escaped = value.replaceAll('\\', '\\\\');
  escaped = escaped.replaceAll('%', String.raw`\%`);
  escaped = escaped.replaceAll('_', String.raw`\_`);
  return escaped;
}
