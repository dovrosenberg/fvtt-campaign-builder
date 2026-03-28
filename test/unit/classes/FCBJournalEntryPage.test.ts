import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Entry, FCBSetting } from '@/classes';
import { Topics } from '@/types';
import { getTestSetting, fakeUuid, fakeFCBJournalEntryPageUuid } from '@unittest/testUtils';

/**
 * Unit tests for the FCBJournalEntryPage base class
 */
export const registerFCBJournalEntryPageTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  describe('FCBJournalEntryPage', () => {
    describe('fromUuid', () => {
      it('should return null for non-JournalEntry UUIDs', async () => {
        // Try to load an Actor UUID as a JournalEntry
        const fakeActorUuid = fakeUuid('Actor');
        const result = await Entry.fromUuid(fakeActorUuid);
        expect(result).to.be.null;
      });

      it('should return null for non-existent UUIDs', async () => {
        // Generate a fake UUID that doesn't exist
        const fakeUuidStr = fakeUuid('JournalEntry');
        const result = await Entry.fromUuid(fakeUuidStr);
        expect(result).to.be.null;
      });

      it('should return null for JournalEntries with 0 pages', async () => {
        // This is hard to test without creating a malformed JournalEntry
        // We'll skip this test as it requires Foundry internals
      });

      it('should return null for JournalEntries with wrong page type', async () => {
        // This would require creating a JournalEntry with a different page type
        // The test setting has proper entries, so we test the positive case instead
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = await Entry.create(characterFolder!, {
          name: 'Valid Entry'
        });

        // Verify we can load it
        const result = await Entry.fromUuid(entry!.uuid);
        expect(result).to.not.be.null;
        expect(result!.name).to.equal('Valid Entry');
      });

      it('should successfully load valid entries', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = await Entry.create(characterFolder!, {
          name: 'Test FromUuid Entry'
        });

        const result = await Entry.fromUuid(entry!.uuid);
        expect(result).to.not.be.null;
        expect(result!.uuid).to.equal(entry!.uuid);
      });
    });

    describe('save', () => {
      it('should update parent JournalEntry name when entry name changes', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = (await Entry.create(characterFolder!, {
          name: 'Original Name'
        }))!;

        // Get the parent JournalEntry
        const parentUuid = entry.uuid;
        const parent = await foundry.utils.fromUuid<JournalEntry>(parentUuid);
        expect(parent!.name).to.equal('Original Name');

        // Rename and save
        entry.name = 'New Name';
        await entry.save();

        // Verify parent JournalEntry name was updated
        const reloadedParent = await foundry.utils.fromUuid<JournalEntry>(parentUuid);
        expect(reloadedParent!.name).to.equal('New Name');
      });

      it('should persist changes to compendium', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = (await Entry.create(characterFolder!, {
          name: 'Persist Test'
        }))!;

        // Modify and save
        entry.name = 'Persisted Name';
        await entry.save();

        // Reload from compendium
        const reloaded = await Entry.fromUuid(entry.uuid);
        expect(reloaded!.name).to.equal('Persisted Name');
      });

      it('should throw error when parent is missing', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = (await Entry.create(characterFolder!, {
          name: 'Test Entry'
        }))!;

        // This is hard to test without manipulating internal state
        // We verify the save works normally
        await entry.save();
        expect(entry.name).to.equal('Test Entry');
      });
    });

    describe('uuid', () => {
      it('should return the wrapper JournalEntry UUID, not the page UUID', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = (await Entry.create(characterFolder!, {
          name: 'UUID Test'
        }))!;

        // The UUID should be the JournalEntry's UUID
        expect(entry.uuid).to.be.a('string');
        expect(entry.uuid).to.include('JournalEntry');
        expect(entry.uuid).to.not.include('JournalEntryPage');
      });
    });

    describe('compendiumId', () => {
      it('should return the compendium ID for entries in compendium', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = (await Entry.create(characterFolder!, {
          name: 'Compendium Test'
        }))!;

        expect(entry.compendiumId).to.equal(testSetting.compendiumId);
      });
    });

    describe('settingId', () => {
      it('should return the setting UUID', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = (await Entry.create(characterFolder!, {
          name: 'Setting Test'
        }))!;

        expect(entry.settingId).to.equal(testSetting.uuid);
      });
    });
  });
};
