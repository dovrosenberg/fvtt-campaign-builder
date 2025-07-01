/**
 * Updates the main window title to include the current setting name
 * @param worldName The name of the current setting
 */
export function updateWindowTitle(worldName: string | null): void {
  // Find the application window header
  const appId = 'app-fcb-CampaignBuilder';
  const appElement = document.getElementById(appId);
  if (!appElement) return;

  const titleElement = appElement.querySelector('header .window-title');
  if (!titleElement) return;

  // Set the title based on whether we have a setting name
  if (worldName) {
    titleElement.textContent = `Campaign Builder - ${worldName}`;
  } else {
    titleElement.textContent = 'Campaign Builder';
  }
}