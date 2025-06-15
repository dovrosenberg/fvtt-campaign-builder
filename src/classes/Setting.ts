import { moduleId, UserFlags, UserFlagKey, ModuleSettings, SettingKey } from '@/settings'; 
import { WorldDoc, WorldFlagKey, worldFlagSettings } from '@/documents';
import { Hierarchy, Topics, ValidTopic, WorldGeneratorConfig } from '@/types';
import { getRootFolder,  } from '@/compendia';
import { FCBDialog } from '@/dialogs';
import { DocumentWithFlags, Campaign, TopicFolder } from '@/classes';
import { cleanTrees } from '@/utils/hierarchy';
import { localize } from '@/utils/game';
import { initializeWorldRollTables, refreshWorldRollTables } from '@/utils/nameGenerators';
import { Backend } from '@/classes';
import { ApiNamePreviewPost200ResponsePreviewInner } from '@/apiClient';

type WBWorldCompendium = CompendiumCollection<CompendiumCollection.Metadata>;

// represents a campaign setting
export class Setting extends DocumentWithFlags<WorldDoc>{
  static override _documentName = 'Folder';
  static override _flagSettings = worldFlagSettings;

  private _compendium: WBWorldCompendium;   // this is the main compendium

  // JournalEntries
  public campaigns: Record<string, Campaign>;   // Campaigns keyed by uuid 
  public topicFolders: Record<ValidTopic, TopicFolder>;  // we load them when we load the world (using validate()), so we assume it's never empty

  // saved on Folder
  private _name;

