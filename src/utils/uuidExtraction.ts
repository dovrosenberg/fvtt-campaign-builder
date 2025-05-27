/**
 * Utility functions for extracting UUIDs from text content
 */

import { Entry } from '@/classes';
import { RelatedItemDetails } from '@/types';

/**
 * Extracts all UUIDs from text content that match @UUID[...] patterns
 * @param content The text content to extract UUIDs from
 * @returns Array of unique UUIDs found in the content
 */
export function extractUUIDs(content: string): string[] {
  if (!content) {
    return [];
  }

  // This matches @UUID[uuid] - we ignore the optional label
  const uuidRegex = /@UUID\[([^\]]+)\]/g;
  
  const uuids = new Set<string>();
  let match;
  
  while ((match = uuidRegex.exec(content)) !== null) {
    const uuid = match[1]; // The UUID is the first capture group
    if (uuid) {
      uuids.add(uuid);
    }
  }
  
  return Array.from(uuids);
}

/**
 * Compares two arrays of UUIDs and returns the differences
 * @param originalUUIDs The original list of UUIDs
 * @param newUUIDs The new list of UUIDs
 * @returns Object containing added and removed UUIDs
 */
export function compareUUIDs(originalUUIDs: string[], newUUIDs: string[]): {
  added: string[];
  removed: string[];
} {
  const originalSet = new Set(originalUUIDs);
  const newSet = new Set(newUUIDs);
  
  const added = newUUIDs.filter(uuid => !originalSet.has(uuid));
  const removed = originalUUIDs.filter(uuid => !newSet.has(uuid));
  
  return { added, removed };
} 

/** for a list of added and removed UUIDs, return a list of ones that are not/are already 
 *  in the current entry's related entries
 */
export async function getRelatedEntries(addedUUIDs: string[], removedUUIDs: string[], currentEntry: Entry): { added: string[], removed: string[]} {
  // collapse the topics to a single object keyed by UUID to make easier
  const relatedEntries = Object.values(currentEntry.relationships).reduce((acc, topic) => {
    Object.values(topic).forEach(details => {
      acc[details.uuid] = details;
    });
    return acc;
  }, {} as Record<string, RelatedItemDetails<any, any>>);

  // also remove ourself (just in case) and our parent (because that seems like a common
  // thing you'd type but not want to connect since you can see it right there anyway and
  // it's indexed to search so there's no reason to connect to it)
  const world = await currentEntry.getWorld();
  const parentId = world.getEntryHierarchy(currentEntry.uuid)?.parentId || null;

  const added = addedUUIDs.filter(uuid => !relatedEntries[uuid] && ![currentEntry.uuid, parentId].includes(uuid));
  const removed = removedUUIDs.filter(uuid => relatedEntries[uuid] && ![currentEntry.uuid, parentId].includes(uuid));
  return { added, removed };
}