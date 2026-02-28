/**
 * Common utilities for Import/Export operations
 *
 * Provides shared types, interfaces, and utility functions used by both
 * import and export operations.
 */

import type { SettingGeneratorConfig } from '@/types';

/** Current export format version */
export const EXPORT_VERSION = '1.0.0';

/** Export mode determines what data is included in the export */
export enum ExportMode {
  /** Export all data: module settings and FCB settings */
  ALL = 'all',
  /** Export only module configuration settings */
  CONFIGURATION_ONLY = 'configuration_only',
  /** Export only FCB settings (no module settings) */
  SETTINGS_ONLY = 'settings_only',
}

/** Pattern for matching @UUID[...] references in text content */
const UUID_LINK_PATTERN = /@UUID\[([^\]]+)\]/g;

/** Pattern for FCB compendium UUIDs: Compendium.world.xxx.* */
const FCB_COMPENDIUM_PATTERN = /^Compendium\.world\.[^.]+\./;

/** Pattern for valid FCB compendium UUIDs */
const VALID_UUID_PATTERN = /^Compendium\.world\.[^.]+\.(JournalEntry|JournalEntryPage)\.[a-zA-Z0-9]+$/;

/** Pattern for valid JournalEntryPage UUIDs */
const VALID_JOURNAL_ENTRY_PAGE_PATTERN = /^JournalEntry\.[^.]+\.JournalEntryPage\.[a-zA-Z0-9]+$/;

/**
 * Check if a UUID belongs to an FCB document (compendium-based).
 * FCB UUIDs have the structure: Compendium.world.xxx.* where xxx is
 * the setting compendium ID.
 *
 * @param uuid - The UUID to check
 * @returns True if the UUID is an FCB document UUID
 */
export function isFCBUuid(uuid: string): boolean {
  if (!uuid) return false;
  return FCB_COMPENDIUM_PATTERN.test(uuid);
}


/**
 * Remap @UUID[...] references in text content using the provided mapping.
 * Only FCB UUIDs are remapped; non-FCB references are left unchanged.
 *
 * @param text - The text content to process
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The text with remapped UUID references
 */
export function remapUuidsInText(text: string, uuidMap: Map<string, string>): string {
  if (!text || typeof text !== 'string') return text;

  return text.replace(UUID_LINK_PATTERN, (match, uuid) => {
    const newUuid = uuidMap.get(uuid);
    if (newUuid) {
      return `@UUID[${newUuid}]`;
    }
    // If not in map, leave unchanged (could be a non-FCB reference)
    return match;
  });
}

/** Pattern for matching UUIDs that appear before a pipe (danger node format) */
/** Danger node UUIDs have format: Compendium.world.xxx.JournalEntry.yyy|index (5 segments) */
const FRONT_UUID_PATTERN = /^([^.|]+\.[^.|]+\.[^.|]+\.[^.|]+\.[^.|]+)\|/;

/**
 * Remap all UUIDs found in a string.
 * This handles:
 * 1) @UUID[...] references - remaps the UUID inside brackets
 * 2) Danger node format (frontUuid|dangerIndex) - remaps the front UUID
 * 3) Direct UUID strings - remaps if entire string is a UUID
 *
 * For each UUID found, replaces it with the new one if it's in the map,
 * otherwise leaves it unchanged.
 *
 * @param text - The string to process
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The string with remapped UUIDs
 */
function remapAllUuidsInString(text: string, uuidMap: Map<string, string>): string {
  if (!text || typeof text !== 'string') return text;

  // First, remap @UUID[...] references
  let result = text.replace(UUID_LINK_PATTERN, (match, uuid) => {
    const newUuid = uuidMap.get(uuid);
    return newUuid ? `@UUID[${newUuid}]` : match;
  });

  // Check if the entire string is a UUID in the map
  if (uuidMap.has(result)) {
    return uuidMap.get(result) || result;
  }

  // Check for danger node format (frontUuid|dangerIndex)
  // Match any UUID-like pattern before the pipe
  const dangerMatch = result.match(FRONT_UUID_PATTERN);
  if (dangerMatch) {
    const frontUuid = dangerMatch[1];
    const newFrontUuid = uuidMap.get(frontUuid);
    if (newFrontUuid) {
      result = newFrontUuid + result.substring(frontUuid.length);
    }
  }

  return result;
}

