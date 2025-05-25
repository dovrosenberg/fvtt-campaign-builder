import { moduleId, ModuleSettings, SettingKey } from '@/settings';
import { localize } from '@/utils/game';
import { Backend } from '@/classes';
import { nameStyles } from '@/utils/nameStyles';

import { GeneratorType, WorldGeneratorConfig } from '@/types';
import { WBWorld } from '@/classes';
export const TABLE_SIZE = 100;  // number of items per table

/**
 * Initialize the roll tables for a specific world
 * @param world The world to initialize roll tables for
 */
export async function initializeWorldRollTables(world: WBWorld): Promise<void> {
  // Get or create the folder for roll tables for this world
  const folderId = await getOrCreateWorldRollTableFolder(world);
  
  // Get existing world generator config or create a new one
  const existingConfig = world.rollTableConfig;
  const worldGeneratorConfig: WorldGeneratorConfig = {
    folderId: folderId,
    rollTables: {} as Record<GeneratorType, string>,
    ...existingConfig
  };
  
  // Ensure all generator types have a roll table
  for (const type of Object.values(GeneratorType)) {
    // Check if we already have a table for this type
    if (worldGeneratorConfig.rollTables[type]) {
      // Verify the table still exists and is the right type
      const table = await fromUuid<RollTable>(worldGeneratorConfig.rollTables[type]);
      if (table) {
        if (table.getFlag(moduleId, 'type')===type)
          continue; // Table exists, skip to next type
      }
    }
    
    // Create a new table
    const table = await createWorldRollTable(type, folderId, world);
    
    // Store the table ID in the mapping
    if (table)
      worldGeneratorConfig.rollTables[type] = table.uuid;
  }
  
  // Save the world generator config
  world.rollTableConfig = worldGeneratorConfig;
  await world.save();
  
  // Check if we should auto-refresh
  const autoRefresh = ModuleSettings.get(SettingKey.autoRefreshRollTables);
  if (autoRefresh) {
    await refreshWorldRollTables(world);
  }
}

/**
 * Get or create the folder for campaign builder roll tables for a specific world
 * @param world The world to create the folder for
 * @returns The ID of the folder
 */
const getOrCreateWorldRollTableFolder = async(world: WBWorld): Promise<string> => {
  // Check if we already have a folder ID stored
  const config = world.rollTableConfig;
  if (config?.folderId) {
    // Verify the folder still exists
    const folder = game.folders?.get(config.folderId);
    if (folder) {
      return config.folderId;
    }
  }

  // Create a new folder
  const newFolder = await Folder.create({
    name: `${world.name} - ${localize('applications.rollTableSettings.folderName')}`,
    type: 'RollTable',
  });

  if (!newFolder) {
    throw new Error('Failed to create roll table folder');
  }

  return newFolder.id;
}

/**
 * Generate table results for a specific generator type using the backend API with world-specific name styles
 * @param type The generator type
 * @param count The number of results to generate
 * @param world The world to use for name styles and settings
 * @returns An array of table results
 */
const generateWorldTableResults = async (type: GeneratorType, count: number, world: WBWorld): Promise<string[]> => {
  // If backend is not available, throw an error 
  if (!Backend.available || !Backend.api) {
    throw new Error('Backend is not available. Please check your backend settings.');
  }

  try {
    // Get world settings for genre, feeling, and name styles
    const genre = world.genre || 'fantasy';
    const worldFeeling = world.worldFeeling || '';
    
    // Convert name style indices to actual style prompts
    const selectedNameStyles = world.nameStyles.map(index => {
      const style = nameStyles[index];
      if (!style) return '';
      return style.prompt.replace('{genre}', genre);
    }).filter(style => style !== '');

    // For now, they all have the same request format
    const request = {
      count,
      genre,
      worldFeeling,
      nameStyles: selectedNameStyles
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
        throw new Error(`Unknown generator type: ${type} in generators.generateWorldTableResults()`);
    }

    return response.data.names;
  } catch (error) {
    throw new Error(`Error in generators.generateWorldTableResults() generating names for ${type}: ${error}`);
  }
}

/**
 * Create a Foundry RollTable for a generator type and populate it for a specific world
 * @param type The generator type
 * @param folderId The ID of the folder to create the table in
 * @param world The world this table belongs to
 * @returns The created RollTable
 */
