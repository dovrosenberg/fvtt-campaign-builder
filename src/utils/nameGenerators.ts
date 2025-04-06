import { moduleId, ModuleSettings, SettingKey } from '@/settings';
import { useMainStore } from '@/applications/stores';
import { localize } from '@/utils/game';
import { Backend } from '@/classes/Backend';

import { GeneratorType, GeneratorConfig, } from '@/types';
export const TABLE_SIZE = 15;  // number of items per table

/**
 * Initialize the roll tables for all generator types
 * @param config Optional configuration for the number of entries per generator type
 */
export async function initializeRollTables(): Promise<void> {
  // Get or create the folder for roll tables
  const folderId = await getOrCreateRollTableFolder();
  
  // Get existing generator config or create a new one
  const existingConfig = ModuleSettings.get(SettingKey.generatorConfig);
  const generatorConfig: GeneratorConfig = {
    folderId: folderId,
    rollTables: {} as Record<GeneratorType, string>,
    ...existingConfig
  };
  
  // Ensure all generator types have a roll table
  for (const type of Object.values(GeneratorType)) {
    // Check if we already have a table for this type
    if (generatorConfig.rollTables[type]) {
      // Verify the table still exists and is the right type
      const table = await fromUuid(generatorConfig.rollTables[type]);
      if (table) {
        if (table.getFlag(moduleId, 'type')===type)
          continue; // Table exists, skip to next type
      }
    }
    
    // Create a new table
    const table = await createRollTable(type, folderId);
    
    // Store the table ID in the mapping
    generatorConfig.rollTables[type] = table.uuid;
  }
  
  // Save the generator config
  await ModuleSettings.set(SettingKey.generatorConfig, generatorConfig);
  
  // Check if we should auto-refresh
  const autoRefresh = ModuleSettings.get(SettingKey.autoRefreshRollTables);
  if (autoRefresh) {
    await refreshAllRollTables();
  }
}
/**
 * Get or create the folder for campaign builder roll tables
 * @returns The ID of the folder
 */
const getOrCreateRollTableFolder = async(): Promise<string> => {
  // Check if we already have a folder ID stored
  const config = ModuleSettings.get(SettingKey.generatorConfig);
  if (config?.folderId) {
    // Verify the folder still exists
    const folder = game.folders?.get(config.folderId);
    if (folder) {
      return config.folderId;
    }
  }

  // Create a new folder
  const newFolder = await Folder.create({
    name: localize('applications.rollTableSettings.folderName'),
    type: 'RollTable',
    parent: null
  });

  return newFolder.id;
}

/**
 * Generate table results for a specific generator type using the backend API
 * @param type The generator type
 * @param count The number of results to generate
 * @returns An array of table results
 */
const generateTableResults = async (type: GeneratorType, count: number): string[] => {
  const results: string[] = [];

  // If backend is not available, return fallback results
  if (!Backend.available || !Backend.api) {
    return [];
  }

  try {
    // Get world settings for genre and feeling
    const world = useMainStore().currentWorld;
    const genre = world?.genre || 'fantasy';
    const worldFeeling = world?.feeling || '';

    // For now, they all have the same request format
    const request = {
      count,
      genre,
      worldFeeling
    };

    // Call the appropriate backend API based on the generator type
    let response;
    switch (type) {
      case GeneratorType.NPC:
        response = await Backend.api.apiNameCharactersPost(request);
        break;

      case GeneratorType.Store:
        response = await Backend.api.apiNameStoresPost(request);
        break;

      case GeneratorType.Tavern:
        response = await Backend.api.apiNameTavernsPost(request);
        break;

      case GeneratorType.Town:
        response = await Backend.api.apiNameTownsPost(request);
        break;

      default:
        throw new Error('Unknown generator type: ${type} in generators.generateTableResults()');
    }

    return response.data.names;
  } catch (error) {
    throw new Error(`Error in generators.generateTableResults() generating names for ${type}:, ${error}`);
  }
}

/**
 * Create a Foundry RollTable for a generator type and populate it
 * @param type The generator type
 * @param folderId The ID of the folder to create the table in
 * @returns The created RollTable
 */
async function createRollTable(type: GeneratorType, folderId: string): Promise<RollTable> {
  const tableName = `${type.charAt(0).toUpperCase() + type.slice(1)} Generator`;
  
  // Create the table
  const table = await RollTable.create({
    name: tableName,
    folder: folderId,
    description: `${localize('applications.rollTableSettings.tableDescription')}-${type}`,
    formula: `1d${TABLE_SIZE}`,
    replacement: false, // Don't replace drawn results
    displayRoll: false, // Don't display the roll publicly
  });
  
  
  await table.setFlag(moduleId, 'type', type);

  await refreshRollTable(table);
  
  return table;
}

/** removes any "used" results and adds replacements for them; tops up to TABLE_SIZE */
export const refreshRollTable = async (rollTable: RollTable) : Promise<void> => {
  // get the type
  const type = rollTable.getFlag(moduleId, 'type');

  // find all the drawn ones that need to be replaced
  const drawnResults = rollTable.results.filter(r => r.drawn).map(r => r.id) as string[];
  
  // get remaining count - if < TABLE_SIZE, need to make up the difference
  const neededItems = TABLE_SIZE - rollTable.results.size + drawnResults.length;

  if (neededItems > 0) {
    // get all the new results 
    const newResults = await generateTableResults(type, neededItems);

    // replace the drawn items first
    await rollTable.updateEmbeddedDocuments("TableResult", drawnResults.map((id: string, i: number) => ({
      _id: id,
      text: newResults[i],
      drawn: false,
    })));

    // now add any extras
    const numUsed = drawnResults.length;
    await rollTable.createEmbeddedDocuments("TableResult", 
      newResults.slice(numUsed).map((val: string, index: number) => ({
        type: CONST.TABLE_RESULT_TYPES.TEXT,
        drawn: false,
        text: val,
        weight: 1,
        range: [index+numUsed+1, index+numUsed+1],
      }))
    );
  } 
}

export const refreshAllRollTables = async() : Promise<void> => {
  const config = ModuleSettings.get(SettingKey.generatorConfig);

  for (const key in config?.rollTables) {
    const table = await fromUuid(config.rollTables[key]);
    if (table)
      await refreshRollTable(table as unknown as RollTable);
  }
}
