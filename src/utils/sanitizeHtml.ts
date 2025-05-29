// from https://github.com/ecosia/vue-safe-html

/**
 * List of HTML tags that are allowed to remain in sanitized content.
 * These tags are considered safe for display and won't be stripped during sanitization.
 */
const allowedTags = [
  'a', 'b', 'br', 'strong', 'i', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
  'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'br',
];

/**
 * List of HTML attributes that are allowed to remain on sanitized tags.
 * Includes standard attributes and Foundry VTT-specific data attributes for proper functionality.
 */
const allowedAttributes = [
  'title', 'class', 'style', 'href', 'draggable', 'inert',
  'data-link-type', 'data-link', 'data-uuid', 'data-id', 'data-type', 
  'data-pack', 'data-tooltip', 'data-tooltip-text'
];

/**
 * Regular expression for removing all HTML tags from content.
 * Matches opening and closing tags including malformed ones.
 */
const removeAllTagsRegex = /<\/?[^>]+(>|$)/g;

/**
 * Removes all HTML tags from the input string, leaving only text content.
 * 
 * @param input - The string to strip HTML tags from
 * @returns The input string with all HTML tags removed
 */
export const removeAllTags = (input: string): string => (input.replace(removeAllTagsRegex, ''));

/**
 * Sanitizes HTML content by removing disallowed tags and attributes while preserving safe content.
 * If no tags are allowed, strips all HTML. Otherwise, filters tags and attributes against allow lists.
 * Special handling for href attributes to ensure they start with "http" for security.
 * 
 * @param htmlString - The HTML string to sanitize
 * @returns The sanitized HTML string with only allowed tags and attributes
 */
export const sanitizeHTML = (htmlString: string): string => {
  if (!htmlString) {
    return '';
  }

  if (allowedTags.length === 0) {
    return removeAllTags(htmlString);
  }

  return htmlString.replace(/<(\/*)(\w+)([^>]*)>/g, (_match, closing, tagName, attrs) => {
    if (allowedTags.includes(tagName)) {
      // If the tag is allowed, we'll retain only allowed attributes.
      if (closing) {
        // If it's a closing tag, simply return it as is.
        return `</${tagName}>`;
      }

      // Process attributes using regex to properly handle quoted values
      const attrRegex = /(\w+(?:-\w+)*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
      let processedAttrs = '';
      let match;

      while ((match = attrRegex.exec(attrs))) {
        const [_, attrName, doubleQuotedValue, singleQuotedValue] = match;
        const value = doubleQuotedValue ?? singleQuotedValue;
        
        if (allowedAttributes.includes(attrName)) {
          if (attrName === 'href') {
            if (value && value.startsWith('http')) {
              processedAttrs += ` ${attrName}="${value}"`;
            } else {
              processedAttrs += ` ${attrName}=""`;
            }
          } else if (value !== undefined) {
            // Use double quotes consistently for all attributes with values
            processedAttrs += ` ${attrName}="${value}"`;
          } else {
            // Handle boolean attributes
            processedAttrs += ` ${attrName}`;
          }
        }
      }

      return `<${tagName}${processedAttrs}>`;
    }
    
    // If the tag is not allowed, strip it completely.
    return '';
  });
};
