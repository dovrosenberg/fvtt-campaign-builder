import { WorldBuilderApplication } from './WorldBuilder';

// the solo instance
export let worldBuilder: WorldBuilderApplication;

// set the main application; should only be called once
export function updateWorldBuilder(newWorldBuilder: WorldBuilderApplication): void {
  worldBuilder = newWorldBuilder;
}

