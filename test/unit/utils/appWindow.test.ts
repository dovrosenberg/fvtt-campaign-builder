import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { moduleId } from '@/settings';
import * as sinon from 'sinon';

export const registerAppWindowTests = () => {
  quench.registerBatch('campaign-builder.utils.appWindow', (context: QuenchBatchContext) => {
    const { describe, it, expect, beforeEach, afterEach } = context;

    describe('appWindow utilities', () => {
      let appWindowUtilities: typeof import('@/utils/appWindow');
      let modulesRegistry: Map<string, { activeWindow: any }>;
      let moduleConfig: { activeWindow: any };

      beforeEach(async () => {
        appWindowUtilities = await import('@/utils/appWindow');

        moduleConfig = { activeWindow: null };
        modulesRegistry = new Map([[moduleId, moduleConfig]]);

        (globalThis as any).game = {
          modules: modulesRegistry,
        };
      });

      afterEach(() => {
        sinon.restore();
        delete (globalThis as any).game;
      });

      describe('isCampaignBuilderAppOpen', () => {
        it('returns false when module is missing', () => {
          modulesRegistry.delete(moduleId);

          const { isCampaignBuilderAppOpen } = appWindowUtilities;

          expect(isCampaignBuilderAppOpen()).to.equal(false);
        });

        it('returns false when activeWindow is null', () => {
          moduleConfig.activeWindow = null;

          const { isCampaignBuilderAppOpen } = appWindowUtilities;

          expect(isCampaignBuilderAppOpen()).to.equal(false);
        });

        it('returns true when activeWindow exists', () => {
          moduleConfig.activeWindow = {};

          const { isCampaignBuilderAppOpen } = appWindowUtilities;

          expect(isCampaignBuilderAppOpen()).to.equal(true);
        });
      });

      describe('closeCampaignBuilderApp', () => {
        it('closes the active window and clears reference when window is open', () => {
          const closeStub = sinon.stub();
          moduleConfig.activeWindow = { close: closeStub };

          const { closeCampaignBuilderApp } = appWindowUtilities;

          closeCampaignBuilderApp();

          expect(closeStub.calledOnce).to.equal(true);
          expect(moduleConfig.activeWindow).to.equal(null);
        });

        it('does nothing when the app is not open', () => {
          moduleConfig.activeWindow = null;

          const closeStub = sinon.stub();
          moduleConfig.close = closeStub;

          const { closeCampaignBuilderApp } = appWindowUtilities;

          closeCampaignBuilderApp();

          expect(closeStub.called).to.equal(false);
        });
      });
    });
  });
};
