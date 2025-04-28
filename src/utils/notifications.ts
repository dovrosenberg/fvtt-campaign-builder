import { isClientGM } from './game';

export const notifyError = (message: string) => { ui.notifications ? ui.notifications.error(message) : console.log('Error: ' + message); }
export const notifyWarn = (message: string) => { ui.notifications ? ui.notifications.warn(message) : console.log('Warning: ' + message); }
export const notifyInfo = (message: string) => { ui.notifications ? ui.notifications.info(message) : console.log(message); }

export const notifyGMError = (message: string) => { if (isClientGM()) notifyError(message); }
export const notifyGMWarn = (message: string) => { if (isClientGM()) notifyWarn(message); }
export const notifyGMInfo = (message: string) => { if (isClientGM()) notifyInfo(message); }
