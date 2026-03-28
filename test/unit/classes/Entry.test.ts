import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Entry, FCBSetting } from '@/classes';
import { Topics } from '@/types';
import { getTestSetting, fakeUuid } from '@unittest/testUtils';

/**
 * Unit tests for the Entry class
 */
export const registerEntryTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach } = context;

  describe('Entry', () => {
    describe('create', () => {
      it('should create an entry in the Character topic folder and add to entryIndex', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        expect(characterFolder).to.not.be.undefined;

        const entry = await Entry.create(characterFolder!, {
          name: 'Test Character'
        });

        // Verify basic creation
        expect(entry).to.not.be.null;
        expect(entry).to.not.be.undefined;
        expect(entry!.name).to.equal('Test Character');

        // Verify entry was added to topic folder's entryIndex
        const entryInIndex = characterFolder!.entryIndex.find(e => e.uuid === entry!.uuid);
        expect(entryInIndex).to.not.be.undefined;
        expect(entryInIndex!.name).to.equal('Test Character');

        // Verify entry was added to topNodes (no parent)
        expect(characterFolder!.topNodes).to.include(entry!.uuid);

        // Verify entry can be reloaded from compendium via fromUuid
        const reloadedEntry = await Entry.fromUuid(entry!.uuid);
        expect(reloadedEntry).to.not.be.null;
        expect(reloadedEntry!.name).to.equal('Test Character');
      });

      it('should create an entry in the Location topic folder and add to entryIndex', async () => {
        const testSetting = getTestSetting();
        const locationFolder = testSetting.topicFolders[Topics.Location];

        expect(locationFolder).to.not.be.undefined;

        const entry = await Entry.create(locationFolder!, {
          name: 'Test Location'
        });

        // Verify basic creation
        expect(entry).to.not.be.null;
        expect(entry!.name).to.equal('Test Location');

        // Verify entry was added to topic folder's entryIndex
        const entryInIndex = locationFolder!.entryIndex.find(e => e.uuid === entry!.uuid);
        expect(entryInIndex).to.not.be.undefined;
        expect(entryInIndex!.name).to.equal('Test Location');

        // Verify entry can be reloaded from compendium via fromUuid
        const reloadedEntry = await Entry.fromUuid(entry!.uuid);
        expect(reloadedEntry).to.not.be.null;
        expect(reloadedEntry!.name).to.equal('Test Location');
      });

      it('should generate a UUID that can be used to reload the entry', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = await Entry.create(characterFolder!, {
          name: 'UUID Test Character'
        });

        expect(entry!.uuid).to.be.a('string');

        // The UUID should be usable to reload the entry via fromUuid
        const reloadedEntry = await Entry.fromUuid(entry!.uuid);
        expect(reloadedEntry).to.not.be.null;
        expect(reloadedEntry!.uuid).to.equal(entry!.uuid);
        expect(reloadedEntry!.name).to.equal('UUID Test Character');
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

      it('should show placeholder for PC entries with no name', async () => {
        const testSetting = getTestSetting();
        const pcFolder = testSetting.topicFolders[Topics.PC];

        const pcEntry = (await Entry.create(pcFolder!, {
          name: 'PC With Name'
        }))!;

        // PC with name should show the name
        expect(pcEntry.name).to.equal('PC With Name');

        // PC without name (empty string) should show placeholder
        pcEntry.name = '';
        expect(pcEntry.name).to.include('Link to Actor');
      });

      it('should have a topic property', () => {
        expect(testEntry.topic).to.equal(Topics.Character);
      });

      it('should have a uuid property', () => {
        expect(testEntry.uuid).to.be.a('string');
      });
    });

    describe('getActor', () => {
      it('should throw error when called on non-PC entry', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = (await Entry.create(characterFolder!, {
          name: 'Non-PC Entry'
        }))!;

        await expect(entry.getActor()).to.be.rejectedWith('Attempt to getActor on non-PC entry');
      });

      it('should return null when PC has no actorId', async () => {
        const testSetting = getTestSetting();
        const pcFolder = testSetting.topicFolders[Topics.PC];

        const pcEntry = (await Entry.create(pcFolder!, {
          name: 'PC Without Actor'
        }))!;

        // PC with no actorId should return null
        expect(pcEntry.actorId).to.equal('');
        const actor = await pcEntry.getActor();
        expect(actor).to.be.null;
      });

      it('should clean up actorId when actor has been deleted', async () => {
        const testSetting = getTestSetting();
        const pcFolder = testSetting.topicFolders[Topics.PC];

        const pcEntry = (await Entry.create(pcFolder!, {
          name: 'PC With Deleted Actor'
        }))!;

        // Set a fake actorId that doesn't exist
        const fakeActorId = fakeUuid('Actor');
        pcEntry.actorId = fakeActorId;
        await pcEntry.save();

        // getActor should return null and clean up the stale reference
        const actor = await pcEntry.getActor();
        expect(actor).to.be.null;

        // Verify actorId was cleared
        expect(pcEntry.actorId).to.equal('');

        // Verify the cleanup was persisted
        const reloadedEntry = await Entry.fromUuid(pcEntry.uuid);
        expect(reloadedEntry!.actorId).to.equal('');
      });
    });

    describe('save', () => {
      it('should update entryIndex when entry is saved', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = (await Entry.create(characterFolder!, {
          name: 'Original Name'
        }))!;

        // Verify initial state
        let entryInIndex = characterFolder!.entryIndex.find(e => e.uuid === entry.uuid);
        expect(entryInIndex!.name).to.equal('Original Name');

        // Rename and save
        entry.name = 'Updated Name';
        await entry.save();

        // Verify entryIndex was updated
        entryInIndex = characterFolder!.entryIndex.find(e => e.uuid === entry.uuid);
        expect(entryInIndex!.name).to.equal('Updated Name');
      });

      it('should add new type to topic folder types list', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const initialTypes = [...characterFolder!.types];

        const entry = (await Entry.create(characterFolder!, {
          name: 'Typed Character',
          type: 'NewType'
        }))!;

        // Verify the new type was added
        expect(characterFolder!.types).to.include('NewType');
        expect(characterFolder!.types.length).to.equal(initialTypes.length + 1);
      });
    });

    describe('delete', () => {
      it('should remove entry from entryIndex and topNodes', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = (await Entry.create(characterFolder!, {
          name: 'Entry To Delete'
        }))!;

        const entryUuid = entry.uuid;

        // Verify entry exists in index and topNodes
        expect(characterFolder!.entryIndex.find(e => e.uuid === entryUuid)).to.not.be.undefined;
        expect(characterFolder!.topNodes).to.include(entryUuid);

        // Delete the entry
        await entry.delete();

        // Verify entry was removed from index and topNodes
        expect(characterFolder!.entryIndex.find(e => e.uuid === entryUuid)).to.be.undefined;
        expect(characterFolder!.topNodes).to.not.include(entryUuid);

        // Verify entry no longer exists in compendium
        const reloadedEntry = await Entry.fromUuid(entryUuid);
        expect(reloadedEntry).to.be.null;
      });
    });

    describe('getFoundryTags', () => {
      it('should return empty array when entry has no tags', async () => {
        const testSetting = getTestSetting();
        const characterFolder = testSetting.topicFolders[Topics.Character];

        const entry = (await Entry.create(characterFolder!, {
          name: 'Tagless Entry'
        }))!;

        const tags = entry.getFoundryTags('actorTags' as any);
        expect(tags).to.deep.equal([]);
      });
    });
  });
};
