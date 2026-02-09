// from https://github.com/ecosia/vue-safe-html

import { Entry } from '@/classes';

/**
 * List of HTML tags that are allowed to remain in sanitized content.
 * These tags are considered safe for display and won't be stripped during sanitization.
 */
const allowedTags = [
  'a', 'b', 'br', 'strong', 'i', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
  'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 
  'code', 'br', 'img', 'span', 's',
];

/**
 * List of HTML attributes that are allowed to remain on sanitized tags.
 * Includes standard attributes and Foundry VTT-specific data attributes for proper functionality.
 */
const allowedAttributes = [
  'title', 'class', 'style', 'href', 'src', 'alt', 'width', 'height', 'draggable', 'inert',
  'data-link-type', 'data-link', 'data-uuid', 'data-id', 'data-type', 
  'data-pack', 'data-tooltip', 'data-tooltip-text', 'data-hash'
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
          } else if (attrName === 'src') {
            if (value && (value.startsWith('http') || value.startsWith('/') || value.startsWith('./') || value.startsWith('../') || value.startsWith('data:image/'))) {
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
  const doc = await foundry.utils.fromUuid(uuid as any);
  return doc?.name ?? '??';
};

  /** Replace UUIDs in text with their corresponding names */
  export const replaceUUIDsInText = async (text: string): Promise<string> => {
    const uuidRegex = /@UUID\[([^\]]+)\](\{([^\}]+)\})?/gi;
    
    let result = text;
    const matches = [...text.matchAll(uuidRegex)];
    
    for (const match of matches) {
      const uuid = match[1]; // The actual UUID string
      const labelText = match[3]; // The label text (without braces), or undefined
      
      if (labelText) {
        // If there's a label text, use that as the replacement
        result = result.replace(match[0], labelText);
      } else {
        // Otherwise, look up the UUID and use the document name
        const entry = await Entry.fromUuid(uuid);
        if (entry) {
          result = result.replace(match[0], entry.name || '');
        } else {
          // Try Foundry documents as fallback
          const doc = await foundry.utils.fromUuid(uuid as any);
          if (doc?.name) {
            result = result.replace(match[0], doc.name);
          }
        }
      }
    }
    
    return result;
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

/** Base heading levels by tag name */
const baseHeadingLevels: Record<string, number> = {
  h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6,
};

/** Heading level offset applied during conversion (set by htmlToMarkdown before processing) */
let headingLevelOffset = 0;

/**
 * Processes all child nodes of an element, concatenating their markdown results.
 * @param el - The parent element whose children to process
 * @returns Concatenated markdown string from all child nodes
 */
function processChildren(el: HTMLElement): string {
  let result = '';
  for (const child of Array.from(el.childNodes)) {
    result += processNode(child);
  }
  return result;
}

/**
 * Converts a blockquote element to markdown by prefixing each line with "> ".
 * @param el - The blockquote element
 * @returns Markdown blockquote string
 */
function processBlockquote(el: HTMLElement): string {
  const inner = processChildren(el).trim();
  const quoted = inner.split('\n').map(line => `> ${line}`).join('\n');
  return `\n\n${quoted}\n\n`;
}

/**
 * Converts a pre element to a fenced markdown code block.
 * @param el - The pre element (may contain a child code element)
 * @returns Fenced code block string
 */
