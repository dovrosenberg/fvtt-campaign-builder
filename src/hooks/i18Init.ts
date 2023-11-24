export function registerFori18nInitHook() {
  Hooks.once('i18nInit', i18nInit);
}

async function i18nInit(): Promise<void> {
  // load the text
 // initializeLocalizedText();
}

