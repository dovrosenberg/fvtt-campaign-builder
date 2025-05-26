import { searchService, FCBSearchResult } from '@/utils/search';
import { WBWorld } from '@/classes';

/**
 * Interface for entity reference replacement options
 */
export interface EntityLinkingOptions {
  /** The UUID of the current entity being edited (to exclude from replacements) */
  currentEntityUuid?: string;
}

/**
 * Replaces entity references in text with @UUID links
 * @param content The HTML content to process
 * @param world The current world for entity lookup
 * @param options Configuration options for the replacement
 * @returns The processed content with entity references replaced
 */
export async function replaceEntityReferences(
  content: string, 
  world: WBWorld, 
  options: EntityLinkingOptions = {}
): Promise<string> {
  const { currentEntityUuid } = options;

  // Get all entities from the search index
  const allEntities = searchService.getAllEntities();
  
  if (allEntities.length === 0) {
    return content;
  }

  // Filter out the current entity
  const filteredEntities = allEntities.filter(entity => 
    entity.uuid !== currentEntityUuid
  );

  if (filteredEntities.length === 0) {
    return content;
  }

  // Create a map for fast entity lookup by name (case-insensitive)
  const names = filteredEntities.map(entity => (entity.name));

  // Sort entity names by length (longest first) to avoid partial replacements
  const sortedNames = names
    .sort((a, b) => b.length - a.length);

  // Create a single regex pattern that matches any entity name
  const escapedNames = sortedNames.map(name => escapeRegExp(name));
  const combinedPattern = new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'gi');

  // Replace all matches in a single pass
  return content.replace(combinedPattern, (match, capturedName, offset) => {
    // Check if this match is already inside a @UUID reference or HTML tag
    if (isInsideHtmlTag(content, offset) || isInsideUuidReference(content, offset)) {
      return match;
    }

    // Look up the entity (case-insensitive)
    const entity = filteredEntities.find((e) => e.name.toLowerCase() === capturedName.toLowerCase());
    if (!entity) {
      return match; // Shouldn't happen, but safety check
    }

    // Replace with @UUID link
    return `@UUID[${entity.uuid}]`;
  });
}


/**
 * Checks if a position in the content is inside an HTML tag
 * @param content The full content
 * @param position The position to check
 * @returns True if the position is inside an HTML tag
 */
function isInsideHtmlTag(content: string, position: number): boolean {
  // Look backwards for the nearest < or >
  let lastTagStart = content.lastIndexOf('<', position);
  let lastTagEnd = content.lastIndexOf('>', position);
  
  // If we found a < after the last >, we're inside a tag
  return lastTagStart > lastTagEnd;
}

/**
 * Checks if a position in the content is inside a @UUID reference
 * @param content The full content
 * @param position The position to check
 * @returns True if the position is inside a @UUID reference
 */
function isInsideUuidReference(content: string, position: number): boolean {
  // Look backwards for @UUID pattern
  const beforePosition = content.substring(0, position);
  const uuidStart = beforePosition.lastIndexOf('@UUID[');
  
  if (uuidStart === -1) {
    return false;
  }
  
  // Find the end of this UUID reference
  const afterUuidStart = content.substring(uuidStart);
  const uuidEnd = afterUuidStart.indexOf('}');
  
  if (uuidEnd === -1) {
    return false;
  }
  
  // Check if our position is within this UUID reference
  return position < uuidStart + uuidEnd + 1;
}

/**
 * Escapes special regex characters in a string
 * @param string The string to escape
 * @returns The escaped string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 