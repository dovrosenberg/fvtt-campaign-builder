import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { useMainStore, useSettingDirectoryStore, useCampaignDirectoryStore } from '@/applications/stores';
import { WindowTabType } from '@/types';
import { Entry, Setting, } from '@/classes';
import DirectoryScrollService from '@/utils/directoryScroll';

export const registerDirectoryScrollTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('directoryScroll utilities', () => {
    let mainStore: ReturnType<typeof useMainStore>;
    let settingDirectoryStore: ReturnType<typeof useSettingDirectoryStore>;
    let campaignDirectoryStore: ReturnType<typeof useCampaignDirectoryStore>;
    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();
      mainStore = useMainStore();
      settingDirectoryStore = useSettingDirectoryStore();
      campaignDirectoryStore = useCampaignDirectoryStore();
      
      // Reset store state
      mainStore.currentTab = null;
      mainStore.currentSetting = null;
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('scrollToActiveEntry', () => {
      it('should return early if no current tab', async () => {
        mainStore.currentTab = null;
        mainStore.currentSetting = {} as Setting;
        
        const result = await DirectoryScrollService.scrollToActiveEntry();
        expect(result).to.be.undefined;
      });

      it('should return early if no current setting', async () => {
        mainStore.currentTab = {
          header: { uuid: 'test-uuid' },
          tabType: WindowTabType.Entry
        } as any;
        mainStore.currentSetting = null;
        
        const result = await DirectoryScrollService.scrollToActiveEntry();
        expect(result).to.be.undefined;
      });

      it('should return early if no content ID', async () => {
        mainStore.currentTab = {
          header: {},
          tabType: WindowTabType.Entry
        } as any;
        mainStore.currentSetting = {} as Setting;
        
        const result = await DirectoryScrollService.scrollToActiveEntry();
        expect(result).to.be.undefined;
      });

      it('should handle Entry tab type', async () => {
        const entryStub = sandbox.stub(Entry, 'fromUuid').resolves({} as Entry);
        const scrollToEntrySpy = sandbox.spy(DirectoryScrollService, 'scrollToEntry');
        
        mainStore.currentTab = {
          header: { uuid: 'entry-uuid' },
          tabType: WindowTabType.Entry
        } as any;
        mainStore.currentSetting = {} as Setting;
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(entryStub.calledWith('entry-uuid')).to.be.true;
        expect(scrollToEntrySpy.calledWith('entry-uuid')).to.be.true;
      });

      it('should handle Campaign tab type', async () => {
        const scrollToCampaignSpy = sandbox.spy(DirectoryScrollService, 'scrollToCampaign');
        
        mainStore.currentTab = {
          header: { uuid: 'campaign-uuid' },
          tabType: WindowTabType.Campaign
        } as any;
        mainStore.currentSetting = {} as Setting;
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(scrollToCampaignSpy.calledOnce).to.be.true;
      });

      it('should handle Session tab type', async () => {
        const scrollToSessionSpy = sandbox.spy(DirectoryScrollService, 'scrollToSession');
        
        mainStore.currentTab = {
          header: { uuid: 'session-uuid' },
          tabType: WindowTabType.Session
        } as any;
        mainStore.currentSetting = {} as Setting;
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(scrollToSessionSpy.calledWith('session-uuid')).to.be.true;
      });

      it('should handle Setting tab type', async () => {
        const scrollToSettingSpy = sandbox.spy(DirectoryScrollService, 'scrollToSetting');
        
        mainStore.currentTab = {
          header: { uuid: 'setting-uuid' },
          tabType: WindowTabType.Setting
        } as any;
        mainStore.currentSetting = {} as Setting;
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(scrollToSettingSpy.calledOnce).to.be.true;
      });

      it('should handle Front tab type', async () => {
        const scrollToFrontSpy = sandbox.spy(DirectoryScrollService, 'scrollToFront');
        
        mainStore.currentTab = {
          header: { uuid: 'front-uuid' },
          tabType: WindowTabType.Front
        } as any;
        mainStore.currentSetting = {} as Setting;
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(scrollToFrontSpy.calledWith('front-uuid')).to.be.true;
      });

      it('should handle Arc tab type', async () => {
        const scrollToArcSpy = sandbox.spy(DirectoryScrollService, 'scrollToArc');
        
        mainStore.currentTab = {
          header: { uuid: 'arc-uuid' },
          tabType: WindowTabType.Arc
        } as any;
        mainStore.currentSetting = {} as Setting;
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(scrollToArcSpy.calledWith('arc-uuid')).to.be.true;
      });
    });
  });
};
