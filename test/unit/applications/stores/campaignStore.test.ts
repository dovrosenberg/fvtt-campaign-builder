import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { useCampaignStore, useMainStore } from '@/applications/stores';
import { Campaign, Session, Arc, Entry, WindowTab } from '@/classes';
import { Topics, ToDoTypes, CampaignPC } from '@/types';
import { getTestSetting, fakeUuid } from '@unittest/testUtils';
import { createTabPanelState } from '@/composables/useTabPanelState';
import { WindowTabType } from '@/types';
import { FCBDialog } from '@/dialogs';

export const registerCampaignStoreTests = (context: QuenchBatchContext) => {
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

  describe('useCampaignStore', () => {
    let campaignStore: ReturnType<typeof useCampaignStore>;
    let mainStore: ReturnType<typeof useMainStore>;
    let sandbox: sinon.SinonSandbox;
    let testSetting: Awaited<ReturnType<typeof getTestSetting>>;
    let testCampaign: Campaign;
    let testSession: Session;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());

      // Create the stores after pinia is set
      campaignStore = useCampaignStore();
      mainStore = useMainStore();

      // Get the shared test setting
      testSetting = getTestSetting();

      // Create test data
      testCampaign = (await Campaign.create(testSetting, 'Test Campaign'))!;
      testSession = (await Session.create(testCampaign, 'Test Session'))!;

      // Set up the main store with panel state
      const panelState = createTabPanelState(0);
      mainStore.setFocusedPanel(panelState);

      // Set the setting
      await mainStore.setNewSetting(testSetting.uuid);

      // Set campaign as current content
      const tab = createTestTab(testCampaign.uuid, WindowTabType.Campaign);
      await mainStore.setNewTab(tab);
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('extraFields', () => {
      it('should have empty array for None type', () => {
        expect(campaignStore.extraFields[0]).to.have.length(0);
      });

      it('should have empty array for PC type', () => {
        expect(campaignStore.extraFields[1]).to.have.length(0);
      });

      it('should have description field for Lore type', () => {
        const fields = campaignStore.extraFields[2]; // CampaignTableTypes.Lore
        expect(fields).to.have.length(1);
        expect(fields[0].field).to.equal('description');
      });

      it('should have fields for ToDo type', () => {
        const fields = campaignStore.extraFields[4]; // CampaignTableTypes.ToDo
        expect(fields).to.have.length(3);
        expect(fields.map(f => f.field)).to.deep.equal(['lastTouched', 'entry', 'text']);
      });
    });

    describe('availableCampaigns', () => {
      it('should return campaigns from current setting', () => {
        const campaigns = campaignStore.availableCampaigns;

        expect(campaigns.some(c => c.uuid === testCampaign.uuid)).to.be.true;
      });

      it('should return empty array when no setting', async () => {
        await mainStore.setNewSetting(null);

        expect(campaignStore.availableCampaigns).to.have.length(0);
      });
    });

    describe('addPC', () => {
      it('should add PC to campaign', async () => {
        const pc: CampaignPC = {
          uuid: 'actor-123',
          name: 'Test PC',
        };

        await campaignStore.addPC(pc);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.pcs).to.have.length(1);
        expect(refreshed?.pcs[0].uuid).to.equal('actor-123');
      });

      it('should do nothing when no campaign', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        const pc: CampaignPC = { uuid: 'actor-123', name: 'Test PC' };
        await campaignStore.addPC(pc);

        // Should not throw and no PC added
        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.pcs).to.have.length(0);
      });
    });

    describe('deletePC', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should remove PC from campaign', async () => {
        // Add PC first
        const pc: CampaignPC = { uuid: 'actor-123', name: 'Test PC' };
        await campaignStore.addPC(pc);

        // Delete it
        await campaignStore.deletePC('actor-123');

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.pcs).to.have.length(0);
      });

      it('should show confirmation dialog', async () => {
        const pc: CampaignPC = { uuid: 'actor-123', name: 'Test PC' };
        await campaignStore.addPC(pc);

        await campaignStore.deletePC('actor-123');

        expect(confirmDialogStub.called).to.be.true;
      });

      it('should not delete if confirmation cancelled', async () => {
        confirmDialogStub.resolves(false);

        const pc: CampaignPC = { uuid: 'actor-123', name: 'Test PC' };
        await campaignStore.addPC(pc);

        await campaignStore.deletePC('actor-123');

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.pcs).to.have.length(1);
      });
    });

    describe('reorderPCs', () => {
      it('should reorder PCs in campaign', async () => {
        const pc1: CampaignPC = { uuid: 'pc-1', name: 'PC 1' };
        const pc2: CampaignPC = { uuid: 'pc-2', name: 'PC 2' };
        const pc3: CampaignPC = { uuid: 'pc-3', name: 'PC 3' };

        await campaignStore.addPC(pc1);
        await campaignStore.addPC(pc2);
        await campaignStore.addPC(pc3);

        // Reverse order
        await campaignStore.reorderPCs([pc3, pc2, pc1]);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.pcs.map(p => p.uuid)).to.deep.equal(['pc-3', 'pc-2', 'pc-1']);
      });
    });

    describe('reorderStoryWebs', () => {
      it('should reorder story webs in campaign', async () => {
        const sw1 = fakeUuid('JournalEntry');
        const sw2 = fakeUuid('JournalEntry');
        const sw3 = fakeUuid('JournalEntry');

        testCampaign.storyWebs = [sw1, sw2, sw3];
        await testCampaign.save();

        await mainStore.refreshCampaign();

        await campaignStore.reorderStoryWebs([sw3, sw1, sw2]);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.storyWebs).to.deep.equal([sw3, sw1, sw2]);
      });
    });

    describe('addLore', () => {
      it('should add lore to campaign', async () => {
        const uuid = await campaignStore.addLore('Test lore');

        expect(uuid).to.be.a('string');

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.lore).to.have.length(1);
        expect(refreshed?.lore[0].description).to.equal('Test lore');
      });

      it('should throw when no campaign', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(campaignStore.addLore('Test')).to.be.rejectedWith('Invalid campaign');
      });
    });

    describe('updateLoreDescription', () => {
      it('should update lore description', async () => {
        const uuid = await campaignStore.addLore('Original');

        await campaignStore.updateLoreDescription(uuid!, 'Updated', null);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.lore[0].description).to.equal('Updated');
      });

      it('should update session-level lore', async () => {
        const sessionUuid = testSession.uuid;
        const uuid = await testSession.addLore('Session lore');

        await campaignStore.updateLoreDescription(uuid, 'Updated session lore', sessionUuid);

        const refreshedSession = await Session.fromUuid(sessionUuid);
        expect(refreshedSession?.lore[0].description).to.equal('Updated session lore');
      });
    });

    describe('deleteLore', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should delete lore from campaign', async () => {
        const uuid = await campaignStore.addLore('Test lore');

        await campaignStore.deleteLore(uuid!, null);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.lore).to.have.length(0);
      });

      it('should not delete if confirmation cancelled', async () => {
        confirmDialogStub.resolves(false);

        const uuid = await campaignStore.addLore('Test lore');

        await campaignStore.deleteLore(uuid!, null);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.lore).to.have.length(1);
      });
    });

    describe('markLoreDelivered', () => {
      it('should mark lore as delivered', async () => {
        const uuid = await campaignStore.addLore('Test lore');

        await campaignStore.markLoreDelivered(uuid!, true, null);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.lore[0].delivered).to.be.true;
      });

      it('should mark lore as not delivered', async () => {
        const uuid = await campaignStore.addLore('Test lore');
        await campaignStore.markLoreDelivered(uuid!, true, null);

        await campaignStore.markLoreDelivered(uuid!, false, null);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.lore[0].delivered).to.be.false;
      });
    });

    describe('addToDoItem', () => {
      it('should add to-do item to campaign', async () => {
        const result = await campaignStore.addToDoItem(ToDoTypes.Manual, 'Test to-do');

        expect(result).to.not.be.null;

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.toDoItems).to.have.length(1);
        expect(refreshed?.toDoItems[0].text).to.equal('Test to-do');
      });

      it('should return null when no campaign', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        const result = await campaignStore.addToDoItem(ToDoTypes.Manual, 'Test');

        expect(result).to.be.null;
      });
    });

    describe('mergeToDoItem', () => {
      it('should merge to-do item into campaign', async () => {
        await campaignStore.mergeToDoItem(ToDoTypes.Manual, 'Merged to-do');

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.toDoItems).to.have.length(1);
      });
    });

    describe('updateToDoItem', () => {
      it('should update to-do item description', async () => {
        const item = await campaignStore.addToDoItem(ToDoTypes.Manual, 'Original');

        await campaignStore.updateToDoItem(item!.uuid, 'Updated');

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.toDoItems[0].text).to.equal('Updated');
      });
    });

    describe('completeToDoItem', () => {
      it('should complete (remove) to-do item', async () => {
        const item = await campaignStore.addToDoItem(ToDoTypes.Manual, 'Test to-do');

        await campaignStore.completeToDoItem(item!.uuid);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.toDoItems).to.have.length(0);
      });
    });

    describe('addIdea', () => {
      it('should add idea to campaign', async () => {
        const uuid = await campaignStore.addIdea('Test idea');

        expect(uuid).to.be.a('string');

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.ideas).to.have.length(1);
        expect(refreshed?.ideas[0].text).to.equal('Test idea');
      });

      it('should throw when no campaign', async () => {
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        await expect(campaignStore.addIdea('Test')).to.be.rejectedWith('Invalid campaign');
      });
    });

    describe('updateIdea', () => {
      it('should update idea text', async () => {
        const uuid = await campaignStore.addIdea('Original idea');

        await campaignStore.updateIdea(uuid!, 'Updated idea');

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.ideas[0].text).to.equal('Updated idea');
      });
    });

    describe('deleteIdea', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should delete idea from campaign', async () => {
        const uuid = await campaignStore.addIdea('Test idea');

        await campaignStore.deleteIdea(uuid!);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.ideas).to.have.length(0);
      });

      it('should not delete if confirmation cancelled', async () => {
        confirmDialogStub.resolves(false);

        const uuid = await campaignStore.addIdea('Test idea');

        await campaignStore.deleteIdea(uuid!);

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        expect(refreshed?.ideas).to.have.length(1);
      });
    });

    describe('reorderIdeas', () => {
      it('should reorder ideas in campaign', async () => {
        const uuid1 = await campaignStore.addIdea('Idea 1');
        const uuid2 = await campaignStore.addIdea('Idea 2');
        const uuid3 = await campaignStore.addIdea('Idea 3');

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        const ideas = refreshed!.ideas;

        // Reverse order
        const reordered = [ideas[2], ideas[1], ideas[0]];
        await campaignStore.reorderIdeas(reordered);

        const afterReorder = await Campaign.fromUuid(testCampaign.uuid);
        expect(afterReorder?.ideas.map(i => i.uuid)).to.deep.equal([uuid3, uuid2, uuid1]);
      });
    });

    describe('reorderToDos', () => {
      it('should reorder to-do items in campaign', async () => {
        const item1 = await campaignStore.addToDoItem(ToDoTypes.Manual, 'To-do 1');
        const item2 = await campaignStore.addToDoItem(ToDoTypes.Manual, 'To-do 2');
        const item3 = await campaignStore.addToDoItem(ToDoTypes.Manual, 'To-do 3');

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        const todos = refreshed!.toDoItems;

        // Reverse order
        const reordered = [todos[2], todos[1], todos[0]];
        await campaignStore.reorderToDos(reordered);

        const afterReorder = await Campaign.fromUuid(testCampaign.uuid);
        expect(afterReorder?.toDoItems.map(t => t.uuid)).to.deep.equal([item3?.uuid, item2?.uuid, item1?.uuid]);
      });
    });

    describe('reorderAvailableLore', () => {
      it('should reorder available lore in campaign', async () => {
        const uuid1 = await campaignStore.addLore('Lore 1');
        const uuid2 = await campaignStore.addLore('Lore 2');
        const uuid3 = await campaignStore.addLore('Lore 3');

        const refreshed = await Campaign.fromUuid(testCampaign.uuid);
        const lore = refreshed!.lore.map(l => ({
          uuid: l.uuid,
          description: l.description,
          delivered: l.delivered,
          significant: l.significant,
          lockedToSessionId: null,
          lockedToSessionName: null,
        }));

        // Reverse order
        const reordered = [lore[2], lore[1], lore[0]];
        await campaignStore.reorderAvailableLore(reordered);

        const afterReorder = await Campaign.fromUuid(testCampaign.uuid);
        expect(afterReorder?.lore.map(l => l.uuid)).to.deep.equal([uuid3, uuid2, uuid1]);
      });
    });
  });
};
