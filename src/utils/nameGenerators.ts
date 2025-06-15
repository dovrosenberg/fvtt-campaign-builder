import { moduleId, ModuleSettings, SettingKey } from '@/settings';
import { localize } from '@/utils/game';
import { Backend } from '@/classes';
import { nameStyles } from '@/utils/nameStyles';

import { GeneratorType, WorldGeneratorConfig } from '@/types';
import { Setting } from '@/classes';

/**
 * The number of items to generate for each roll table.
 * This constant defines the standard size for all generator roll tables.
 */
export const TABLE_SIZE = 100;

/**
 * Initializes roll tables for all generator types in a specific world.
 * Creates the necessary folder structure and roll tables if they don't exist.
 * 
 * @param world - The world to initialize roll tables for
 * @returns A promise that resolves when initialization is complete
 */
let initializationInProgress = false;
export async function initializeWorldRollTables(world: Setting): Promise<void> {
  // Prevent multiple concurrent initializations - don't need to queue because they all do the same things
  if (initializationInProgress) {
    return;
  }

  initializationInProgress = true;

  // Get or create the folder for roll tables for this world
  const folderId = await getOrCreateWorldRollTableFolder(world);
  
  // Get existing world generator config or create a new one
  let worldGeneratorConfig: WorldGeneratorConfig | null = world.rollTableConfig;

  // if we have a config, make sure the folderId still existed
  if (worldGeneratorConfig) {
    // the folderId would change if the folder got deleted and recreated
    if (worldGeneratorConfig.folderId !== folderId) {
      worldGeneratorConfig.folderId = folderId;
      worldGeneratorConfig.rollTables = {} as Record<GeneratorType, string>;
    }
  } else {
    // create a new config
    worldGeneratorConfig = {
      rollTables: {} as Record<GeneratorType, string>,
      folderId: folderId,
    };
  }
  
  // Ensure all generator types have a roll table
  for (const type of Object.values(GeneratorType)) {
    // Check if we already have a table for this type
    if (worldGeneratorConfig.rollTables[type]) {
      // Verify the table still exists and is the right type
      const table = await fromUuid<RollTable>(worldGeneratorConfig.rollTables[type]);
      if (table && table.getFlag(moduleId, 'type') === type) {
        continue; // Table exists and is valid, skip to next type
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

  initializationInProgress = false;
}

/**
 * Gets or creates the folder for campaign builder roll tables for a specific world.
 * Checks if an existing folder is still valid before creating a new one.
 * 
 * @param world - The world to create the folder for
 * @returns A promise that resolves to the folder ID
 */
const getOrCreateWorldRollTableFolder = async(world: Setting): Promise<string> => {
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
 * Populates table results for a specific generator type using the backend API.
 * Uses world-specific settings including genre, feeling, and name styles.
 * 
 * @param type - The generator type to generate results for
 * @param count - The number of results to generate
 * @param world - The world to use for settings and configuration
 * @returns A promise that resolves to an array of generated names
 * @throws {Error} If the backend is unavailable or generation fails
 */
const generateWorldTableResults = async (type: GeneratorType, count: number, world: Setting): Promise<string[]> => {
  // If backend is not available, just return
  if (!Backend.available || !Backend.api) {
    return;
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
 * Creates a Foundry RollTable for a specific generator type.
 * Sets appropriate flags and metadata for the table and associates it with the world.
 * 
 * @param type - The generator type for this table
 * @param folderId - The ID of the folder to create the table in
 * @param world - The world this table belongs to
 * @returns A promise that resolves to the created RollTable, or null if creation failed
 */
async function createWorldRollTable(type: GeneratorType, folderId: string, world: Setting): Promise<RollTable | null> {
  const tableName = `${world.name} - ${type.charAt(0).toUpperCase() + type.slice(1)} Generator`;
  
  // Create the table
  const table = await RollTable.create({
    name: tableName,
    folder: folderId,
    description: `${localize('applications.rollTableSettings.tableDescription')}-${world.name}-${type}`,
    formula: `1d${TABLE_SIZE}`,
    replacement: false, // Don't replace drawn results
    displayRoll: false, // Don't display the roll publicly
  });
  
  if (table) {
    await table.setFlag(moduleId, 'type', type);
    await table.setFlag(moduleId, 'worldId', world.uuid);
    return table;
  } else {
    return null;
  }
}

/**
 * Refreshes a single roll table by removing used results and adding new ones to maintain TABLE_SIZE.
 * Uses world-specific settings to generate replacement content that matches the world's style.
 * 
 * @param rollTable - The roll table to refresh
 * @param world - The world containing style and generation settings
 * @returns A promise that resolves when the table is refreshed
 * @throws {Error} If the table type is missing or generation fails
 */
export const refreshWorldRollTable = async (rollTable: RollTable, world: Setting) : Promise<void> => {
  // requires backend
  if (!Backend.available || !Backend.api) {
    throw new Error('Backend is not available. Please check your backend settings.');
  }

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
 * Refreshes all roll tables for a specific world, optionally clearing them first.
 * Useful for updating all tables when world settings change or for maintenance.
 * 
 * @param world - The world whose tables should be refreshed
 * @param empty - Whether to clear all existing results before refreshing (defaults to false)
 * @returns A promise that resolves when all tables are refreshed
 */
let refreshInProgress = false;
export const refreshWorldRollTables = async(world: Setting, empty: boolean = false) : Promise<void> => {
  // Prevent multiple concurrent refreshes - don't need to queue because they all do the same things
  if (refreshInProgress) {
    return;
  }

  refreshInProgress = true;
  ui.notifications?.info(localize('applications.rollTableSettings.notifications.refreshStarted'));

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

  refreshInProgress = false;
}

/**
 * Refreshes roll tables for all worlds in the current game.
 * Iterates through all worlds and refreshes their respective roll tables.
 * 
 * @returns A promise that resolves when all world tables are refreshed
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
 * Updates the names of all roll tables for a world to match the current world name.
 * Called when a world is renamed to keep table names synchronized.
 * 
 * @param world - The world whose table names should be updated
 * @returns A promise that resolves when all table names are updated
 */
export const updateWorldRollTableNames = async(world: Setting) : Promise<void> => {
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
