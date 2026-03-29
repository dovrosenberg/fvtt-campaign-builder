/**
 * Synchronous UUID cleaning utilities for clipboard copy events.
 *
 * When users copy text from Editor or AdvancedTextArea components, raw @UUID[Entry.abc123]{John Smith}
 * syntax (edit mode) or enriched HTML anchors with icons (read/display mode) end up on the clipboard.
 * These utilities intercept the copy event and replace UUID references with just the display name.
 */

/** Quick check for any @Type[...] pattern in text */
const UUID_QUICK_CHECK = /@(UUID|Actor|Item|Scene|JournalEntry|Macro|RollTable|Cards|Playlist|Compendium)\[/i;

/**
 * Synchronously resolves a UUID to its document name using index lookups.
 * Uses foundry.utils.parseUuid() and collection index/get lookups (same pattern as helpers.ts).
 * Handles both primary documents and embedded documents (like JournalEntryPage).
 */
export function resolveUuidNameSync(uuid: string): string {
  try {
    const parsed = foundry.utils.parseUuid(uuid);
    if (!parsed) return uuid;

    const collection = parsed.collection as any;
    const id = parsed.id as string;
    const primaryId = parsed.primaryId as string | undefined;
    const embedded = parsed.embedded as string[] | undefined;

    if (!collection || !id) return uuid;

    // For embedded documents (e.g., JournalEntryPage), we need to get the parent first
    if (embedded && embedded.length > 0 && primaryId) {
      // Get the primary document first
      let primaryDoc: any = null;

      // For compendium collections, check the index
      if (collection.index) {
        primaryDoc = collection.index.get(primaryId);
      }

      // For world collections
      if (!primaryDoc && typeof collection.get === 'function') {
        primaryDoc = collection.get(primaryId);
      }

      // If we found the primary document, look for the embedded document
      if (primaryDoc) {
        // For compendium index entries, check if pages are indexed
        if (primaryDoc.pages && Array.isArray(primaryDoc.pages)) {
          // Find the page by id
          const page = primaryDoc.pages.find((p: any) => p._id === id || p.id === id);
          if (page?.name) return page.name;
        }

        // For actual document instances with embedded collection
        if (typeof primaryDoc.getEmbeddedDocument === 'function') {
          const embeddedDoc = primaryDoc.getEmbeddedDocument(embedded[0], id);
          if (embeddedDoc?.name) return embeddedDoc.name;
        }

        // Fall back to pages.contents for JournalEntry documents
        if (primaryDoc.pages?.contents) {
          const page = primaryDoc.pages.contents.find((p: any) => p._id === id || p.id === id);
          if (page?.name) return page.name;
        }
      }

      return uuid;
    }

    // For primary documents (non-embedded)
    // For compendium collections, check the index
    if (collection.index) {
      const indexEntry = collection.index.get(id);
      if (indexEntry?.name) return indexEntry.name;
    }

    // For world collections (game.actors, game.items, etc.)
    if (typeof collection.get === 'function') {
      const doc = collection.get(id);
      if (doc?.name) return doc.name;
    }

    return uuid;
  } catch {
    return uuid;
  }
}

/**
 * Cleans @UUID[...]{label}, @Actor[...]{label}, etc. references in plain text,
 * replacing them with just the display name.
 *
 * @param text - Text containing @UUID or @Type references
 * @returns Text with UUID references replaced by display names
 */
export function cleanUuidReferencesInText(text: string): string {
  const documentTypes = [...CONST.DOCUMENT_LINK_TYPES, 'Compendium', 'UUID'];
  const pattern = new RegExp(
    `@(${documentTypes.join('|')})\\[([^#\\]]+)(?:#[^\\]]*)?\\](?:\\{([^}]+)\\})?`,
    'g'
  );

  return text.replace(pattern, (_match, _type, id, label) => {
    if (label) return label;
    return resolveUuidNameSync(id);
  });
}

/**
 * Cleans UUID references from HTML content. Handles both enriched HTML anchors
 * (a.content-link with icon children) and raw @UUID text references.
 *
 * @param html - HTML string potentially containing content-link anchors and/or raw @UUID references
 * @returns Cleaned HTML with anchors replaced by text and @UUID references resolved
 */
export function cleanUuidReferencesInHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  // Find all content-link anchors and replace with their text content (minus icons)
  div.querySelectorAll('a.content-link').forEach(anchor => {
    anchor.querySelectorAll('i').forEach(icon => icon.remove());
    anchor.replaceWith(anchor.textContent || '');
  });

  // Also apply text-level regex cleaning for any remaining raw @UUID references
  div.innerHTML = cleanUuidReferencesInText(div.innerHTML);

  return div.innerHTML;
}

/**
 * Converts an HTML element to plain text, preserving list formatting, paragraphs, and line breaks.
 * Unlike el.textContent which strips all structure, this produces readable plain text.
 * 
 * @param el the HTML element to convert to plain text
 * @returns the plain text version of the HTML element
 */
function htmlToPlainText(el: HTMLElement): string {
  // Convert <br> to newlines
  el.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

  // Convert <ol> items to numbered lines
  el.querySelectorAll('ol').forEach(ol => {
    ol.querySelectorAll(':scope > li').forEach((li, i) => {
      li.replaceWith(document.createTextNode(`${i + 1}. ${li.textContent}\n`));
    });
    ol.replaceWith(...Array.from(ol.childNodes));
  });

  // Convert <ul> items to bulleted lines
  el.querySelectorAll('ul').forEach(ul => {
    ul.querySelectorAll(':scope > li').forEach(li => {
      li.replaceWith(document.createTextNode(`- ${li.textContent}\n`));
    });
    ul.replaceWith(...Array.from(ul.childNodes));
  });

  el.querySelectorAll('p').forEach(p => {
    p.appendChild(document.createTextNode('\n\n'));
  });

  return el.textContent?.trim() || '';
}

/**
 * Main entry point for copy event handling. Checks if the selection contains UUID references
 * and, if so, cleans them and sets the clipboard data.
 *
 * @param event - The ClipboardEvent from a copy handler
 * @param textareaSelection - For textarea elements, the selected text substring (plain text only)
 * @returns true if the event was handled (preventDefault called), false if default copy should proceed
 */
export function handleCopyWithCleanUuids(event: ClipboardEvent, textareaSelection?: string): boolean {
  if (!event.clipboardData) return false;

  // Textarea mode: plain text only, no HTML to process
  if (textareaSelection !== undefined) {
    if (!UUID_QUICK_CHECK.test(textareaSelection)) return false;

    event.clipboardData.setData('text/plain', cleanUuidReferencesInText(textareaSelection));
    event.preventDefault();
    return true;
  }

  // Rich content mode: get selection and its HTML
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(fragment);
  const html = tempDiv.innerHTML;

  const hasUuidPattern = UUID_QUICK_CHECK.test(selection.toString());
  const hasContentLinks = /class="[^"]*content-link[^"]*"/.test(html);

  if (!hasUuidPattern && !hasContentLinks) return false;

  // Clean HTML (handles both content-link anchors and raw @UUID patterns),
  // then derive plain text from the cleaned result to preserve list formatting
  // and avoid icon character artifacts
  const cleanedHtml = cleanUuidReferencesInHtml(html);
  const cleanDiv = document.createElement('div');
  cleanDiv.innerHTML = cleanedHtml;
  const cleanedText = htmlToPlainText(cleanDiv);

  event.clipboardData.setData('text/plain', cleanedText);
  if (hasContentLinks) {
    event.clipboardData.setData('text/html', cleanedHtml);
  }
  event.preventDefault();
  return true;
}