async function createWorldRollTable(type: GeneratorType, folderId: string, world: WBWorld): Promise<RollTable | null> {
  const tableName = `${world.name} - ${type.charAt(0).toUpperCase() + type.slice(1)} Generator`;
  
  // Create the table
  const table = await RollTable.create({
    name: tableName,
    folder: folderId,
    description: `${localize('applications.rollTableSettings.tableDescription')}-${world.name}-${world.name}`,
    formula: `1d${TABLE_SIZE}`,
    replacement: false, // Don't replace drawn results
    displayRoll: false, // Don't display the roll publicly
  });
  
  if (table) {
    await table.setFlag(moduleId, 'type', type);
    await table.setFlag(moduleId, 'worldId', world.uuid);

    await refreshWorldRollTable(table, world);
  
    return table;
  } else {
    return null;
  }
}

/** removes any "used" results and adds replacements for them; tops up to TABLE_SIZE for a world-specific table */
export const refreshWorldRollTable = async (rollTable: RollTable, world: WBWorld) : Promise<void> => {
  // get the type
  const type = rollTable.getFlag(moduleId, 'type');

  if (!type) {
    throw new Error(`Roll table ${rollTable.name} is missing type flag`);
  }

  // find all the drawn ones that need to be replaced
  const drawnResults = rollTable.results.filter(r => r.drawn).map(r => r.id) as string[];
  
  // get remaining count - if < TABLE_SIZE, need to make up the difference
  const neededItems = TABLE_SIZE - rollTable.results.size + drawnResults.length;

  if (neededItems > 0) {
    // get all the new results using world-specific settings
    const newResults = await generateWorldTableResults(type, neededItems, world);

    // replace the drawn items first
    if (drawnResults.length > 0) {
      await rollTable.updateEmbeddedDocuments("TableResult", drawnResults.map((id: string, i: number) => ({
        _id: id,
        text: newResults[i],
        drawn: false,
      })));
    }

    // now add any extras
    const numUsed = drawnResults.length;
    if (numUsed < newResults.length) {
      await rollTable.createEmbeddedDocuments("TableResult", 
        newResults.slice(numUsed).map((val: string, index: number) => ({
          type: CONST.TABLE_RESULT_TYPES.TEXT,
          drawn: false,
          text: val,
          weight: 1,
          range: [rollTable.results.size + index + 1, rollTable.results.size + index + 1],
        }))
      );
    }
  } 
}

/**
 * Refresh all roll tables for a specific world
 * @param world The world whose roll tables should be refreshed
 * @param empty Whether to empty the roll tables before refreshing them
 */
export const refreshWorldRollTables = async(world: WBWorld, empty: boolean = false) : Promise<void> => {
  const config = world.rollTableConfig;

  if (!config) {
    return; // No roll tables configured for this world
  }

  for (const key in config.rollTables) {
    const table = await fromUuid<RollTable>(config.rollTables[key]);
    if (table) {
      if (empty && table.results.size > 0) {
        await table.deleteEmbeddedDocuments("TableResult", table.results.map(r => r.id || ''));
      }

      await refreshWorldRollTable(table, world);
    }
  }
}

/**
 * Refresh all roll tables for all worlds - empties them and fills with new results
 */
export const refreshAllWorldRollTables = async() : Promise<void> => {
  // Import the mainStore dynamically to avoid circular dependencies
  const { useMainStore } = await import('@/applications/stores');
  const mainStore = useMainStore();
  
  // Get all worlds using the mainStore function
  const worlds = await mainStore.getAllWorlds();
  
  // Refresh roll tables for each world
  for (const world of worlds) {
    try {
      await refreshWorldRollTables(world, true);
    } catch (error) {
      console.error(`Error refreshing roll tables for world ${world.name}:`, error);
    }
  }
}

/**
 * Update roll table names when a world name changes
 * @param world The world whose name changed
 */
export const updateWorldRollTableNames = async(world: WBWorld) : Promise<void> => {
  const config = world.rollTableConfig;

  if (!config) {
    return; // No roll tables configured for this world
  }

  // Update the folder name
  const folder = game.folders?.get(config.folderId);
  if (folder) {
    await folder.update({
      name: `${world.name} - ${localize('applications.rollTableSettings.folderName')}`
    });
  }

  // Update each roll table name
  for (const [type, tableUuid] of Object.entries(config.rollTables)) {
    const table = await fromUuid<RollTable>(tableUuid);
    if (table) {
      const newName = `${world.name} - ${type.charAt(0).toUpperCase() + type.slice(1)} Generator`;
      await table.update({
        name: newName,
        description: `${localize('applications.rollTableSettings.tableDescription')}-${type} for ${world.name}`
      });
    }
  }
}
