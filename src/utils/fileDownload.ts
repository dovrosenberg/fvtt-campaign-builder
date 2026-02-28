/**
 * File Download Utility
 *
 * Provides a reusable function for triggering file downloads in the browser.
 * Uses application/octet-stream MIME type to ensure files are downloaded
 * rather than displayed in the browser.
 */

/**
 * Triggers a file download in the browser.
 *
 * This function creates a blob URL and triggers a download using a hidden link element.
 * It uses 'application/octet-stream' MIME type to ensure the file is downloaded
 * rather than displayed in the browser (which can happen with 'application/json'
 * or 'text/plain' types).
 *
 * @param content - The file content as a string, Blob, or Uint8Array
 * @param filename - The name for the downloaded file
 * @param mimeType - Optional MIME type (defaults to 'application/octet-stream')
 *
 * @example
 * ```typescript
 * // Download a JSON file
 * const json = JSON.stringify(data, null, 2);
 * downloadFile(json, 'export.json');
 *
 * // Download a markdown file
 * downloadFile(markdownContent, 'readme.md', 'text/markdown');
 * 
 * // Download a zip file (from UInt8Array)
 * downloadFile(zipData, 'export.zip', 'application/zip');
 * ```
 */
export function downloadFile(
  content: string | Blob | Uint8Array<ArrayBufferLike>,
  filename: string,
  mimeType: string
): void {
  // Create blob from content
  let blob: Blob;

  // Create a new one with the correct MIME type
  blob = new Blob([content], { type: mimeType });

  downloadBlob(blob, filename);
}

/**
 * Triggers a download for an existing Blob with its original MIME type preserved.
 * Useful when you have a Blob with the correct type already set (e.g., images).
 *
 * @param blob - The blob to download
 * @param filename - The name for the downloaded file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