function processPreBlock(el: HTMLElement): string {
  // Use textContent to get raw text without processing inner tags
  const content = el.textContent || '';
  return `\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
}

/**
 * Converts an unordered list element to markdown list items.
 * @param el - The ul element
 * @param depth - Current nesting depth for indentation
 * @returns Markdown unordered list string
 */
function processUnorderedList(el: HTMLElement, depth: number): string {
  let result = '\n\n';
  const indent = '  '.repeat(depth);

  for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
    const content = processListItemContent(li as HTMLElement, depth);
    result += `${indent}- ${content}\n`;
  }

  return result + '\n';
}

/**
 * Converts an ordered list element to markdown numbered list items.
 * @param el - The ol element
 * @param depth - Current nesting depth for indentation
 * @returns Markdown ordered list string
 */
function processOrderedList(el: HTMLElement, depth: number): string {
  let result = '\n\n';
  const indent = '  '.repeat(depth);

  let index = 1;
  for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
    const content = processListItemContent(li as HTMLElement, depth);
    result += `${indent}${index}. ${content}\n`;
    index++;
  }

  return result + '\n';
}

/**
 * Processes the content of a list item, handling nested lists with increased depth.
 * @param li - The li element
 * @param currentDepth - Current nesting depth
 * @returns Processed list item content string
 */
function processListItemContent(li: HTMLElement, currentDepth: number): string {
  let textParts = '';

  for (const child of Array.from(li.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childTag = (child as HTMLElement).tagName.toLowerCase();

      // Nested lists get processed with increased depth
      if (childTag === 'ul') {
        textParts += '\n' + processUnorderedList(child as HTMLElement, currentDepth + 1).trim();
      } else if (childTag === 'ol') {
        textParts += '\n' + processOrderedList(child as HTMLElement, currentDepth + 1).trim();
      } else {
        textParts += processNode(child);
      }
    } else {
      textParts += processNode(child);
    }
  }

  return textParts.trim();
}

/**
 * Recursively processes a single DOM node, converting it to markdown.
 * Dispatches to tag-specific handlers based on element type.
 * @param node - The DOM node to process
 * @returns Markdown string for this node and its descendants
 */
function processNode(node: Node): string {
  // Text node — return content as-is (DOM already decoded HTML entities)
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  // Skip non-element nodes (comments, etc.)
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Inline formatting - trim content but preserve surrounding whitespace
  if (tag === 'b' || tag === 'strong') {
    const rawContent = processChildren(el);
    const trimmed = rawContent.trim();
    if (!trimmed) return rawContent;
    const leadingSpace = rawContent.match(/^(\s*)/)?.[1] || '';
    const trailingSpace = rawContent.match(/(\s*)$/)?.[1] || '';
    return `${leadingSpace}**${trimmed}**${trailingSpace}`;
  }
  if (tag === 'u' || tag ==='underline') {
    const rawContent = processChildren(el);
    const trimmed = rawContent.trim();
    if (!trimmed) return rawContent;
    const leadingSpace = rawContent.match(/^(\s*)/)?.[1] || '';
    const trailingSpace = rawContent.match(/(\s*)$/)?.[1] || '';
    return `${leadingSpace}<u>${trimmed}</u>${trailingSpace}`;
  }
  if (tag === 'i' || tag === 'em') {
    const rawContent = processChildren(el);
    const trimmed = rawContent.trim();
    if (!trimmed) return rawContent;
    const leadingSpace = rawContent.match(/^(\s*)/)?.[1] || '';
    const trailingSpace = rawContent.match(/(\s*)$/)?.[1] || '';
    return `${leadingSpace}*${trimmed}*${trailingSpace}`;
  }
  if (tag === 'del' || tag === 's') {
    const rawContent = processChildren(el);
    const trimmed = rawContent.trim();
    if (!trimmed) return rawContent;
    const leadingSpace = rawContent.match(/^(\s*)/)?.[1] || '';
    const trailingSpace = rawContent.match(/(\s*)$/)?.[1] || '';
    return `${leadingSpace}~~${trimmed}~~${trailingSpace}`;
  }
  if (tag === 'code')
    return `\`${el.textContent || ''}\``;

  // Links
  if (tag === 'a') {
    const href = el.getAttribute('href');
    const text = processChildren(el);
    // Only create markdown links for http(s) URLs
    if (href && href.startsWith('http'))
      return `[${text}](${href})`;
    return text;
  }

  // Images — skip (local Foundry paths won't work externally)
  if (tag === 'img')
    return '';

  // Paragraphs and line breaks
  if (tag === 'p')
    return `\n\n${processChildren(el)}\n\n`;
  if (tag === 'br')
    return '\n';

  // Headings — adjust level by offset; levels beyond 6 become bold text
  const baseLevel = baseHeadingLevels[tag];
  if (baseLevel) {
    const effectiveLevel = baseLevel + headingLevelOffset;
    const content = processChildren(el);
    if (effectiveLevel <= 6)
      return `\n\n${'#'.repeat(effectiveLevel)} ${content}\n\n`;
    return `\n\n__**${content}**__\n\n`;
  }

  // Block elements with specialized handlers
  if (tag === 'blockquote')
    return processBlockquote(el);
  if (tag === 'pre')
    return processPreBlock(el);
  if (tag === 'ul')
    return processUnorderedList(el, 0);
  if (tag === 'ol')
    return processOrderedList(el, 0);

  // All other tags (mark, small, ins, sub, sup, li, div, etc.) — just process children
  // Special handling for span with text-decoration: underline
  if (tag === 'span') {
    const style = el.getAttribute('style');
    if (style && style.includes('text-decoration: underline')) {
      return `<u>${processChildren(el)}</u>`;
    }
  }
  
  return processChildren(el);
}

/**
 * Collapses excessive newlines and trims the result.
 * @param text - Raw markdown text with potential extra whitespace
 * @returns Cleaned markdown text
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts ProseMirror HTML content to markdown format.
 * Handles common formatting tags (bold, italic, strikethrough, code),
 * block elements (paragraphs, headings, blockquotes, lists, code blocks),
 * and links. Tags without markdown equivalents are reduced to their text content.
 *
 * @param html - The HTML string from ProseMirror editor content
 * @param topHeaderLevel - The header level to use for the top-level heading
 * @returns Markdown-formatted string
 */
export function htmlToMarkdown(html: string, topHeaderLevel: number = 1): string {
  if (!html)
    return '';

  // Set offset so <h1> maps to topHeaderLevel, <h2> to topHeaderLevel+1, etc.
  headingLevelOffset = topHeaderLevel - 1;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  return normalizeWhitespace(processChildren(tempDiv));
}