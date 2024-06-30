import { OldWorldBuilder } from './OldWorldBuilder';
export { OldWorldBuilder } from './OldWorldBuilder';

// the solo instance
export let oldWorldBuilder: OldWorldBuilder;

// set the main application; should only be called once
export function updateWorldBuilder(newWorldBuilder: OldWorldBuilder): void {
  oldWorldBuilder = newWorldBuilder;
}

