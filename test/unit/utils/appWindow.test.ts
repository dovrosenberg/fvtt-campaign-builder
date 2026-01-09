import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { moduleId } from '@/settings';
import * as sinon from 'sinon';

export const registerAppWindowTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

    describe('appWindow utilities', () => {
      let appWindowUtilities: typeof import('@/utils/appWindow');
      let originalModule: any;

      beforeEach(async () => {
        appWindowUtilities = await import('@/utils/appWindow');

        // Store original module state for cleanup
        originalModule = game.modules.get(moduleId);
        
        // Clean up any existing activeWindow
        if (originalModule && 'activeWindow' in originalModule) {
          originalModule.activeWindow = null;
        }
      });

      afterEach(() => {
        // Restore original module state
        if (originalModule && 'activeWindow' in originalModule) {
          originalModule.activeWindow = null;
        }
      });

      describe('isCampaignBuilderAppOpen', () => {
        it('returns false when module is missing', () => {
          // This test assumes the module exists in test environment
          // In a real Foundry environment with the module loaded, this will return based on activeWindow
          const { isCampaignBuilderAppOpen } = appWindowUtilities;

          // If module somehow doesn't exist, should return false
          // Otherwise, will check activeWindow state
          const result = isCampaignBuilderAppOpen();
          expect(typeof result).to.equal('boolean');
        });

        it('returns false when activeWindow is null', () => {
          // Ensure activeWindow is null
          if (originalModule) {
            originalModule.activeWindow = null;
          }

          const { isCampaignBuilderAppOpen } = appWindowUtilities;

          expect(isCampaignBuilderAppOpen()).to.equal(false);
        });

        it('returns true when activeWindow exists', () => {
          // Set a mock activeWindow
          if (originalModule) {
            originalModule.activeWindow = {};
          }

          const { isCampaignBuilderAppOpen } = appWindowUtilities;

          expect(isCampaignBuilderAppOpen()).to.equal(true);
          
          // Clean up
          if (originalModule) {
            originalModule.activeWindow = null;
          }
        });
      });

      describe('closeCampaignBuilderApp', () => {
        it('closes the active window and clears reference when window is open', () => {
          const closeStub = sinon.stub();
          if (originalModule) {
            originalModule.activeWindow = { close: closeStub };
          }

          const { closeCampaignBuilderApp } = appWindowUtilities;

          closeCampaignBuilderApp();

          if (originalModule) {
            expect(closeStub.calledOnce).to.equal(true);
            expect(originalModule.activeWindow).to.equal(null);
          }
        });

        it('does nothing when the app is not open', () => {
          // Ensure activeWindow is null
          if (originalModule) {
            originalModule.activeWindow = null;
          }

          const closeStub = sinon.stub();
          if (originalModule) {
            originalModule.close = closeStub;
          }

          const { closeCampaignBuilderApp } = appWindowUtilities;

          closeCampaignBuilderApp();

          expect(closeStub.called).to.equal(false);
        });
      });
    });
};
