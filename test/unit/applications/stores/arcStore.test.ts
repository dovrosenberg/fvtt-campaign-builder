import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { useArcStore, useMainStore } from '@/applications/stores';
import { Arc, Campaign, WindowTab } from '@/classes';
import { getTestSetting, fakeUuid, fakeFCBJournalEntryPageUuid } from '@unittest/testUtils';
import { createTabPanelState } from '@/composables/useTabPanelState';
import { WindowTabType } from '@/types';
import { FCBDialog } from '@/dialogs';

export const registerArcStoreTests = (context: QuenchBatchContext) => {
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

  describe('useArcStore', () => {
    let arcStore: ReturnType<typeof useArcStore>;
    let mainStore: ReturnType<typeof useMainStore>;
    let sandbox: sinon.SinonSandbox;
    let testSetting: Awaited<ReturnType<typeof getTestSetting>>;
    let testCampaign: Campaign;
    let testArc: Arc;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());

      // Create the stores after pinia is set
      arcStore = useArcStore();
      mainStore = useMainStore();

      // Get the shared test setting
      testSetting = getTestSetting();

      // Create test data
      testCampaign = (await Campaign.create(testSetting, 'Test Campaign'))!;
      testArc = (await Arc.create(testCampaign, 'Test Arc'))!;

      // Set up the main store with panel state
      const panelState = createTabPanelState(0);
      mainStore.setFocusedPanel(panelState);

      // Set the setting
      await mainStore.setNewSetting(testSetting.uuid);

      // Set arc as current content
      const tab = createTestTab(testArc.uuid, WindowTabType.Arc);
      await mainStore.setNewTab(tab);
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('extraFields', () => {
      it('should have empty array for None type', () => {
        expect(arcStore.extraFields[0]).to.have.length(0);
      });

      it('should have fields for Location type', () => {
        const fields = arcStore.extraFields[1]; // ArcTableTypes.Location
        expect(fields).to.have.length(4);
        expect(fields.map(f => f.field)).to.deep.equal(['name', 'type', 'parent', 'notes']);
      });

      it('should have fields for Participant type', () => {
        const fields = arcStore.extraFields[2]; // ArcTableTypes.Participant
        expect(fields).to.have.length(3);
        expect(fields.map(f => f.field)).to.deep.equal(['name', 'type', 'notes']);
      });

      it('should have fields for Lore type', () => {
        const fields = arcStore.extraFields[6]; // ArcTableTypes.Lore
        expect(fields).to.have.length(1);
        expect(fields[0].field).to.equal('description');
      });
    });

    describe('addLocation', () => {
      it('should add location to arc', async () => {
        const locationUuid = fakeFCBJournalEntryPageUuid();
        await arcStore.addLocation(locationUuid, 'Test notes');

        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.locations).to.have.length(1);
        expect(refreshed?.locations[0].uuid).to.equal(locationUuid);
        expect(refreshed?.locations[0].notes).to.equal('Test notes');
      });

      it('should throw when no current arc', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(arcStore.addLocation(fakeFCBJournalEntryPageUuid())).to.be.rejectedWith('Invalid arc');
      });
    });

    describe('deleteLocation', () => {
      let confirmDialogStub: sinon.SinonStub;
      let locationUuid: string;

      beforeEach(async () => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
        locationUuid = fakeFCBJournalEntryPageUuid();
        await arcStore.addLocation(locationUuid);
      });

      it('should remove location from arc', async () => {
        const result = await arcStore.deleteLocation(locationUuid);

        expect(result).to.be.true;
        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.locations).to.have.length(0);
      });

      it('should return false if confirmation cancelled', async () => {
        confirmDialogStub.resolves(false);

        const result = await arcStore.deleteLocation(locationUuid);

        expect(result).to.be.false;
        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.locations).to.have.length(1);
      });

      it('should skip confirmation when skipConfirm is true', async () => {
        const result = await arcStore.deleteLocation(locationUuid, true);

        expect(confirmDialogStub.called).to.be.false;
        expect(result).to.be.true;
      });
    });

    describe('updateLocationNotes', () => {
      it('should update location notes', async () => {
        const locationUuid = fakeFCBJournalEntryPageUuid();
        await arcStore.addLocation(locationUuid, 'Original notes');

        await arcStore.updateLocationNotes(locationUuid, 'Updated notes');

        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.locations[0].notes).to.equal('Updated notes');
      });
    });

    describe('reorderLocations', () => {
      it('should reorder locations in arc', async () => {
        const loc1 = fakeFCBJournalEntryPageUuid();
        const loc2 = fakeFCBJournalEntryPageUuid();
        const loc3 = fakeFCBJournalEntryPageUuid();

        await arcStore.addLocation(loc1);
        await arcStore.addLocation(loc2);
        await arcStore.addLocation(loc3);

        const refreshed = await Arc.fromUuid(testArc.uuid);
        const locations = refreshed!.locations;

        // Reverse order
        const reordered = [locations[2], locations[1], locations[0]];
        await arcStore.reorderLocations(reordered);

        const afterReorder = await Arc.fromUuid(testArc.uuid);
        expect(afterReorder?.locations.map(l => l.uuid)).to.deep.equal([loc3, loc2, loc1]);
      });
    });

    describe('addLore', () => {
      it('should add lore to arc', async () => {
        const uuid = await arcStore.addLore('Test lore');

        expect(uuid).to.be.a('string');

        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.lore).to.have.length(1);
        expect(refreshed?.lore[0].description).to.equal('Test lore');
      });

      it('should throw when no current arc', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(arcStore.addLore('Test')).to.be.rejectedWith('Invalid arc');
      });
    });

    describe('updateLoreDescription', () => {
      it('should update lore description', async () => {
        const uuid = await arcStore.addLore('Original');

        await arcStore.updateLoreDescription(uuid!, 'Updated');

        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.lore[0].description).to.equal('Updated');
      });
    });

    describe('deleteLore', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should delete lore from arc', async () => {
        const uuid = await arcStore.addLore('Test lore');

        const result = await arcStore.deleteLore(uuid!);

        expect(result).to.be.true;
        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.lore).to.have.length(0);
      });

      it('should return false if confirmation cancelled', async () => {
        confirmDialogStub.resolves(false);
        const uuid = await arcStore.addLore('Test lore');

        const result = await arcStore.deleteLore(uuid!);

        expect(result).to.be.false;
      });
    });

    describe('addVignette', () => {
      it('should add vignette to arc', async () => {
        const uuid = await arcStore.addVignette('Test vignette');

        expect(uuid).to.be.a('string');

        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.vignettes).to.have.length(1);
        expect(refreshed?.vignettes[0].description).to.equal('Test vignette');
      });
    });

    describe('updateVignetteDescription', () => {
      it('should update vignette description', async () => {
        const uuid = await arcStore.addVignette('Original');

        await arcStore.updateVignetteDescription(uuid!, 'Updated');

        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.vignettes[0].description).to.equal('Updated');
      });
    });

    describe('deleteVignette', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should delete vignette from arc', async () => {
        const uuid = await arcStore.addVignette('Test vignette');

        const result = await arcStore.deleteVignette(uuid!);

        expect(result).to.be.true;
        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.vignettes).to.have.length(0);
      });
    });

    describe('addIdea', () => {
      it('should add idea to arc', async () => {
        const uuid = await arcStore.addIdea('Test idea');

        expect(uuid).to.be.a('string');

        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.ideas).to.have.length(1);
        expect(refreshed?.ideas[0].text).to.equal('Test idea');
      });
    });

    describe('updateIdea', () => {
      it('should update idea text', async () => {
        const uuid = await arcStore.addIdea('Original');

        await arcStore.updateIdea(uuid!, 'Updated');

        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.ideas[0].text).to.equal('Updated');
      });
    });

    describe('deleteIdea', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should delete idea from arc', async () => {
        const uuid = await arcStore.addIdea('Test idea');

        const result = await arcStore.deleteIdea(uuid!);

        expect(result).to.be.true;
        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.ideas).to.have.length(0);
      });

      it('should return false when no current arc', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        const result = await arcStore.deleteIdea('some-uuid');

        expect(result).to.be.false;
      });
    });

    describe('reorderIdeas', () => {
      it('should reorder ideas in arc', async () => {
        const uuid1 = await arcStore.addIdea('Idea 1');
        const uuid2 = await arcStore.addIdea('Idea 2');
        const uuid3 = await arcStore.addIdea('Idea 3');

        const refreshed = await Arc.fromUuid(testArc.uuid);
        const ideas = refreshed!.ideas;

        // Reverse order
        const reordered = [ideas[2], ideas[1], ideas[0]];
        await arcStore.reorderIdeas(reordered);

        const afterReorder = await Arc.fromUuid(testArc.uuid);
        expect(afterReorder?.ideas.map(i => i.uuid)).to.deep.equal([uuid3, uuid2, uuid1]);
      });
    });

    describe('addParticipant', () => {
      it('should add participant to arc', async () => {
        const participantUuid = fakeFCBJournalEntryPageUuid();
        await arcStore.addParticipant(participantUuid, 'Test notes');

        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.participants).to.have.length(1);
        expect(refreshed?.participants[0].uuid).to.equal(participantUuid);
      });

      it('should throw when no current arc', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(arcStore.addParticipant(fakeFCBJournalEntryPageUuid())).to.be.rejectedWith('Invalid arc');
      });
    });

    describe('deleteParticipant', () => {
      let confirmDialogStub: sinon.SinonStub;
      let participantUuid: string;

      beforeEach(async () => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
        participantUuid = fakeFCBJournalEntryPageUuid();
        await arcStore.addParticipant(participantUuid);
      });

      it('should remove participant from arc', async () => {
        const result = await arcStore.deleteParticipant(participantUuid);

        expect(result).to.be.true;
        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.participants).to.have.length(0);
      });
    });

    describe('reorderParticipants', () => {
      it('should reorder participants in arc', async () => {
        const p1 = fakeFCBJournalEntryPageUuid();
        const p2 = fakeFCBJournalEntryPageUuid();
        const p3 = fakeFCBJournalEntryPageUuid();

        await arcStore.addParticipant(p1);
        await arcStore.addParticipant(p2);
        await arcStore.addParticipant(p3);

        const refreshed = await Arc.fromUuid(testArc.uuid);
        const participants = refreshed!.participants;

        // Reverse order
        const reordered = [participants[2], participants[1], participants[0]];
        await arcStore.reorderParticipants(reordered);

        const afterReorder = await Arc.fromUuid(testArc.uuid);
        expect(afterReorder?.participants.map(p => p.uuid)).to.deep.equal([p3, p2, p1]);
      });
    });

    describe('reorderStoryWebs', () => {
      it('should reorder story webs in arc', async () => {
        const sw1 = fakeUuid('JournalEntry');
        const sw2 = fakeUuid('JournalEntry');
        const sw3 = fakeUuid('JournalEntry');

        testArc.storyWebs = [sw1, sw2, sw3];
        await testArc.save();

        await mainStore.refreshArc();

        await arcStore.reorderStoryWebs([sw3, sw1, sw2]);

        const refreshed = await Arc.fromUuid(testArc.uuid);
        expect(refreshed?.storyWebs).to.deep.equal([sw3, sw1, sw2]);
      });
    });
  });
};
