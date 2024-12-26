import { moduleId, getFlag, setFlagDefaults, UserFlags, UserFlagKey, unsetFlag, setFlag } from '@/settings'; 
import { CampaignDoc, WorldDoc, WorldFlagKey, } from '@/documents';
import { Hierarchy, Topics, ValidTopic } from '@/types';
import { getRootFolder,  } from '@/compendia';
import { inputDialog } from '@/dialogs/input';
import { Topic } from '@/classes';
import { cleanTrees } from '@/utils/hierarchy';

// represents a topic entry (ex. a character, location, etc.)
export class WBWorld {
  private _worldDoc: WorldDoc;   // this is the foundry folder
  private _compendium: CompendiumCollection;   // this is the main compendium

  // JournalEntries
  public campaigns: CampaignDoc[] | null; 
  public topics: Record<ValidTopic, Topic>;  // we load them when we load the world (using validate()), so we assume it's never empty

  // saved on Folder
  private _name;

  // saved in flags
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made (saved into 'flags')
  private _campaignEntries: Record<string, string>;  //name of each campaign; keyed by journal entry uuid
  private _expandedCampaignIds: Record<string, boolean | null>;   // ids of nodes that are expanded in the campaign tree
  private _expandedIds: Record<string, boolean | null>;  // ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree
  private _hierarchies: Record<string, Hierarchy>;  // the full tree hierarchy or null for topics without hierarchy
  private _topicIds: Record<ValidTopic, string>;  // the uuid for each topic
  private _compendiumId: string;  // the uuid for the world compendium 

  /**
   * @param {WorldDoc} worldDoc - The WBWorld Foundry document
   */
  constructor(worldDoc: WorldDoc) {
    // make sure it's the right kind of document
    if (worldDoc.documentName !== 'Folder' || !worldDoc.getFlag(moduleId, 'isWorld'))
      throw new Error('Invalid document type in WBWorld constructor');

    // clone it to avoid unexpected changes, also drop the proxy
    this._worldDoc = foundry.utils.deepClone(worldDoc);
    this._cumulativeUpdate = {};

    this._campaignEntries = getFlag(this._worldDoc, WorldFlagKey.campaignEntries);
    this._expandedCampaignIds = getFlag(this._worldDoc, WorldFlagKey.expandedCampaignIds);
    this._expandedIds = getFlag(this._worldDoc, WorldFlagKey.expandedIds);
    this._hierarchies = getFlag(this._worldDoc, WorldFlagKey.hierarchies);
    this._topicIds = getFlag(this._worldDoc, WorldFlagKey.topicIds);
    this._compendiumId = getFlag(this._worldDoc, WorldFlagKey.compendiumId);
    this._name = this._worldDoc.name;
    if (this._compendiumId) {
      this._compendium = game.packs?.get(this._compendiumId);
    }  

    this.campaigns = null;
    this.topics = {} as Record<ValidTopic, Topic>;
  }

  static async fromUuid(worldId: string, options?: Record<string, any>): Promise<WBWorld | null> {
    const worldDoc = await fromUuid(worldId, options) as WorldDoc;

    if (!worldDoc)
      return null;
    else {
      const newWorld = new WBWorld(worldDoc);
      // await worldDoc.validate();
      return newWorld;
    }
  }

  /**
  * Gets the Topics associated with the world. If the topics are already loaded, the promise resolves
  * to the existing ones; otherwise, it loads the topics and then resolves to the set.
  * @returns {Promise<Record<ValidTopic, Topics>>} A promise to the topics
  */
  public async loadTopics(): Promise<Record<ValidTopic, Topics>> {
    for (const topic in Topics) {
      if (!this.topics[topic]) {
        const topicObj = await Topic.fromUuid(this._topicIds[topic]);
        if (!topicObj)
          throw new Error('Invalid topic uuid in WBWorld.loadTopics()');

        this._topicIds[topic] = topicObj.uuid;
        this.topics[topic] = topicObj;
      }
    }

    return this.topics;
  }
  
  /** 
   * The uuid
   */
  public get uuid(): string {
    return this._worldDoc.uuid;
  }

  /** 
   * The world name 
   */
  public get name(): string {
    return this._name;
  }
  
  /** 
   * The uuid for the world compendium   (used to be called worldCompendium)
   */
  public get compendiumId(): string {
    return this._compendiumId;
  }
  
  /** 
   * The actual compendium
   */
  public get compendium(): CompendiumCollection {
    return this._compendium;
  }

  /**
   * The JournalEntry UUID for each topic.
   */
  public get topicIds(): Record<string, string> {
    return this._topicIds;
  }

  /**
   * The name keyed by JournalEntry UUID.
   */
  public get campaignEntries(): Record<string, string> {
    return this._campaignEntries;
  }

