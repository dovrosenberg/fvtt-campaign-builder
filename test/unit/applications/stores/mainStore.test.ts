import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useMainStore, useNavigationStore } from '@/applications/stores';
import { Entry, Campaign, Session, FCBSetting, WindowTab, Front, Arc, StoryWeb } from '@/classes';
import { Topics, WindowTabType, DocumentLinkType } from '@/types';
import { getTestSetting } from '@unittest/testUtils';
import { UserFlagKey, UserFlags, ModuleSettings, SettingKey } from '@/settings';
import AppWindowService from '@/utils/appWindow';
import GlobalSettingService from '@/utils/globalSettings';
import { SessionNotesApplication } from '@/applications/SessionNotes';
import NameGeneratorsService from '@/utils/nameGenerators';
import TitleUpdaterService from '@/utils/titleUpdater';
import { createTabPanelState, type TabPanelState } from '@/composables/useTabPanelState';

export const registerMainStoreTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  // Helper function to create test window tabs
  const createTestTab = (
    uuid: string,
    tabType: WindowTabType,
    icon?: string,
    name?: string,
    contentTab?: string
  ): WindowTab => {
    return new WindowTab(
      true, // active
      { 
        uuid, 
        name: name || 'testTab', 
        icon: icon || 'fa-question'
      },
      uuid, // contentId
      tabType,
      null, // id (will be generated)
      contentTab || null, // contentTabId
      [], // history (will be created in constructor)
      -1 // historyIdx (will be set in constructor)
    );
  };

  describe('useMainStore', () => {
    let mainStore: ReturnType<typeof useMainStore>;
    let sandbox: sinon.SinonSandbox;
    let testSetting: FCBSetting;
    let getGlobalSettingsStub: sinon.SinonStub;
    let closeCampaignBuilderAppStub: sinon.SinonStub;
    let panelState: TabPanelState;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Set up stubs BEFORE creating the store
      getGlobalSettingsStub = sandbox.stub(GlobalSettingService, 'getGlobalSetting');
      closeCampaignBuilderAppStub = sandbox.stub(AppWindowService, 'closeCampaignBuilderApp');
      
      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());
      
      // Create the main store after pinia and stubs are set
      mainStore = useMainStore();
      
      // Get the shared test setting
      testSetting = getTestSetting();
      
      // Configure the stub to return the test setting by default
      getGlobalSettingsStub.withArgs(testSetting.uuid).resolves(testSetting);
      
      // Create and set a TabPanelState for the focused panel
      panelState = createTabPanelState(0);
      mainStore.setFocusedPanel(panelState);
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('computed properties', () => {
      it('should return correct content type based on current tab', async () => {
        const testEntry = await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test Character'
        });
        
        if (!testEntry)
          throw new Error('Failed to create test entry');

        const tab = createTestTab(testEntry.uuid, WindowTabType.Entry);
        
        // Set the setting first
        await mainStore.setNewSetting(testSetting.uuid);
        
        // Use the store's public method to set the tab
        await mainStore.setNewTab(tab);
        
        // Now check the computed property
        expect(mainStore.currentContentType).to.equal(WindowTabType.Entry);
      });

      it('should return NewTab when no current tab', () => {
        // With a fresh store, currentTab should be undefined/null
        expect(mainStore.currentContentType).to.equal(WindowTabType.NewTab);
      });

      it('should return correct content id for entry', async () => {
        const testEntry = await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test Character'
        });
        
        if (!testEntry)
          throw new Error('Failed to create test entry');
          
        const tab = createTestTab(testEntry.uuid, WindowTabType.Entry);
        
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentContentId).to.equal(testEntry.uuid);
      });

      it('should return null for content id when no content', () => {
        // With a fresh store, currentContentId should be null
        expect(mainStore.currentContentId).to.be.null;
      });

      it('should return correct entry topic', async () => {
        const testEntry = await Entry.create(testSetting.topicFolders[Topics.Location]!, {
          name: 'Test Location'
        });
        
        // Set the entry
        const tab = createTestTab(testEntry!.uuid, WindowTabType.Entry);
        
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentEntryTopic).to.equal(Topics.Location);
      });

      it('should return None for entry topic when no entry', () => {
        // With a fresh store, currentEntryTopic should be None
        expect(mainStore.currentEntryTopic).to.equal(Topics.None);
      });

      it('should correctly detect multiple campaigns', async () => {
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        
        // Check initial state
        expect(mainStore.hasMultipleCampaigns).to.equal(testSetting.campaignIndex.length > 1);
      });

      it('should return false for multiple campaigns when no setting', () => {
        // With a fresh store, hasMultipleCampaigns should be false
        expect(mainStore.hasMultipleCampaigns).to.be.false;
      });
    });

    describe('setNewSetting', () => {
      let userFlagsSetStub: sinon.SinonStub;

      beforeEach(() => {
        userFlagsSetStub = sandbox.stub(UserFlags, 'set').resolves();
        getGlobalSettingsStub.resetHistory();
      });

      it('should clear setting when null is passed', async () => {
        await mainStore.setNewSetting(null);
        
        expect(mainStore.currentSetting).to.be.null;
        expect(userFlagsSetStub.calledWith(UserFlagKey.currentSetting, '')).to.be.true;
        expect(closeCampaignBuilderAppStub.called).to.be.true;
      });

      it('should set new setting when valid ID is passed', async () => {
        await mainStore.setNewSetting(testSetting.uuid);
        
        expect(mainStore.currentSetting).to.deep.equal(testSetting);
        expect(userFlagsSetStub.calledWith(UserFlagKey.currentSetting, testSetting.uuid)).to.be.true;
        expect(getGlobalSettingsStub.calledWith(testSetting.uuid)).to.be.true;
      });

      it('should throw error for invalid setting ID', async () => {
        getGlobalSettingsStub.resolves(null);
        
        try {
          await mainStore.setNewSetting('invalid-id');
          expect.fail('Should have thrown an error');
        } catch (error: unknown) {
          expect((error as Error).message).to.include('Invalid settingId');
        }
      });

      it('should close SessionNotesApplication if open when changing settings', async () => {
        const closeStub = sandbox.stub();
        (SessionNotesApplication.app as any) = { close: closeStub };
        
        await mainStore.setNewSetting(testSetting.uuid);
        
        expect(closeStub.calledOnce).to.be.true;
      });
    });

    describe('setNewTab', () => {
      it('should set entry tab correctly', async () => {
        const testEntry = await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test Character'
        });

        if (!testEntry)
          throw new Error('Failed to create test entry');
        
        const tab = createTestTab(testEntry.uuid, WindowTabType.Entry);
        
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentTab).to.deep.equal(tab);
        expect(mainStore.currentEntry?.uuid).to.equal(testEntry.uuid);
      });

      it('should set campaign tab correctly', async () => {
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');
        
        if (!testCampaign)
          throw new Error('Failed to create test campaign');
        
        const tab = createTestTab(testCampaign.uuid, WindowTabType.Campaign, 'fa-calendar', 'testTab');
        
        // Set the setting 
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentTab).to.deep.equal(tab);
        expect(mainStore.currentCampaign?.uuid).to.equal(testCampaign.uuid);
      });

      it('should set session tab correctly', async () => {
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');

        if (!testCampaign)
          throw new Error('Failed to create test campaign');
        
        const testSession = await Session.create(testCampaign, 'Test Session');

        if (!testSession)
          throw new Error('Failed to create test session');
        
        const tab = createTestTab(testSession.uuid, WindowTabType.Session, 'fa-calendar', 'testTab');
        
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentTab).to.deep.equal(tab);
        expect(mainStore.currentSession?.uuid).to.equal(testSession.uuid);
      });

      it('should set tag results tab correctly', async () => {
        const tagName = 'test-tag';
        const tab = createTestTab(tagName, WindowTabType.TagResults, 'fa-tag', 'testTab');
        
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentTab).to.deep.equal(tab);
        expect(mainStore.currentTag.value).to.equal(tagName);
      });

      it('should clear all content when setting new tab', async () => {
        // Set some initial content through the store's public API
        const testEntry = await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'Test Character' });
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');
        
        if (!testEntry || !testCampaign)
          throw new Error('Failed to create test content');
        
        // First set an entry tab
        const entryTab = createTestTab(testEntry.uuid, WindowTabType.Entry, 'fa-user', 'testTab');
        
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(entryTab);
        
        // Verify content is set
        expect(mainStore.currentEntry).to.not.be.null;
        
        // Now set a new tab to clear content
        const newTab = createTestTab(testSetting.uuid, WindowTabType.Setting, 'fa-gear', 'testTab');
        
        await mainStore.setNewTab(newTab);
        
        expect(mainStore.currentEntry).to.be.null;
        expect(mainStore.currentCampaign).to.be.null;
        expect(mainStore.currentSession).to.be.null;
        expect(mainStore.currentFront).to.be.null;
        expect(mainStore.currentArc).to.be.null;
        expect(mainStore.currentStoryWeb).to.be.null;
        expect(mainStore.currentTag.value).to.be.null;
      });

      it('should return early if no current setting', async () => {
        // Don't set the setting, it should be null from fresh store
        
        const tab = createTestTab('test-uuid', WindowTabType.Entry, 'fa-user', 'testTab');
        
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentTab).to.be.null;
      });
    });

    describe('refresh methods', () => {
      it('should refresh entry correctly', async () => {
        const testEntry = await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test Character'
        });
        
        if (!testEntry)
          throw new Error('Failed to create test entry');
        
        // Set the entry through the store's public API
        const tab = createTestTab(testEntry.uuid, WindowTabType.Entry);
        
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        await mainStore.refreshEntry();
        
        // Should still have the entry after refresh
        expect(mainStore.currentEntry).to.not.be.null;
        expect(mainStore.currentEntry?.uuid).to.equal(testEntry.uuid);
      });

      it('should refresh campaign correctly', async () => {
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');
        
        if (!testCampaign)
          throw new Error('Failed to create test campaign');
        
        // Set the campaign through the store's public API
        const tab = createTestTab(testCampaign.uuid, WindowTabType.Campaign);
        
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        await mainStore.refreshCampaign();
        
        expect(mainStore.currentCampaign).to.not.be.null;
        expect(mainStore.currentCampaign?.uuid).to.equal(testCampaign.uuid);
      });

      it('should refresh setting correctly', async () => {
        // Set the setting through the public API
        await mainStore.setNewSetting(testSetting.uuid);
        
        await mainStore.refreshSetting();
        
        expect(mainStore.currentSetting).to.not.be.null;
        expect(mainStore.currentSetting?.uuid).to.equal(testSetting.uuid);
      });

      it('should refresh tag results correctly', async () => {
        // Set the setting first
        await mainStore.setNewSetting(testSetting.uuid);
        
        // Set the tag through the store's public API
        const tagName = 'test-tag';
        const tab = createTestTab(tagName, WindowTabType.TagResults);
        
        await mainStore.setNewTab(tab);
        
        await mainStore.refreshTagResults();
        
        expect(mainStore.currentTag.value).to.equal(tagName);
      });
    });

    describe('currentContentTab', () => {
      let navigationStore: any;

      beforeEach(() => {
        // Create a testing pinia instance
        const pinia = createTestingPinia({ createSpy: sinon.spy });
        navigationStore = useNavigationStore(pinia);
      });

      it('should get and set content tab', async () => {
        // Set the setting and tab through public API
        await mainStore.setNewSetting(testSetting.uuid);
        
        const testEntry = await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test Character'
        });

        if (!testEntry) {
          expect.fail('Failed to create test entry');
        }
        
        const tab = createTestTab(testEntry.uuid, WindowTabType.Entry, 'fa-solid fa-user', 'Test Character', 'description');
        
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentContentTab).to.equal('description');
        
        mainStore.currentContentTab = 'relationships';
        expect(mainStore.currentTab?.contentTab).to.equal('relationships');
      });
    });

    describe('getAllSettings', () => {
      let moduleSettingsGetStub: sinon.SinonStub;

      beforeEach(() => {
        moduleSettingsGetStub = sandbox.stub(ModuleSettings, 'get');
        getGlobalSettingsStub.resetHistory();
      });

      it('should return all valid settings', async () => {
        const settingIndex = [
          { settingId: testSetting.uuid },
          { settingId: 'another-setting-id' }
        ];
        moduleSettingsGetStub.withArgs(SettingKey.settingIndex).returns(settingIndex);
        getGlobalSettingsStub.withArgs(testSetting.uuid).resolves(testSetting);
        getGlobalSettingsStub.withArgs('another-setting-id').resolves(null);
        
        const settings = await mainStore.getAllSettings();
        
        expect(settings).to.have.length(1);
        expect(settings[0]).to.deep.equal(testSetting);
      });

      it('should handle errors gracefully', async () => {
        const settingIndex = [{ settingId: 'invalid-id' }];
        moduleSettingsGetStub.withArgs(SettingKey.settingIndex).returns(settingIndex);
        getGlobalSettingsStub.withArgs('invalid-id').rejects(new Error('Failed to load'));
        
        const consoleErrorStub = sandbox.stub(console, 'error');
        
        const settings = await mainStore.getAllSettings();
        
        expect(settings).to.have.length(0);
        expect(consoleErrorStub.calledOnce).to.be.true;
      });
    });

    describe('isInPlayMode watcher', () => {
      let moduleSettingsSetStub: sinon.SinonStub;

      beforeEach(() => {
        moduleSettingsSetStub = sandbox.stub(ModuleSettings, 'set').resolves();
      });

      it('should save isInPlayMode to settings when changed', async () => {
        mainStore.isInPlayMode = true;
        
        // Wait for watcher to trigger
        await new Promise(resolve => setTimeout(resolve, 10));
        
        expect(moduleSettingsSetStub.calledWith(SettingKey.isInPlayMode, true)).to.be.true;
      });
    });

    describe('missing refresh methods', () => {
      it('should refresh front correctly', async () => {
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');
        
        if (!testCampaign)
          throw new Error('Failed to create test campaign');
        
        const testFront = await Front.create(testCampaign, 'Test Front');
        
        if (!testFront)
          throw new Error('Failed to create test front');
        
        const tab = createTestTab(testFront.uuid, WindowTabType.Front);
        
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        await mainStore.refreshFront();
        
        expect(mainStore.currentFront).to.not.be.null;
        expect(mainStore.currentFront?.uuid).to.equal(testFront.uuid);
      });

      it('should refresh story web correctly', async () => {
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');
        
        if (!testCampaign)
          throw new Error('Failed to create test campaign');
        
        const testStoryWeb = await StoryWeb.create(testCampaign, 'Test Story Web');
        
        if (!testStoryWeb)
          throw new Error('Failed to create test story web');
        
        const tab = createTestTab(testStoryWeb.uuid, WindowTabType.StoryWeb);
        
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        await mainStore.refreshStoryWeb();
        
        expect(mainStore.currentStoryWeb).to.not.be.null;
        expect(mainStore.currentStoryWeb?.uuid).to.equal(testStoryWeb.uuid);
      });

      it('should refresh session with reload parameter', async () => {
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');

        if (!testCampaign)
          throw new Error('Failed to create test campaign');
        
        const testSession = await Session.create(testCampaign, 'Test Session');

        if (!testSession)
          throw new Error('Failed to create test session');
        
        const tab = createTestTab(testSession.uuid, WindowTabType.Session);
        
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        await mainStore.refreshSession(true);
        
        expect(mainStore.currentSession).to.not.be.null;
        expect(mainStore.currentSession?.uuid).to.equal(testSession.uuid);
      });

      it('should refresh arc with reload parameter', async () => {
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');

        if (!testCampaign)
          throw new Error('Failed to create test campaign');
        
        const testArc = await Arc.create(testCampaign, 'Test Arc');
        
        if (!testArc)
          throw new Error('Failed to create test arc');
        
        const tab = createTestTab(testArc.uuid, WindowTabType.Arc);
        
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        await mainStore.refreshArc(true);
        
        expect(mainStore.currentArc).to.not.be.null;
        expect(mainStore.currentArc?.uuid).to.equal(testArc.uuid);
      });

      it('should refresh current content based on type', async () => {
        const testEntry = await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test Character'
        });
        
        if (!testEntry)
          throw new Error('Failed to create test entry');
        
        const tab = createTestTab(testEntry.uuid, WindowTabType.Entry);
        
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        await mainStore.refreshCurrentContent();
        
        expect(mainStore.currentEntry).to.not.be.null;
        expect(mainStore.currentEntry?.uuid).to.equal(testEntry.uuid);
      });

      it('should refresh setting with reload parameter', async () => {
        await mainStore.setNewSetting(testSetting.uuid);
        
        await mainStore.refreshSetting(true);
        
        expect(mainStore.currentSetting).to.not.be.null;
        expect(mainStore.currentSetting?.uuid).to.equal(testSetting.uuid);
      });
    });

    describe('missing computed properties', () => {
      it('should return correct document type for content tab', async () => {
        const testEntry = await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test Character'
        });
        
        if (!testEntry)
          throw new Error('Failed to create test entry');
        
        const tab = createTestTab(testEntry.uuid, WindowTabType.Entry, 'fa-user', 'testTab', 'actors');
        
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentDocumentType).to.equal(DocumentLinkType.Actors);
      });

      it('should return correct compendium for setting', async () => {
        await mainStore.setNewSetting(testSetting.uuid);
        
        const compendium = mainStore.currentSettingCompendium;
        
        expect(compendium).to.not.be.null;
        expect(compendium.metadata.id).to.equal('world.' + foundry.utils.parseUuid(testSetting.compendiumId).id);
      });
    });

    describe('missing tab types in setNewTab', () => {
      it('should set front tab correctly', async () => {
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');
        
        if (!testCampaign)
          throw new Error('Failed to create test campaign');
        
        const testFront = await Front.create(testCampaign, 'Test Front');
        
        if (!testFront)
          throw new Error('Failed to create test front');
        
        const tab = createTestTab(testFront.uuid, WindowTabType.Front);
        
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentTab).to.deep.equal(tab);
        expect(mainStore.currentFront?.uuid).to.equal(testFront.uuid);
      });

      it('should set arc tab correctly', async () => {
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');
        
        if (!testCampaign)
          throw new Error('Failed to create test campaign');
        
        const testArc = await Arc.create(testCampaign, 'Test Arc');
        
        if (!testArc)
          throw new Error('Failed to create test arc');
        
        const tab = createTestTab(testArc.uuid, WindowTabType.Arc);
        
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentTab).to.deep.equal(tab);
        expect(mainStore.currentArc?.uuid).to.equal(testArc.uuid);
      });

      it('should set story web tab correctly', async () => {
        const testCampaign = await Campaign.create(testSetting, 'Test Campaign');
        
        if (!testCampaign)
          throw new Error('Failed to create test campaign');
        
        const testStoryWeb = await StoryWeb.create(testCampaign, 'Test Story Web');
        
        if (!testStoryWeb)
          throw new Error('Failed to create test story web');
        
        const tab = createTestTab(testStoryWeb.uuid, WindowTabType.StoryWeb);
        
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentTab).to.deep.equal(tab);
        expect(mainStore.currentStoryWeb?.uuid).to.equal(testStoryWeb.uuid);
      });
    });

    describe('propagateSettingNameChange', () => {
      let updateSettingRollTableNamesStub: sinon.SinonStub;

      beforeEach(() => {
        updateSettingRollTableNamesStub = sandbox.stub(NameGeneratorsService, 'updateSettingRollTableNames').resolves();
      });

      it('should update roll table names when setting has roll table config', async () => {
        testSetting.rollTableConfig = {
          rollTableId: 'test-table',
          nameFormat: 'test-format'
        };
        
        await mainStore.propagateSettingNameChange(testSetting);
        
        expect(updateSettingRollTableNamesStub.calledOnceWith(testSetting)).to.be.true;
      });

      it('should not update roll tables when no config exists', async () => {
        testSetting.rollTableConfig = null;
        
        await mainStore.propagateSettingNameChange(testSetting);
        
        expect(updateSettingRollTableNamesStub.notCalled).to.be.true;
      });

      it('should handle errors gracefully', async () => {
        updateSettingRollTableNamesStub.rejects(new Error('Test error'));
        
        await mainStore.propagateSettingNameChange(testSetting);
        
        // Just checking it doesn't throw
      });
    });

    describe('currentSetting watcher', () => {
      let updateWindowTitleStub: sinon.SinonStub;

      beforeEach(() => {
        updateWindowTitleStub = sandbox.stub(TitleUpdaterService, 'updateWindowTitle');
      });

      it('should update window title when setting changes', async () => {
        await mainStore.setNewSetting(testSetting.uuid);
        
        expect(updateWindowTitleStub.calledWith(testSetting.name)).to.be.true;
      });

      it('should turn off play mode when switching settings', async () => {
        // First set an initial setting (so there's an oldSetting to switch from)
        await mainStore.setNewSetting(testSetting.uuid);
        mainStore.isInPlayMode = true;
        
        // Create a second setting to switch to
        const secondSetting = (await FCBSetting.create(false, 'Second Test Setting'))!;
        
        try {
          // Configure the stub to return the second setting for its UUID
          getGlobalSettingsStub.withArgs(secondSetting.uuid).resolves(secondSetting);
          
          // Switch to the new setting - this should turn off play mode
          await mainStore.setNewSetting(secondSetting.uuid);
          
          expect(mainStore.isInPlayMode).to.be.false;
        } finally {
          await secondSetting.delete();
        }
      });

      it('should not update title when same setting UUID', async () => {
        await mainStore.setNewSetting(testSetting.uuid);
        updateWindowTitleStub.resetHistory();
        
        await mainStore.setNewSetting(testSetting.uuid);
        
        expect(updateWindowTitleStub.notCalled).to.be.true;
      });
    });
  });
};