/**
 * Recursively remap UUIDs in an object's string fields.
 * This handles nested objects, arrays, and string values that may contain
 * UUID references.
 *
 * For strings, finds every UUID or front UUID in the string and:
 * 1) Replaces it with the new one if it's in the map
 * 2) Leaves it alone otherwise
 *
 * Also handles danger node UUIDs which have the format "frontUuid|dangerIndex".
 *
 * @param obj - The object to process
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The object with remapped UUID references
 */
export function remapUuidsInObject(obj: unknown, uuidMap: Map<string, string>): unknown {
  if (obj == null) return obj;

  // Handle strings - find and remap all UUIDs within
  if (typeof obj === 'string') {
    return remapAllUuidsInString(obj, uuidMap);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => remapUuidsInObject(item, uuidMap));
  }

  // Handle objects (but not null, which typeof returns 'object' for)
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Remap key if it's a UUID in the map, otherwise keep original
      // Also handle danger node keys (format: frontUuid|dangerIndex)
      const newKey = remapObjectKey(key, uuidMap);
      result[newKey] = remapUuidsInObject(value, uuidMap);
    }
    return result;
  }

  // Return primitives unchanged
  return obj;
}

/**
 * Remap an object key that may be a direct UUID, a danger node composite key,
 * or an edge style composite key.
 * 
 * Handles three formats:
 * 1. Direct UUID: "Compendium.world.xxx.JournalEntryPage.yyy"
 * 2. Danger node: "frontUuid|dangerIndex" (single UUID before pipe)
 * 3. Edge style: "edgeType:uuidA|uuidB" (two UUIDs after colon, separated by pipe)
 *
 * @param key - The key to remap
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The remapped key or the original if not found
 */
function remapObjectKey(key: string, uuidMap: Map<string, string>): string {
  // First try direct UUID match
  if (uuidMap.has(key)) {
    return uuidMap.get(key) || key;
  }

  // Check for edge style format: "edgeType:uuidA|uuidB"
  // Edge types are: manual, relationship, danger
  const edgeMatch = key.match(/^(manual|relationship|danger):([^|]+)\|(.+)$/);
  if (edgeMatch) {
    const edgeType = edgeMatch[1];
    const uuidA = edgeMatch[2];
    const uuidB = edgeMatch[3];
    const remappedA = uuidMap.get(uuidA) || uuidA;
    const remappedB = uuidMap.get(uuidB) || uuidB;
    
    // Only return remapped key if at least one UUID was remapped
    if (remappedA !== uuidA || remappedB !== uuidB) {
      // Maintain sorted order as per getEdgeUuid
      const sorted = [remappedA, remappedB].sort();
      return `${edgeType}:${sorted[0]}|${sorted[1]}`;
    }
    return key;
  }

  // Check if this is a danger node key (format: frontUuid|dangerIndex)
  const pipeIndex = key.indexOf('|');
  if (pipeIndex !== -1) {
    const frontUuid = key.substring(0, pipeIndex);
    const suffix = key.substring(pipeIndex);
    const remappedFrontUuid = uuidMap.get(frontUuid);
    if (remappedFrontUuid) {
      return remappedFrontUuid + suffix;
    }
  }

  return key;
}

/**
 * Remap UUID keys in a record object while preserving values.
 * Used for objects like `positions`, `edgeStyles`, `nodeStyles`, `hierarchies`
 * where keys are UUIDs.
 *
 * Also handles danger node UUIDs which have the format "frontUuid|dangerIndex".
 *
 * @param record - The record object with UUID keys
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns A new record with remapped keys
 */
export function remapRecordKeys<T>(
  record: Record<string, T>,
  uuidMap: Map<string, string>
): Record<string, T> {
  if (!record) return record;

  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    const newKey = remapKey(key, uuidMap);
    result[newKey] = value;
  }
  return result;
}

/**
 * Remap a single key that may be a direct UUID, a danger node composite key,
 * or an edge style composite key.
 * 
 * Handles three formats:
 * 1. Direct UUID: "Compendium.world.xxx.JournalEntryPage.yyy"
 * 2. Danger node: "frontUuid|dangerIndex" (single UUID before pipe)
 * 3. Edge style: "edgeType:uuidA|uuidB" (two UUIDs after colon, separated by pipe)
 *
 * @param key - The key to remap
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The remapped key or the original if not found
 */
