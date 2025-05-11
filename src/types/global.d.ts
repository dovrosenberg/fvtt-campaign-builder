export * from '@types/fvtt-types';

// some global configuration for the types
declare global {
  interface AssumeHookRan {
    ready: never; // this ensures that `game` is never undefined (at least from a typescript standpoint)... avoids needing to continually typeguard
  }

  type foundry = _foundry;
  type Scene = _Scene;
}
