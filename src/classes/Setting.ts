import { moduleId, UserFlags, UserFlagKey, ModuleSettings, SettingKey } from '@/settings'; 
import { Hierarchy, Topics, ValidTopic, SettingGeneratorConfig, RelatedJournal } from '@/types';
import { FCBDialog } from '@/dialogs';
import { Campaign, TopicFolder, RootFolder, } from '@/classes';
import { cleanTrees } from '@/utils/hierarchy';
import { localize } from '@/utils/game';
import { initializeSettingRollTables, refreshSettingRollTables } from '@/utils/nameGenerators';
import { Backend } from '@/classes';
import { ApiNamePreviewPost200ResponsePreviewInner } from '@/apiClient';
import { SettingDoc } from '@/documents';

type SettingCompendium = CompendiumCollection<'JournalEntry'>;

// represents a campaign setting
// it's essentially a wrapper around a SettingDoc object stored in the 
//    module settings
export class Setting {
  private _compendium: SettingCompendium;   // this is the compendium for the setting

  // JournalEntries
  public campaigns: Record<string, Campaign>;   // Campaigns keyed by uuid 
  public topicFolders: Record<ValidTopic, TopicFolder>;  // we load them when we load the setting (using validate()), so we assume it's never empty

  /**
   * The name of the setting.get
   */
  public name: string = '';  

  /**
   * The uuid for the setting compendium.
   */
  private _settingId: string = '';  
  
  /**
   * The uuid for each topic.
   */
  public topicIds: Record<ValidTopic, string> | Record<never, string> = {};  

  /**
   * The names of campaigns; keyed by journal entry uuid.
   */
  public campaignNames: Record<string, string> = {};  

  /**
   * The IDs of nodes that are expanded in the directory.
   * Could include compendia, entries, or subentries, or campaigns.
   */
  public expandedIds: Record<string, boolean> = {};  
  
  /**
   * The full tree hierarchy or null for topics without a hierarchy.
   */
  public hierarchies: Record<string, Hierarchy> = {};  

  /**
   * The genre of the setting.
   */
  public genre: string = '';

  /**
   * The feeling of the setting.
   */
  public settingFeeling: string = '';

  /**
   * The description of the setting.
   */
  public description: string = '';

  /**
   * The image for the setting.
   */
  public img: string = '';

  /**
   * The name styles for the setting.
   */
  public nameStyles: number[] = [0, 1, 2, 3, 4];

  /**
   * The roll table configuration for the setting.
   */
  public rollTableConfig: SettingGeneratorConfig | null = null;

