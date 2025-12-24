// some helpers to simplify various repetitive tasks

// is the current client the GM?
const isClientGM = (): boolean => (game.user?.isGM || false);

// localize a string
const localize = (text: string, data?: Record<string, unknown>): string => {
  const key = `fcb.${text}`;
  if (!data) {
    return game.i18n.localize(key);
  }

  const formattedData: Record<string, string> = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );
  return game.i18n.format(key, formattedData);
};

export { 
  isClientGM,
  localize,
};