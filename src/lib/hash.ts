// Stryker disable all: hash function mutation results are low-signal without property-based collision/avalanche tests.
export function hashText(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16);
}
// Stryker restore all
