// some helpers to simplify various repetitive tasks

// is the current client the GM?
const isClientGM = (): boolean => (game.user?.isGM || false);

// localize a string
const localize = (text: string) => game.i18n.localize(`fcb.${text}`);

export { 
  isClientGM,
  localize,
};