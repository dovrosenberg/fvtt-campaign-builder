import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Backend } from '@/classes/Backend';
import { ModuleSettings, SettingKey } from '@/settings';
import * as sinon from 'sinon';

export const registerBackendTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Backend',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('Backend', () => {
        // Setup stubs
        let getStub;
        let fcbApiStub;
        let apiVersionGetStub;
        let notifyStub;
        let originalVersion;

        // Reset stubs before each test
        beforeEach(() => {
          // Store original values if they exist
          originalVersion = game.version || '1.0.0';

          // Reset Backend
          Backend.available = false;
          Backend.config = undefined as any;
          Backend.api = undefined as any;

          // Create stubs
          getStub = sinon.stub(ModuleSettings, 'get');
          fcbApiStub = sinon.stub(globalThis, 'FCBApi').returns({
            apiVersionGet: apiVersionGetStub = sinon.stub()
          });

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
            expect(fcbApiStub.called).to.equal(false);
            expect(Backend.available).to.equal(false);
          });

          it('should create FCBApi with config when settings are provided', async () => {
            // Arrange
            getStub.withArgs(SettingKey.APIToken).returns('test-token');
            getStub.withArgs(SettingKey.APIURL).returns('http://test-url');
            apiVersionGetStub.resolves({
              data: { version: '1.0.0' }
            });

            // Act
            await Backend.configure();

            // Assert
            expect(fcbApiStub.calledOnce).to.equal(true);
            expect(Backend.config.accessToken).to.equal('test-token');
            expect(Backend.config.basePath).to.equal('http://test-url');
            expect(apiVersionGetStub.calledOnce).to.equal(true);
          });

          it('should set available to true when version matches', async () => {
            // Arrange
            getStub.withArgs(SettingKey.APIToken).returns('test-token');
            getStub.withArgs(SettingKey.APIURL).returns('http://test-url');
            apiVersionGetStub.resolves({
              data: { version: '1.0.0' }
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
            globalThis.version = '#{VERSION}#';

            // Act
            await Backend.configure();

            // Assert
            expect(notifyStub.calledWith(
              sinon.match.string.and(sinon.match('Development module detected')),
              'warning'
            )).to.equal(true);
            expect(Backend.available).to.equal(true);
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
