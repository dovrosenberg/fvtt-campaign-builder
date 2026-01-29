// some helpers to simplify various repetitive tasks

// is the current client the GM?
const isClientGM = (): boolean => (game.user?.isGM || false);

/** localize a string
 * @param text the key to localize
 * @param data optional data to replace in the string `{xyz}` will be replaced by {xyz: value} 
 * @returns the localized string */
const localize = (text: string, data?: Record<string, string>): string => {
  const key = `fcb.${text}`;
  if (!data) {
    return game.i18n.localize(key);
  }

  return game.i18n.format(key, data);
};

export { 
  isClientGM,
  localize,
};