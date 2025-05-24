// from https://github.com/ecosia/vue-safe-html

const allowedTags = [
  'a', 'b', 'br', 'strong', 'i', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
  'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'br',
];

const allowedAttributes = [
  'title', 'class', 'style', 'href', 'draggable', 'inert',
  'data-link-type', 'data-link', 'data-uuid', 'data-id', 'data-type', 
  'data-pack', 'data-tooltip', 'data-tooltip-text'
];


  // Strips all tags
const removeAllTagsRegex = /<\/?[^>]+(>|$)/g;
export const removeAllTags = (input) => (input.replace(removeAllTagsRegex, ''));

/**
 * sanitizeHTML strips html tags in the given string
 * if allowedTags is empty, all tags are stripped
 * @param {*} htmlString  the HTML strings
 * @param {*} allowedTags array of tags that are not stripped
 */
export const sanitizeHTML = (htmlString ) => {
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

