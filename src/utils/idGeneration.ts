/**
 * Generate a consistent ID from a name string.
 * Converts to lowercase and replaces spaces with underscores.
 * Used for creating stable identifiers from user-friendly names.
 * This matches the logic used in customFields.ts for consistency.
 * 
 * @param text - The display name to convert to an ID
 * @param fallbackLength - Length of random ID to generate if name is empty (default: 8)
 * @returns A stable ID string
 */
export const generateIdFromName = (text: string, fallbackLength: number = 8): string => {
  const lowered = (text || '').toLowerCase();

  // keep only letters, numbers, and spaces
  const cleaned = lowered.replace(/[^a-z0-9 ]/g, '');

  const underscored = cleaned.trim().replace(/\s+/g, '_');
  if (!underscored) return foundry.utils.randomID(fallbackLength);

  return underscored;
};