  /**
   * The IDs of nodes that are expanded in the topic tree.
   * Could include compendia, entries, or subentries.
   */
  public get expandedIds(): Record<string, boolean | null> {
    return this._expandedIds;
  }

  /**
   * The IDs of nodes that are expanded in the campaign tree.
   */
  public get expandedCampaignIds(): Record<string, boolean | null> {
    return this._expandedCampaignIds;
  }

  /**
   * The full tree hierarchy or null for topics without a hierarchy.
   */
  public get hierarchies(): Record<string, Hierarchy> {
    return this._hierarchies;
  }

 
  /** 
   * The uuid for the world compendium  
   */
  public set compendiumId(value: string) {
    this._compendiumId = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.compendiumId`]: value
    };
  }

  /**
   * The JournalEntry UUID for each topic.
   */
  public set topicIds(value: Record<ValidTopic, string>) {
    this._topicIds = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.topicIds`]: value
    };
  }

  /**
   * The name keyed by JournalEntry UUID.
   */
  public set campaignEntries(value: Record<string, string>) {
    this._campaignEntries = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.campaignEntries`]: value
    };
  }

  /**
   * The IDs of nodes that are expanded in the topic tree.
   * Could include compendia, entries, or subentries.
   */
  public set expandedIds(value: Record<string, boolean | null>) {
    this._expandedIds = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.expandedIds`]: value
    };
  }

  /**
   * The IDs of nodes that are expanded in the campaign tree.
   */
  public set expandedCampaignIds(value: Record<string, boolean | null>) {
    this._expandedCampaignIds = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.expandedCampaignIds`]: value
    };
  }

  /**
   * The full tree hierarchy or null for topics without a hierarchy.
   */
  public set hierarchies(value: Record<string, Hierarchy>) {
    this._hierarchies = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}.hierarchies`]: value
    };
  }

  /**
   * Updates a world in the database 
   * 
   * @returns {Promise<WBWorld | null>} The updated WBWorld, or null if the update failed.
   */
  public async save(): Promise<WBWorld | null> {
    let success = false;

    const updateData = this._cumulativeUpdate;
    if (Object.keys(updateData).length !== 0) {

      const retval = await this._worldDoc.update(updateData) || null;
      if (retval) {
        this._worldDoc = retval;
        this._cumulativeUpdate = {};

        success = true;
      }
    }

    return success ? this : null;
  }  

  /**
   * Create a new world.
   * @param {boolean} [makeCurrent=false] If true, sets the new world as the current world.
   * @returns The new world, or null if the user cancelled the dialog.
   */
  public static async create(makeCurrent = false): Promise<WBWorld | null> {
    const rootFolder = await getRootFolder(); // will create if needed

    // get the name
    let name;

    do {
      name = await inputDialog('Create World', 'World Name:');
      
      if (name) {
        // create the world folder
        const worldDoc = await Folder.createDocuments([{
          name,
          type: 'Compendium',
          folder: rootFolder.id,
          sorting: 'a',
        }]) as unknown as WorldDoc;
    
        if (worldDoc) {
          await setFlagDefaults(worldDoc);
        }

        if (!worldDoc)
          throw new Error('Couldn\'t create new folder for world');
    
        await setFlag(worldDoc, WorldFlagKey.isWorld, true);

        const newWorld = new WBWorld(worldDoc);

        // set as the current world
        if (makeCurrent) {
          await UserFlags.set(UserFlagKey.currentWorld, newWorld.uuid);
        }
    
        await this.validate();
        await setFlagDefaults(worldDoc);

        return newWorld;
      }
    } while (name==='');  // if hit ok, must have a value

    // if name isn't '' and we're here, then we cancelled the dialog
    return null;
  }

  // make sure we have a compendium in the folder; create a new one if needed
  // also loads all the topics
  public async validate() {
    let updated = false;

    if (this._compendiumId) {
      this._compendium = game.packs?.get(this._compendiumId);
    }

    // check it
    // if the value is blank or we can't find the compendia create a new one
    if (!this._compendium) {
      await this.createCompendium();
    }

    if (!this._compendium)
      throw new Error('Failed to create compendium in WBWorld.validate()');

    // also need to create the journal entries
    // check them all
    // Object.keys() on an enum returns an array with all the values followed by all the names
    const topics = [Topics.Character, Topics.Event, Topics.Location, Topics.Organization];
    const topicIds = this._topicIds;
    const topicObjects = {} as Record<ValidTopic, Topic>;

    // load the topics, creating them if needed
    for (let i=0; i<topics.length; i++) {
      const t = topics[i];

      let topic = await Topic.fromUuid(topicIds[t]);

      if (!topic) {
        // create the missing one
        topic = Topic.create(this, t);

        if (!topic)
          throw new Error('Couldn\'t create topic in WBWorld.validate()');

        topicIds[t] = topic.uuid;
        topicObjects[t] = topic;

        updated = true;
      } else {
        topicObjects[t] = topic;
      }
    }

    this.topics = topicObjects;

    // if we changed things, save new compendia flag
    if (updated) {
      this.topicIds = topicIds;
      await this.save();
    }
  }

  // returns the compendium
  private async createCompendium(): Promise<void> {
    const metadata = { 
      name: foundry.utils.randomID(), 
      label: this._name,
      type: 'JournalEntry' as const, 
    };

    const pack = await CompendiumCollection.createCompendium(metadata);
    await pack.setFolder(this._worldDoc.uuid);
    await pack.configure({ locked:true });

    this._compendium = pack;
    this._compendiumId = pack.metadata.id;
  }
  
  /**
   * Unlock the world compendium to allow edits
   */
  public async unlock() {
    await this._compendium.configure({locked:false});
  }

  /**
   * Lock the world compendium to stop edits
   */
  public async lock() {
    await this._compendium.configure({locked:true});
  }
  
  public async collapseCampaignDirectory() {
    // we just unset the entire expandedIds flag
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedCampaignIds);
  }

  public async collapseTopicDirectory() {
    // we just unset the entire expandedIds flag
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedIds);
  }

  // remove a campaign from the world metadata
  // update the flags - this doesn't remove the whole flag, because the keys are flattened
  // TODO: should delete all the sessions from expanded entries, too
  // note: WORLD MUST BE UNLOCKED FIRST
  public async deleteCampaignFromWorld(campaignId: string) {
    await unsetFlag(this._worldDoc, WorldFlagKey.campaignEntries, campaignId);
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedCampaignIds, campaignId);
  }  

  // remove an entry from the world metadata
  // note: WORLD MUST BE UNLOCKED FIRST
  public async deleteEntryFromWorld(topic: ValidTopic, entryId: string) {
    const hierarchy = WorldFlags.getHierarchy(Entry.worldId, this.uuid);

    let topNodesCleaned = false;
    if (hierarchy) {
      // delete from any trees (also cleans up topNodes)
      if (hierarchy?.ancestors || hierarchy?.children) {
        await cleanTrees(this, topic, entryId, hierarchy);
        topNodesCleaned = true;
      }
    }

    if (!topNodesCleaned) {
      // remove from the top nodes
      const topNodes = this.topics[topic].topNodes;
      this.topics[topic].topNodes = topNodes.filter((id) => id !== entryId);
      await this.topics[topic].save();
    }

    // remove from the expanded list
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedIds, entryId);
  }  

  // remove a campaign from the world metadata
  // note: WORLD MUST BE UNLOCKED FIRST
  public async deleteSessionFromWorld(sessionId: string) {
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedCampaignIds, sessionId);
  }  

  // change a campaign name inside all the world metadata
  public async updateCampaignName(campaignId: string, name: string) {
    await setFlag(this._worldDoc, WorldFlagKey.campaignEntries, {
      ... (getFlag(this._worldDoc, WorldFlagKey.campaignEntries) || {}),
      [campaignId]: name
    });
  }
}

