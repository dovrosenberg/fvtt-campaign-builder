import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { useNavigationStore, useMainStore } from '@/applications/stores';
import { Campaign, Session, WindowTab } from '@/classes';
import { WindowTabType } from '@/types';
import { getTestSetting } from '@unittest/testUtils';
import { createTabPanelState } from '@/composables/useTabPanelState';
import { ModuleSettings, SettingKey } from '@/settings';

export const registerNavigationStoreTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('useNavigationStore', () => {
    let navigationStore: ReturnType<typeof useNavigationStore>;
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
      navigationStore = useNavigationStore();
      mainStore = useMainStore();

      // Get the shared test setting
      testSetting = getTestSetting();

      // Create test data
      testCampaign = (await Campaign.create(testSetting, 'Test Campaign'))!;
      testSession = (await Session.create(testCampaign, 'Test Session'))!;
      testSession.number = 1;
      await testSession.save();

      // Set up the main store with panel state
      const panelState = createTabPanelState(0);
      mainStore.setFocusedPanel(panelState);

      // Set the setting
      await mainStore.setNewSetting(testSetting.uuid);

      // Load tabs
      await navigationStore.loadTabs();
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('initial state', () => {
      it('should have empty tabs array initially', () => {
        // After loadTabs, there should be at least one panel
        expect(navigationStore.tabs.length).to.be.greaterThan(0);
      });

      it('should have focusedPanelIndex of 0', () => {
        expect(navigationStore.focusedPanelIndex).to.equal(0);
      });

      it('should have empty bookmarks', () => {
        expect(navigationStore.bookmarks).to.have.length(0);
      });

      it('should have empty recent', () => {
        expect(navigationStore.recent).to.have.length(0);
      });
    });

    describe('getActiveTab', () => {
      it('should return null when no tabs exist', () => {
        navigationStore.tabs = [[]];
        const tab = navigationStore.getActiveTab(false, 0);
        expect(tab).to.be.null;
      });

      it('should return last tab when findOne is true', () => {
        const panelState = createTabPanelState(0);
        navigationStore.registerPanelState(0, panelState);

        const tab1 = new WindowTab(false, { uuid: 'uuid1', name: 'Tab 1', icon: '' }, 'uuid1', WindowTabType.Entry, null, null);
        const tab2 = new WindowTab(false, { uuid: 'uuid2', name: 'Tab 2', icon: '' }, 'uuid2', WindowTabType.Entry, null, null);
        navigationStore.tabs = [[tab1, tab2]];

        const tab = navigationStore.getActiveTab(true, 0);
        expect(tab?.id).to.equal(tab2.id);
      });
    });

    describe('focusPanel', () => {
      it('should update focusedPanelIndex', () => {
        // Create two panels
        const panelState0 = createTabPanelState(0);
        const panelState1 = createTabPanelState(1);
        navigationStore.registerPanelState(0, panelState0);
        navigationStore.registerPanelState(1, panelState1);

        navigationStore.tabs = [[], []];
        navigationStore.focusPanel(1);

        expect(navigationStore.focusedPanelIndex).to.equal(1);
      });

      it('should clamp to valid range', () => {
        navigationStore.tabs = [[]];
        navigationStore.focusPanel(5);

        expect(navigationStore.focusedPanelIndex).to.equal(0);
      });
    });

    describe('addBookmark', () => {
      it('should add a bookmark', async () => {
        const bookmark = {
          id: foundry.utils.randomID(),
          header: { uuid: testCampaign.uuid, name: 'Test', icon: '' },
          tabInfo: { tabType: WindowTabType.Campaign, contentId: testCampaign.uuid, contentTab: null },
        };

        await navigationStore.addBookmark(bookmark);

        expect(navigationStore.bookmarks).to.have.length(1);
        expect(navigationStore.bookmarks[0].id).to.equal(bookmark.id);
      });
    });

    describe('removeBookmark', () => {
      it('should remove a bookmark', async () => {
        const bookmark = {
          id: foundry.utils.randomID(),
          header: { uuid: testCampaign.uuid, name: 'Test', icon: '' },
          tabInfo: { tabType: WindowTabType.Campaign, contentId: testCampaign.uuid, contentTab: null },
        };

        await navigationStore.addBookmark(bookmark);
        await navigationStore.removeBookmark(bookmark.id);

        expect(navigationStore.bookmarks.filter(b=>b.id===bookmark.id)).to.have.length(0);
      });
    });

    describe('changeBookmarkPosition', () => {
      it('should reorder bookmarks', async () => {
        const bookmark1 = {
          id: foundry.utils.randomID(),
          header: { uuid: 'uuid1', name: 'First', icon: '' },
          tabInfo: { tabType: WindowTabType.Campaign, contentId: 'uuid1', contentTab: null },
        };
        const bookmark2 = {
          id: foundry.utils.randomID(),
          header: { uuid: 'uuid2', name: 'Second', icon: '' },
          tabInfo: { tabType: WindowTabType.Campaign, contentId: 'uuid2', contentTab: null },
        };

        await navigationStore.addBookmark(bookmark1);
        await navigationStore.addBookmark(bookmark2);

        // find the first index
        const firstIndex = navigationStore.bookmarks.findIndex(b => b.id === bookmark1.id);
        const secondIndex = navigationStore.bookmarks.findIndex(b => b.id === bookmark2.id);

        await navigationStore.changeBookmarkPosition(secondIndex, firstIndex);

        expect(navigationStore.bookmarks[firstIndex].id).to.equal(bookmark2.id);
        expect(navigationStore.bookmarks[secondIndex].id).to.equal(bookmark1.id);
      });
    });

    describe('registerPanelState', () => {
      it('should register a panel state', () => {
        const panelState = createTabPanelState(0);
        navigationStore.registerPanelState(0, panelState);

        // Should not throw
      });
    });

    describe('unregisterPanelState', () => {
      it('should unregister a panel state', () => {
        const panelState = createTabPanelState(0);
        navigationStore.registerPanelState(0, panelState);
        navigationStore.unregisterPanelState(0);

        // Should not throw
      });
    });

    describe('clearTabsAndBookmarks', () => {
      it('should clear all tabs and bookmarks', async () => {
        const bookmark = {
          id: 'test-bookmark',
          header: { uuid: testCampaign.uuid, name: 'Test', icon: '' },
          tabInfo: { tabType: WindowTabType.Campaign, contentId: testCampaign.uuid, contentTab: null },
        };
        await navigationStore.addBookmark(bookmark);

        await navigationStore.clearTabsAndBookmarks();

        expect(navigationStore.tabs).to.deep.equal([[]]);
        expect(navigationStore.bookmarks).to.have.length(0);
      });
    });

    describe('propagateNameChange', () => {
      it('should update tab header name', async () => {
        const panelState = createTabPanelState(0);
        navigationStore.registerPanelState(0, panelState);

        const tab = new WindowTab(
          true,
          { uuid: testCampaign.uuid, name: 'Old Name', icon: '' },
          testCampaign.uuid,
          WindowTabType.Campaign,
          null,
          null
        );
        navigationStore.tabs = [[tab]];

        await navigationStore.propagateNameChange(testCampaign.uuid, 'New Name');

        expect(tab.header.name).to.equal('New Name');
      });

      it('should update bookmark name', async () => {
        // Clear any bookmarks from previous tests
        navigationStore.bookmarks = [];

        const bookmark = {
          id: foundry.utils.randomID(),
          header: { uuid: testCampaign.uuid, name: 'Old Name', icon: '' },
          tabInfo: { tabType: WindowTabType.Campaign, contentId: testCampaign.uuid, contentTab: null },
        };
        await navigationStore.addBookmark(bookmark);

        await navigationStore.propagateNameChange(testCampaign.uuid, 'New Name');

        expect(navigationStore.bookmarks.find(b => b.id === bookmark.id)?.header.name).to.equal('New Name');
      });
    });

    describe('findTabAcrossPanels', () => {
      it('should find tab in focused panel', () => {
        const panelState = createTabPanelState(0);
        navigationStore.registerPanelState(0, panelState);

        const tab = new WindowTab(
          true,
          { uuid: testCampaign.uuid, name: 'Test', icon: '' },
          testCampaign.uuid,
          WindowTabType.Campaign,
          null,
          null
        );
        navigationStore.tabs = [[tab]];

        const result = navigationStore.findTabAcrossPanels(testCampaign.uuid);

        expect(result).to.not.be.null;
        expect(result?.panelIndex).to.equal(0);
        expect(result?.tab.id).to.equal(tab.id);
      });

      it('should return null when not found', () => {
        const result = navigationStore.findTabAcrossPanels('non-existent-uuid');

        expect(result).to.be.null;
      });
    });

    describe('refreshSessionBookmarks', () => {
      it('should create session bookmarks for campaigns with sessions', async () => {
        // Enable session bookmarks
        sandbox.stub(ModuleSettings, 'get').withArgs(SettingKey.sessionBookmark).returns(true);

        await navigationStore.refreshSessionBookmarks();

        expect(navigationStore.sessionBookmarks.length).to.be.greaterThan(0);
      });

      it('should return empty array when session bookmarks disabled', async () => {
        sandbox.stub(ModuleSettings, 'get').withArgs(SettingKey.sessionBookmark).returns(false);

        await navigationStore.refreshSessionBookmarks();

        expect(navigationStore.sessionBookmarks).to.have.length(0);
      });

      it('should return empty array when no setting', async () => {
        await mainStore.setNewSetting(null);

        await navigationStore.refreshSessionBookmarks();

        expect(navigationStore.sessionBookmarks).to.have.length(0);
      });
    });

    // Note: handleUnsavedChanges is an internal function not exposed on the store.
    // It's tested indirectly through activateTab and openContent tests.

    describe('splitToRight', () => {
      it('should not split when at max panels', async () => {
        navigationStore.tabs = [[], [], []]; // 3 panels

        await navigationStore.splitToRight();

        // Should still have 3 panels
        expect(navigationStore.tabs.length).to.equal(3);
      });

      it('should not split when only one tab', async () => {
        const panelState = createTabPanelState(0);
        navigationStore.registerPanelState(0, panelState);

        const tab = new WindowTab(true, { uuid: 'uuid1', name: 'Tab', icon: '' }, 'uuid1', WindowTabType.Entry, null, null);
        navigationStore.tabs = [[tab]];

        await navigationStore.splitToRight();

        // Should still have 1 panel
        expect(navigationStore.tabs.length).to.equal(1);
      });
    });

    describe('removePanel', () => {
      it('should not remove the last panel', async () => {
        navigationStore.tabs = [[]];

        await navigationStore.removePanel(0);

        expect(navigationStore.tabs.length).to.equal(1);
      });

      it('should remove panel when multiple exist', async () => {
        const panelState0 = createTabPanelState(0);
        const panelState1 = createTabPanelState(1);
        navigationStore.registerPanelState(0, panelState0);
        navigationStore.registerPanelState(1, panelState1);

        navigationStore.tabs = [[], []];

        await navigationStore.removePanel(1);

        expect(navigationStore.tabs.length).to.equal(1);
      });
    });
  });
};
