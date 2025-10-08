import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { ModuleSettings, SettingKey } from '@/settings';
import { moduleId } from '@/settings/index';
import * as sinon from 'sinon';

export const registerModuleSettingsTests = () => {
  quench.registerBatch(
    'campaign-builder.settings.ModuleSettings',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('ModuleSettings', () => {
        // Setup stubs
        let getStub;
        let setStub;
        let registerStub;
        let registerMenuStub;

        beforeEach(() => {
          // Stub game settings to avoid affecting actual settings during tests
          getStub = sinon.stub(game.settings, 'get');
          setStub = sinon.stub(game.settings, 'set');
          registerStub = sinon.stub(game.settings, 'register');
          registerMenuStub = sinon.stub(game.settings, 'registerMenu');

          // We don't need to stub foundry.utils.deepClone as it's a real function in Foundry
        });

        afterEach(() => {
          sinon.restore();
        });

        describe('get', () => {
          it('should call game.settings.get with correct parameters', () => {
            // Arrange
            const mockValue = 'test-value';
            getStub.returns(mockValue);

            // Act
            const result = ModuleSettings.get(SettingKey.APIToken);

            // Assert
            expect(getStub.calledWith(moduleId, SettingKey.APIToken)).to.equal(true);
            expect(result).to.equal(mockValue);
          });
        });

        describe('getClone', () => {
          it('should return a deep clone of the setting value', () => {
            // Arrange
            const originalValue = { key: 'value', nested: { prop: 'test' } };
            getStub.returns(originalValue);

            // Act
            const result = ModuleSettings.getClone(SettingKey.generatorConfig as any);

            // Assert
            expect(getStub.calledWith(moduleId, SettingKey.generatorConfig)).to.equal(true);

            // Check that it's a different object with the same content
            expect(result).not.to.equal(originalValue); // Different reference
            expect(result.key).to.equal(originalValue.key);
            expect(result.nested.prop).to.equal(originalValue.nested.prop);

            // Verify it's a true deep clone by modifying the result
            result.nested.prop = 'modified';
            expect(originalValue.nested.prop).to.equal('test'); // Original unchanged
          });
        });

        describe('set', () => {
          it('should call game.settings.set with correct parameters', async () => {
            // Arrange
            const testValue = 'new-test-value';
            setStub.resolves(undefined);

            // Act
            await ModuleSettings.set(SettingKey.APIToken, testValue);

            // Assert
            expect(setStub.calledWith(moduleId, SettingKey.APIToken, testValue)).to.equal(true);
          });
        });

        describe('register', () => {
          it('should register all settings and menus', () => {
            // Act
            ModuleSettings.register();

            // Assert - just check that the registration methods were called
            // The exact number of calls depends on the implementation details
            expect(registerStub.called).to.equal(true);
            expect(registerMenuStub.called).to.equal(true);
          });
        });
      });
    }
  );
};