import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { useRelationshipStore, useMainStore } from '@/applications/stores';
import { Entry, WindowTab } from '@/classes';
import { Topics } from '@/types';
import { getTestSetting } from '@unittest/testUtils';
import { createTabPanelState } from '@/composables/useTabPanelState';
import { WindowTabType } from '@/types';

export const registerRelationshipStoreTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  // Helper function to create test window tabs
  const createTestTab = (uuid: string, tabType: WindowTabType): WindowTab => {
    return new WindowTab(
      true, // active
      { uuid, name: 'testTab', icon: 'fa-question' },
      uuid, // contentId
      tabType,
      null, // id
      null, // contentTab
      [], // history
      -1 // historyIdx
    );
  };

  describe('useRelationshipStore', () => {
    let relationshipStore: ReturnType<typeof useRelationshipStore>;
    let mainStore: ReturnType<typeof useMainStore>;
    let sandbox: sinon.SinonSandbox;
    let testSetting: Awaited<ReturnType<typeof getTestSetting>>;
    let testEntry1: Entry;
    let testEntry2: Entry;
    let testActors: Actor[] = [];
    let testScenes: Scene[] = [];

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());

      // Create the stores after pinia is set
      relationshipStore = useRelationshipStore();
      mainStore = useMainStore();

      // Get the shared test setting
      testSetting = getTestSetting();

      // Create test entries
      testEntry1 = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
        name: 'Test Character 1',
      }))!;
      testEntry2 = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
        name: 'Test Character 2',
      }))!;

      // Set up the main store with panel state
      const panelState = createTabPanelState(0);
      mainStore.setFocusedPanel(panelState);

      // Set the setting
      await mainStore.setNewSetting(testSetting.uuid);

      // Set entry1 as current entry
      const tab = createTestTab(testEntry1.uuid, WindowTabType.Entry);
      await mainStore.setNewTab(tab);
    });

    afterEach(async () => {
      // Clean up test actors
      for (const actor of testActors) {
        try {
          await actor.delete();
        } catch {
          // Ignore if already deleted
        }
      }
      testActors = [];

      // Clean up test scenes
      for (const scene of testScenes) {
        try {
          await scene.delete();
        } catch {
          // Ignore if already deleted
        }
      }
      testScenes = [];

      sandbox.restore();
    });

    describe('extraFields', () => {
      it('should define relationship fields for character-to-character', () => {
        const fields = relationshipStore.extraFields[Topics.Character][Topics.Character];
        expect(fields).to.have.length(1);
        expect(fields[0].field).to.equal('relationship');
      });

      it('should define relationship fields for character-to-location', () => {
        const fields = relationshipStore.extraFields[Topics.Character][Topics.Location];
        expect(fields).to.have.length(1);
        expect(fields[0].field).to.equal('relationship');
      });

      it('should have empty array for location-to-organization', () => {
        const fields = relationshipStore.extraFields[Topics.Location][Topics.Organization];
        expect(fields).to.have.length(0);
      });

      it('should have empty array for PC-to-PC', () => {
        const fields = relationshipStore.extraFields[Topics.PC][Topics.PC];
        expect(fields).to.have.length(0);
      });
    });

    describe('addRelationship', () => {
      it('should add relationship between entries', async () => {
        await relationshipStore.addRelationship(testEntry2, { relationship: 'Friend' });

        // Verify relationship was added to both entries
        const refreshed1 = await Entry.fromUuid(testEntry1.uuid);
        const refreshed2 = await Entry.fromUuid(testEntry2.uuid);

        expect(refreshed1?.relationships[Topics.Character]?.[testEntry2.uuid]).to.exist;
        expect(refreshed1?.relationships[Topics.Character]?.[testEntry2.uuid]?.extraFields.relationship).to.equal('Friend');
        expect(refreshed2?.relationships[Topics.Character]?.[testEntry1.uuid]).to.exist;
      });

      it('should throw when no current entry', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(relationshipStore.addRelationship(testEntry2, {})).to.be.rejectedWith('Invalid entry');
      });

      it('should throw when no related entry', async () => {
        await expect(relationshipStore.addRelationship(null as any, {})).to.be.rejectedWith('Invalid entry');
      });
    });

    describe('deleteRelationship', () => {
      it('should remove relationship from both entries', async () => {
        // Add relationship first
        await relationshipStore.addRelationship(testEntry2, { relationship: 'Friend' });

        // Delete it
        await relationshipStore.deleteRelationship(testEntry2.uuid);

        // Verify relationship was removed from both
        const refreshed1 = await Entry.fromUuid(testEntry1.uuid);
        const refreshed2 = await Entry.fromUuid(testEntry2.uuid);

        expect(refreshed1?.relationships[Topics.Character]?.[testEntry2.uuid]).to.be.undefined;
        expect(refreshed2?.relationships[Topics.Character]?.[testEntry1.uuid]).to.be.undefined;
      });

      it('should throw when no current entry', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(relationshipStore.deleteRelationship(testEntry2.uuid)).to.be.rejectedWith('Invalid entry');
      });
    });

    describe('editRelationship', () => {
      it('should update extra fields on both entries', async () => {
        // Add relationship first
        await relationshipStore.addRelationship(testEntry2, { relationship: 'Friend' });

        // Edit it
        await relationshipStore.editRelationship(testEntry2.uuid, { relationship: 'Rival' });

        // Verify update
        const refreshed1 = await Entry.fromUuid(testEntry1.uuid);
        const refreshed2 = await Entry.fromUuid(testEntry2.uuid);

        expect(refreshed1?.relationships[Topics.Character]?.[testEntry2.uuid]?.extraFields.relationship).to.equal('Rival');
        expect(refreshed2?.relationships[Topics.Character]?.[testEntry1.uuid]?.extraFields.relationship).to.equal('Rival');
      });

      it('should throw when no current entry', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(relationshipStore.editRelationship(testEntry2.uuid, {})).to.be.rejectedWith('Invalid entry');
      });
    });

    describe('addScene', () => {
      it('should add scene to entry', async () => {
        // Create a real Scene document
        const scene = await Scene.create({ name: 'Test Scene' });
        testScenes.push(scene!);
        const sceneUuid = scene!.uuid;

        await relationshipStore.addScene(sceneUuid);

        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.scenes).to.include(sceneUuid);
      });

      it('should not add duplicate scene', async () => {
        // Create a real Scene document
        const scene = await Scene.create({ name: 'Test Scene' });
        testScenes.push(scene!);
        const sceneUuid = scene!.uuid;

        await relationshipStore.addScene(sceneUuid);
        await relationshipStore.addScene(sceneUuid);

        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.scenes).to.have.length(1);
      });

      it('should throw when no current entry', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        // Create a real Scene for the error test
        const scene = await Scene.create({ name: 'Test Scene' });
        testScenes.push(scene!);

        await expect(relationshipStore.addScene(scene!.uuid)).to.be.rejectedWith('Invalid entry');
      });
    });

    describe('deleteScene', () => {
      it('should remove scene from entry', async () => {
        // Create a real Scene document
        const scene = await Scene.create({ name: 'Test Scene' });
        testScenes.push(scene!);
        const sceneUuid = scene!.uuid;

        await relationshipStore.addScene(sceneUuid);

        await relationshipStore.deleteScene(sceneUuid);

        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.scenes).to.not.include(sceneUuid);
      });

      it('should do nothing if scene not found', async () => {
        // Create a real Scene that won't be added
        const scene = await Scene.create({ name: 'Unrelated Scene' });
        testScenes.push(scene!);

        await relationshipStore.deleteScene(scene!.uuid);

        // Should not throw
        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.scenes).to.have.length(0);
      });
    });

    describe('addActor', () => {
      it('should add actor to entry', async () => {
        // Create a real Actor document
        const actor = await Actor.create({ name: 'Test Actor', type: 'base' });
        testActors.push(actor!);
        const actorUuid = actor!.uuid;

        await relationshipStore.addActor(actorUuid);

        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.actors).to.include(actorUuid);
      });

      it('should not add duplicate actor', async () => {
        // Create a real Actor document
        const actor = await Actor.create({ name: 'Test Actor', type: 'base' });
        testActors.push(actor!);
        const actorUuid = actor!.uuid;

        await relationshipStore.addActor(actorUuid);
        await relationshipStore.addActor(actorUuid);

        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.actors).to.have.length(1);
      });

      it('should throw when no current entry', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        // Create a real Actor for the error test
        const actor = await Actor.create({ name: 'Test Actor', type: 'base' });
        testActors.push(actor!);

        await expect(relationshipStore.addActor(actor!.uuid)).to.be.rejectedWith('Invalid entry');
      });
    });

    describe('deleteActor', () => {
      it('should remove actor from entry', async () => {
        // Create a real Actor document
        const actor = await Actor.create({ name: 'Test Actor', type: 'base' });
        testActors.push(actor!);
        const actorUuid = actor!.uuid;

        await relationshipStore.addActor(actorUuid);

        await relationshipStore.deleteActor(actorUuid);

        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.actors).to.not.include(actorUuid);
      });
    });

    describe('reorderActors', () => {
      it('should reorder actors list', async () => {
        // Create real Actor documents
        const actor1 = await Actor.create({ name: 'Actor 1', type: 'base' });
        const actor2 = await Actor.create({ name: 'Actor 2', type: 'base' });
        const actor3 = await Actor.create({ name: 'Actor 3', type: 'base' });
        testActors.push(actor1!, actor2!, actor3!);

        await relationshipStore.addActor(actor1!.uuid);
        await relationshipStore.addActor(actor2!.uuid);
        await relationshipStore.addActor(actor3!.uuid);

        // Reverse order
        await relationshipStore.reorderActors([actor3!.uuid, actor2!.uuid, actor1!.uuid]);

        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.actors).to.deep.equal([actor3!.uuid, actor2!.uuid, actor1!.uuid]);
      });

      it('should throw when no current entry', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(relationshipStore.reorderActors([])).to.be.rejectedWith('Invalid entry');
      });
    });

    describe('addFoundryDocument', () => {
      it('should add document uuid to entry', async () => {
        // Create a real JournalEntry to use as the document
        const journal = await JournalEntry.create({ name: 'Test Journal' });
        const docUuid = journal!.uuid;

        await relationshipStore.addFoundryDocument(docUuid);

        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.foundryDocuments).to.include(docUuid);

        // Clean up
        await journal?.delete();
      });

      it('should not add duplicate document', async () => {
        // Create a real JournalEntry to use as the document
        const journal = await JournalEntry.create({ name: 'Test Journal' });
        const docUuid = journal!.uuid;

        await relationshipStore.addFoundryDocument(docUuid);
        await relationshipStore.addFoundryDocument(docUuid);

        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.foundryDocuments).to.have.length(1);

        // Clean up
        await journal?.delete();
      });
    });

    describe('deleteFoundryDocument', () => {
      it('should remove document from entry', async () => {
        // Create a real JournalEntry to use as the document
        const journal = await JournalEntry.create({ name: 'Test Journal' });
        const docUuid = journal!.uuid;

        await relationshipStore.addFoundryDocument(docUuid);

        await relationshipStore.deleteFoundryDocument(docUuid);

        const refreshed = await Entry.fromUuid(testEntry1.uuid);
        expect(refreshed?.foundryDocuments).to.not.include(docUuid);

        // Clean up
        await journal?.delete();
      });
    });

    describe('getRelationships', () => {
      it('should return relationships for topic', async () => {
        // Add relationship
        await relationshipStore.addRelationship(testEntry2, { relationship: 'Friend' });

        const relationships = await relationshipStore.getRelationships<Topics.Character, Topics.Character>(Topics.Character);

        expect(relationships).to.have.length(1);
        expect(relationships[0].uuid).to.equal(testEntry2.uuid);
        expect(relationships[0].name).to.equal('Test Character 2');
      });

      it('should return empty array when no relationships', async () => {
        const relationships = await relationshipStore.getRelationships<Topics.Character, Topics.Character>(Topics.Character);

        expect(relationships).to.have.length(0);
      });

      it('should throw when no current entry', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(relationshipStore.getRelationships(Topics.Character)).to.be.rejectedWith('Invalid current entry');
      });
    });

    describe('propagateFieldChange', () => {
      it('should propagate name change to related entries', async () => {
        // Add relationship
        await relationshipStore.addRelationship(testEntry2, { relationship: 'Friend' });

        // Reload entry1 to get updated relationships
        const entry1 = (await Entry.fromUuid(testEntry1.uuid))!;

        // Change name and propagate
        entry1.name = 'Updated Name';
        await entry1.save();
        await relationshipStore.propagateFieldChange(entry1, 'name');

        // Verify propagated
        const refreshed2 = await Entry.fromUuid(testEntry2.uuid);
        expect(refreshed2?.relationships[Topics.Character]?.[testEntry1.uuid]?.name).to.equal('Updated Name');
      });

      it('should propagate type change to related entries', async () => {
        // Add relationship
        await relationshipStore.addRelationship(testEntry2, { relationship: 'Friend' });

        // Reload entry1 to get updated relationships
        const entry1 = (await Entry.fromUuid(testEntry1.uuid))!;

        // Change type and propagate
        entry1.type = 'NPC';
        await entry1.save();
        await relationshipStore.propagateFieldChange(entry1, 'type');

        // Verify propagated
        const refreshed2 = await Entry.fromUuid(testEntry2.uuid);
        expect(refreshed2?.relationships[Topics.Character]?.[testEntry1.uuid]?.type).to.equal('NPC');
      });

      it('should propagate multiple fields at once', async () => {
        // Add relationship
        await relationshipStore.addRelationship(testEntry2, { relationship: 'Friend' });

        // Reload entry1 to get updated relationships
        const entry1 = (await Entry.fromUuid(testEntry1.uuid))!;

        // Change both fields and propagate
        entry1.name = 'Updated Name';
        entry1.type = 'NPC';
        await entry1.save();
        await relationshipStore.propagateFieldChange(entry1, ['name', 'type']);

        // Verify both propagated
        const refreshed2 = await Entry.fromUuid(testEntry2.uuid);
        expect(refreshed2?.relationships[Topics.Character]?.[testEntry1.uuid]?.name).to.equal('Updated Name');
        expect(refreshed2?.relationships[Topics.Character]?.[testEntry1.uuid]?.type).to.equal('NPC');
      });

      it('should do nothing when entry has no relationships', async () => {
        // Entry with no relationships
        await relationshipStore.propagateFieldChange(testEntry1, 'name');

        // Should not throw
      });

      it('should ignore invalid field names', async () => {
        // Add relationship
        await relationshipStore.addRelationship(testEntry2, { relationship: 'Friend' });

        // Reload entry1 to get updated relationships
        const entry1 = (await Entry.fromUuid(testEntry1.uuid))!;

        // Should not throw with invalid field
        await relationshipStore.propagateFieldChange(entry1, 'invalid' as any);

        // No change should occur
        const refreshed2 = await Entry.fromUuid(testEntry2.uuid);
        expect(refreshed2?.relationships[Topics.Character][testEntry1.uuid].name).to.equal('Test Character 1');
      });
    });

    describe('addArbitraryRelationship', () => {
      it('should add relationship between any two entries by uuid', async () => {
        await relationshipStore.addArbitraryRelationship(testEntry1.uuid, testEntry2.uuid, { relationship: 'Ally' });

        const refreshed1 = await Entry.fromUuid(testEntry1.uuid);
        const refreshed2 = await Entry.fromUuid(testEntry2.uuid);

        expect(refreshed1?.relationships[Topics.Character]?.[testEntry2.uuid]).to.exist;
        expect(refreshed2?.relationships[Topics.Character]?.[testEntry1.uuid]).to.exist;
      });

      it('should throw for invalid entry1 uuid', async () => {
        await expect(relationshipStore.addArbitraryRelationship('invalid-uuid', testEntry2.uuid, {})).to.be.rejectedWith('Invalid entry1');
      });

      it('should throw for invalid entry2 uuid', async () => {
        await expect(relationshipStore.addArbitraryRelationship(testEntry1.uuid, 'invalid-uuid', {})).to.be.rejectedWith('Invalid entry2');
      });
    });

    describe('deleteArbitraryRelationship', () => {
      it('should delete relationship between any two entries by uuid', async () => {
        // Add first
        await relationshipStore.addArbitraryRelationship(testEntry1.uuid, testEntry2.uuid, { relationship: 'Ally' });

        // Delete
        await relationshipStore.deleteArbitraryRelationship(testEntry1.uuid, testEntry2.uuid);

        const refreshed1 = await Entry.fromUuid(testEntry1.uuid);
        const refreshed2 = await Entry.fromUuid(testEntry2.uuid);

        expect(refreshed1?.relationships[Topics.Character]?.[testEntry2.uuid]).to.be.undefined;
        expect(refreshed2?.relationships[Topics.Character]?.[testEntry1.uuid]).to.be.undefined;
      });
    });
  });
};
