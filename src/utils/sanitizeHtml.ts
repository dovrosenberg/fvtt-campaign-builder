// from https://github.com/ecosia/vue-safe-html

import { Entry } from '@/classes';

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

// does a sanitize but also swaps UUIDs for the entry name
export const htmlToPlainTextReplaceUuid = async (htmlString: string): Promise<string> => {
  // first do the basic clean
  let retval = htmlToPlainText(htmlString);

  // now search for any UUIDs and replace them with the entry name
  const uuidRegex = /@UUID\[([^\]]+)\](\{([^\}]+)\})?/gi;
  
  // for each match:
  //    if it has a (text) after it, use that text as the name
  //    otherwise, look up the ID as an entry, and then as a document
  for (const match of retval.matchAll(uuidRegex)) {
    const uuid = match[1]; // The actual UUID string
    const labelText = match[3];  // The label text (without braces), or undefined
    const replacement = labelText ? labelText : await replaceUUID(uuid);
    retval = retval.replace(match[0], replacement);
  }

  return retval;
};

const replaceUUID = async (uuid: string): Promise<string> => {
  // check Entry first, because those seem more likely
  const entry = await Entry.fromUuid(uuid);
  if (entry) 
    return entry.name || '';

  // then check foundry docs
  const doc = await fromUuid(uuid as any);
  return doc?.name ?? '??';
};

/**
 * Converts AI-generated plain text (which is formatted for safe display with whitespace-pre-wrap) 
 * into proper HTML for editor storage.
 * Takes string, splits it by newline characters, trims each line, filters out empty lines, and then wraps each line in a <p> tag.
 * Escapes HTML special characters, processes markdown-style bold formatting.
 * Results is a string of HTML <p> tags, each containing one line of text
 * 
 * @param text - The plain text to convert to HTML
 * @returns HTML string with proper paragraph structure and basic formatting
 */
export function generatedTextToHTML(text: string) {
  return text
  // replace special characters
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

  // mark bold (for short descriptions)
  .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')

  // change newlines to paragraphs
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .map(line => `<p>${line}</p>`)
  .join('');
}

/**
 * Converts HTML text back to plain text with newlines preserved.
 * Strips most HTML tags but converts <br> and <p> elements to newlines.
 * This is the reverse operation of generatedTextToHTML, though not perfectly symmetric.  You should
 * not expect that calling htmlToPlainText(generatedTextToHTML(text)) will return the original text.
 * 
 * @param html - The HTML string to convert to plain text
 * @returns Plain text with newlines representing paragraph breaks
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Convert <br> and <p> to newlines before stripping tags
  tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  tempDiv.querySelectorAll('p').forEach(p => {
    const newline = document.createTextNode('\n\n');
    p.appendChild(newline);
  });

  return tempDiv.textContent?.trim() ?? '';
}