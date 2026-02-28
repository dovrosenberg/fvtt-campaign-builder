import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { GeneratorType } from '@/types';
import { FCBSetting } from '@/classes';
import { RollTableFlagKey } from '@/documents';
import NameGeneratorsService from '@/utils/nameGenerators';
import { getTestSetting } from '@unittest/testUtils';
import { useBackendStore } from '@/applications/stores';
import NotificationService from '@/utils/notifications';
import { moduleId } from '@/settings';

export const registerNameGeneratorsTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  let testSetting: FCBSetting;
  let backendStore: any;
  let notifyInfoStub: sinon.SinonStub;

  beforeEach(async () => {
    // Get the shared test setting
    testSetting = getTestSetting();

    // Create a testing pinia instance with stubbed BackendStore
    const pinia = createTestingPinia({
      createSpy: sinon.spy,
      stubActions: false,
      initialState: {
        backend: {
          available: true,
          generateCharacterNames: sinon.stub().resolves({ data: { names: ['Test NPC 1', 'Test NPC 2'] } }),
          generateStoreNames: sinon.stub().resolves({ data: { names: ['Test Store 1', 'Test Store 2'] } }),
          generateTavernNames: sinon.stub().resolves({ data: { names: ['Test Tavern 1', 'Test Tavern 2'] } }),
          generateTownNames: sinon.stub().resolves({ data: { names: ['Test Town 1', 'Test Town 2'] } })
        }
      }
    });
    
    // Get the stubbed backend store
    backendStore = useBackendStore(pinia);

    // Stub notifyInfo
    notifyInfoStub = sinon.stub(NotificationService, 'info');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('TABLE_SIZE', () => {
    it('should be 100', () => {
      expect(NameGeneratorsService.TABLE_SIZE).to.equal(100);
    });
  });

  describe('initializeSettingRollTables', () => {
    it('should create roll tables for all generator types', async () => {
      // Clear any existing config
      testSetting.rollTableConfig = null;
      await testSetting.save();

      await NameGeneratorsService.initializeSettingRollTables(testSetting);

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
      
      // Delete one table
      const npcTableUuid = testSetting.rollTableConfig?.rollTables[GeneratorType.NPC];
      const npcTable = await foundry.utils.fromUuid<RollTable>(npcTableUuid);
      await npcTable?.delete();

      // Initialize again
      await NameGeneratorsService.initializeSettingRollTables(testSetting);

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
      const tableUuid = testSetting.rollTableConfig?.rollTables[GeneratorType.NPC];
      testTable = (await foundry.utils.fromUuid<RollTable>(tableUuid))!;
    });

    it('should throw error when backend is not available', async () => {
      backendStore.available = false;
      
      try {
        await NameGeneratorsService.refreshSettingRollTable(testTable, testSetting);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Backend is not available');
      }
    });

    it('should throw error when table is missing type flag', async () => {
      await testTable.unsetFlag(game.modules.get('fvtt-campaign-builder')?.id || '', RollTableFlagKey.type);
      
      try {
        await NameGeneratorsService.refreshSettingRollTable(testTable, testSetting);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('missing type flag');
      }
    });

    it('should generate new names for drawn results', async () => {
      // Mark some results as drawn
      const results = Array.from(testTable.results.values());
      await testTable.updateEmbeddedDocuments('TableResult', [
        { _id: results[0].id, drawn: true },
        { _id: results[1].id, drawn: true }
      ]);

      await NameGeneratorsService.refreshSettingRollTable(testTable, testSetting);

      // Check that backend was called
      expect(backendStore.generateCharacterNames.calledOnce).to.be.true;
      
      // Check that drawn results were replaced
      const updatedResults = Array.from(testTable.results.values());
      expect(updatedResults[0].drawn).to.be.false;
      expect(updatedResults[1].drawn).to.be.false;
      expect(updatedResults[0].name).to.be.oneOf(['Test NPC 1', 'Test NPC 2']);
    });

    it('should add new results if table is below TABLE_SIZE', async () => {
      // Clear all results
      await testTable.deleteEmbeddedDocuments('TableResult', testTable.results.map(r => r.id));

      await NameGeneratorsService.refreshSettingRollTable(testTable, testSetting);

      // Should have generated new results
      expect(testTable.results.size).to.equal(NameGeneratorsService.TABLE_SIZE);
      expect(backendStore.generateCharacterNames.calledOnce).to.be.true;
    });
  });

  describe('refreshSettingRollTables', () => {
    beforeEach(async () => {
      await NameGeneratorsService.initializeSettingRollTables(testSetting);
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

      await NameGeneratorsService.refreshSettingRollTables(testSetting);

      // Check that notification was shown
      expect(notifyInfoStub.calledOnce).to.be.true;
      
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

    it('should clear all results when empty parameter is true', async () => {
      // First ensure tables have results
      await NameGeneratorsService.refreshSettingRollTables(testSetting);

      // Clear with empty=true
      await NameGeneratorsService.refreshSettingRollTables(testSetting, true);

      // All tables should be empty
      for (const type of Object.values(GeneratorType)) {
        const tableUuid = testSetting.rollTableConfig?.rollTables[type];
        const table = (await foundry.utils.fromUuid<RollTable>(tableUuid))!;
        expect(table.results.size).to.equal(0);
      }
    });
  });

  describe('updateSettingRollTableNames', () => {
    beforeEach(async () => {
      await NameGeneratorsService.initializeSettingRollTables(testSetting);
    });

    it('should update folder and table names when setting name changes', async () => {
      const originalName = testSetting.name;
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
    let secondSetting: FCBSetting;

    beforeEach(async () => {
      // Create a second test setting
      secondSetting = (await FCBSetting.create(false, 'Second Test Setting'))!;
      await NameGeneratorsService.initializeSettingRollTables(testSetting);
      await NameGeneratorsService.initializeSettingRollTables(secondSetting);
    });

    afterEach(async () => {
      await secondSetting.delete();
    });

    it('should refresh tables for all settings', async () => {
      // Mark some results as drawn
      const table1Uuid = testSetting.rollTableConfig?.rollTables[GeneratorType.NPC];
      const table1 = (await foundry.utils.fromUuid<RollTable>(table1Uuid))!;
      const table2Uuid = secondSetting.rollTableConfig?.rollTables[GeneratorType.NPC];
      const table2 = (await foundry.utils.fromUuid<RollTable>(table2Uuid))!;

      await table1.updateEmbeddedDocuments('TableResult', [
        { _id: Array.from(table1.results.values())[0].id, drawn: true }
      ]);
      await table2.updateEmbeddedDocuments('TableResult', [
        { _id: Array.from(table2.results.values())[0].id, drawn: true }
      ]);

      await NameGeneratorsService.refreshAllSettingRollTables();

      // Both tables should have been refreshed
      const results1 = Array.from(table1.results.values());
      const results2 = Array.from(table2.results.values());
      expect(results1.every(r => !r.drawn)).to.be.true;
      expect(results2.every(r => !r.drawn)).to.be.true;
    });
  });
};
