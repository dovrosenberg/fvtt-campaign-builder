import { WorldBuilder } from '@/applications/WorldBuilder/WorldBuilder.ts';

describe('WorldBuilder', () => {
  let worldBuilder: WorldBuilder;

  beforeEach(() => {
    worldBuilder = new WorldBuilder();
  });

  describe('getData', () => {
    it('tests', ()=> {
      expect(true).toBe(true);
    });
  });
});