import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Entry } from '@/classes';
import { Topics } from '@/types';
import { getTestSetting } from '@unittest/testUtils';

/**
 * Unit tests for the Entry class
 */
export const registerEntryTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach } = context;

  describe('Entry', () => {
    describe('create', () => {
      it('should create an entry in the Character topic folder', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];
        
        expect(characterFolder).to.not.be.undefined;
        
        const entry = await Entry.create(characterFolder!, {
          name: 'Test Character'
        });
        
        expect(entry).to.not.be.null;
        expect(entry).to.not.be.undefined;
        expect(entry!.name).to.equal('Test Character');
      });

      it('should create an entry in the Location topic folder', async () => {
        const testSetting = getTestSetting();
        const locationFolder = testSetting.topicFolders[Topics.Location];
        
        expect(locationFolder).to.not.be.undefined;
        
        const entry = await Entry.create(locationFolder!, {
          name: 'Test Location'
        });
        
        expect(entry).to.not.be.null;
        expect(entry!.name).to.equal('Test Location');
      });

      it('should generate a valid UUID', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];
        
        const entry = await Entry.create(characterFolder!, {
          name: 'UUID Test Character'
        });
        
        expect(entry!.uuid).to.be.a('string');
        // Entry UUID is the wrapper JournalEntry's UUID, not the page UUID
        expect(entry!.uuid).to.include('JournalEntry');
        expect(entry!.uuid).to.not.include('JournalEntryPage');
      });
    });

    describe('properties', () => {
      let testEntry: Entry;

      beforeEach(async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];
        testEntry = (await Entry.create(characterFolder!, {
          name: 'Property Test Character'
        }))!;
      });

      it('should have a name property', () => {
        expect(testEntry.name).to.equal('Property Test Character');
      });

      it('should have a topic property', () => {
        expect(testEntry.topic).to.equal(Topics.Character);
      });

      it('should have a uuid property', () => {
        expect(testEntry.uuid).to.be.a('string');
      });
    });
  });
};
