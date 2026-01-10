import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { ArcBasicIndex } from '@/types';
import ArcIndexService from '@/utils/arcIndex';

export const registerArcIndexTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  const testArcIndex: ArcBasicIndex[] = [
    { uuid: 'arc1', name: 'Arc 1', startSessionNumber: -1, endSessionNumber: -1, sortOrder: 0 },
    { uuid: 'arc2', name: 'Arc 2', startSessionNumber: 1, endSessionNumber: 5, sortOrder: 1 },
    { uuid: 'arc3', name: 'Arc 3', startSessionNumber: 6, endSessionNumber: 10, sortOrder: 2 },
    { uuid: 'arc4', name: 'Arc 4', startSessionNumber: -1, endSessionNumber: -1, sortOrder: 3 },
    { uuid: 'arc5', name: 'Arc 5', startSessionNumber: 11, endSessionNumber: 15, sortOrder: 4 },
  ];

  describe('getFirstArcWithSessions', () => {
    it('should return the first arc that has sessions', () => {
      const result = ArcIndexService.getFirstArcWithSessions(testArcIndex);
      expect(result).to.equal(testArcIndex[1]);
      expect(result?.name).to.equal('Arc 2');
    });

    it('should return null if no arcs have sessions', () => {
      const noSessionArcs = [
        { uuid: 'arc1', name: 'Arc 1', startSessionNumber: -1, endSessionNumber: -1, sortOrder: 0 },
        { uuid: 'arc2', name: 'Arc 2', startSessionNumber: -1, endSessionNumber: -1, sortOrder: 1 },
      ];
      const result = ArcIndexService.getFirstArcWithSessions(noSessionArcs);
      expect(result).to.be.null;
    });

    it('should return null for empty array', () => {
      const result = ArcIndexService.getFirstArcWithSessions([]);
      expect(result).to.be.null;
    });
  });

  describe('getLastArcWithSessions', () => {
    it('should return the last arc that has sessions', () => {
      const result = ArcIndexService.getLastArcWithSessions(testArcIndex);
      expect(result).to.equal(testArcIndex[4]);
      expect(result?.name).to.equal('Arc 5');
    });

    it('should return null if no arcs have sessions', () => {
      const noSessionArcs = [
        { uuid: 'arc1', name: 'Arc 1', startSessionNumber: -1, endSessionNumber: -1, sortOrder: 0 },
        { uuid: 'arc2', name: 'Arc 2', startSessionNumber: -1, endSessionNumber: -1, sortOrder: 1 },
      ];
      const result = ArcIndexService.getLastArcWithSessions(noSessionArcs);
      expect(result).to.be.null;
    });

    it('should return null for empty array', () => {
      const result = ArcIndexService.getLastArcWithSessions([]);
      expect(result).to.be.null;
    });
  });

  describe('getArcForSession', () => {
    it('should return arc containing the session number', () => {
      const result = ArcIndexService.getArcForSession(testArcIndex, 3);
      expect(result).to.equal(testArcIndex[1]);
      expect(result?.name).to.equal('Arc 2');
    });

    it('should return null if session number is not in any arc', () => {
      const result = ArcIndexService.getArcForSession(testArcIndex, 99);
      expect(result).to.be.null;
    });

    it('should return null for empty array', () => {
      const result = ArcIndexService.getArcForSession([], 1);
      expect(result).to.be.null;
    });

    it('should handle negative session numbers', () => {
      const result = ArcIndexService.getArcForSession(testArcIndex, -1);
      expect(result).to.be.null;
    });

    it('should find arc for session at boundary', () => {
      const result = ArcIndexService.getArcForSession(testArcIndex, 5);
      expect(result).to.equal(testArcIndex[1]);
      expect(result?.name).to.equal('Arc 2');
    });

    it('should find arc for session at start boundary', () => {
      const result = ArcIndexService.getArcForSession(testArcIndex, 6);
      expect(result).to.equal(testArcIndex[2]);
      expect(result?.name).to.equal('Arc 3');
    });

    it('should find arc for session at end boundary', () => {
      const result = ArcIndexService.getArcForSession(testArcIndex, 10);
      expect(result).to.equal(testArcIndex[2]);
      expect(result?.name).to.equal('Arc 3');
    });
  });
};
