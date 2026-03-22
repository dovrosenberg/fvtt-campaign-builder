import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { useCampaignDirectoryStore, useMainStore, useNavigationStore } from '@/applications/stores';
import { Campaign, Session, Arc, Front, StoryWeb, WindowTab } from '@/classes';
import { getTestSetting } from '@unittest/testUtils';
import { createTabPanelState } from '@/composables/useTabPanelState';
import { WindowTabType } from '@/types';
import { FCBDialog } from '@/dialogs';
import { ModuleSettings, SettingKey } from '@/settings';

export const registerCampaignDirectoryStoreTests = (context: QuenchBatchContext) => {
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

  describe('useCampaignDirectoryStore', () => {
    let campaignDirectoryStore: ReturnType<typeof useCampaignDirectoryStore>;
    let mainStore: ReturnType<typeof useMainStore>;
    let navigationStore: ReturnType<typeof useNavigationStore>;
    let sandbox: sinon.SinonSandbox;
    let testSetting: Awaited<ReturnType<typeof getTestSetting>>;
    let testCampaign: Campaign;
    let testSession: Session;
    let testArc: Arc;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());

      // Create the stores after pinia is set
      campaignDirectoryStore = useCampaignDirectoryStore();
      mainStore = useMainStore();
      navigationStore = useNavigationStore();

      // Get the shared test setting
      testSetting = getTestSetting();

      // Create test data
      testCampaign = (await Campaign.create(testSetting, 'Test Campaign'))!;
      testSession = (await Session.create(testCampaign, 'Test Session'))!;
      testSession.number = 1;
      await testSession.save();
      testArc = (await Arc.create(testCampaign, 'Test Arc'))!;

      // Set up the main store with panel state
      const panelState = createTabPanelState(0);
      mainStore.setFocusedPanel(panelState);

      // Set the setting
      await mainStore.setNewSetting(testSetting.uuid);

      // Refresh the directory tree
      await campaignDirectoryStore.refreshCampaignDirectoryTree();
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('currentCampaignTree', () => {
      it('should contain campaigns after refresh', async () => {
        expect(campaignDirectoryStore.currentCampaignTree.value).to.have.length.greaterThan(0);
      });

      it('should be empty when no setting', async () => {
        await mainStore.setNewSetting(null);

        expect(campaignDirectoryStore.currentCampaignTree.value).to.have.length(0);
      });
    });

    describe('isCampaignTreeRefreshing', () => {
      it('should be false initially', () => {
        expect(campaignDirectoryStore.isCampaignTreeRefreshing).to.be.false;
      });
    });

    describe('createCampaign', () => {
      it('should create a new campaign', async () => {
        const campaign = await campaignDirectoryStore.createCampaign(testSetting, 'New Campaign');

        expect(campaign).to.not.be.null;
        expect(campaign?.name).to.equal('New Campaign');

        // Verify it appears in the tree
        await campaignDirectoryStore.refreshCampaignDirectoryTree();
        const found = campaignDirectoryStore.currentCampaignTree.value.find(n => n.id === campaign?.uuid);
        expect(found).to.exist;
      });
    });

    describe('createSession', () => {
      it('should create a new session in campaign', async () => {
        const session = await campaignDirectoryStore.createSession(testCampaign.uuid, 'New Session');

        expect(session).to.not.be.null;
        expect(session?.name).to.equal('New Session');
      });

      it('should return null when no setting', async () => {
        await mainStore.setNewSetting(null);

        const session = await campaignDirectoryStore.createSession(testCampaign.uuid, 'New Session');

        expect(session).to.be.null;
      });
    });

    describe('createArc', () => {
      it('should create a new arc in campaign', async () => {
        const arc = await campaignDirectoryStore.createArc(testCampaign.uuid, 'New Arc');

        expect(arc).to.not.be.null;
        expect(arc?.name).to.equal('New Arc');
      });
    });

    describe('createFront', () => {
      it('should create a new front in campaign when fronts enabled', async () => {
        // Enable fronts - capture original before stubbing to avoid recursion
        const originalGet = ModuleSettings.get.bind(ModuleSettings);
        sandbox.stub(ModuleSettings, 'get').callsFake((key: SettingKey) => {
          if (key === SettingKey.useFronts) return true;
          return originalGet(key);
        });

        const front = await campaignDirectoryStore.createFront(testCampaign.uuid, 'New Front');

        expect(front).to.not.be.null;
        expect(front?.name).to.equal('New Front');
      });
    });

    describe('createStoryWeb', () => {
      it('should create a new story web in campaign when story webs enabled', async () => {
        // Enable story webs - capture original before stubbing to avoid recursion
        const originalGet = ModuleSettings.get.bind(ModuleSettings);
        sandbox.stub(ModuleSettings, 'get').callsFake((key: SettingKey) => {
          if (key === SettingKey.useStoryWebs) return true;
          return originalGet(key);
        });

        const storyWeb = await campaignDirectoryStore.createStoryWeb(testCampaign.uuid, 'New StoryWeb');

        expect(storyWeb).to.not.be.null;
        expect(storyWeb?.name).to.equal('New StoryWeb');
      });
    });

    describe('deleteCampaign', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should delete campaign and return true', async () => {
        // Create a separate campaign for deletion
        const campaign = (await Campaign.create(testSetting, 'To Delete'))!;

        const result = await campaignDirectoryStore.deleteCampaign(campaign.uuid);

        expect(result).to.be.true;

        // Verify it's gone
        const refreshed = await Campaign.fromUuid(campaign.uuid);
        expect(refreshed).to.be.null;
      });

      it('should return false if confirmation cancelled', async () => {
        confirmDialogStub.resolves(false);

        const result = await campaignDirectoryStore.deleteCampaign(testCampaign.uuid);

        expect(result).to.be.false;
      });

      it('should return false when no setting', async () => {
        await mainStore.setNewSetting(null);

        const result = await campaignDirectoryStore.deleteCampaign(testCampaign.uuid);

        expect(result).to.be.false;
      });
    });

    describe('deleteSession', () => {
      let confirmDialogStub: sinon.SinonStub;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
      });

      it('should delete session and return true', async () => {
        // Create a separate session for deletion
        const session = (await Session.create(testCampaign, 'To Delete'))!;

        const result = await campaignDirectoryStore.deleteSession(session.uuid);

        expect(result).to.be.true;

        // Verify it's gone
        const refreshed = await Session.fromUuid(session.uuid);
        expect(refreshed).to.be.null;
      });

      it('should return false if confirmation cancelled', async () => {
        confirmDialogStub.resolves(false);

        const result = await campaignDirectoryStore.deleteSession(testSession.uuid);

        expect(result).to.be.false;
      });
    });

    describe('deleteFront', () => {
      let confirmDialogStub: sinon.SinonStub;
      let moduleSettingsStub: sinon.SinonStub;
      let originalGet: (key: SettingKey) => unknown;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
        // Enable fronts - capture original before stubbing to avoid recursion
        originalGet = ModuleSettings.get.bind(ModuleSettings);

        // @ts-ignore
        moduleSettingsStub = sandbox.stub(ModuleSettings, 'get').callsFake((key: SettingKey) => {
          if (key === SettingKey.useFronts) return true;
          return originalGet(key);
        });
      });

      it('should delete front and return true', async () => {
        const front = (await Front.create(testCampaign, 'Front to Delete'))!;

        const result = await campaignDirectoryStore.deleteFront(front.uuid);

        expect(result).to.be.true;

        // Verify it's gone
        const refreshed = await Front.fromUuid(front.uuid);
        expect(refreshed).to.be.null;
      });
    });

    describe('deleteStoryWeb', () => {
      let confirmDialogStub: sinon.SinonStub;
      let moduleSettingsStub: sinon.SinonStub;
      let originalGet: (key: SettingKey) => unknown;

      beforeEach(() => {
        confirmDialogStub = sandbox.stub(FCBDialog, 'confirmDialog').resolves(true);
        // Enable story webs - capture original before stubbing to avoid recursion
        originalGet = ModuleSettings.get.bind(ModuleSettings);

        // @ts-ignore
        moduleSettingsStub = sandbox.stub(ModuleSettings, 'get').callsFake((key: SettingKey) => {
          if (key === SettingKey.useStoryWebs) return true;
          return originalGet(key);
        });
      });

      it('should delete story web and return true', async () => {
        const storyWeb = (await StoryWeb.create(testCampaign, 'StoryWeb to Delete'))!;

        const result = await campaignDirectoryStore.deleteStoryWeb(storyWeb.uuid);

        expect(result).to.be.true;

        // Verify it's gone
        const refreshed = await StoryWeb.fromUuid(storyWeb.uuid);
        expect(refreshed).to.be.null;
      });
    });

    describe('duplicateStoryWeb', () => {
      let moduleSettingsStub: sinon.SinonStub;
      let originalGet: (key: SettingKey) => unknown;

      beforeEach(() => {
        // Enable story webs - capture original before stubbing to avoid recursion
        originalGet = ModuleSettings.get.bind(ModuleSettings);

        // @ts-ignore
        moduleSettingsStub = sandbox.stub(ModuleSettings, 'get').callsFake((key: SettingKey) => {
          if (key === SettingKey.useStoryWebs) return true;
          return originalGet(key);
        });
      });

      it('should duplicate a story web', async () => {
        const storyWeb = (await StoryWeb.create(testCampaign, 'Original StoryWeb'))!;

        const duplicate = await campaignDirectoryStore.duplicateStoryWeb(storyWeb.uuid);

        expect(duplicate).to.not.be.null;
        expect(duplicate?.uuid).to.not.equal(storyWeb.uuid);
      });
    });

    describe('getCampaigns', () => {
      it('should return all campaigns in setting', async () => {
        const campaigns = await campaignDirectoryStore.getCampaigns();

        expect(campaigns.length).to.be.greaterThan(0);
        expect(campaigns.some(c => c.uuid === testCampaign.uuid)).to.be.true;
      });

      it('should return empty array when no setting', async () => {
        await mainStore.setNewSetting(null);

        const campaigns = await campaignDirectoryStore.getCampaigns();

        expect(campaigns).to.have.length(0);
      });

      it('should return campaigns sorted alphabetically', async () => {
        // Create additional campaigns with specific names
        await Campaign.create(testSetting, 'AAA First');
        await Campaign.create(testSetting, 'ZZZ Last');

        const campaigns = await campaignDirectoryStore.getCampaigns();

        expect(campaigns[0].name).to.equal('AAA First');
        expect(campaigns[campaigns.length - 1].name).to.equal('ZZZ Last');
      });
    });

    describe('refreshCampaignDirectoryTree', () => {
      it('should populate the tree', async () => {
        await campaignDirectoryStore.refreshCampaignDirectoryTree();

        expect(campaignDirectoryStore.currentCampaignTree.value.length).to.be.greaterThan(0);
      });

      it('should do nothing when no setting', async () => {
        await mainStore.setNewSetting(null);

        // Should not throw
        await campaignDirectoryStore.refreshCampaignDirectoryTree();
      });
    });
  });
};
