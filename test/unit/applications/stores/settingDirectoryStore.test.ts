import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingDirectoryStore, useMainStore, useNavigationStore } from '@/applications/stores';
import { Entry, FCBSetting, WindowTab } from '@/classes';
import { Topics } from '@/types';
import { getTestSetting } from '@unittest/testUtils';
import { createTabPanelState } from '@/composables/useTabPanelState';
import { WindowTabType } from '@/types';
import { FCBDialog } from '@/dialogs';
import { ModuleSettings, SettingKey } from '@/settings';

export const registerSettingDirectoryStoreTests = (context: QuenchBatchContext) => {
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

  describe('useSettingDirectoryStore', () => {
    let settingDirectoryStore: ReturnType<typeof useSettingDirectoryStore>;
    let mainStore: ReturnType<typeof useMainStore>;
    let navigationStore: ReturnType<typeof useNavigationStore>;
    let sandbox: sinon.SinonSandbox;
    let testSetting: Awaited<ReturnType<typeof getTestSetting>>;
    let testEntry: Entry;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());

      // Create the stores after pinia is set
      settingDirectoryStore = useSettingDirectoryStore();
      mainStore = useMainStore();
      navigationStore = useNavigationStore();

      // Get the shared test setting
      testSetting = getTestSetting();

      // Create a test entry
      testEntry = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
        name: 'Test Character',
      }))!;

      // Set up the main store with panel state
      const panelState = createTabPanelState(0);
      mainStore.setFocusedPanel(panelState);

      // Set the setting
      await mainStore.setNewSetting(testSetting.uuid);

      // Refresh the directory tree
      await settingDirectoryStore.refreshSettingDirectoryTree();
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('currentSettingTree', () => {
      it('should contain setting after refresh', async () => {
        expect(settingDirectoryStore.currentSettingTree.value).to.have.length(1);
        expect(settingDirectoryStore.currentSettingTree.value[0].id).to.equal(testSetting.settingId);
      });

      it('should be empty when no setting', async () => {
        await mainStore.setNewSetting(null);

        expect(settingDirectoryStore.currentSettingTree.value).to.have.length(0);
      });
    });

    describe('isSettingTreeRefreshing', () => {
      it('should be false initially', () => {
        expect(settingDirectoryStore.isSettingTreeRefreshing).to.be.false;
      });
    });

    describe('isGroupedByType', () => {
      it('should be a boolean', () => {
        expect(typeof settingDirectoryStore.isGroupedByType).to.equal('boolean');
      });
    });

    describe('filterText', () => {
      it('should be empty string initially', () => {
        expect(settingDirectoryStore.filterText).to.equal('');
      });
    });

    describe('createEntry', () => {
      it('should create a new entry in topic folder', async () => {
        const entry = await settingDirectoryStore.createEntry(
          testSetting.topicFolders[Topics.Character]!,
          { name: 'New Character' }
        );

        expect(entry).to.not.be.null;
        expect(entry?.name).to.equal('New Character');

        // Verify it's in the hierarchy
        const hierarchy = testSetting.getEntryHierarchy(entry!.uuid);
        expect(hierarchy).to.not.be.undefined;
      });

      it('should return null when no setting', async () => {
        await mainStore.setNewSetting(null);

        const entry = await settingDirectoryStore.createEntry(
          testSetting.topicFolders[Topics.Character]!,
          { name: 'New Character' }
        );

        expect(entry).to.be.null;
      });

      it('should add entry as top node when no parent', async () => {
        const entry = await settingDirectoryStore.createEntry(
          testSetting.topicFolders[Topics.Location]!,
          { name: 'New Location' }
        );

        expect(entry).to.not.be.null;
        expect(testSetting.topicFolders[Topics.Location]!.topNodes).to.include(entry!.uuid);
      });
    });

    describe('deleteEntry', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should delete entry and return true', async () => {
        const entry = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'To Delete',
        }))!;

        const result = await settingDirectoryStore.deleteEntry(entry.uuid);

        expect(result).to.be.true;

        // Verify it's gone
        const refreshed = await Entry.fromUuid(entry.uuid);
        expect(refreshed).to.be.null;
      });

      it('should return false if confirmation cancelled', async () => {
        confirmDialogStub.resolves(false);

        const result = await settingDirectoryStore.deleteEntry(testEntry.uuid);

        expect(result).to.be.false;
      });

      it('should return false when no setting', async () => {
        await mainStore.setNewSetting(null);

        const result = await settingDirectoryStore.deleteEntry(testEntry.uuid);

        expect(result).to.be.false;
      });
    });

    describe('setNodeParent', () => {
      it('should set parent for entry in hierarchical topic', async () => {
        const parent = (await Entry.create(testSetting.topicFolders[Topics.Location]!, {
          name: 'Parent Location',
        }))!;
        const child = (await Entry.create(testSetting.topicFolders[Topics.Location]!, {
          name: 'Child Location',
        }))!;

        const result = await settingDirectoryStore.setNodeParent(
          testSetting.topicFolders[Topics.Location]!,
          child.uuid,
          parent.uuid
        );

        expect(result).to.be.true;

        // Verify hierarchy updated
        const hierarchy = testSetting.getEntryHierarchy(child.uuid);
        expect(hierarchy?.parentId).to.equal(parent.uuid);
        expect(hierarchy?.ancestors).to.include(parent.uuid);
      });

      it('should return false when no setting', async () => {
        await mainStore.setNewSetting(null);

        const result = await settingDirectoryStore.setNodeParent(
          testSetting.topicFolders[Topics.Location]!,
          testEntry.uuid,
          null
        );

        expect(result).to.be.false;
      });

      it('should return false for non-hierarchical topic', async () => {
        const result = await settingDirectoryStore.setNodeParent(
          testSetting.topicFolders[Topics.Character]!,
          testEntry.uuid,
          null
        );

        expect(result).to.be.false;
      });

      it('should return false when child does not exist', async () => {
        const result = await settingDirectoryStore.setNodeParent(
          testSetting.topicFolders[Topics.Location]!,
          'non-existent-uuid',
          null
        );

        expect(result).to.be.false;
      });

      it('should prevent circular references', async () => {
        const parent = (await Entry.create(testSetting.topicFolders[Topics.Location]!, {
          name: 'Parent',
        }))!;
        const child = (await Entry.create(testSetting.topicFolders[Topics.Location]!, {
          name: 'Child',
        }))!;

        // Set parent relationship
        await settingDirectoryStore.setNodeParent(
          testSetting.topicFolders[Topics.Location]!,
          child.uuid,
          parent.uuid
        );

        // Try to make parent a child of its own child (should fail)
        const result = await settingDirectoryStore.setNodeParent(
          testSetting.topicFolders[Topics.Location]!,
          parent.uuid,
          child.uuid
        );

        expect(result).to.be.false;
      });
    });

    describe('updateEntryType', () => {
      it('should update entry type in hierarchy', async () => {
        const entry = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test',
          type: 'NPC',
        }))!;

        // Change type
        entry.type = 'Villain';
        await entry.save();

        await settingDirectoryStore.updateEntryType(entry, 'NPC');

        const hierarchy = testSetting.getEntryHierarchy(entry.uuid);
        expect(hierarchy?.type).to.equal('Villain');
      });

      it('should do nothing when type unchanged', async () => {
        const entry = (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test',
          type: 'NPC',
        }))!;

        await settingDirectoryStore.updateEntryType(entry, 'NPC');

        // Should not throw - just return early
      });

      it('should do nothing when no setting', async () => {
        await mainStore.setNewSetting(null);

        // Should not throw
        await settingDirectoryStore.updateEntryType(testEntry, 'SomeType');
      });
    });

    describe('collapseAll', () => {
      it('should collapse all expanded nodes', async () => {
        // Expand a topic first
        const topicNode = settingDirectoryStore.currentSettingTree.value[0]?.topicNodes[0];
        if (topicNode) {
          topicNode.expanded = true;
          testSetting.expandedIds[topicNode.id] = true;
          await testSetting.save();
        }

        await settingDirectoryStore.collapseAll();

        // Verify all are collapsed
        const expandedIds = Object.keys(testSetting.expandedIds);
        expect(expandedIds).to.have.length(0);
      });

      it('should do nothing when no setting', async () => {
        await mainStore.setNewSetting(null);

        // Should not throw
        await settingDirectoryStore.collapseAll();
      });
    });

    describe('refreshSettingDirectoryTree', () => {
      it('should populate the tree', async () => {
        await settingDirectoryStore.refreshSettingDirectoryTree();

        expect(settingDirectoryStore.currentSettingTree.value.length).to.equal(1);
      });

      it('should do nothing when no setting', async () => {
        await mainStore.setNewSetting(null);

        // Should not throw
        await settingDirectoryStore.refreshSettingDirectoryTree();

        expect(settingDirectoryStore.currentSettingTree.value).to.have.length(0);
      });
    });

    describe('toggleWithLoad', () => {
      it('should toggle node expansion', async () => {
        const topicNode = settingDirectoryStore.currentSettingTree.value[0]?.topicNodes[0];
        if (!topicNode) {
          return; // Skip if no topic nodes
        }

        const result = await settingDirectoryStore.toggleWithLoad(topicNode, true);

        expect(result.expanded).to.be.true;
      });
    });

    describe('toggleTopic', () => {
      it('should toggle topic expansion', async () => {
        const topicNode = settingDirectoryStore.currentSettingTree.value[0]?.topicNodes[0];
        if (!topicNode) {
          return; // Skip if no topic nodes
        }

        const initialExpanded = topicNode.expanded;

        await settingDirectoryStore.toggleTopic(topicNode);

        // The expansion should have changed
        expect(topicNode.expanded).to.equal(!initialExpanded);
      });
    });
  });
};
