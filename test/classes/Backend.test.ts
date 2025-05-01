import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Backend } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';
import * as sinon from 'sinon';

// Create a mock FCBApi class
class MockFCBApi {
  apiVersionGet: sinon.SinonStub;
  
  constructor() {
    this.apiVersionGet = sinon.stub();
  }
}

// Import the actual module to replace its exports
import * as apiClientModule from '@/apiClient';

export const registerBackendTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Backend',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('Backend', () => {
        // Setup stubs
        let getStub;
        let apiVersionGetStub;
        let notifyStub;
        let originalVersion;
        let mockFCBApi;
        let originalFCBApi;

        // Reset stubs before each test
        beforeEach(() => {
          // Store original values if they exist
          originalVersion = game.version || '1.0.0';
          originalFCBApi = apiClientModule.FCBApi;

          // Create mock FCBApi instance
          mockFCBApi = new MockFCBApi();
          apiVersionGetStub = mockFCBApi.apiVersionGet;
          
          // Stub the FCBApi constructor to return the mock instance
          sinon.stub(apiClientModule, 'FCBApi').callsFake(() => mockFCBApi);

          // Reset Backend
          Backend.available = false;
          Backend.config = undefined as any;
          Backend.api = undefined as any;

          // Create stubs
          getStub = sinon.stub(ModuleSettings, 'get');

          // Stub UI notifications to avoid actual notifications during tests
          notifyStub = sinon.stub(ui.notifications, 'notify');
        });

        afterEach(() => {
          // Restore all stubs
          sinon.restore();
        });

        describe('configure', () => {
          it('should set available to false initially', async () => {
            // Arrange
            getStub.withArgs(SettingKey.APIToken).returns('');
            getStub.withArgs(SettingKey.APIURL).returns('');

            // Act
            await Backend.configure();

            // Assert
            expect(Backend.available).to.equal(false);
          });

          it('should return early if both token and URL are empty', async () => {
            // Arrange
            getStub.withArgs(SettingKey.APIToken).returns('');
            getStub.withArgs(SettingKey.APIURL).returns('');

            // Act
            await Backend.configure();

            // Assert
            expect(apiVersionGetStub.called).to.equal(false);
            expect(Backend.available).to.equal(false);
          });

          it('should create FCBApi with config when settings are provided', async () => {
            // Arrange
            getStub.withArgs(SettingKey.APIToken).returns('test-token');
            getStub.withArgs(SettingKey.APIURL).returns('http://test-url');
            apiVersionGetStub.resolves({
              data: { version: '0.0.7' }
            });

            // Act
            await Backend.configure();

            // Assert
            expect(Backend.config.accessToken).to.equal('test-token');
            expect(Backend.config.basePath).to.equal('http://test-url');
            expect(apiVersionGetStub.calledOnce).to.equal(true);
          });

          it('should set available to true when version matches', async () => {
            // Arrange
            getStub.withArgs(SettingKey.APIToken).returns('test-token');
            getStub.withArgs(SettingKey.APIURL).returns('http://test-url');
            apiVersionGetStub.resolves({
              data: { version: '0.0.7' }
            });

            // Act
            await Backend.configure();

            // Assert
            expect(Backend.available).to.equal(true);
          });

          it('should show warning notification for development version', async () => {
            // Arrange
            getStub.withArgs(SettingKey.APIToken).returns('test-token');
            getStub.withArgs(SettingKey.APIURL).returns('http://test-url');
            apiVersionGetStub.resolves({
              data: { version: '2.0.0' }
            });

            // Set development version
            const actualVersion = globalThis.version;
            globalThis.version = '#{VERSION}#';

            // Act
            await Backend.configure();

            // Assert
            expect(notifyStub.calledWith(
              sinon.match.string.and(sinon.match('Development module detected')),
              'warning'
            )).to.equal(true);
            expect(Backend.available).to.equal(true);

            globalThis.version = actualVersion;
          });

          it('should show error notification when versions mismatch', async () => {
            // Arrange
            getStub.withArgs(SettingKey.APIToken).returns('test-token');
            getStub.withArgs(SettingKey.APIURL).returns('http://test-url');
            apiVersionGetStub.resolves({
              data: { version: '2.0.0' }
            });

            // Act
            await Backend.configure();

            // Assert
            expect(notifyStub.calledWith(
              sinon.match.string.and(sinon.match('doesn\'t match the version of the module')),
              'error'
            )).to.equal(true);
            expect(Backend.available).to.equal(false);
          });

          it('should show error notification when connection fails', async () => {
            // Arrange
            getStub.withArgs(SettingKey.APIToken).returns('test-token');
            getStub.withArgs(SettingKey.APIURL).returns('http://test-url');
            apiVersionGetStub.rejects(new Error('Connection failed'));

            // Act
            await Backend.configure();

            // Assert
            expect(notifyStub.calledWith(
              sinon.match.string.and(sinon.match('Failed to connect to backend')),
              'error'
            )).to.equal(true);
            expect(Backend.available).to.equal(false);
          });
        });
      });
    }
  );
};
