import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionStore, useMainStore } from '@/applications/stores';
import { Campaign, Session, Entry, WindowTab } from '@/classes';
import { Topics } from '@/types';
import { getTestSetting } from '@unittest/testUtils';
import { createTabPanelState } from '@/composables/useTabPanelState';
import { WindowTabType } from '@/types';
import { FCBDialog } from '@/dialogs';

export const registerSessionStoreTests = (context: QuenchBatchContext) => {
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

  describe('useSessionStore', () => {
    let sessionStore: ReturnType<typeof useSessionStore>;
    let mainStore: ReturnType<typeof useMainStore>;
    let sandbox: sinon.SinonSandbox;
    let testSetting: Awaited<ReturnType<typeof getTestSetting>>;
    let testCampaign: Campaign;
    let testSession: Session;
    let testEntry: Entry;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());

      // Create the stores after pinia is set
      sessionStore = useSessionStore();
      mainStore = useMainStore();

      // Get the shared test setting
      testSetting = getTestSetting();

      // Create test data
      testCampaign = (await Campaign.create(testSetting, 'Test Campaign'))!;
      testSession = (await Session.create(testCampaign, 'Test Session'))!;
      testSession.number = 1;
      await testSession.save();

      // Create a test entry for location/NPC tests
      testEntry = (await Entry.create(testSetting.topicFolders[Topics.Location]!, {
        name: 'Test Location',
      }))!;

      // Set up the main store with panel state
      const panelState = createTabPanelState(0);
      mainStore.setFocusedPanel(panelState);

      // Set the setting
      await mainStore.setNewSetting(testSetting.uuid);

      // Set session as current content
      const tab = createTestTab(testSession.uuid, WindowTabType.Session);
      await mainStore.setNewTab(tab);
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('extraFields', () => {
      it('should have empty array for None type', () => {
        expect(sessionStore.extraFields[0]).to.have.length(0);
      });

      it('should have fields for Location type', () => {
        const fields = sessionStore.extraFields[1]; // SessionTableTypes.Location
        expect(fields).to.have.length(4);
        expect(fields.map(f => f.field)).to.deep.equal(['name', 'type', 'parent', 'notes']);
      });

      it('should have fields for NPC type', () => {
        const fields = sessionStore.extraFields[3]; // SessionTableTypes.NPC
        expect(fields).to.have.length(3);
        expect(fields.map(f => f.field)).to.deep.equal(['name', 'type', 'notes']);
      });

      it('should have fields for Lore type', () => {
        const fields = sessionStore.extraFields[6]; // SessionTableTypes.Lore
        expect(fields).to.have.length(2);
        expect(fields.map(f => f.field)).to.deep.equal(['significant', 'description']);
      });
    });

    describe('addLocation', () => {
      it('should add location to session', async () => {
        await sessionStore.addLocation(testEntry.uuid);

        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.locations).to.have.length(1);
        expect(refreshed?.locations[0].uuid).to.equal(testEntry.uuid);
      });

      it('should throw when no current session', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(sessionStore.addLocation(testEntry.uuid)).to.be.rejectedWith('Invalid session');
      });
    });

    describe('deleteLocation', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should remove location from session', async () => {
        await sessionStore.addLocation(testEntry.uuid);

        const result = await sessionStore.deleteLocation(testEntry.uuid);

        expect(result).to.be.true;
        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.locations).to.have.length(0);
      });

      it('should return false if confirmation cancelled', async () => {
        confirmDialogStub.resolves(false);
        await sessionStore.addLocation(testEntry.uuid);

        const result = await sessionStore.deleteLocation(testEntry.uuid);

        expect(result).to.be.false;
      });

      it('should skip confirmation when skipConfirm is true', async () => {
        await sessionStore.addLocation(testEntry.uuid);

        const result = await sessionStore.deleteLocation(testEntry.uuid, true);

        expect(confirmDialogStub.called).to.be.false;
        expect(result).to.be.true;
      });
    });

    describe('updateLocationNotes', () => {
      it('should update location notes', async () => {
        await sessionStore.addLocation(testEntry.uuid);

        await sessionStore.updateLocationNotes(testEntry.uuid, 'Updated notes');

        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.locations[0].notes).to.equal('Updated notes');
      });
    });

    describe('reorderLocations', () => {
      it('should reorder locations in session', async () => {
        const entry2 = (await Entry.create(testSetting.topicFolders[Topics.Location]!, {
          name: 'Location 2',
        }))!;
        const entry3 = (await Entry.create(testSetting.topicFolders[Topics.Location]!, {
          name: 'Location 3',
        }))!;

        await sessionStore.addLocation(testEntry.uuid);
        await sessionStore.addLocation(entry2.uuid);
        await sessionStore.addLocation(entry3.uuid);

        const refreshed = await Session.fromUuid(testSession.uuid);
        const locations = refreshed!.locations;

        // Reverse order
        const reordered = [locations[2], locations[1], locations[0]];
        await sessionStore.reorderLocations(reordered);

        const afterReorder = await Session.fromUuid(testSession.uuid);
        expect(afterReorder?.locations.map(l => l.uuid)).to.deep.equal([entry3.uuid, entry2.uuid, testEntry.uuid]);
      });
    });

    describe('addNPC', () => {
      it('should add NPC to session', async () => {
        const character = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test NPC',
        }))!;

        await sessionStore.addNPC(character.uuid);

        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.npcs).to.have.length(1);
        expect(refreshed?.npcs[0].uuid).to.equal(character.uuid);
      });

      it('should throw when no current session', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(sessionStore.addNPC('some-uuid')).to.be.rejectedWith('Invalid session');
      });
    });

    describe('deleteNPC', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should remove NPC from session', async () => {
        const character = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test NPC',
        }))!;
        await sessionStore.addNPC(character.uuid);

        const result = await sessionStore.deleteNPC(character.uuid);

        expect(result).to.be.true;
        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.npcs).to.have.length(0);
      });
    });

    describe('updateNPCNotes', () => {
      it('should update NPC notes', async () => {
        const character = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test NPC',
        }))!;
        await sessionStore.addNPC(character.uuid);

        await sessionStore.updateNPCNotes(character.uuid, 'Updated notes');

        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.npcs[0].notes).to.equal('Updated notes');
      });
    });

    describe('reorderNPCs', () => {
      it('should reorder NPCs in session', async () => {
        const char1 = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'NPC 1' }))!;
        const char2 = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'NPC 2' }))!;
        const char3 = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'NPC 3' }))!;

        await sessionStore.addNPC(char1.uuid);
        await sessionStore.addNPC(char2.uuid);
        await sessionStore.addNPC(char3.uuid);

        const refreshed = await Session.fromUuid(testSession.uuid);
        const npcs = refreshed!.npcs;

        // Reverse order
        const reordered = [npcs[2], npcs[1], npcs[0]];
        await sessionStore.reorderNPCs(reordered);

        const afterReorder = await Session.fromUuid(testSession.uuid);
        expect(afterReorder?.npcs.map(n => n.uuid)).to.deep.equal([char3.uuid, char2.uuid, char1.uuid]);
      });
    });

    describe('addLore', () => {
      it('should add lore to session', async () => {
        const uuid = await sessionStore.addLore('Test lore');

        expect(uuid).to.be.a('string');

        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.lore).to.have.length(1);
        expect(refreshed?.lore[0].description).to.equal('Test lore');
      });

      it('should throw when no current session', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(sessionStore.addLore('Test')).to.be.rejectedWith('Invalid session');
      });
    });

    describe('updateLoreDescription', () => {
      it('should update lore description', async () => {
        const uuid = await sessionStore.addLore('Original');

        await sessionStore.updateLoreDescription(uuid!, 'Updated');

        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.lore[0].description).to.equal('Updated');
      });
    });

    describe('deleteLore', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should delete lore from session', async () => {
        const uuid = await sessionStore.addLore('Test lore');

        const result = await sessionStore.deleteLore(uuid!);

        expect(result).to.be.true;
        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.lore).to.have.length(0);
      });
    });

    describe('markLoreSignificant', () => {
      it('should mark lore as significant', async () => {
        const uuid = await sessionStore.addLore('Test lore');

        await sessionStore.markLoreSignificant(uuid!, true);

        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.lore[0].significant).to.be.true;
      });
    });

    describe('addVignette', () => {
      it('should add vignette to session', async () => {
        const uuid = await sessionStore.addVignette('Test vignette');

        expect(uuid).to.be.a('string');

        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.vignettes).to.have.length(1);
        expect(refreshed?.vignettes[0].description).to.equal('Test vignette');
      });
    });

    describe('updateVignetteDescription', () => {
      it('should update vignette description', async () => {
        const uuid = await sessionStore.addVignette('Original');

        await sessionStore.updateVignetteDescription(uuid!, 'Updated');

        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.vignettes[0].description).to.equal('Updated');
      });
    });

    describe('deleteVignette', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should delete vignette from session', async () => {
        const uuid = await sessionStore.addVignette('Test vignette');

        const result = await sessionStore.deleteVignette(uuid!);

        expect(result).to.be.true;
        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.vignettes).to.have.length(0);
      });
    });

    describe('reorderStoryWebs', () => {
      it('should reorder story webs in session', async () => {
        testSession.storyWebs = ['sw-1', 'sw-2', 'sw-3'];
        await testSession.save();

        await mainStore.refreshSession();

        await sessionStore.reorderStoryWebs(['sw-3', 'sw-1', 'sw-2']);

        const refreshed = await Session.fromUuid(testSession.uuid);
        expect(refreshed?.storyWebs).to.deep.equal(['sw-3', 'sw-1', 'sw-2']);
      });
    });
  });
};