function remapKey(key: string, uuidMap: Map<string, string>): string {
  // First try direct UUID match
  if (uuidMap.has(key)) {
    return uuidMap.get(key) || key;
  }

  // Check for edge style format: "edgeType:uuidA|uuidB"
  // Edge types are: manual, relationship, danger
  const edgeMatch = key.match(/^(manual|relationship|danger):([^|]+)\|(.+)$/);
  if (edgeMatch) {
    const edgeType = edgeMatch[1];
    const uuidA = edgeMatch[2];
    const uuidB = edgeMatch[3];
    const remappedA = uuidMap.get(uuidA) || uuidA;
    const remappedB = uuidMap.get(uuidB) || uuidB;
    
    // Only return remapped key if at least one UUID was remapped
    if (remappedA !== uuidA || remappedB !== uuidB) {
      // Maintain sorted order as per getEdgeUuid
      const sorted = [remappedA, remappedB].sort();
      return `${edgeType}:${sorted[0]}|${sorted[1]}`;
    }
    return key;
  }

  // Check if this is a danger node key (format: frontUuid|dangerIndex)
  const pipeIndex = key.indexOf('|');
  if (pipeIndex !== -1) {
    const frontUuid = key.substring(0, pipeIndex);
    const dangerIndex = key.substring(pipeIndex);
    const remappedFrontUuid = uuidMap.get(frontUuid);
    if (remappedFrontUuid) {
      return remappedFrontUuid + dangerIndex;
    }
  }

  return key;
}

/**
 * Remap UUIDs in an array of UUID strings.
 *
 * @param uuids - Array of UUID strings
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns New array with remapped UUIDs
 */
export function remapUuidArray(uuids: string[], uuidMap: Map<string, string>): string[] {
  if (!uuids) return uuids;
  return uuids.map(uuid => uuidMap.get(uuid) || uuid);
}

/**
 * Remap a single UUID if it exists in the map.
 *
 * @param uuid - The UUID to remap
 * @param uuidMap - Map of old UUIDs to new UUIDs
 * @returns The remapped UUID or the original if not found
 */
export function remapUuid(uuid: string | null | undefined, uuidMap: Map<string, string>): string | null {
  if (!uuid) return null;
  return uuidMap.get(uuid) || uuid;
}

// ===========================================
// Shared Types and Interfaces
// ===========================================

/** Export data structure */
export interface ModuleExportData {
  version: string;
  exportedAt: string;
  /** Export mode determines what data is included */
  exportMode: ExportMode;
  /** Module configuration settings (present when mode is ALL or CONFIGURATION_ONLY) */
  moduleSettings: Record<string, unknown> | null;
  /** FCB settings data (present when mode is ALL or SETTINGS_ONLY) */
  settings: SettingExportData[] | null;
}

/** Import context to track original data and mappings */
export interface ImportContext {
  /** Maps old UUID -> new UUID (for remapping content) */
  uuidMap: Map<string, string>;
  /** Maps new UUID -> old UUID (for finding original data during second pass) */
  reverseUuidMap: Map<string, string>;
  /** Original document data keyed by old UUID */
  originalData: Map<string, DocumentExportData>;
  /** JournalEntry IDs to preserve when creating settings (for cross-world imports) */
  entryIdsToPreserve: Set<string>;
  /** Roll table configs from existing settings, keyed by JournalEntry ID */
  existingRollTableConfigs: Map<string, SettingGeneratorConfig | null>;
}

/** Setting export data structure */
export interface SettingExportData {
  uuid: string;
  name: string;
  description: string | null;
  system: Record<string, unknown>;
  documents: {
    entries: DocumentExportData[];
    campaigns: DocumentExportData[];
    sessions: DocumentExportData[];
    arcs: DocumentExportData[];
    fronts: DocumentExportData[];
    storyWebs: DocumentExportData[];
  };
}

/** Individual document export data */
export interface DocumentExportData {
  uuid: string;
  name: string;
  description: string | null;
  system: Record<string, unknown>;
}

/** Progress callback type */
export type ProgressCallback = (message: string, progress?: number) => void;

// ===========================================
// Shared Validation Functions
// ===========================================


export default {
  EXPORT_VERSION,
  isFCBUuid,
  remapUuidsInText,
  remapUuidsInObject,
  remapRecordKeys,
  remapUuidArray,
  remapUuid,
};