  /**
   * The name style examples for the setting.
   */
  public nameStyleExamples: { genre: string; settingFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] } | null = null;

  /**
   * The related journals for the setting.
   */
  public journals: RelatedJournal[] = [];

  /**
   * Note: you should always call validate() after creating a new Setting - this ensures the 
   * compendium exists and is properly used
   * @param {string} settingId - The uuid for the setting's compendium
   */
  constructor(settingId?: string) {
    this._settingId = settingId || '';

    if (settingId) {
      const settings = game.settings.get(moduleId, SettingKey.settings);

      if (!settings || !settings[settingId]) {
        throw new Error(`Setting ${settingId} not found`);
      }

      this.importSetting(settings[settingId]);
    }
  }

  private importSetting(settingDoc: SettingDoc): void {
    this.name = settingDoc.name;
    this.campaignNames = settingDoc.campaignNames;
    this.expandedIds = settingDoc.expandedIds;
    this.hierarchies = settingDoc.hierarchies;
    this.topicIds = settingDoc.topicIds;
    this.description = settingDoc.description || '';
    this.genre = settingDoc.genre || '';
    this.settingFeeling = settingDoc.settingFeeling || '';
    this.img = settingDoc.img || '';
    this.nameStyles = settingDoc.nameStyles || [0];
    this.rollTableConfig = settingDoc.rollTableConfig;
    this.nameStyleExamples = settingDoc.nameStyleExamples;
    this.journals = settingDoc.journals || [];

    if (this._settingId) {
      const compendium = game.packs?.get(this._settingId) as SettingCompendium;
      
      if (!compendium) {
        // it didn't exist, so we pretend we don't have one - this will get cleaned up in validate()
        this._settingId = '';
      } else {
        this._compendium = compendium;
      }
    }  

    this.campaigns = {} as Record<string, Campaign>;
    this.topicFolders = {} as Record<ValidTopic, TopicFolder>;
  }

  private exportSetting(): SettingDoc {
    return {
      name: this.name,
      campaignNames: this.campaignNames,
      expandedIds: this.expandedIds,
      hierarchies: this.hierarchies,
      topicIds: this.topicIds,
      description: this.description,
      genre: this.genre,
      settingFeeling: this.settingFeeling,
      img: this.img,
      nameStyles: this.nameStyles,
      rollTableConfig: this.rollTableConfig,
      nameStyleExamples: this.nameStyleExamples,
      journals: this.journals,
    };
 }

 
  /** 
   * The uuid (alias for settingId)
   */
  public get uuid(): string {
    return this._settingId;
  }
  
  static async fromUuid(settingId: string): Promise<Setting | null> {
    const settings = game.settings.get(moduleId, SettingKey.settings);

    if (!settings || !settings[settingId]) {
      return null;
    }
    else {
      const newSetting = new Setting(settingId);
      await newSetting.validate();  // will also load topic folders
      return newSetting;
    }
  }


  /**
  * Gets the Topics associated with the setting. If the topics are already loaded, the promise resolves
  * to the existing ones; otherwise, it loads the topics and then resolves to the set.
  * @returns {Promise<Record<ValidTopic, TopicFolder>>} A promise to the topics
  */
  public async loadTopics(): Promise<Record<ValidTopic, TopicFolder>> {
    if (!this.topicIds)
      throw new Error('Invalid Setting.loadTopics() called before IDs loaded');

    // loop over just the numeric values
    for (const topic of Object.values(Topics).filter(t=>typeof t === 'number')) {
      if (topic !== Topics.None && !this.topicFolders[topic]) {
        const topicObj = await TopicFolder.fromUuid(this.topicIds[topic]);
        if (!topicObj)
          throw new Error('Invalid topic uuid in Setting.loadTopics()');

        topicObj.setting = this;
        this.topicFolders[topic] = topicObj;
      }
    }

    return this.topicFolders;
  }
  

  /**
  * Gets the Campaigns associated with the setting. If the campaigns are already loaded, the promise resolves
  * to the existing ones; otherwise, it loads the campaigns and then resolves to the set.
  * @returns {Promise<Record<string, Campaign>>} A promise to the campaigns 
  */
  public async loadCampaigns(): Promise<Record<string, Campaign>> {
    for (const id in this.campaignNames) {
      const campaignObj = await Campaign.fromUuid(id);
      if (!campaignObj) {
        // clean it up
        delete this.campaignNames[id];
        delete this.campaigns[id];

        await this.save();
      } else {
        campaignObj.setting = this;
        this.campaigns[id] = campaignObj;
      }
    }

    return this.campaigns;
  }


  /** 
   * The uuid for the setting compendium   
   */
  public get settingId(): string {
    return this._settingId;
  }

  /** 
   * The actual compendium 
   */
  public get compendium(): SettingCompendium {
    return this._compendium;
  }



  /**
   * Get the hierarchy for a single entry
   */
  // TODO: get rid of this
  public getEntryHierarchy(entryId: string): Hierarchy {
    return this.hierarchies[entryId];
  }

  /**
   * set the hierarchy for a single entry
   */
  // TODO: get rid of this
  public setEntryHierarchy(entryId: string, value: Hierarchy) {
    this.hierarchies[entryId] = value;
  }
  
 
  public async collapseNode(id: string): Promise<void> {
    delete this.expandedIds[id];
    await this.save();
  }

  public async expandNode(id: string): Promise<void> {
    this.expandedIds[id] = true;
    await this.save();
  }


  /**
   * Updates a setting in the database.  Handles locking.
   * 
   * @returns {Promise<Setting | null>} The updated Setting, or null if the update failed.
   */
  public async save(): Promise<Setting | null> {
    let success = false;

    if (!this._settingId)
      return null;

    try {
      const allSettings = ModuleSettings.get(SettingKey.settings);
      allSettings[this._settingId] = this.exportSetting();
      await ModuleSettings.set(SettingKey.settings,  allSettings);

      success = true;
    } catch (e) {
      console.error('Failed to update setting', e);
    }

    return success ? this : null;
  }  

  /**
   * Create a new setting.
   * @param {boolean} [makeCurrent=false] If true, sets the new setting as the current setting.
   * @returns The new setting, or null if the user cancelled the dialog.
   */
  public static async create(makeCurrent = false): Promise<Setting | null> {
    // get the name
    let name;

    do {
      name = await FCBDialog.inputDialog(localize('dialogs.createSetting.title'), `${localize('dialogs.createSetting.settingName')}:`); 
      
      if (name) {
        const newSetting = new Setting();
        newSetting.name = name;

        await newSetting.validate();

        if (!newSetting.settingId)
          throw new Error('Failed to create setting in Setting.create()');

        // set as the current setting
        if (makeCurrent) {
          await UserFlags.set(UserFlagKey.currentSetting, newSetting.settingId);
        }
        
        // create the rolltables
        await initializeSettingRollTables(newSetting);

        // If auto-refresh is enabled, populate tables in background
        const autoRefresh = ModuleSettings.get(SettingKey.autoRefreshRollTables);
        if (autoRefresh && Backend.available && Backend.api) {
          void refreshSettingRollTables(newSetting);
        }

        return newSetting;
      }
    } while (name==='');  // if hit ok, must have a value

    // if name isn't '' and we're here, then we cancelled the dialog
    return null;
  }

  // make sure we have a compendium in the folder; create a new one if needed
  // also loads all the topics
  public async validate() {
    if (this._settingId) {
      const compendium = game.packs?.get(this._settingId) as SettingCompendium;
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

    // load the topics and campaigns
    await this.populateTopics();
    await this.loadCampaigns();
    
    // Initialize roll tables for this setting if they don't exist - but don't wait for the generation
    await initializeSettingRollTables(this);      
  }

  private async populateTopics() {
    let updated = false;

    const topics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC] as ValidTopic[];
    let topicIds = this.topicIds;
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
          topicFolder.setting = this;
      }

      if (!topicFolder) {
        // create the missing one
        topicFolder = await TopicFolder.create(this, t);

        if (!topicFolder)
          throw new Error('Couldn\'t create topicFolder in Setting.validate()');

        topicFolder.setting = this;
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
      label: `FCB - ${this.name}`,
      type: 'JournalEntry' as const, 
      ownership: {
        GAMEMASTER: 'OWNER',
        ASSISTANT: 'LIMITED',
        TRUSTED: 'LIMITED',
        PLAYER: 'LIMITED'
      },
      locked: false
    };

    const rootFolder = await RootFolder.get();
    const pack = await foundry.documents.collections.CompendiumCollection.createCompendium(metadata) as SettingCompendium;
    await pack.setFolder(rootFolder.raw);

    this._compendium = pack;
    this._settingId = pack.metadata.id;
    await this.save();
  }
  
  /**
   * Unlock the setting compendium to allow edits
   */
  public async unlock() {
    await this._compendium.configure({locked:false});
  }

  /**
   * Lock the setting compendium to stop edits
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
   * Execute a function after unlocking (if needed), then re-lock when done.
   * Uses a queue system to prevent race conditions between multiple calls.
   * Handles nested calls by checking the actual lock state of the compendium.
   */
  public async executeUnlocked(executeFunction: () => Promise<void>): Promise<void> {
    const compendiumId = this._settingId;
    
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
        // Always re-lock, but only if we were the ones who unlocked it
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
  
  public async collapseAll() {
    this.expandedIds = {};
    await this.save();
  }


  /**
   * Remove a campaign from the setting metadata.  NOTE: SETTING MUST BE UNLOCKED FIRST
   * @param {string} campaignId - the uuid of the campaign to remove
   */
  // TODO: should delete all the sessions from expanded entries, too
  public async deleteCampaignFromSetting(campaignId: string) {
    const campaigns = this.campaigns;
    if (campaigns[campaignId]) {
      delete campaigns[campaignId];
      this.campaigns = campaigns;
    }

    delete this.campaignNames[campaignId];
    delete this.expandedIds[campaignId];

    await this.save();
  }  

  // remove an entry from the setting metadata
  // note: SETTING MUST BE UNLOCKED FIRST
  public async deleteEntryFromSetting(topicFolder: TopicFolder, entryId: string) {
    const hierarchy = this.hierarchies[entryId];
    
    let topNodesCleaned = false;
    if (hierarchy) {
      // delete from any trees (also cleans up topNodes)
      if (hierarchy?.ancestors || hierarchy?.children) {
        await cleanTrees(this, topicFolder, entryId, hierarchy);
        topNodesCleaned = true;
      } else {
        // Even if there are no ancestors or children, we still need to delete the hierarchy
        delete this.hierarchies[entryId];
      }
    }

    if (!topNodesCleaned) {
      // remove from the top nodes
      const folder = this.topicFolders[topicFolder.topic];

      if (folder.topNodes.includes(entryId)) {
        folder.topNodes = folder.topNodes.filter(id => id !== entryId);
      }
    }

    // remove from the expanded list
    delete this.expandedIds[entryId];
    
    await this.save();
  }  

  // remove a session from the setting metadata
  // note: SETTING MUST BE UNLOCKED FIRST
  public async deleteSessionFromSetting(sessionId: string) {
    delete this.expandedIds[sessionId];    
    await this.save();
  }  

  // change a campaign name inside all the setting metadata
  // note: SETTING MUST BE UNLOCKED FIRST
  public async updateCampaignName(campaignId: string, name: string) {
    this.campaignNames[campaignId] = name;
    
    await this.save();
  }

  public async delete() {
    // have to unlock the pack - we won't need to lock at the end
    await this.unlock();

    // delete the pack
    if (this._compendium) {
      await this._compendium.deleteCompendium();
    }

    // delete the setting
    const allSettings = ModuleSettings.get(SettingKey.settings);
    if (allSettings[this._settingId]) {
      delete allSettings[this._settingId];
    }
    await ModuleSettings.set(SettingKey.settings, allSettings);

    // Delete all associated roll tables.
    await this.deleteRollTables();
  }

/**
 * Deletes all roll tables and the containing folder for the setting
 */
private async deleteRollTables() : Promise<void> {
  const config = this.rollTableConfig;

  if (!config) {
    return; // No roll tables configured for this setting
  }

  // first delete all the rollTables
  for (const tableUuid of Object.values(config.rollTables)) {
    const table = await fromUuid<RollTable>(tableUuid);
    if (table) {
      await table.delete();
    }
  }

  // now remove the folder
  const folder = game.folders?.get(config.folderId);   
  if (folder) {
    await folder.delete();
  }
}

  public async deleteActorFromSetting(actorId: string)
   {
    // remove from any PCs that are linked to it
    for (let pc of this.topicFolders[Topics.PC].filterEntries((e)=>e.actorId === actorId)) {
      pc.actorId = '';
      await pc.save();
    }

    for (let campaign of Object.values(this.campaigns)) {
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

  public async deleteSceneFromSetting(sceneId: string) {
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
  public async deleteItemFromSetting(itemId: string) {
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

  /** remove from the journals tabs -- don't worry about lore for now */
  public async deleteJournalEntryFromSetting(journalId: string) {
    // remove from the setting
    if (this.journals.find(j => j.journalUuid === journalId)) {
      this.journals = this.journals.filter(j => j.journalUuid !== journalId);
      await this.save();
    }

    // remove from any Campaigns that are linked to it
    for (let campaign of Object.values(this.campaigns)) {
      if (campaign.journals.find(j => j.journalUuid === journalId)) {  
        campaign.journals = campaign.journals.filter(j => j.journalUuid !== journalId);
        await campaign.save();
      }
    }

    // remove from any Entries that are linked to it
    for (let topic of Object.values(this.topicFolders)) {
      for (let entry of topic.allEntries()) {
        if (entry.journals.find(j => j.journalUuid === journalId)) {
          entry.journals = entry.journals.filter(j => j.journalUuid !== journalId);
          await entry.save();
        }
      }
    }
  }

  /** remove from the journals tabs -- don't worry about lore for now */
  public async deleteJournalEntryPageFromSetting(journalId: string) {
    // remove from the setting
    if (this.journals.find(j => j.pageUuid === journalId)) {
      this.journals = this.journals.filter(j => j.pageUuid !== journalId);
      await this.save();
    }

    // remove from any Campaigns that are linked to it
    for (let campaign of Object.values(this.campaigns)) {
      if (campaign.journals.find(j => j.pageUuid === journalId)) {  
        campaign.journals = campaign.journals.filter(j => j.pageUuid !== journalId);
        await campaign.save();
      }
    }

    // remove from any Entries that are linked to it
    for (let topic of Object.values(this.topicFolders)) {
      for (let entry of topic.allEntries()) {
        if (entry.journals.find(j => j.pageUuid === journalId)) {
          entry.journals = entry.journals.filter(j => j.pageUuid !== journalId);
          await entry.save();
        }
      }
    }
  }

}
