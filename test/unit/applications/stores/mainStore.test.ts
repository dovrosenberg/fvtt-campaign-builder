import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useMainStore, useNavigationStore } from '@/applications/stores';
import { WindowTabType} from '@/types';
import { Entry, Campaign, Session, FCBSetting, WindowTab } from '@/classes';
import { Topics } from '@/types';
import { getTestSetting } from '../../testUtils';
import { UserFlagKey, UserFlags, ModuleSettings, SettingKey } from '@/settings';
import * as appWindowModule from '@/utils/appWindow';
import { getGlobalSetting } from '@/utils/globalSettings';
import { SessionNotesApplication } from '@/applications/SessionNotes';

export const registerMainStoreTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('useMainStore', () => {
    let mainStore: ReturnType<typeof useMainStore>;
    let sandbox = sinon.createSandbox();
    let testSetting: FCBSetting;
    let getGlobalSettingStub: sinon.SinonStub;

    beforeEach(async () => {
      
      // Set up stubs BEFORE creating the store
      getGlobalSettingStub = sandbox.stub(getGlobalSetting);
      
      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());
      
      // Create the main store after pinia and stubs are set
      mainStore = useMainStore();
      
      // Get the shared test setting
      testSetting = getTestSetting();
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

        const tab: WindowTab = {
          header: { uuid: testEntry.uuid, name: 'testTab', icon: 'fa-user' },
          tabType: WindowTabType.Entry
        };
        
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
          
        const tab: WindowTab = {
          header: { uuid: testEntry.uuid, name: 'testTab', icon: 'fa-user' },
          tabType: WindowTabType.Entry
        };
        
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
        const tab: WindowTab = {
          header: { uuid: testEntry!.uuid, name: 'testTab', icon: 'fa-user' },
          tabType: WindowTabType.Entry
        };
        
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
        getGlobalSettingStub.resetHistory();
      });

      it('should clear setting when null is passed', async () => {
        await mainStore.setNewSetting(null);
        
        expect(mainStore.currentSetting).to.be.null;
        expect(userFlagsSetStub.calledWith(UserFlagKey.currentSetting, '')).to.be.true;
      });

      it('should set new setting when valid ID is passed', async () => {
        getGlobalSettingStub.resolves(testSetting);
        
        await mainStore.setNewSetting(testSetting.uuid);
        
        expect(mainStore.currentSetting).to.equal(testSetting);
        expect(userFlagsSetStub.calledWith(UserFlagKey.currentSetting, testSetting.uuid)).to.be.true;
        expect(getGlobalSettingStub.calledWith(testSetting.uuid)).to.be.true;
      });

      it('should throw error for invalid setting ID', async () => {
        getGlobalSettingStub.resolves(null);
        
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
        getGlobalSettingStub.resolves(testSetting);
        
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
        
        const tab: WindowTab = {
          header: { uuid: testEntry.uuid, name: 'testTab', icon: 'fa-user' },
          tabType: WindowTabType.Entry
        };
        
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
        
        const tab: WindowTab = {
          header: { uuid: testCampaign.uuid, name: 'testTab', icon: 'fa-calendar' },
          tabType: WindowTabType.Campaign
        };
        
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
        
        const tab: WindowTab = {
          header: { uuid: testSession.uuid, name: 'testTab', icon: 'fa-calendar' },
          tabType: WindowTabType.Session
        };
        
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(tab);
        
        expect(mainStore.currentTab).to.deep.equal(tab);
        expect(mainStore.currentSession?.uuid).to.equal(testSession.uuid);
      });

      it('should set tag results tab correctly', async () => {
        const tagName = 'test-tag';
        const tab: WindowTab = {
          header: { uuid: tagName, name: 'testTab', icon: 'fa-tag' },
          tabType: WindowTabType.TagResults
        };
        
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
        const entryTab: WindowTab = {
          header: { uuid: testEntry.uuid },
          tabType: WindowTabType.Entry
        };
        
        // Set the setting
        await mainStore.setNewSetting(testSetting.uuid);
        await mainStore.setNewTab(entryTab);
        
        // Verify content is set
        expect(mainStore.currentEntry).to.not.be.null;
        
        // Now set a new tab to clear content
        const newTab: WindowTab = {
          header: { uuid: testSetting.uuid },
          tabType: WindowTabType.Setting
        };
        
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
        
        const tab: WindowTab = {
          header: { uuid: 'test-uuid' },
          tabType: WindowTabType.Entry
        };
        
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
        const tab: WindowTab = {
          header: { uuid: testEntry.uuid },
          tabType: WindowTabType.Entry
        };
        
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
        const tab: WindowTab = {
          header: { uuid: testCampaign.uuid },
          tabType: WindowTabType.Campaign
        };
        
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
        const tab: WindowTab = {
          header: { uuid: tagName },
          tabType: WindowTabType.TagResults
        };
        
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
        
        const tab: WindowTab = {
          header: { uuid: testEntry.uuid, name: 'Test Character', icon: 'fa-solid fa-user' },
          tabType: WindowTabType.Entry,
          contentTab: 'description'
        };
        
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
        getGlobalSettingStub.resetHistory();
      });

      it('should return all valid settings', async () => {
        const settingIndex = [
          { settingId: testSetting.uuid },
          { settingId: 'another-setting-id' }
        ];
        moduleSettingsGetStub.withArgs(SettingKey.settingIndex).returns(settingIndex);
        getGlobalSettingStub.withArgs(testSetting.uuid).resolves(testSetting);
        getGlobalSettingStub.withArgs('another-setting-id').resolves(null);
        
        const settings = await mainStore.getAllSettings();
        
        expect(settings).to.have.length(1);
        expect(settings[0]).to.equal(testSetting);
      });

      it('should handle errors gracefully', async () => {
        const settingIndex = [{ settingId: 'invalid-id' }];
        moduleSettingsGetStub.withArgs(SettingKey.settingIndex).returns(settingIndex);
        getGlobalSettingStub.withArgs('invalid-id').rejects(new Error('Failed to load'));
        
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
  });
};
