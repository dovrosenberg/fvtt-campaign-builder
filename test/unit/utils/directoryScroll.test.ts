import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { useMainStore, useSettingDirectoryStore, useCampaignDirectoryStore } from '@/applications/stores';
import { WindowTabType } from '@/types';
import { Entry, FCBSetting, } from '@/classes';
import DirectoryScrollService from '@/utils/directoryScroll';
import { stubStoreComputed } from '@unittest/stores';

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
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('scrollToActiveEntry', () => {
      it('should return early if no current tab', async () => {
        stubStoreComputed(sandbox, mainStore, 'currentTab', null);
        stubStoreComputed(sandbox, mainStore, 'currentSetting', {} as FCBSetting);
        
        const result = await DirectoryScrollService.scrollToActiveEntry();
        expect(result).to.be.undefined;
      });

      it('should return early if no current setting', async () => {
        stubStoreComputed(sandbox, mainStore, 'currentTab', {
          header: { uuid: 'test-uuid' },
          tabType: WindowTabType.Entry
        });
        stubStoreComputed(sandbox, mainStore, 'currentSetting', null);
        
        const result = await DirectoryScrollService.scrollToActiveEntry();
        expect(result).to.be.undefined;
      });

      it('should return early if no content ID', async () => {
        stubStoreComputed(sandbox, mainStore, 'currentTab', {
          header: {},
          tabType: WindowTabType.Entry
        });
        stubStoreComputed(sandbox, mainStore, 'currentSetting', {} as FCBSetting);
        
        const result = await DirectoryScrollService.scrollToActiveEntry();
        expect(result).to.be.undefined;
      });

      it('should handle Entry tab type', async () => {
        const entryStub = sandbox.stub(Entry, 'fromUuid').resolves({} as Entry);
        const scrollToEntrySpy = sandbox.spy(DirectoryScrollService, 'scrollToEntry');
        
        stubStoreComputed(sandbox, mainStore, 'currentTab', {
          header: { uuid: 'entry-uuid' },
          tabType: WindowTabType.Entry
        });
        stubStoreComputed(sandbox, mainStore, 'currentSetting', {} as FCBSetting);
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(entryStub.calledWith('entry-uuid')).to.be.true;
        expect(scrollToEntrySpy.calledWith('entry-uuid')).to.be.true;
      });

      it('should handle Campaign tab type', async () => {
        const scrollToCampaignSpy = sandbox.spy(DirectoryScrollService, 'scrollToCampaign');
        
        stubStoreComputed(sandbox, mainStore, 'currentTab', {
          header: { uuid: 'campaign-uuid' },
          tabType: WindowTabType.Campaign
        });
        stubStoreComputed(sandbox, mainStore, 'currentSetting', {} as FCBSetting);
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(scrollToCampaignSpy.calledOnce).to.be.true;
      });

      it('should handle Session tab type', async () => {
        const scrollToSessionSpy = sandbox.spy(DirectoryScrollService, 'scrollToSession');
        
        stubStoreComputed(sandbox, mainStore, 'currentTab', {
          header: { uuid: 'session-uuid' },
          tabType: WindowTabType.Session
        });
        stubStoreComputed(sandbox, mainStore, 'currentSetting', {} as FCBSetting);
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(scrollToSessionSpy.calledWith('session-uuid')).to.be.true;
      });

      it('should handle Setting tab type', async () => {
        const scrollToSettingSpy = sandbox.spy(DirectoryScrollService, 'scrollToSetting');
        
        stubStoreComputed(sandbox, mainStore, 'currentTab', {
          header: { uuid: 'setting-uuid' },
          tabType: WindowTabType.Setting
        });
        stubStoreComputed(sandbox, mainStore, 'currentSetting', {} as FCBSetting);
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(scrollToSettingSpy.calledOnce).to.be.true;
      });

      it('should handle Front tab type', async () => {
        const scrollToFrontSpy = sandbox.spy(DirectoryScrollService, 'scrollToFront');
        
        stubStoreComputed(sandbox, mainStore, 'currentTab', {
          header: { uuid: 'front-uuid' },
          tabType: WindowTabType.Front
        });
        stubStoreComputed(sandbox, mainStore, 'currentSetting', {} as FCBSetting);
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(scrollToFrontSpy.calledWith('front-uuid')).to.be.true;
      });

      it('should handle Arc tab type', async () => {
        const scrollToArcSpy = sandbox.spy(DirectoryScrollService, 'scrollToArc');
        
        stubStoreComputed(sandbox, mainStore, 'currentTab', {
          header: { uuid: 'arc-uuid' },
          tabType: WindowTabType.Arc
        });
        stubStoreComputed(sandbox, mainStore, 'currentSetting', {} as FCBSetting);
        
        await DirectoryScrollService.scrollToActiveEntry();
        
        expect(scrollToArcSpy.calledWith('arc-uuid')).to.be.true;
      });
    });
  });
};
