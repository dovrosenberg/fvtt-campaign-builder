/**
 * Service for displaying notifications to the user
 */
const NotificationsService = {
  /**
   * Displays an error notification to the user
   * 
   * @param message - The error message to display
   */
  error: (message: string): void => {
    if (ui.notifications) {
      ui.notifications.error(message);
    } else {
      console.log('Error: ' + message);
    }
  },

  /**
   * Displays a warning notification to the user
   * 
   * @param message - The warning message to display
   */
  warn: (message: string): void => {
    if (ui.notifications) {
      ui.notifications.warn(message);
    } else {
      console.log('Warning: ' + message);
    }
  },

  /**
   * Displays an info notification to the user
   * 
   * @param message - The info message to display
   */
  info: (message: string): void => {
    if (ui.notifications) {
      ui.notifications.info(message);
    } else {
      console.log(message);
    }
  }
};

// Export individual functions for backward compatibility
export const notifyError = NotificationsService.error;
export const notifyWarn = NotificationsService.warn;
export const notifyInfo = NotificationsService.info;

// Export the service as default
export default NotificationsService;