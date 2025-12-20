export function toCustomFieldKey(text: string): string {
  const input = (text || '').toLowerCase();

  // FNV-1a 32-bit hash
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `cf_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
