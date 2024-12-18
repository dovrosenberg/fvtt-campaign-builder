// some helpers to simplify various repetitive tasks

// is the current client the GM?
const isClientGM = (): boolean => (game.user?.isGM || false);

// localize a string
const localize = game.i18n?.localize;

export { 
  isClientGM,
  localize,
};