import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { FCBSetting, Entry, Campaign, Session } from '@/classes';
import { Topics } from '@/types';
import { getTestSetting, settingsHelper, fakeUuid } from '@unittest/testUtils';
import { ModuleSettings, SettingKey } from '@/settings';
import GlobalSettingService from '@/utils/globalSettings';

/**
 * Unit tests for the FCBSetting class
 */
export const registerFCBSettingTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach } = context;

  describe('FCBSetting', () => {
    describe('filterEntries', () => {
      it('should return all entries when filter returns true', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];
        const locationFolder = testSetting.topicFolders[Topics.Location];

        // Create entries in different topics
        await Entry.create(characterFolder!, { name: 'Character 1' });
        await Entry.create(characterFolder!, { name: 'Character 2' });
        await Entry.create(locationFolder!, { name: 'Location 1' });

        const allEntries = await testSetting.filterEntries(() => true);
        expect(allEntries.length).to.be.at.least(3);
      });

      it('should filter entries by type', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        await Entry.create(characterFolder!, { name: 'Filtered 1', type: 'NPC' });
        await Entry.create(characterFolder!, { name: 'Filtered 2', type: 'NPC' });
        await Entry.create(characterFolder!, { name: 'Filtered 3', type: 'Monster' });

        const npcs = await testSetting.filterEntries(e => e.type === 'NPC');
        expect(npcs.length).to.be.at.least(2);
        npcs.forEach(entry => {
          expect(entry.type).to.equal('NPC');
        });
      });

      it('should return empty array when no entries match filter', async () => {
        const testSetting = getTestSetting();

        const entries = await testSetting.filterEntries(e => e.type === 'NonExistentType12345');
        expect(entries).to.deep.equal([]);
      });
    });

    describe('deleteEntryFromSetting', () => {
      it('should cascade delete branch entries', async () => {
        const testSetting = getTestSetting();
        const orgFolder = testSetting.topicFolders[Topics.Organization];
        const locationFolder = testSetting.topicFolders[Topics.Location];

        // Create an organization
        const org = (await Entry.create(orgFolder!, {
          name: 'Test Org'
        }))!;

        // Create a location
        const location = (await Entry.create(locationFolder!, {
          name: 'Test Location'
        }))!;

        // Create a branch (organization presence in location)
        const branch = (await Entry.create(orgFolder!, {
          name: `${org.name} (${location.name})`
        }))!;
        branch.isBranch = true;
        await branch.save();

        // Set up hierarchy
        testSetting.hierarchies[org.uuid] = {
          ancestors: [],
          children: [],
          childBranches: [branch.uuid]
        };
        testSetting.hierarchies[branch.uuid] = {
          ancestors: [org.uuid],
          children: [],
          childBranches: []
        };
        await testSetting.save();

        // Delete the organization
        await org.delete();

        // Verify branch was cascade deleted
        const reloadedBranch = await Entry.fromUuid(branch.uuid);
        expect(reloadedBranch).to.be.null;
      });
    });

    describe('deleteActorFromSetting', () => {
      it('should clear actorId from linked PCs', async () => {
        const testSetting = getTestSetting();
        const pcFolder = testSetting.topicFolders[Topics.PC];

        const pc = (await Entry.create(pcFolder!, {
          name: 'Test PC'
        }))!;

        // Set a fake actorId
        const fakeActorId = fakeUuid('Actor');
        pc.actorId = fakeActorId;
        await pc.save();

        // Call deleteActorFromSetting
        await testSetting.deleteActorFromSetting(fakeActorId);

        // Verify actorId was cleared
        const reloadedPc = await Entry.fromUuid(pc.uuid);
        expect(reloadedPc!.actorId).to.equal('');
      });
    });

    describe('deleteSceneFromSetting', () => {
      it('should remove scene from linked locations', async () => {
        const testSetting = getTestSetting();
        const locationFolder = testSetting.topicFolders[Topics.Location];

        const location = (await Entry.create(locationFolder!, {
          name: 'Test Location'
        }))!;

        const fakeSceneId = fakeUuid('Scene');
        location.scenes = [fakeSceneId];
        await location.save();

        // Call deleteSceneFromSetting
        await testSetting.deleteSceneFromSetting(fakeSceneId);

        // Verify scene was removed
        const reloadedLocation = await Entry.fromUuid(location.uuid);
        expect(reloadedLocation!.scenes).to.not.include(fakeSceneId);
      });
    });

    describe('expandNode and collapseNode', () => {
      it('should track expanded nodes', async () => {
        const testSetting = getTestSetting();
        const testId = 'test-node-id';

        await testSetting.expandNode(testId);
        expect(testSetting.expandedIds[testId]).to.equal(true);

        await testSetting.collapseNode(testId);
        expect(testSetting.expandedIds[testId]).to.be.undefined;
      });
    });
  });
};
