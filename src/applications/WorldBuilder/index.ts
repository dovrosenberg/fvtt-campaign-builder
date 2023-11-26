import { WorldBuilder } from './WorldBuilder';
export { WorldBuilder } from './WorldBuilder';

// the solo instance
export let worldBuilder: WorldBuilder;

// set the main application; should only be called once
export function updateWorldBuilder(newWorldBuilder: WorldBuilder): void {
  worldBuilder = newWorldBuilder;
}

