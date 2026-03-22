import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { useFrontStore, useMainStore } from '@/applications/stores';
import { Campaign, Entry, Front, WindowTab } from '@/classes';
import { Topics, WindowTabType } from '@/types';
import { getTestSetting } from '@unittest/testUtils';
import { createTabPanelState } from '@/composables/useTabPanelState';

export const registerFrontStoreTests = (context: QuenchBatchContext) => {
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

  describe('useFrontStore', () => {
    let frontStore: ReturnType<typeof useFrontStore>;
    let mainStore: ReturnType<typeof useMainStore>;
    let sandbox: sinon.SinonSandbox;
    let testSetting: Awaited<ReturnType<typeof getTestSetting>>;
    let testCampaign: Campaign;
    let testFront: Front;
    let testEntry: Entry;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());

      // Create the stores after pinia is set
      frontStore = useFrontStore();
      mainStore = useMainStore();

      // Get the shared test setting
      testSetting = getTestSetting();

      // Create test data
      testCampaign = (await Campaign.create(testSetting, 'Test Campaign'))!;
      testFront = (await Front.create(testCampaign, 'Test Front'))!;

      // Add a danger to the front for testing
      testFront.dangers = [
        {
          uuid: foundry.utils.randomID(),
          name: 'Test Danger',
          description: 'A test danger',
          grimPortents: [],
          participants: [],
        },
      ];
      await testFront.save();

      // Create a test entry for participant tests
      testEntry = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
        name: 'Test Character',
      }))!;

      // Set up the main store with the front
      const panelState = createTabPanelState(0);
      mainStore.setFocusedPanel(panelState);

      // Set the setting and front
      await mainStore.setNewSetting(testSetting.uuid);
      const tab = createTestTab(testFront.uuid, WindowTabType.Front);
      await mainStore.setNewTab(tab);
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('addParticipant', () => {
      it('should add participant to danger', async () => {
        const result = await frontStore.addParticipant(0, testEntry, { role: 'Villain' });

        expect(result).to.equal(testEntry.uuid);

        // Verify participant was added
        const refreshedFront = await Front.fromUuid(testFront.uuid);
        expect(refreshedFront?.dangers[0].participants).to.have.length(1);
        expect(refreshedFront?.dangers[0].participants[0].uuid).to.equal(testEntry.uuid);
        expect(refreshedFront?.dangers[0].participants[0].role).to.equal('Villain');
      });

      it('should return null when no current front', async () => {
        // Clear the current front
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        const result = await frontStore.addParticipant(0, testEntry, { role: 'Villain' });

        expect(result).to.be.null;
      });

      it('should return null for invalid danger index', async () => {
        const result = await frontStore.addParticipant(999, testEntry, { role: 'Villain' });

        expect(result).to.be.null;
      });

      it('should prevent duplicate participants', async () => {
        // Add participant first
        await frontStore.addParticipant(0, testEntry, { role: 'Villain' });

        // Try to add again
        const result = await frontStore.addParticipant(0, testEntry, { role: 'Hero' });

        expect(result).to.be.null;

        // Verify only one participant exists
        const refreshedFront = await Front.fromUuid(testFront.uuid);
        expect(refreshedFront?.dangers[0].participants).to.have.length(1);
      });

      it('should use empty string for missing role', async () => {
        await frontStore.addParticipant(0, testEntry, {});

        const refreshedFront = await Front.fromUuid(testFront.uuid);
        expect(refreshedFront?.dangers[0].participants[0].role).to.equal('');
      });
    });

    describe('deleteParticipant', () => {
      it('should remove participant from danger', async () => {
        // Add participant first
        await frontStore.addParticipant(0, testEntry, { role: 'Villain' });

        // Delete it
        const result = await frontStore.deleteParticipant(0, testEntry.uuid);

        expect(result).to.be.true;

        // Verify participant was removed
        const refreshedFront = await Front.fromUuid(testFront.uuid);
        expect(refreshedFront?.dangers[0].participants).to.have.length(0);
      });

      it('should return false when no current front', async () => {
        // Clear the current front
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        const result = await frontStore.deleteParticipant(0, testEntry.uuid);

        expect(result).to.be.false;
      });

      it('should return false for invalid danger index', async () => {
        const result = await frontStore.deleteParticipant(999, testEntry.uuid);

        expect(result).to.be.false;
      });
    });

    describe('updateParticipant', () => {
      it('should update participant role', async () => {
        // Add participant first
        await frontStore.addParticipant(0, testEntry, { role: 'Villain' });

        // Update role
        await frontStore.updateParticipant(0, testEntry.uuid, 'Redeemed Hero');

        // Verify role was updated
        const refreshedFront = await Front.fromUuid(testFront.uuid);
        expect(refreshedFront?.dangers[0].participants[0].role).to.equal('Redeemed Hero');
      });

      it('should do nothing when no current front', async () => {
        // Clear the current front
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        // Should not throw
        await expect(frontStore.updateParticipant(0, testEntry.uuid, 'Role')).to.be.fulfilled;
      });

      it('should do nothing for invalid danger index', async () => {
        // Should not throw
        await expect(frontStore.updateParticipant(999, testEntry.uuid, 'Role')).to.be.fulfilled;
      });
    });

    describe('addGrimPortent', () => {
      it('should add grim portent to danger', async () => {
        const result = await frontStore.addGrimPortent(0, 'The sky darkens');

        expect(result).to.be.a('string');

        // Verify portent was added
        const refreshedFront = await Front.fromUuid(testFront.uuid);
        expect(refreshedFront?.dangers[0].grimPortents).to.have.length(1);
        expect(refreshedFront?.dangers[0].grimPortents[0].description).to.equal('The sky darkens');
        expect(refreshedFront?.dangers[0].grimPortents[0].complete).to.be.false;
      });

      it('should return null when no current front', async () => {
        // Clear the current front
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        const result = await frontStore.addGrimPortent(0, 'Test');

        expect(result).to.be.null;
      });

      it('should return null for invalid danger index', async () => {
        const result = await frontStore.addGrimPortent(999, 'Test');

        expect(result).to.be.null;
      });

      it('should use empty string for missing description', async () => {
        const result = await frontStore.addGrimPortent(0);

        expect(result).to.be.a('string');

        const refreshedFront = await Front.fromUuid(testFront.uuid);
        expect(refreshedFront?.dangers[0].grimPortents[0].description).to.equal('');
      });
    });

    describe('deleteGrimPortent', () => {
      it('should remove grim portent from danger', async () => {
        // Add portent first
        const portentUuid = await frontStore.addGrimPortent(0, 'Test portent');

        // Delete it
        const result = await frontStore.deleteGrimPortent(0, portentUuid!);

        expect(result).to.be.true;

        // Verify portent was removed
        const refreshedFront = await Front.fromUuid(testFront.uuid);
        expect(refreshedFront?.dangers[0].grimPortents).to.have.length(0);
      });

      it('should return false when no current front', async () => {
        // Clear the current front
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        const result = await frontStore.deleteGrimPortent(0, 'some-uuid');

        expect(result).to.be.false;
      });

      it('should return false for invalid danger index', async () => {
        const result = await frontStore.deleteGrimPortent(999, 'some-uuid');

        expect(result).to.be.false;
      });
    });

    describe('updateGrimPortent', () => {
      it('should update grim portent', async () => {
        // Add portent first
        const portentUuid = await frontStore.addGrimPortent(0, 'Test portent');

        // Update it
        await frontStore.updateGrimPortent(0, portentUuid!, 'Updated description', true);

        // Verify update
        const refreshedFront = await Front.fromUuid(testFront.uuid);
        expect(refreshedFront?.dangers[0].grimPortents[0].description).to.equal('Updated description');
        expect(refreshedFront?.dangers[0].grimPortents[0].complete).to.be.true;
      });

      it('should do nothing when no current front', async () => {
        // Clear the current front
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        // Should not throw
        await expect(frontStore.updateGrimPortent(0, 'uuid', 'desc', false)).to.be.fulfilled;
      });

      it('should do nothing for invalid danger index', async () => {
        // Should not throw
        await expect(frontStore.updateGrimPortent(999, 'uuid', 'desc', false)).to.be.fulfilled;
      });
    });

    describe('reorderGrimPortents', () => {
      it('should reorder grim portents', async () => {
        // Add multiple portents
        const uuid1 = await frontStore.addGrimPortent(0, 'First');
        const uuid2 = await frontStore.addGrimPortent(0, 'Second');
        const uuid3 = await frontStore.addGrimPortent(0, 'Third');

        // Get current order
        let refreshedFront = await Front.fromUuid(testFront.uuid);
        const originalOrder = refreshedFront?.dangers[0].grimPortents.map(p => p.uuid);

        // Reverse the order
        const reordered = [...refreshedFront!.dangers[0].grimPortents].reverse();
        await frontStore.reorderGrimPortents(0, reordered);

        // Verify new order
        refreshedFront = await Front.fromUuid(testFront.uuid);
        const newOrder = refreshedFront?.dangers[0].grimPortents.map(p => p.uuid);

        expect(newOrder).to.deep.equal([uuid3, uuid2, uuid1]);
        expect(newOrder).to.not.deep.equal(originalOrder);
      });

      it('should do nothing when no current front', async () => {
        // Clear the current front
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        // Should not throw
        await expect(frontStore.reorderGrimPortents(0, [])).to.be.fulfilled;
      });
    });

    describe('reorderParticipants', () => {
      it('should reorder participants', async () => {
        // Create additional entries
        const entry2 = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Character 2',
        }))!;
        const entry3 = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Character 3',
        }))!;

        // Add multiple participants
        await frontStore.addParticipant(0, testEntry, { role: 'First' });
        await frontStore.addParticipant(0, entry2, { role: 'Second' });
        await frontStore.addParticipant(0, entry3, { role: 'Third' });

        // Get current order
        let refreshedFront = await Front.fromUuid(testFront.uuid);
        const originalOrder = refreshedFront?.dangers[0].participants.map(p => p.uuid);

        // Reverse the order
        const reordered = [...refreshedFront!.dangers[0].participants].reverse();
        await frontStore.reorderParticipants(0, reordered);

        // Verify new order
        refreshedFront = await Front.fromUuid(testFront.uuid);
        const newOrder = refreshedFront?.dangers[0].participants.map(p => p.uuid);

        expect(newOrder).to.deep.equal([entry3.uuid, entry2.uuid, testEntry.uuid]);
        expect(newOrder).to.not.deep.equal(originalOrder);
      });

      it('should do nothing when no current front', async () => {
        // Clear the current front
        await mainStore.setNewTab(createTestTab(testSetting.uuid, WindowTabType.Setting));

        // Should not throw
        await expect(frontStore.reorderParticipants(0, [])).to.be.fulfilled;
      });
    });
  });
};
