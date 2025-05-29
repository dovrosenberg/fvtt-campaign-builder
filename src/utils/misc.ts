import { Topics, WindowTabType } from '@/types';

/**
 * Safely converts a topic value to the Topics enum type.  Sometimes topic ends up a string
 * (ex. when pulling from DOM), so this makes sure it can be compared properly for use in switch
 * or [].includes, etc.
 * Handles string representations by parsing them to integers, and provides null safety.
 * 
 * @param topic - The topic value to convert (string, number, Topics enum, or null/undefined)
 * @returns The corresponding Topics enum value, or null if conversion fails
 */
export function toTopic(topic: string | number | Topics | null | undefined): Topics | null {
  const castedTopic = typeof topic === 'string' ? parseInt(topic) as Topics : topic;

  return castedTopic ?? null;
}

/**
 * Safely converts a window tab type value to the WindowTabType enum type.
 * Handles string representations by parsing them to integers, and provides null safety.
 * Used to ensure consistent type handling when working with tab type values from various sources.
 * 
 * @param type - The window tab type value to convert (string, number, WindowTabType enum, or null/undefined)
 * @returns The corresponding WindowTabType enum value, or null if conversion fails
 */
export function toWindowTabType(type: string | number | WindowTabType | null | undefined): WindowTabType | null {
  const castedType = typeof type === 'string' ? parseInt(type) as WindowTabType : type;

  return castedType ?? null;
}

/**
 * Returns the appropriate FontAwesome icon class for a given topic.
 * Provides consistent iconography across the application for different content types.
 * 
 * @param topic - The topic to get an icon for
 * @returns The FontAwesome icon class name, or empty string for unknown topics
 */
export function getTopicIcon(topic: string | number | Topics | null | undefined) {
  switch (toTopic(topic)) {
    case Topics.Character: 
      return 'fa-user';
    case Topics.Location: 
      return 'fa-location-dot';   //'fa-place-of-worship';
    case Topics.Organization: 
      return 'fa-flag';
    default: 
      return '';
  }
}

/**
 * Returns the appropriate FontAwesome icon class for a given window tab type.
 * Provides consistent iconography for different types of application tabs.
 * 
 * @param type - The window tab type to get an icon for
 * @returns The FontAwesome icon class name, or empty string for unknown types
 * @throws {Error} If called with WindowTabType.Entry (entries should use topic icons instead)
 */
export function getTabTypeIcon(type: string | number | WindowTabType | null | undefined) {
  switch (toWindowTabType(type)) {
    case WindowTabType.World: 
      return 'fa-globe';
    case WindowTabType.Campaign: 
      return 'fa-signs-post';
    case WindowTabType.Session: 
      return 'fa-tent';
    case WindowTabType.PC: 
      return 'fa-user-ninja';
    case WindowTabType.Entry:
      throw new Error('Tried to use getTabTypeIcon() for Entry');
    default: 
      return '';
  }
}

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