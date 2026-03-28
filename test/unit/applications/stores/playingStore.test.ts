import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { usePlayingStore, useMainStore, useCampaignStore } from '@/applications/stores';
import { Campaign, Session, WindowTab, } from '@/classes';
import { getTestSetting } from '@unittest/testUtils';
import { createTabPanelState } from '@/composables/useTabPanelState';
import { WindowTabType } from '@/types';
import { ModuleSettings, SettingKey } from '@/settings';
import { openSessionNotes, SessionNotesApplication } from '@/applications/SessionNotes';

export const registerPlayingStoreTests = (context: QuenchBatchContext) => {
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

  describe('usePlayingStore', () => {
    let playingStore: ReturnType<typeof usePlayingStore>;
    let mainStore: ReturnType<typeof useMainStore>;
    let campaignStore: ReturnType<typeof useCampaignStore>;
    let sandbox: sinon.SinonSandbox;
    let testSetting: Awaited<ReturnType<typeof getTestSetting>>;
    let testCampaign: Campaign;
    let testSession: Session;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());

      // Create the stores after pinia is set
      playingStore = usePlayingStore();
      mainStore = useMainStore();
      campaignStore = useCampaignStore();

      // Get the shared test setting
      testSetting = getTestSetting();

      // Create test data - campaign with a session (required for playable)
      testCampaign = (await Campaign.create(testSetting, 'Test Campaign'))!;
      testSession = (await Session.create(testCampaign, 'Test Session'))!;

      // Set up the main store with panel state
      const panelState = createTabPanelState(0);
      mainStore.setFocusedPanel(panelState);

      // Set the setting
      await mainStore.setNewSetting(testSetting.uuid);
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('playableCampaigns', () => {
      it('should return campaigns with sessions that are not completed', async () => {
        // Create a completed campaign
        const completedCampaign = (await Campaign.create(testSetting, 'Completed Campaign'))!;
        await Session.create(completedCampaign, 'Session 1');
        completedCampaign.completed = true;
        await completedCampaign.save();

        // Create a campaign without sessions
        const emptyCampaign = (await Campaign.create(testSetting, 'Empty Campaign'))!;

        const playable = playingStore.playableCampaigns;

        // Should only include testCampaign (has sessions, not completed)
        expect(playable.some(c => c.uuid === testCampaign.uuid)).to.be.true;
        expect(playable.some(c => c.uuid === completedCampaign.uuid)).to.be.false;
        expect(playable.some(c => c.uuid === emptyCampaign.uuid)).to.be.false;
      });

      it('should return empty array when no setting', async () => {
        // Clear the setting
        await mainStore.setNewSetting(null);

        expect(playingStore.playableCampaigns).to.have.length(0);
      });
    });

    describe('currentPlayedCampaign', () => {
      it('should return null when not in play mode and no campaign id', async () => {
        mainStore.isInPlayMode = false;
        playingStore.currentPlayedCampaignId = null;

        expect(playingStore.currentPlayedCampaign).to.be.null;
      });

      it('should return null when no setting', async () => {
        await mainStore.setNewSetting(null);

        expect(playingStore.currentPlayedCampaign).to.be.null;
      });

      it('should return null when no playable campaigns', async () => {
        // Delete the session to make campaign non-playable
        await testSession.delete();

        expect(playingStore.currentPlayedCampaign).to.be.null;
      });

      it('should auto-select single playable campaign', async () => {
        const campaign = playingStore.currentPlayedCampaign;

        expect(campaign?.uuid).to.equal(testCampaign.uuid);
      });

      it('should use currentPlayedCampaignId when set', async () => {
        // Create another campaign
        const campaign2 = (await Campaign.create(testSetting, 'Campaign 2'))!;
        await Session.create(campaign2, 'Session 2');

        // Set the ID
        playingStore.currentPlayedCampaignId = campaign2.uuid;

        expect(playingStore.currentPlayedCampaign?.uuid).to.equal(campaign2.uuid);
      });

      it('should auto-select first campaign when multiple playable and no id set', async () => {
        // Create another campaign
        const campaign2 = (await Campaign.create(testSetting, 'Campaign 2'))!;
        await Session.create(campaign2, 'Session 2');

        // Clear the id
        playingStore.currentPlayedCampaignId = null;

        // Should select first campaign and set the id
        const campaign = playingStore.currentPlayedCampaign;
        expect(campaign).to.not.be.null;
        expect(playingStore.currentPlayedCampaignId).to.equal(campaign?.uuid);
      });
    });

    describe('currentPlayedSessionId', () => {
      it('should return session id from current campaign', async () => {
        playingStore.currentPlayedCampaignId = testCampaign.uuid;

        // The campaign should have a current session
        const sessionId = playingStore.currentPlayedSessionId;

        expect(sessionId).to.equal(testCampaign.currentSessionId);
      });

      it('should return null when no campaign', async () => {
        playingStore.currentPlayedCampaignId = null;

        expect(playingStore.currentPlayedSessionId).to.be.null;
      });
    });

    describe('currentPlayedSessionNotes', () => {
      it('should be null by default', () => {
        expect(playingStore.currentPlayedSessionNotes).to.be.null;
      });

      it('can be set directly', () => {
        playingStore.currentPlayedSessionNotes = 'Test notes';

        expect(playingStore.currentPlayedSessionNotes).to.equal('Test notes');
      });
    });

    describe('currentPlayedCampaignId', () => {
      it('should be null by default', () => {
        expect(playingStore.currentPlayedCampaignId).to.be.null;
      });

      it('can be set directly', () => {
        playingStore.currentPlayedCampaignId = 'test-uuid';

        expect(playingStore.currentPlayedCampaignId).to.equal('test-uuid');
      });
    });

    describe('isInPlayMode watcher', () => {
      let openSessionNotesStub: sinon.SinonStub;
      let closeSessionNotesStub: sinon.SinonStub;
      let moduleSettingsGetStub: sinon.SinonStub;

      beforeEach(() => {
        openSessionNotesStub = sandbox.stub(openSessionNotes);
        closeSessionNotesStub = sandbox.stub(SessionNotesApplication, 'close').resolves();
        moduleSettingsGetStub = sandbox.stub(ModuleSettings, 'get');
      });

      it('should set campaign id when entering play mode', async () => {
        mainStore.isInPlayMode = true;

        // Wait for watcher
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(playingStore.currentPlayedCampaignId).to.equal(testCampaign.uuid);
      });

      it('should close session notes when exiting play mode', async () => {
        // Enter play mode first
        mainStore.isInPlayMode = true;
        await new Promise(resolve => setTimeout(resolve, 10));

        // Exit play mode
        mainStore.isInPlayMode = false;
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(closeSessionNotesStub.called).to.be.true;
        expect(playingStore.currentPlayedSessionNotes).to.be.null;
      });

      it('should open session notes when entering play mode if setting enabled', async () => {
        moduleSettingsGetStub.withArgs(SettingKey.displaySessionNotes).returns(true);
        testCampaign.resetCurrentSession();
        await testCampaign.save();

        mainStore.isInPlayMode = true;

        // Wait for watcher
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(openSessionNotesStub.called).to.be.true;
      });

      it('should not open session notes when setting disabled', async () => {
        moduleSettingsGetStub.withArgs(SettingKey.displaySessionNotes).returns(false);

        mainStore.isInPlayMode = true;

        // Wait for watcher
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(openSessionNotesStub.called).to.be.false;
      });
    });

    describe('currentSetting watcher', () => {
      it('should reset campaign id when setting changes', async () => {
        // Set a campaign id first
        playingStore.currentPlayedCampaignId = testCampaign.uuid;

        // Change setting to null
        await mainStore.setNewSetting(null);

        // Wait for watcher
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(playingStore.currentPlayedCampaignId).to.be.null;
      });

      it('should turn off play mode when no campaign available', async () => {
        mainStore.isInPlayMode = true;

        // Clear the setting
        await mainStore.setNewSetting(null);

        // Wait for watcher
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mainStore.isInPlayMode).to.be.false;
      });
    });
  });
};
