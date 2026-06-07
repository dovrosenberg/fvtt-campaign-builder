/**
 * Puppeteer helper utilities.
 */

import type { Page } from 'puppeteer';

/**
 * Returns a data-testid selector string.
 */
export function getByTestId(testId: string): string {
  return `[data-testid="${testId}"]`;
}

/**
 * Helper to safely iterate over querySelectorAll results inside page.evaluate().
 * Use this to avoid TypeScript's NodeListOf iteration error (TS2495).
 *
 * @param selector CSS selector to query
 * @returns Array of elements matching the selector
 */
export function queryAll(selector: string): Element[] {
  return Array.from(document.querySelectorAll(selector));
}

/**
 * Waits for an input element to have a non-empty value.
 * Used after opening entries to wait for Vue reactivity to populate the form.
 */
export async function waitForInputValue(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForFunction(
    () => {
      const input = document.querySelector(selector) as HTMLInputElement | null;
      return input && input.value.length > 0;
    },
    { timeout }
  );
}
