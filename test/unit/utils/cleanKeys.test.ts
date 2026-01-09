import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import type { ValidTopicRecord } from '@/types';
import { Topics } from '@/types';
import {
  cleanKeysOnLoad,
  cleanKeysOnSave,
  cleanTopicKeysOnLoad,
  cleanTopicKeysOnSave
} from '@/utils/cleanKeys';

export const registerCleanKeysTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  describe('cleanKeysOnLoad', () => {
    it('should replace #&# with . in keys', () => {
      const input = {
        'entry1#&#uuid': 'value1',
        'entry2#&#uuid': 'value2',
        'normalKey': 'value3',
      };
      const expected = {
        'entry1.uuid': 'value1',
        'entry2.uuid': 'value2',
        'normalKey': 'value3',
      };
      
      const result = cleanKeysOnLoad(input);
      expect(result).to.deep.equal(expected);
    });

    it('should filter out Compendium key', () => {
      const input = {
        'entry1#&#uuid': 'value1',
        'Compendium': 'should be removed',
        'entry2#&#uuid': 'value2',
      };
      const expected = {
        'entry1.uuid': 'value1',
        'entry2.uuid': 'value2',
      };
      
      const result = cleanKeysOnLoad(input);
      expect(result).to.deep.equal(expected);
    });

    it('should handle empty object', () => {
      const result = cleanKeysOnLoad({});
      expect(result).to.deep.equal({});
    });

    it('should handle object with no #&# in keys', () => {
      const input = {
        'key1': 'value1',
        'key2': 'value2',
      };
      const result = cleanKeysOnLoad(input);
      expect(result).to.deep.equal(input);
    });
  });

  describe('cleanKeysOnSave', () => {
    it('should replace . with #&# in keys', () => {
      const input = {
        'entry1.uuid': 'value1',
        'entry2.uuid': 'value2',
        'normalKey': 'value3',
      };
      const expected = {
        'entry1#&#uuid': 'value1',
        'entry2#&#uuid': 'value2',
        'normalKey': 'value3',
      };
      
      const result = cleanKeysOnSave(input);
      expect(result).to.deep.equal(expected);
    });

    it('should handle empty object', () => {
      const result = cleanKeysOnSave({});
      expect(result).to.deep.equal({});
    });

    it('should handle object with no . in keys', () => {
      const input = {
        'key1': 'value1',
        'key2': 'value2',
      };
      const expected = {
        'key1': 'value1',
        'key2': 'value2',
      };
      
      const result = cleanKeysOnSave(input);
      expect(result).to.deep.equal(expected);
    });
  });

  describe('cleanTopicKeysOnLoad', () => {
    it('should clean keys for each topic', () => {
      const input: ValidTopicRecord<Record<string, unknown>> = {
        [Topics.Character]: {
          'char1#&#uuid': { name: 'Character 1' },
          'char2#&#uuid': { name: 'Character 2' },
        },
        [Topics.Location]: {
          'loc1#&#uuid': { name: 'Location 1' },
          'Compendium': 'should be removed',
        },
      };
      const expected = {
        [Topics.Character]: {
          'char1.uuid': { name: 'Character 1' },
          'char2.uuid': { name: 'Character 2' },
        },
        [Topics.Location]: {
          'loc1.uuid': { name: 'Location 1' },
        },
      };
      
      const result = cleanTopicKeysOnLoad(input);
      expect(result).to.deep.equal(expected);
    });

    it('should handle null/undefined topic values', () => {
      const input = {
        [Topics.Character]: {
          'char1#&#uuid': { name: 'Character 1' },
        },
        [Topics.Location]: null as any,
        [Topics.Organization]: undefined as any,
      } as ValidTopicRecord<Record<string, unknown>>;
      const expected = {
        [Topics.Character]: {
          'char1.uuid': { name: 'Character 1' },
        },
        [Topics.Location]: {},
        [Topics.Organization]: {},
      };
      
      const result = cleanTopicKeysOnLoad(input);
      expect(result).to.deep.equal(expected);
    });

    it('should handle empty topics object', () => {
      const result = cleanTopicKeysOnLoad({} as ValidTopicRecord<Record<string, unknown>>);
      expect(result).to.deep.equal({});
    });

    it('should handle empty topic sections', () => {
      const input = {
        [Topics.Character]: {},
        [Topics.Location]: {},
      } as ValidTopicRecord<Record<string, unknown>>;
      const result = cleanTopicKeysOnLoad(input);
      expect(result).to.deep.equal(input);
    });
  });

  describe('cleanTopicKeysOnSave', () => {
    it('should clean keys for each topic', () => {
      const input: ValidTopicRecord<Record<string, unknown>> = {
        [Topics.Character]: {
          'char1.uuid': { name: 'Character 1' },
          'char2.uuid': { name: 'Character 2' },
        },
        [Topics.Location]: {
          'loc1.uuid': { name: 'Location 1' },
          'normalKey': { name: 'Normal' },
        },
      };
      const expected = {
        [Topics.Character]: {
          'char1#&#uuid': { name: 'Character 1' },
          'char2#&#uuid': { name: 'Character 2' },
        },
        [Topics.Location]: {
          'loc1#&#uuid': { name: 'Location 1' },
          'normalKey': { name: 'Normal' },
        },
      };
      
      const result = cleanTopicKeysOnSave(input);
      expect(result).to.deep.equal(expected);
    });

    it('should handle empty topics object', () => {
      const result = cleanTopicKeysOnSave({} as ValidTopicRecord<Record<string, unknown>>);
      expect(result).to.deep.equal({});
    });

    it('should handle empty topic sections', () => {
      const input = {
        [Topics.Character]: {},
        [Topics.Location]: {},
      } as ValidTopicRecord<Record<string, unknown>>;
      const result = cleanTopicKeysOnSave(input);
      expect(result).to.deep.equal(input);
    });

    it('should handle null/undefined topic values', () => {
      const input = {
        [Topics.Character]: {
          'char1.uuid': { name: 'Character 1' },
        },
        [Topics.Location]: null as any,
        [Topics.Organization]: undefined as any,
      } as ValidTopicRecord<Record<string, unknown>>;
      const expected = {
        [Topics.Character]: {
          'char1#&#uuid': { name: 'Character 1' },
        },
        [Topics.Location]: {},
        [Topics.Organization]: {},
      };
      
      const result = cleanTopicKeysOnSave(input);
      expect(result).to.deep.equal(expected);
    });
  });
};
