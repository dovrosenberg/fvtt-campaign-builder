import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { CustomFieldContentType, WindowTabType, Topics } from '@/types';
import { Entry } from '@/classes';
import CustomFieldsService from '@/utils/customFields';

export const registerCustomFieldsTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  describe('customFields utilities', () => {
    describe('makeCustomFieldKeyUnique', () => {
      it('should return the original key if not in use', () => {
        const usedKeys = new Set<string>(['key1', 'key2', 'key3']);
        const result = CustomFieldsService.makeCustomFieldKeyUnique('key4', usedKeys);
        expect(result).to.equal('key4');
      });

      it('should add + until key is unique', () => {
        const usedKeys = new Set(['key1', 'key1+', 'key1++']);
        const result = CustomFieldsService.makeCustomFieldKeyUnique('key1', usedKeys);
        expect(result).to.equal('key1+++');
      });

      it('should handle single collision', () => {
        const usedKeys = new Set<string>(['key1', 'key2', 'key3']);
        const result = CustomFieldsService.makeCustomFieldKeyUnique('key1', usedKeys);
        expect(result).to.equal('key1+');
      });

      it('should handle multiple collisions', () => {
        const usedKeys = new Set<string>(['key1', 'key1+', 'key1++', 'key1+++']);
        const result = CustomFieldsService.makeCustomFieldKeyUnique('key1', usedKeys);
        expect(result).to.equal('key1++++');
      });

      it('should handle empty usedKeys set', () => {
        const usedKeys = new Set<string>();
        const result = CustomFieldsService.makeCustomFieldKeyUnique('key1', usedKeys);
        expect(result).to.equal('key1');
      });
    });

    describe('windowTabToCustomContentType', () => {
      it('should return Character for Entry with Character topic', () => {
        const entry = { topic: Topics.Character } as Entry;
        const result = CustomFieldsService.windowTabToCustomContentType(WindowTabType.Entry, entry);
        expect(result).to.equal(CustomFieldContentType.Character);
      });

      it('should return Location for Entry with Location topic', () => {
        const entry = { topic: Topics.Location } as Entry;
        const result = CustomFieldsService.windowTabToCustomContentType(WindowTabType.Entry, entry);
        expect(result).to.equal(CustomFieldContentType.Location);
      });

      it('should return Organization for Entry with Organization topic', () => {
        const entry = { topic: Topics.Organization } as Entry;
        const result = CustomFieldsService.windowTabToCustomContentType(WindowTabType.Entry, entry);
        expect(result).to.equal(CustomFieldContentType.Organization);
      });

      it('should return PC for Entry with PC topic', () => {
        const entry = { topic: Topics.PC } as Entry;
        const result = CustomFieldsService.windowTabToCustomContentType(WindowTabType.Entry, entry);
        expect(result).to.equal(CustomFieldContentType.PC);
      });

      it('should return Campaign for Campaign tab', () => {
        const result = CustomFieldsService.windowTabToCustomContentType(WindowTabType.Campaign);
        expect(result).to.equal(CustomFieldContentType.Campaign);
      });

      it('should return Arc for Arc tab', () => {
        const result = CustomFieldsService.windowTabToCustomContentType(WindowTabType.Arc);
        expect(result).to.equal(CustomFieldContentType.Arc);
      });

      it('should return Session for Session tab', () => {
        const result = CustomFieldsService.windowTabToCustomContentType(WindowTabType.Session);
        expect(result).to.equal(CustomFieldContentType.Session);
      });

      it('should return Front for Front tab', () => {
        const result = CustomFieldsService.windowTabToCustomContentType(WindowTabType.Front);
        expect(result).to.equal(CustomFieldContentType.Front);
      });

      it('should return Setting for Setting tab', () => {
        const result = CustomFieldsService.windowTabToCustomContentType(WindowTabType.Setting);
        expect(result).to.equal(CustomFieldContentType.Setting);
      });

      it('should throw error for unsupported entry topic', () => {
        const entry = { topic: 'InvalidTopic' as any } as Entry;
        expect(() => {
          CustomFieldsService.windowTabToCustomContentType(WindowTabType.Entry, entry);
        }).to.throw('Unsupported entry topic: InvalidTopic');
      });

      it('should throw error for unsupported window type', () => {
        expect(() => {
          CustomFieldsService.windowTabToCustomContentType('InvalidType' as any);
        }).to.throw('Unsupported window type: InvalidType');
      });
    });
  });
};