// // special case because of nesting and index
//   /**
//    * Set the hierarchy 
//    *
//    * @static
//    * @param {string} entryId
//    * @param {Hierarchy} hierarchy
//    * @return {*}  {Promise<void>}
//    */
//   public static async setHierarchy(worldId: string, entryId: string, hierarchy: Hierarchy): Promise<void> {
//     // pull the full structure
//     const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);
//     hierarchies[entryId] = hierarchy;

//     await WorldFlags.set(worldId, WorldFlagKey.hierarchies, hierarchies);
//   }

//   /**
//    * Get the hierarchy.  Could just use get() but here for consistency with setHierarchy()
//    *
//    * @static
//    * @param {string} entryId
//    * @return {*}  {Promise<void>}
//    */
//   public static getHierarchy(worldId: string, entryId: string): Hierarchy | null {
//     // pull the full structure
//     const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);

//     return hierarchies[entryId] || null;
//   }

//   /**
//    * Remove an entry from hierarchy
//    *
//    * @static
//    * @param {string} entryId
//    * @param {Hierarchy} hierarchy
//    * @return {*}  {Promise<void>}
//    */
//   public static async unsetHierarchy(worldId: string, entryId: string): Promise<void> {
//     // pull the full structure
//     const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);
//     delete hierarchies[entryId];

//     await WorldFlags.set(worldId, WorldFlagKey.hierarchies, hierarchies);
//   }

 