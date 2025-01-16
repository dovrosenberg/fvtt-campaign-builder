import { moduleId, getFlag, setFlagDefaults, UserFlags, UserFlagKey, unsetFlag, setFlag, prepareFlagsForUpdate, } from '@/settings'; 
import { WorldDoc, WorldFlagKey, worldFlagSettings } from '@/documents';
import { Hierarchy, Topics, ValidTopic } from '@/types';
import { getRootFolder,  } from '@/compendia';
import { inputDialog } from '@/dialogs/input';
import { Campaign, TopicFolder } from '@/classes';
import { cleanTrees } from '@/utils/hierarchy';

type WBWorldCompendium = CompendiumCollection<JournalEntry.Metadata>;

// represents a topic entry (ex. a character, location, etc.)
export class WBWorld {
  private _worldDoc: WorldDoc;   // this is the foundry folder
  private _compendium: WBWorldCompendium;   // this is the main compendium

  // JournalEntries
  public campaigns: Record<string, Campaign>;   // Campaigns keyed by uuid 
  public topicFolders: Record<ValidTopic, TopicFolder>;  // we load them when we load the world (using validate()), so we assume it's never empty

  // saved on Folder
  private _name;

  // saved in flags
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made (saved into 'flags')
  private _campaignNames: Record<string, string>;  //name of each campaign; keyed by journal entry uuid
  private _expandedIds: Record<string, boolean | null>;  // ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree
  private _hierarchies: Record<string, Hierarchy>;  // the full tree hierarchy or null for topics without hierarchy
  private _topicIds: Record<ValidTopic, string> | null;  // the uuid for each topic
  private _compendiumId: string;  // the uuid for the world compendium 

  /**
   * Note: you should always call validate() after creating a new WBWorld - this ensures the 
   * compendium exists and is properly used
   * @param {WorldDoc} worldDoc - The WBWorld Foundry document
   */
  constructor(worldDoc: WorldDoc) {
    // make sure it's the right kind of document
    if (worldDoc.documentName !== 'Folder' || !worldDoc.getFlag(moduleId, WorldFlagKey.isWorld))
      throw new Error('Invalid document type in WBWorld constructor');

    // clone it to avoid unexpected changes, also drop the proxy
    this._worldDoc = foundry.utils.deepClone(worldDoc);
    this._cumulativeUpdate = {};

    this._campaignNames = getFlag(this._worldDoc, WorldFlagKey.campaignNames);
    this._expandedIds = getFlag(this._worldDoc, WorldFlagKey.expandedIds);
    this._hierarchies = getFlag(this._worldDoc, WorldFlagKey.hierarchies);
    this._topicIds = getFlag(this._worldDoc, WorldFlagKey.topicIds);
    this._compendiumId = getFlag(this._worldDoc, WorldFlagKey.compendiumId);
    this._name = this._worldDoc.name;
    if (this._compendiumId) {
      const compendium = game.packs?.get(this._compendiumId);
      
      if (!compendium) {
        // it didn't exist, so we pretend we don't have one - this will get cleaned up in validate()
        this._compendiumId = '';
      } else {
        this._compendium = compendium;
      }
    }  

    this.campaigns = {} as Record<string, Campaign>;
    this.topicFolders = {} as Record<ValidTopic, TopicFolder>;
  }

