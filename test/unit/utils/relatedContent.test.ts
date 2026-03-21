import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Topics } from '@/types';
import { Entry } from '@/classes';
import { filterRelatedEntries } from '@/utils/relatedContent';
import { getTestSetting } from '@unittest/testUtils';

/**
 * Unit tests for the relatedContent utility functions
 */
export const registerRelatedContentTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('filterRelatedEntries', () => {
    let added: string[];
    let removed: string[];
    let testEntries: {
      character1: Entry;
      character2: Entry;
      location1: Entry;
      location2: Entry;
    };

    beforeEach(async () => {
      // Get the shared test setting
      const testSetting = getTestSetting();
      testEntries = {
        character1: (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
      name: 'Test Character 1'
        }))!,
        character2: (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
      name: 'Test Character 2'
        }))!,
        location1: (await Entry.create(testSetting.topicFolders[Topics.Location]!, {
      name: 'Test Location 1'
        }))!,
        location2: (await Entry.create(testSetting.topicFolders[Topics.Location]!, {
      name: 'Test Location 2'
        }))!
      };

      // Initialize test arrays
      added = [];
      removed = [];
    });

    afterEach(async () => {
      // Clean up is handled at batch level
    });

    it('should return empty if both arrays are empty', async () => {
      added = [];
      removed = [];

      await filterRelatedEntries(getTestSetting(), added, removed);

      expect(added).to.deep.equal([]);
      expect(removed).to.deep.equal([]);
    });

    it('should filter UUIDs to only include those from the current compendium', async () => {
      added = [
        testEntries.character1.uuid,
        'Compendium.other-setting.JournalEntry.other1',
        testEntries.character2.uuid
      ];
      removed = [
        testEntries.location1.uuid,
        'Compendium.another-setting.JournalEntry.other2'
      ];

      await filterRelatedEntries(getTestSetting(), added, removed, [Topics.Character]);

      // should only have characters from the current setting
      expect(added).to.deep.equal([
        testEntries.character1.uuid,
        testEntries.character2.uuid
      ]);
      expect(removed).to.deep.equal([
      ]);
    });

    it('should filter by specific topics when provided', async () => {
      added = [
        testEntries.character1.uuid, // Character topic
        testEntries.location1.uuid   // Location topic
      ];
      removed = [
        testEntries.character2.uuid, // Character topic
        testEntries.location2.uuid   // Location topic
      ];

      // Only allow Character topic
      await filterRelatedEntries(getTestSetting(), added, removed, [Topics.Character]);

      expect(added).to.deep.equal([
        testEntries.character1.uuid
      ]);
      expect(removed).to.deep.equal([
        testEntries.character2.uuid
      ]);
    });

    it('should allow all topics when no topic filter is provided', async () => {
      added = [
        testEntries.character1.uuid, // Character topic
        testEntries.location1.uuid   // Location topic
      ];
      removed = [
        testEntries.character2.uuid, // Character topic
        testEntries.location2.uuid   // Location topic
      ];

      await filterRelatedEntries(getTestSetting(), added, removed);

      expect(added).to.deep.equal([
        testEntries.character1.uuid,
        testEntries.location1.uuid
      ]);
      expect(removed).to.deep.equal([
        testEntries.character2.uuid,
        testEntries.location2.uuid
      ]);
    });

        it('should preserve original array references while modifying contents', async () => {
      added = [testEntries.character1.uuid];
      removed = [testEntries.character2.uuid];

      const addedRef = added;
      const removedRef = removed;

      await filterRelatedEntries(getTestSetting(), added, removed);

      // Arrays should be the same objects (same reference)
      expect(added).to.equal(addedRef);
      expect(removed).to.equal(removedRef);

      // But contents should be filtered
      expect(added).to.deep.equal([testEntries.character1.uuid]);
      expect(removed).to.deep.equal([testEntries.character2.uuid]);
    });

        it('should handle duplicate UUIDs in input arrays', async () => {
      added = [
        testEntries.character1.uuid,
        testEntries.character1.uuid,
        testEntries.character2.uuid
      ];
      removed = [
        testEntries.character1.uuid,
        testEntries.location1.uuid,
        testEntries.location1.uuid
      ];

      await filterRelatedEntries(getTestSetting(), added, removed, [Topics.Character]);

      expect(added).to.deep.equal([
        testEntries.character1.uuid,
        testEntries.character1.uuid,
        testEntries.character2.uuid
      ]);
      expect(removed).to.deep.equal([
        testEntries.character1.uuid
      ]);
    });

        it('should filter out non-existent UUIDs', async () => {
      added = [
        testEntries.character1.uuid,
        'Compendium.test-setting.JournalEntry.nonexistent'
      ];
      removed = [
        testEntries.character2.uuid,
        'Compendium.test-setting.JournalEntry.also-nonexistent'
      ];

      await filterRelatedEntries(getTestSetting(), added, removed);

      expect(added).to.deep.equal([
        testEntries.character1.uuid
      ]);
      expect(removed).to.deep.equal([
        testEntries.character2.uuid
      ]);
    });

        it('should handle multiple topic filters', async () => {
      added = [
        testEntries.character1.uuid, // Character
        testEntries.character2.uuid, // Character
        testEntries.location1.uuid,  // Location
        testEntries.location2.uuid   // Location
      ];
      removed = [];

      await filterRelatedEntries(getTestSetting(), added, removed, [Topics.Character, Topics.Location]);

      expect(added).to.deep.equal([
        testEntries.character1.uuid,
        testEntries.character2.uuid,
        testEntries.location1.uuid,
        testEntries.location2.uuid
      ]);
    });

    it('should handle malformed UUIDs gracefully', async () => {
      added = [
        testEntries.character1.uuid,
        'invalid-uuid-format',
        testEntries.character2.uuid
      ];
      removed = [
        'another-invalid-format',
        testEntries.location1.uuid
      ];

      await filterRelatedEntries(getTestSetting(), added, removed);

      expect(added).to.deep.equal([
        testEntries.character1.uuid,
        testEntries.character2.uuid
      ]);
      expect(removed).to.deep.equal([
        testEntries.location1.uuid
      ]);
    });
  });
};
