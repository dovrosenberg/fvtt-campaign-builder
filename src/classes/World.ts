import { moduleId, DocumentWithFlags, FlagSettings } from '@/settings'; 
import { Topic } from '@/types';
import { WorldDoc, } from '@/documents';


// represents a topic entry (ex. a character, location, etc.)
export class World extends DocumentWithFlags<WorldDoc.FlagKey, WorldDoc.FlagType<WorldDoc.FlagKey>, WorldDoc> {
  protected get _document() { return this._worldDoc; }
  protected get _flagSettings() { 
    return [
      {
        flagId: WorldDoc.FlagKey.worldCompendium,
        default: '' as string,
      },
      {
        flagId: WorldDoc.FlagKey.topicEntries,
        default: {} as Record<Topic, string>,
      },
      {
        flagId: WorldDoc.FlagKey.campaignEntries,
        default: {} as Record<string, string>,
        keyedByUUID: true,
      },
      {
        flagId: WorldDoc.FlagKey.types,
        default: {
          [Topic.Character]: [],
          [Topic.Location]: [],
          [Topic.Event]: [],
          [Topic.Organization]: [],
        },
      },
      {
        flagId: WorldDoc.FlagKey.expandedIds,
        default: {} as Record<string, boolean | null>,
        keyedByUUID: true,
      },
      {
        flagId: WorldDoc.FlagKey.expandedCampaignIds,
        default: {} as Record<string, boolean | null>,
        keyedByUUID: true,
      },
      {
        flagId: WorldDoc.FlagKey.hierarchies,
        default: {},
        keyedByUUID: true,
      },
      {
        flagId: WorldDoc.FlagKey.topNodes,
        default: {
          [Topic.Character]: [],
          [Topic.Location]: [],
          [Topic.Event]: [],
          [Topic.Organization]: [],
        },
      },
    ] as FlagSettings<WorldDoc.FlagKey, WorldDoc.FlagType<WorldDoc.FlagKey>>[];
  }

  private _worldDoc: WorldDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {WorldDoc} worldDoc - The entry Foundry document
   */
  constructor(worldDoc: WorldDoc) {
    // make sure it's the right kind of document
    if (worldDoc.documentName !== 'Folder' || !worldDoc.getFlag(moduleId, 'isWorld'))
      throw new Error('Invalid document type in World constructor');

    // clone it to avoid unexpected changes, also drop the proxy
    this._worldDoc = foundry.utils.deepClone(worldDoc);
    this._cumulativeUpdate = {};
  }

  static async fromUuid(worldId: string, options?: Record<string, any>): Promise<World | null> {
    const worldDoc = await fromUuid(worldId, options) as WorldDoc;

    if (!worldDoc)
      return null;
    else
      return new World(worldDoc);
  }

    // special case because of nesting and index
  /**
   * Set the hierarchy 
   *
   * @static
   * @param {string} entryId
   * @param {Hierarchy} hierarchy
   * @return {*}  {Promise<void>}
   */
  public static async setHierarchy(worldId: string, entryId: string, hierarchy: Hierarchy): Promise<void> {
    // pull the full structure
    const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);
    hierarchies[entryId] = hierarchy;

    await WorldFlags.set(worldId, WorldFlagKey.hierarchies, hierarchies);
  }

  /**
   * Get the hierarchy.  Could just use get() but here for consistency with setHierarchy()
   *
   * @static
   * @param {string} entryId
   * @return {*}  {Promise<void>}
   */
  public static getHierarchy(worldId: string, entryId: string): Hierarchy | null {
    // pull the full structure
    const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);

    return hierarchies[entryId] || null;
  }

  /**
   * Remove an entry from hierarchy
   *
   * @static
   * @param {string} entryId
   * @param {Hierarchy} hierarchy
   * @return {*}  {Promise<void>}
   */
  public static async unsetHierarchy(worldId: string, entryId: string): Promise<void> {
    // pull the full structure
    const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);
    delete hierarchies[entryId];

    await WorldFlags.set(worldId, WorldFlagKey.hierarchies, hierarchies);
  }

  // special cases because of indexes
  public static getTopicFlag<K extends RequiresTopic>(worldId: string, flag: K, topic: Topic): WorldFlagType<K>[keyof WorldFlagType<K>] {
    const f = game.folders?.find((f)=>f.uuid===worldId);
    
    const config = flagSetup.find((s)=>s.flagId===flag);

    if (!f)
      return config?.default[topic];

    const fullFlag = WorldFlags.get(worldId, flag);

    return fullFlag[topic] as WorldFlagType<K>[keyof WorldFlagType<K>];
  }

  public async setTopicFlag<T extends RequiresTopic>(worldId: string, flag: T, topic: Topic, value: WorldFlagType<T>[keyof WorldFlagType<T>]): Promise<void> {
    const f = game.folders?.find((f)=>f.uuid===worldId);
    if (!f)
      return;

    const config = flagSetup.find((s)=>s.flagId===flag);
    if (!config)
      throw new Error('Bad flag in WorldFlags.set()');

    // get the current value
    const currentValue = WorldFlags.get(worldId, flag) as WorldFlagType<T>;
    currentValue[topic] = value;

    await WorldFlags.set(worldId, flag, currentValue);
  }
 
}