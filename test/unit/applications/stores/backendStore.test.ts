import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { useBackendStore } from '@/applications/stores';
import { ModuleSettings, SettingKey } from '@/settings';
import * as gameUtils from '@/utils/game';
import * as notifications from '@/utils/notifications';
import { FCBApi } from '@/apiClient';

export const registerBackendStoreTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('useBackendStore', () => {
    let backendStore: ReturnType<typeof useBackendStore>;
    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());

      // Create the store after pinia is set
      backendStore = useBackendStore();
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('initial state', () => {
      it('should have null config by default', () => {
        expect(backendStore.config).to.be.null;
      });

      it('should have available false by default', () => {
        expect(backendStore.available).to.be.false;
      });

      it('should have inProgress false by default', () => {
        expect(backendStore.inProgress).to.be.false;
      });

      it('should have empty isGeneratingImage by default', () => {
        expect(Object.keys(backendStore.isGeneratingImage)).to.have.length(0);
      });
    });

    describe('configure', () => {
      let isClientGMStub: sinon.SinonStub;
      let notifyErrorStub: sinon.SinonStub;
      let moduleSettingsGetStub: sinon.SinonStub;

      beforeEach(() => {
        isClientGMStub = sandbox.stub(gameUtils, 'isClientGM').returns(true);
        moduleSettingsGetStub = sandbox.stub(ModuleSettings, 'get');
        notifyErrorStub = sandbox.stub(notifications, 'notifyError');
        sandbox.stub(notifications, 'notifyInfo');
        sandbox.stub(notifications, 'notifyWarn');
      });

      it('should return early if not GM', async () => {
        isClientGMStub.returns(false);

        await backendStore.configure();

        expect(backendStore.available).to.be.false;
        expect(moduleSettingsGetStub.called).to.be.false;
      });

      it('should return early if already in progress', async () => {
        backendStore.inProgress = true;

        await backendStore.configure();

        expect(moduleSettingsGetStub.called).to.be.false;
      });

      it('should return early if already available and not forcing', async () => {
        backendStore.available = true;

        await backendStore.configure();

        expect(moduleSettingsGetStub.called).to.be.false;
      });

      it('should return early if both token and URL are blank', async () => {
        moduleSettingsGetStub.withArgs(SettingKey.APIToken).returns('');
        moduleSettingsGetStub.withArgs(SettingKey.APIURL).returns('');

        await backendStore.configure();

        expect(backendStore.inProgress).to.be.false;
        expect(backendStore.available).to.be.false;
      });

      it('should set inProgress to false in finally block', async () => {
        moduleSettingsGetStub.withArgs(SettingKey.APIToken).returns('');
        moduleSettingsGetStub.withArgs(SettingKey.APIURL).returns('');

        await backendStore.configure();

        expect(backendStore.inProgress).to.be.false;
      });

      it('should show error notification on connection failure', async () => {
        moduleSettingsGetStub.withArgs(SettingKey.APIToken).returns('test-token');
        moduleSettingsGetStub.withArgs(SettingKey.APIURL).returns('http://test-url');
        moduleSettingsGetStub.withArgs(SettingKey.hideBackendWarning).returns(false);

        // Stub FCBApi method to throw
        sandbox.stub(FCBApi.prototype, 'apiVersionGet').rejects(new Error('Connection failed'));

        await backendStore.configure();

        expect(notifyErrorStub.called).to.be.true;
        expect(backendStore.available).to.be.false;
      });

      it('should not show error notification if hideBackendWarning is true', async () => {
        moduleSettingsGetStub.withArgs(SettingKey.APIToken).returns('test-token');
        moduleSettingsGetStub.withArgs(SettingKey.APIURL).returns('http://test-url');
        moduleSettingsGetStub.withArgs(SettingKey.hideBackendWarning).returns(true);

        sandbox.stub(FCBApi.prototype, 'apiVersionGet').rejects(new Error('Connection failed'));

        await backendStore.configure();

        expect(notifyErrorStub.called).to.be.false;
      });
    });

    describe('isGeneratingImage', () => {
      it('should track image generation state by key', () => {
        const key1 = 'image-1';
        const key2 = 'image-2';

        backendStore.isGeneratingImage[key1] = true;
        backendStore.isGeneratingImage[key2] = false;

        expect(backendStore.isGeneratingImage[key1]).to.be.true;
        expect(backendStore.isGeneratingImage[key2]).to.be.false;
      });

      it('should allow setting and clearing generation state', () => {
        const key = 'test-image';

        backendStore.isGeneratingImage[key] = true;
        expect(backendStore.isGeneratingImage[key]).to.be.true;

        backendStore.isGeneratingImage[key] = false;
        expect(backendStore.isGeneratingImage[key]).to.be.false;

        delete backendStore.isGeneratingImage[key];
        expect(backendStore.isGeneratingImage[key]).to.be.undefined;
      });
    });

    describe('API methods when not configured', () => {
      it('getNamePreview should return undefined when api is null', async () => {
        const result = await backendStore.getNamePreview(['style1'], 'genre', 'feeling');

        expect(result).to.be.undefined;
      });

      it('getImageModels should return undefined when api is null', async () => {
        const result = await backendStore.getImageModels();

        expect(result).to.be.undefined;
      });

      it('getTextModels should return undefined when api is null', async () => {
        const result = await backendStore.getTextModels();

        expect(result).to.be.undefined;
      });

      it('generateLocation should return undefined when api is null', async () => {
        const result = await backendStore.generateLocation({} as any);

        expect(result).to.be.undefined;
      });

      it('generateCharacter should return undefined when api is null', async () => {
        const result = await backendStore.generateCharacter({} as any);

        expect(result).to.be.undefined;
      });
    });
  });
};