  // saved in flags
  private _campaignNames: Record<string, string>;  //name of each campaign; keyed by journal entry uuid
  private _expandedIds: Record<string, boolean | null>;  // ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree
  private _hierarchies: Record<string, Hierarchy>;  // the full tree hierarchy or null for topics without hierarchy
  private _topicIds: Record<ValidTopic, string> | null;  // the uuid for each topic
  private _compendiumId: string;  // the uuid for the world compendium 
  private _description: string;
  private _genre: string;
  private _worldFeeling: string;
  private _img: string;
  private _nameStyles: number[];
  private _rollTableConfig: WorldGeneratorConfig | null;
  private _nameStyleExamples: { genre: string; worldFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] } | null;

  /**
   * Note: you should always call validate() after creating a new Setting - this ensures the 
   * compendium exists and is properly used
   * @param {WorldDoc} worldDoc - The Setting Foundry document
   */
  constructor(worldDoc: WorldDoc) {
    super(worldDoc, WorldFlagKey.isWorld);

    this._campaignNames = this.getFlag(WorldFlagKey.campaignNames);
    this._expandedIds = this.getFlag(WorldFlagKey.expandedIds);
    this._hierarchies = this.getFlag(WorldFlagKey.hierarchies);
    this._topicIds = this.getFlag(WorldFlagKey.topicIds);
    this._compendiumId = this.getFlag(WorldFlagKey.compendiumId);
    this._description = this.getFlag(WorldFlagKey.description) || '';
    this._genre = this.getFlag(WorldFlagKey.genre) || '';
    this._worldFeeling = this.getFlag(WorldFlagKey.worldFeeling) || '';
    this._img = this.getFlag(WorldFlagKey.img) || '';
    this._nameStyles = this.getFlag(WorldFlagKey.nameStyles) || [0];
    this._rollTableConfig = this.getFlag(WorldFlagKey.rollTableConfig);
    this._nameStyleExamples = this.getFlag(WorldFlagKey.nameStyleExamples);
    this._name = this._doc.name;
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

  override async _getWorld(): Promise<Setting> {
    return this;
  };

  // Setting is a Folder so it's outside the compendium
  override get requiresUnlock(): boolean {
    return false;
  };

  static async fromUuid(worldId: string, options?: Record<string, any>): Promise<Setting | null> {
    const worldDoc = await fromUuid<WorldDoc>(worldId, options);

    if (!worldDoc)
      return null;
    else {
      const newWorld = new Setting(worldDoc);
      await newWorld.validate();  // will also load topic folders
      return newWorld;
    }
  }

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): WorldDoc {
    return this._doc;
  }

  /**
  * Gets the Topics associated with the world. If the topics are already loaded, the promise resolves
  * to the existing ones; otherwise, it loads the topics and then resolves to the set.
  * @returns {Promise<Record<ValidTopic, TopicFolder>>} A promise to the topics
  */
  public async loadTopics(): Promise<Record<ValidTopic, TopicFolder>> {
    if (!this._topicIds)
      throw new Error('Invalid Setting.loadTopics() called before IDs loaded');

    // loop over just the numeric values
    for (const topic of Object.values(Topics).filter(t=>typeof t === 'number')) {
      if (topic !== Topics.None && !this.topicFolders[topic]) {
        const topicObj = await TopicFolder.fromUuid(this._topicIds[topic]);
        if (!topicObj)
          throw new Error('Invalid topic uuid in Setting.loadTopics()');

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
      throw new Error('Invalid Setting.loadCampaigns() called before IDs loaded');

    if (!this.campaigns)
      this.campaigns = {};

    for (const id in this._campaignNames) {
      const campaignObj = await Campaign.fromUuid(id);
      if (!campaignObj) {
        // clean it up
        const names = this.campaignNames;
        delete names[id];
        this.campaignNames = names;

        const campaigns = this.campaigns;
        delete campaigns[id];
        this.campaigns = campaigns;

        await this.save();
      } else {
        campaignObj.world = this;
        this.campaigns[id] = campaignObj;
      }
    }

    return this.campaigns;
  }

  /** 
   * The uuid
   */
  public get uuid(): string {
    return this._doc.uuid;
  }

  /** 
   * The world name 
   */
  public get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      name: value,
    };
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
   * The IDs of nodes that are expanded in the directory.
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

  get description(): string {
    return this._description;
  }

  set description(value: string) {
    this._description = value;
    this.updateCumulative(WorldFlagKey.description, value);
  }

  public get genre(): string {
    return this._genre;
  }

  public set genre(value: string) {
    this._genre = value;
    this.updateCumulative(WorldFlagKey.genre, value);
  }

  public get worldFeeling(): string {
    return this._worldFeeling;
  }

  public set worldFeeling(value: string) {
    this._worldFeeling = value;
    this.updateCumulative(WorldFlagKey.worldFeeling, value);
  }

  public get img(): string {
    return this._img;
  }

  public set img(value: string) {
    this._img = value;
    this.updateCumulative(WorldFlagKey.img, value);
  }
  
  public get nameStyles(): readonly number[] {
    return this._nameStyles;
  }

  public set nameStyles(value: number[] | readonly number[] ) {
    this._nameStyles = value.slice();     // we clone it so it can't be edited outside
    this.updateCumulative(WorldFlagKey.nameStyles, this._nameStyles);
  }

  public get rollTableConfig(): WorldGeneratorConfig | null {
    return this._rollTableConfig;
  }

  public set rollTableConfig(value: WorldGeneratorConfig | null) {
    this._rollTableConfig = value;
    this.updateCumulative(WorldFlagKey.rollTableConfig, value);
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
    this.updateCumulative(WorldFlagKey.topicIds, value);
  }

  /**
   * The name keyed by JournalEntry UUID.
   */
  public set campaignNames(value: Record<string, string>) {
    this._campaignNames = value;
    this.updateCumulative(WorldFlagKey.campaignNames, value);
  }

  /**
   * The IDs of nodes that are expanded in the topic tree.
   * Could include compendia, entries, or subentries.
   */
  public set expandedIds(value: Record<string, boolean | null>) {
    this._expandedIds = value;
    this.updateCumulative(WorldFlagKey.expandedIds, value);
  }

  public async collapseNode(id: string): Promise<void> {
    const expandedIds = this._expandedIds || {};
    if (expandedIds[id])
      delete expandedIds[id];
    this._expandedIds = expandedIds;
    await this.unsetFlag(WorldFlagKey.expandedIds, id);
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
    this.updateCumulative(WorldFlagKey.hierarchies, value);
  }

  /**
   * Updates a world in the database.  Handles locking.
   * 
   * @returns {Promise<Setting | null>} The updated Setting, or null if the update failed.
   */
  public async save(): Promise<Setting | null> {
    let success = false;

    // note: no unlock needed for changes to the world because it's not in
    //    a compendium

    const updateData = this._cumulativeUpdate;
    if (Object.keys(updateData).length !== 0) {
      // protect any complex flags
      if (updateData && updateData.flags[moduleId])
        updateData.flags[moduleId] = this.prepareFlagsForUpdate(updateData.flags[moduleId]);

      const retval = await this._doc.update(updateData) || null;
      if (retval) {
        this._doc = retval;
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
  public static async create(makeCurrent = false): Promise<Setting | null> {
    const rootFolder = await getRootFolder(); // will create if needed

    // get the name
    let name;

    do {
      name = await FCBDialog.inputDialog(localize('dialogs.createWorld.title'), `${localize('dialogs.createWorld.worldName')}:`); 
      
      if (name) {
        // create the setting folder
        const worldDocs = await Folder.createDocuments([{
          name,
          type: 'Compendium',
          folder: rootFolder.id,
          sorting: 'a',
        }]) as unknown as WorldDoc[];
    
        if (!worldDocs)
          throw new Error('Couldn\'t create new folder for world');

        const worldDoc = worldDocs[0];

        const newWorld = new Setting(worldDoc);
        await newWorld.setup();

        // set as the current world
        if (makeCurrent) {
          await UserFlags.set(UserFlagKey.currentSetting, newWorld.uuid);
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
        throw new Error('Invalid compendiumId in Setting.validate()');
      
      this._compendium = compendium;
    }

    // check it
    // if the value is blank or we can't find the compendia create a new one
    if (!this._compendium) {
      await this.createCompendium();
    }

    if (!this._compendium)
      throw new Error('Failed to create compendium in Setting.validate()');

    // load the journal entries... we populate any missing topics, but can't reconstruct
    //    campaigns
    await this.populateTopics();
    await this.loadCampaigns();
    
    // Initialize roll tables for this world if they don't exist - but don't wait for the generation
    await initializeWorldRollTables(this);
      
    // If auto-refresh is enabled, populate tables in background
    const autoRefresh = ModuleSettings.get(SettingKey.autoRefreshRollTables);
    if (autoRefresh && Backend.available && Backend.api) {
      void refreshWorldRollTables(this);
    }
  }

  private async populateTopics() {
    let updated = false;

    const topics = [Topics.Character, Topics.Location, Topics.Organization] as ValidTopic[];
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
          throw new Error('Couldn\'t create topicFolder in Setting.validate()');

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

    const pack = await CompendiumCollection.createCompendium(metadata) as WBWorldCompendium;
    await pack.setFolder(this._doc as Folder);
    await pack.configure({ locked:true });

    this._compendium = pack;
    this._compendiumId = pack.metadata.id;
    await this.setFlag(WorldFlagKey.compendiumId, this._compendiumId);
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

  // Track ongoing unlock operations to prevent race conditions
  private static _unlockOperations: Record<string, Promise<void> | null> = {};  // mapped by compendiumId

  public get isLocked(): boolean {
    return this._compendium.config.locked;
  }
  
  /** 
   * Execute a function after unlocking (if needed), then relock when done.
   * Uses a queue system to prevent race conditions between multiple calls.
   * Handles nested calls by checking the actual lock state of the compendium.
   */
  public async executeUnlocked(executeFunction: () => Promise<void>): Promise<void> {
    const compendiumId = this._compendiumId;
    
    // If the compendium is already unlocked, just execute the function without locking/unlocking
    if (!this.isLocked) {
      return executeFunction();
    }
    
    // Create a new operation that will wait for any existing operation to complete
    const operation = (async () => {
      // Wait for any previous operation on this compendium to complete
      if (Setting._unlockOperations[compendiumId]) {
        try {
          await Setting._unlockOperations[compendiumId];
        } catch (error) {
          // If previous operation failed, we still want to continue with our operation
          console.error("Previous unlock operation failed:", error);
        }
      }

      // Check again if the compendium is locked after waiting for previous operations
      const needsUnlock = this.isLocked;
      if (needsUnlock) {
        await this.unlock();
      }

      try {
        await executeFunction();
      } finally {
        // Always relock, but only if we were the ones who unlocked it
        if (needsUnlock) {
          await this.lock();
        }
        
        // Remove our operation from the map once it's done
        delete Setting._unlockOperations[compendiumId];
      }
    })();

    // Store the promise so other operations can wait for it
    Setting._unlockOperations[compendiumId] = operation;

    // Wait for our operation to complete
    return operation;
  }
  
  public async collapseCampaignDirectory() {
    // we just unset the entire expandedIds flag
    await this.unsetFlag(WorldFlagKey.expandedIds);
  }

  public async collapseSettingDirectory() {
    // we just unset the entire expandedIds flag
    await this.unsetFlag(WorldFlagKey.expandedIds);

    // then need to reset it
    this.expandedIds = {};
    await this.save();
  }

  /**
   * Remove a campaign from the world metadata.  NOTE: WORLD MUST BE UNLOCKED FIRST
   * @param {string} campaignId - the uuid of the campaign to remove
   */
  // TODO: should delete all the sessions from expanded entries, too
  public async deleteCampaignFromWorld(campaignId: string) {
    const campaigns = this.campaigns;
    if (campaigns[campaignId]) {
      delete campaigns[campaignId];
      this.campaigns = campaigns;
    }

    const campaignNames = this.campaignNames;
    if (campaignNames[campaignId]) {
      delete campaignNames[campaignId];
      this.campaignNames = campaignNames;
    }

    const expandedIds = this.expandedIds;
    if (expandedIds[campaignId]) {
      delete expandedIds[campaignId];
      this.expandedIds = expandedIds;
    }

    await this.save();
  }  

  // remove an entry from the world metadata
  // note: WORLD MUST BE UNLOCKED FIRST
  public async deleteEntryFromWorld(topicFolder: TopicFolder, entryId: string) {
    const hierarchy = this._hierarchies[entryId];

    let topNodesCleaned = false;
    if (hierarchy) {
      // delete from any trees (also cleans up topNodes)
      if (hierarchy?.ancestors || hierarchy?.children) {
        await cleanTrees(this, topicFolder, entryId, hierarchy);
        topNodesCleaned = true;
      } else {
        // Even if there are no ancestors or children, we still need to delete the hierarchy
        delete this._hierarchies[entryId];
        this.hierarchies = this._hierarchies;
        await this.save();
      }
    }

    if (!topNodesCleaned) {
      // remove from the top nodes
      const folder = this.topicFolders[topicFolder.topic];

      if (folder.topNodes.includes(entryId)) {
        folder.topNodes = folder.topNodes.filter(id => id !== entryId);
        await folder.save();
      }
    }

    // remove from the expanded list
    await this.unsetFlag(WorldFlagKey.expandedIds, entryId);
  }  

  // remove a session from the world metadata
  // note: WORLD MUST BE UNLOCKED FIRST
  public async deleteSessionFromWorld(sessionId: string) {
    await this.unsetFlag(WorldFlagKey.expandedIds, sessionId);
  }  

  // change a campaign name inside all the world metadata
  // note: WORLD MUST BE UNLOCKED FIRST
  public async updateCampaignName(campaignId: string, name: string) {
    this._campaignNames[campaignId] = name;
    
    await this.setFlag(WorldFlagKey.campaignNames, {
      ... (this.getFlag(WorldFlagKey.campaignNames) || {}),
      [campaignId]: name
    });
  }

  public async delete() {
    // have to unlock the pack - we won't need to lock at the end
    await this.unlock();

    // delete the pack
    if (this._compendium) {
      await this._compendium.deleteCompendium();
    }
    // delete the setting folder
    await this._doc.delete();
  }

  public async deleteActorFromWorld(actorId: string) {
    // remove from any PCs that are linked to it
    for (let campaign of Object.values(this.campaigns)) {
      const pcs = (await campaign.filterPCs(pc => pc.actorId === actorId));
      for (const pc of pcs) {
        pc.actorId = '';
        await pc.save();
      }

      // remove from any monsters that are linked to it
      for (let session of campaign.sessions) {
        const monsters = session.monsters.map(m=>m.uuid);
        for (let i=0; i<monsters.length; i++) {
          if (monsters[i] === actorId) {
            await session.deleteMonster(monsters[i]);
          }
        }
      }
    }

    // remove from any Characters that are linked to it
    for (let character of this.topicFolders[Topics.Character].allEntries()) {
      // check the related documents
      for (let i=0; i<character.actors.length; i++) {
        if (character.actors[i] === actorId) {
          // not too worried about doing multiple saves because each actor should really only be in here once
          character.actors = character.actors.filter(a => a !== actorId);
          await character.save();
        }
      }
    }
  }

  public async deleteSceneFromWorld(sceneId: string) {
    // remove from any Locations that are linked to it
    for (let locations of this.topicFolders[Topics.Location].allEntries()) {
      // check the related documents
      for (let i=0; i<locations.scenes.length; i++) {
        if (locations.scenes[i] === sceneId) {
          // not too worried about doing multiple saves because each scene should really only be in here once
          locations.scenes = locations.scenes.filter(s => s !== sceneId);
          await locations.save();
        }
      }
    }
  }

  /** remove from any session item lists */
  public async deleteItemFromWorld(itemId: string) {
    // remove from any Magic Items that are linked to it
    for (let campaign of Object.values(this.campaigns)) {
      for (let session of campaign.sessions) {
        const items = session.items.map(i=>i.uuid);
        for (let i=0; i<items.length; i++) {
          if (items[i] === itemId) {
            await session.deleteItem(items[i]);
          }
        }
      }
    }
  }

  public get nameStyleExamples(): { genre: string; worldFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] } | null {
    return this._nameStyleExamples;
  }

  public set nameStyleExamples(value: { genre: string; worldFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] } | null) {
    this._nameStyleExamples = value;
    this.updateCumulative(WorldFlagKey.nameStyleExamples, value);
  }
}
