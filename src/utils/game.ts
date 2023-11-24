// some helpers to simplify various repetitive tasks

// return the game object
const getGame = function(): Game {
  if(!(game instanceof Game)) {
    throw new Error('Game is not initialized yet!');
  }
  return game;
}

// is the current client the GM?
const isClientGM = (): boolean => (getGame()?.user?.isGM || false);

// localize a string
const localize = (stringId: string) => getGame().i18n.localize(stringId);

export { 
  getGame,
  isClientGM,
  localize,
};