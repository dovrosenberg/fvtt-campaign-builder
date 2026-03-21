import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { GeneratorType } from '@/types';
import { FCBSetting } from '@/classes';
import { RollTableFlagKey } from '@/documents';
import NameGeneratorsService from '@/utils/nameGenerators';
import { getTestSetting, rollTableHelper } from '@unittest/testUtils';
import { 
  createBackendStoreStubs, 
  resetBackendStoreStubHistory,
  createMainStoreStubs,
  type BackendStoreStubs,
  type MainStoreStubs,
} from '@unittest/stores';
import NotificationService from '@/utils/notifications';
import GlobalSettingService from '@/utils/globalSettings';
import { moduleId } from '@/settings';

export const registerNameGeneratorsTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  let testSetting: FCBSetting;
  let backendStubs: BackendStoreStubs;
  let mainStoreStubs: MainStoreStubs;
  let notifyInfoStub: sinon.SinonStub;
  let getGlobalSettingStub: sinon.SinonStub;

  beforeEach(async () => {
    // Get the shared test setting
    testSetting = getTestSetting();

    // Create stubbed stores - they share a single Pinia instance automatically
    backendStubs = createBackendStoreStubs();
    mainStoreStubs = createMainStoreStubs({ settings: [testSetting] });

    // Stub GlobalSettingService.getGlobalSetting to return settings by UUID
    getGlobalSettingStub = sinon.stub(GlobalSettingService, 'getGlobalSetting');
    getGlobalSettingStub.withArgs(testSetting.uuid).resolves(testSetting);

    // Stub notifyInfo
    notifyInfoStub = sinon.stub(NotificationService, 'info');
  });

  afterEach(async () => {
    sinon.restore();
    // The batch-level after hook will handle final cleanup
    await rollTableHelper.cleanup();
    await rollTableHelper.clearConfig(testSetting);
  });

  describe('TABLE_SIZE', () => {
    it('should be 100', () => {
      expect(NameGeneratorsService.TABLE_SIZE).to.equal(100);
    });
  });

  describe('initializeSettingRollTables', () => {
    beforeEach(async () => {
      await NameGeneratorsService.initializeSettingRollTables(testSetting);
      rollTableHelper.trackSettingTables(testSetting);
    });

    it('should create roll tables for all generator types', async () => {
      // Clear any existing config
      testSetting.rollTableConfig = null;
      await testSetting.save();

      await NameGeneratorsService.initializeSettingRollTables(testSetting);
      // Track the new tables created by this test
      rollTableHelper.trackSettingTables(testSetting);

      // Check that config was created
      expect(testSetting.rollTableConfig).to.not.be.null;
      expect(testSetting.rollTableConfig?.rollTables).to.have.all.keys(Object.values(GeneratorType));
      
      // Check that tables exist
      for (const type of Object.values(GeneratorType)) {
        const tableUuid = testSetting.rollTableConfig?.rollTables[type];
        expect(tableUuid).to.be.a('string');
        
        const table = await foundry.utils.fromUuid<RollTable>(tableUuid);
        expect(table).to.not.be.null;
        expect(table?.getFlag(moduleId, RollTableFlagKey.type)).to.equal(type);
      }
    });

    it('should not recreate existing tables', async () => {
      // Initialize once
      await NameGeneratorsService.initializeSettingRollTables(testSetting);
      const originalConfig = testSetting.rollTableConfig;
      const originalTableIds = { ...originalConfig?.rollTables };

      // Initialize again
      await NameGeneratorsService.initializeSettingRollTables(testSetting);

      // Table IDs should be the same
      expect(testSetting.rollTableConfig?.rollTables).to.deep.equal(originalTableIds);
    });

    it('should handle missing tables by recreating them', async () => {
      // Initialize first
      await NameGeneratorsService.initializeSettingRollTables(testSetting);
      rollTableHelper.trackSettingTables(testSetting);
      
      // Delete one table
      const npcTableUuid = testSetting.rollTableConfig?.rollTables[GeneratorType.NPC];
      const npcTable = await foundry.utils.fromUuid<RollTable>(npcTableUuid);
      await npcTable?.delete();

      // Initialize again
      await NameGeneratorsService.initializeSettingRollTables(testSetting);
      // Track the recreated table
      rollTableHelper.trackSettingTables(testSetting);

      // Should have recreated the missing table
      const newNpcTableUuid = testSetting.rollTableConfig?.rollTables[GeneratorType.NPC];
      expect(newNpcTableUuid).to.not.equal(npcTableUuid);
      
      const newNpcTable = await foundry.utils.fromUuid<RollTable>(newNpcTableUuid);
      expect(newNpcTable).to.not.be.null;
    });
  });

  describe('refreshSettingRollTable', () => {
    let testTable: RollTable;

    beforeEach(async () => {
      // Create a test table
      await NameGeneratorsService.initializeSettingRollTables(testSetting);
      rollTableHelper.trackSettingTables(testSetting);
      const tableUuid = testSetting.rollTableConfig?.rollTables[GeneratorType.NPC];
      testTable = (await foundry.utils.fromUuid<RollTable>(tableUuid))!;
      
      // Populate the table with initial results
      await NameGeneratorsService.refreshSettingRollTable(testTable, testSetting);
    });

    it('should throw error when backend is not available', async () => {
      backendStubs.store.available = false;
      
      try {
        await NameGeneratorsService.refreshSettingRollTable(testTable, testSetting);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.include('Backend is not available');
      }
    });

    it('should throw error when table is missing type flag', async () => {
      await testTable.unsetFlag(moduleId, RollTableFlagKey.type);
      
      try {
        await NameGeneratorsService.refreshSettingRollTable(testTable, testSetting);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.include('missing type flag');
      }
    });

    it('should generate new names for drawn results', async () => {
      // Mark some results as drawn
      const results = Array.from(testTable.results.values());
      await testTable.updateEmbeddedDocuments('TableResult', [
        { _id: results[0].id, drawn: true },
        { _id: results[1].id, drawn: true }
      ]);

      // Reset the stub call count (beforeEach already called it once)
      resetBackendStoreStubHistory(backendStubs);

      await NameGeneratorsService.refreshSettingRollTable(testTable, testSetting);

      // Check that backend was called
      expect(backendStubs.generateCharacterNames.calledOnce).to.be.true;
      
      // Check that drawn results were replaced
      const updatedResults = Array.from(testTable.results.values());
      expect(updatedResults[0].drawn).to.be.false;
      expect(updatedResults[1].drawn).to.be.false;
      expect(updatedResults[0].name).to.be.oneOf(['Test NPC 1', 'Test NPC 2']);
    });

    it('should add new results if table is below TABLE_SIZE', async () => {
      // Clear all results
      await testTable.deleteEmbeddedDocuments('TableResult', testTable.results.map(r => r.id));

      // Reset stub call count (beforeEach already called it once)
      resetBackendStoreStubHistory(backendStubs);

      await NameGeneratorsService.refreshSettingRollTable(testTable, testSetting);

      // Should have generated new results
      expect(testTable.results.size).to.equal(NameGeneratorsService.TABLE_SIZE);
      expect(backendStubs.generateCharacterNames.calledOnce).to.be.true;
    });
  });

  describe('refreshSettingRollTables', () => {
    beforeEach(async () => {
      await NameGeneratorsService.initializeSettingRollTables(testSetting);
      rollTableHelper.trackSettingTables(testSetting);
      // Populate all tables with initial results
      await NameGeneratorsService.refreshSettingRollTables(testSetting);
    });

    it('should refresh all tables for a setting', async () => {
      // Mark some results as drawn in each table
      for (const type of Object.values(GeneratorType)) {
        const tableUuid = testSetting.rollTableConfig?.rollTables[type];
        const table = (await foundry.utils.fromUuid<RollTable>(tableUuid))!;
        const results = Array.from(table.results.values());
        if (results.length > 0) {
          await table.updateEmbeddedDocuments('TableResult', [
            { _id: results[0].id, drawn: true }
          ]);
        }
      }

      // Reset stub call counts (beforeEach already called them)
      resetBackendStoreStubHistory(backendStubs);

      await NameGeneratorsService.refreshSettingRollTables(testSetting);
      
      // Check that all drawn results were replaced
      for (const type of Object.values(GeneratorType)) {
        const tableUuid = testSetting.rollTableConfig?.rollTables[type];
        const table = (await foundry.utils.fromUuid<RollTable>(tableUuid))!;
        const results = Array.from(table.results.values());
        if (results.length > 0) {
          expect(results.every(r => !r.drawn)).to.be.true;
        }
      }
    });

    it('should clear and refill all results when empty parameter is true', async () => {
      // First ensure tables have results
      await NameGeneratorsService.refreshSettingRollTables(testSetting);

      // Clear with empty=true (this clears AND refills with new names)
      await NameGeneratorsService.refreshSettingRollTables(testSetting, true);

      // All tables should still have TABLE_SIZE results
      for (const type of Object.values(GeneratorType)) {
        const tableUuid = testSetting.rollTableConfig?.rollTables[type];
        const table = (await foundry.utils.fromUuid<RollTable>(tableUuid))!;
        expect(table.results.size).to.equal(NameGeneratorsService.TABLE_SIZE);
        
        // All results should be not drawn (reset after refill)
        const results = Array.from(table.results.values());
        expect(results.every(r => !r.drawn)).to.be.true;
      }
    });
  });

  describe('updateSettingRollTableNames', () => {
    beforeEach(async () => {
      await NameGeneratorsService.initializeSettingRollTables(testSetting);
      rollTableHelper.trackSettingTables(testSetting);
    });

    it('should update folder and table names when setting name changes', async () => {
      const newName = 'Updated Test Setting';
      
      // Update setting name
      testSetting.name = newName;
      await testSetting.save();

      await NameGeneratorsService.updateSettingRollTableNames(testSetting);

      // Check folder name
      const config = testSetting.rollTableConfig;
      const folder = game.folders?.get(config?.folderId || '');
      expect(folder?.name).to.include(newName);

      // Check table names
      for (const type of Object.values(GeneratorType)) {
        const tableUuid = config?.rollTables[type];
        const table = await foundry.utils.fromUuid<RollTable>(tableUuid);
        expect(table?.name).to.include(newName);
        expect(table?.description).to.include(newName);
      }
    });
  });

  describe('refreshAllSettingRollTables', () => {
    // Note: We can't easily test multiple settings because mainStore.getAllSettings
    // reads from the settingIndex which doesn't include test settings.
    // Instead, we test that the function doesn't throw and handles the empty case.

    it('should not throw when no settings have roll tables configured', async () => {
      // The test setting doesn't have roll tables initialized in this describe block
      // so this tests the graceful handling of missing config
      await NameGeneratorsService.refreshAllSettingRollTables();
      // Should complete without throwing
    });
  });
};