  static async fromUuid(worldId: string, options?: Record<string, any>): Promise<WBWorld | null> {
    const worldDoc = await fromUuid(worldId, options) as WorldDoc;

    if (!worldDoc)
      return null;
    else {
      const newWorld = new WBWorld(worldDoc);
      await newWorld.validate();
      return newWorld;
    }
  }

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): WorldDoc {
    return this._worldDoc;
  }

  /**
  * Gets the Topics associated with the world. If the topics are already loaded, the promise resolves
  * to the existing ones; otherwise, it loads the topics and then resolves to the set.
  * @returns {Promise<Record<ValidTopic, TopicFolder>>} A promise to the topics
  */
  public async loadTopics(): Promise<Record<ValidTopic, TopicFolder>> {
    if (!this._topicIds)
      throw new Error('Invalid WBWorld.loadTopics() called before IDs loaded');

    for (const topic in Topics) {
      if (!this.topicFolders[topic]) {
        const topicObj = await TopicFolder.fromUuid(this._topicIds[topic]);
        if (!topicObj)
          throw new Error('Invalid topic uuid in WBWorld.loadTopics()');

        topicObj.world = this;
        this.topicFolders[topic] = topicObj;
      }
    }

    return this.topicFolders;
  }
  

  /**
  * Gets the Campaigns associated with the world. If the campaigns are already loaded, the promise resolves
  * to the existing ones; otherwise, it loads the campaigns and then resolves to the set.
  * @returns {Promise<Record<string, Campaign>>} A promise to the campaigns 
  */
  public async loadCampaigns(): Promise<Record<string, Campaign>> {
    if (!this._campaignNames)
      throw new Error('Invalid WBWorld.loadCampaigns() called before IDs loaded');

    if (!this.campaigns)
      this.campaigns = {};

    for (const id in this._campaignNames) {
      const campaignObj = await Campaign.fromUuid(id);
      if (!campaignObj)
        throw new Error('Invalid campaign uuid in WBWorld.loadCampaigns()');

      campaignObj.world = this;
      this.campaigns[id] = campaignObj;
    }

    return this.campaigns;
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
   * The uuid for the world compendium   
   */
  public get compendiumId(): string {
    return this._compendiumId;
  }

  /** 
   * The actual compendium (used to be called worldCompendium)
   */
  public get compendium(): WBWorldCompendium {
    return this._compendium;
  }

  /**
   * The JournalEntry UUID for each topic.
   */
  public get topicIds(): Record<string, string> | null {
    return this._topicIds;
  }

  /**
   * The name keyed by JournalEntry UUID.
   */
  public get campaignNames(): Record<string, string> {
    return this._campaignNames;
  }

  /**
   * The IDs of nodes that are expanded in the cirectory.
   * Could include compendia, entries, or subentries, or campaigns.
   */
  public get expandedIds(): Record<string, boolean | null> {
    return this._expandedIds;
  }

  /**
   * The full tree hierarchy or null for topics without a hierarchy.
   */
  public get hierarchies(): Record<string, Hierarchy> {
    return this._hierarchies;
  }

  /**
   * Get the hierarchy for a single entry
   */
  public getEntryHierarchy(entryId: string): Hierarchy {
    return this._hierarchies[entryId];
  }

  /**
   * set the hierarchy for a single entry
   */
  public setEntryHierarchy(entryId: string, value: Hierarchy) {
    this._hierarchies[entryId] = value;

    // make sure to note we have an update to make
    this.hierarchies = this._hierarchies;
  }
  
 
  /**
   * The JournalEntry UUID for each topic.
   */
  public set topicIds(value: Record<ValidTopic, string>) {
    this._topicIds = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        topicIds: value,
      }
    };
  }

  /**
   * The name keyed by JournalEntry UUID.
   */
  public set campaignNames(value: Record<string, string>) {
    this._campaignNames = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        campaignNames: value,
      }
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
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        expandedIds: value,
      }
    };
  }

  public async collapseNode(id: string): Promise<void> {
    const expandedIds = this._expandedIds || {};
    if (expandedIds[id])
      delete expandedIds[id];
    this._expandedIds = expandedIds;
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedIds, id);
  }

  public async expandNode(id: string): Promise<void> {
    const expandedIds = this._expandedIds || {};
    expandedIds[id] = true;
    this.expandedIds = expandedIds;

    await this.save();
  }

  /**
   * The full tree hierarchy or null for topics without a hierarchy.
   */
  public set hierarchies(value: Record<string, Hierarchy>) {
    this._hierarchies = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      [`flags.${moduleId}`]: {
        ...this._cumulativeUpdate[`flags.${moduleId}`],
        hierarchies: value,
      }
    };
  }

  /**
   * Updates a world in the database.  Handles locking.
   * 
   * @returns {Promise<WBWorld | null>} The updated WBWorld, or null if the update failed.
   */
  public async save(): Promise<WBWorld | null> {
    let success = false;

    await this.unlock();

    const updateData = this._cumulativeUpdate;
    if (Object.keys(updateData).length !== 0) {

      // protect any complex flags
      if (updateData[`flags.${moduleId}`])
        updateData[`flags.${moduleId}`] = prepareFlagsForUpdate(this._worldDoc, updateData[`flags.${moduleId}`]);

      const retval = await this._worldDoc.update(updateData) || null;
      if (retval) {
        this._worldDoc = retval;
        this._cumulativeUpdate = {};

        success = true;
      }
    }

    await this.lock();

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
        const worldDocs = await Folder.createDocuments([{
          name,
          type: 'Compendium',
          folder: rootFolder.id,
          sorting: 'a',
        }]) as unknown as WorldDoc[];
    
        if (!worldDocs)
          throw new Error('Couldn\'t create new folder for world');

        const worldDoc = worldDocs[0];

        await setFlagDefaults(worldDoc, worldFlagSettings);

        const newWorld = new WBWorld(worldDoc);

        // set as the current world
        if (makeCurrent) {
          await UserFlags.set(UserFlagKey.currentWorld, newWorld.uuid);
        }
    
        await newWorld.validate();

        return newWorld;
      }
    } while (name==='');  // if hit ok, must have a value

    // if name isn't '' and we're here, then we cancelled the dialog
    return null;
  }

  // make sure we have a compendium in the folder; create a new one if needed
  // also loads all the topics
  public async validate() {
    if (this._compendiumId) {
      const compendium = game.packs?.get(this._compendiumId);
      if (!compendium) 
        throw new Error('Invalid compendiumId in WBWorld.validate()');
      
      this._compendium = compendium;
    }

    // check it
    // if the value is blank or we can't find the compendia create a new one
    if (!this._compendium) {
      await this.createCompendium();
    }

    if (!this._compendium)
      throw new Error('Failed to create compendium in WBWorld.validate()');

    // load the journal entries... we populate any missing topics, but can't reconstruct
    //    campaigns
    await this.populateTopics();
    await this.loadCampaigns();
  }

  private async populateTopics() {
    let updated = false;

    const topics = [Topics.Character, Topics.Event, Topics.Location, Topics.Organization] as ValidTopic[];
    let topicIds = this._topicIds;
    const topicObjects = {} as Record<ValidTopic, TopicFolder>;

    if (!topicIds) {
      topicIds = {} as Record<ValidTopic, string>;
    }

    // load the topics, creating them if needed
    for (let i=0; i<topics.length; i++) {
      const t = topics[i];

      let topicFolder;
      if (topicIds[t]) {
        topicFolder = await TopicFolder.fromUuid(topicIds[t]);

        if (topicFolder)
          topicFolder.world = this;
      }

      if (!topicFolder) {
        // create the missing one
        topicFolder = await TopicFolder.create(this, t);

        if (!topicFolder)
          throw new Error('Couldn\'t create topicFolder in WBWorld.validate()');

        topicFolder.world = this;
        topicIds[t] = topicFolder.uuid;
        topicObjects[t] = topicFolder;

        updated = true;
      } else {
        topicObjects[t] = topicFolder;
      }
    }

    this.topicFolders = topicObjects;

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
    await pack.setFolder(this._worldDoc as Folder);
    await pack.configure({ locked:true });

    this._compendium = pack;
    this._compendiumId = pack.metadata.id;
    await setFlag(this._worldDoc, WorldFlagKey.compendiumId, this._compendiumId);
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
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedIds);
  }

  public async collapseTopicDirectory() {
    // we just unset the entire expandedIds flag
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedIds);
  }

  /**
   * Remove a campaign from the world metadata.  NOTE: WORLD MUST BE UNLOCKED FIRST
   * @param {string} campaignId - the uuid of the campaign to remove
   */
  // TODO: should delete all the sessions from expanded entries, too
  public async deleteCampaignFromWorld(campaignId: string) {
    await unsetFlag(this._worldDoc, WorldFlagKey.campaignNames, campaignId);
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedIds, campaignId);
  }  

  // remove an entry from the world metadata
  // note: WORLD MUST BE UNLOCKED FIRST
  public async deleteEntryFromWorld(topicFolder: TopicFolder, entryId: string) {
    const hierarchy = this.getEntryHierarchy(entryId);

    let topNodesCleaned = false;
    if (hierarchy) {
      // delete from any trees (also cleans up topNodes)
      if (hierarchy?.ancestors || hierarchy?.children) {
        await cleanTrees(this, topicFolder, entryId, hierarchy);
        topNodesCleaned = true;
      }
    }

    if (!topNodesCleaned) {
      // remove from the top nodes
      const topNodes = this.topicFolders[topicFolder.topic].topNodes;
      this.topicFolders[topicFolder.topic].topNodes = topNodes.filter((id) => id !== entryId);
      await this.topicFolders[topicFolder.topic].save();
    }

    // remove from the expanded list
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedIds, entryId);
  }  

  // remove a campaign from the world metadata
  // note: WORLD MUST BE UNLOCKED FIRST
  public async deleteSessionFromWorld(sessionId: string) {
    await unsetFlag(this._worldDoc, WorldFlagKey.expandedIds, sessionId);
  }  

  // change a campaign name inside all the world metadata
  // note: WORLD MUST BE UNLOCKED FIRST
  public async updateCampaignName(campaignId: string, name: string) {
    this._campaignNames[campaignId] = name;
    
    await setFlag(this._worldDoc, WorldFlagKey.campaignNames, {
      ... (getFlag(this._worldDoc, WorldFlagKey.campaignNames) || {}),
      [campaignId]: name
    });
  }

  public async delete() {
    // have to unlock the pack
    await this.unlock();

    // delete the pack
    if (this._compendium) {
      await this._compendium.deleteCompendium();
    }
    // delete the world folder
    await this._worldDoc.delete();
  }
}
