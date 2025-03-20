export * from '@league-of-foundry-developers/foundry-vtt-types/src/index.d.mts';

// some global configuration for the types
declare global {
  interface AssumeHookRan {
    ready: never; // this ensures that `game` is never undefined (at least from a typescript standpoint)... avoids needing to continually typeguard
  }
}
