/**
 * Service for managing the main window title of the Campaign Builder application
 */
const TitleUpdaterService = {
  /**
   * Updates the main window title to include the current setting name
   * @param settingName The name of the current setting
   */
  updateWindowTitle(settingName: string | null): void {
    // Find the application window header
    const appId = 'app-fcb-CampaignBuilder';
    const appElement = document.getElementById(appId);
    if (!appElement) return;

    const titleElement = appElement.querySelector('header .window-title');
    if (!titleElement) return;

    // Set the title based on whether we have a setting name
    if (settingName) {
      titleElement.textContent = `Campaign Builder - ${settingName}`;
    } else {
      titleElement.textContent = 'Campaign Builder';
    }
  }
};

export default TitleUpdaterService;