import { UserFlags, UserFlagKey, ModuleSettings, SettingKey } from '@/settings'; 
import { Hierarchy, Topics, ValidTopic, SettingGeneratorConfig, RelatedJournal, ContentType } from '@/types';
import { FCBDialog } from '@/dialogs';
import { Campaign, TopicFolder, RootFolder, } from '@/classes';
import { cleanTrees } from '@/utils/hierarchy';
import { localize } from '@/utils/game';
import { initializeSettingRollTables, refreshSettingRollTables } from '@/utils/nameGenerators';
import { Backend } from '@/classes';
import { ApiNamePreviewPost200ResponsePreviewInner } from '@/apiClient';
import { SettingDoc, } from '@/documents';
import { ContentWrapper } from './ContentWrapper';

type SettingCompendium = CompendiumCollection<'JournalEntry'>;

// represents a campaign setting
// it's essentially a wrapper around a SettingDoc object stored in the 
//    module settings
export class Setting extends ContentWrapper<ContentType.Setting> {
  protected static override _getFolderName = () => { return localize('contentFolders.settings'); }
  
  // JournalEntries
  public campaigns: Record<string, Campaign>;   // Campaigns keyed by uuid 
  public topicFolders: Record<ValidTopic, TopicFolder>;  // we load them when we load the setting (using validate()), so we assume it's never empty

  // this is the compendium for the setting
  public get compendium(): SettingCompendium {
    const packId = this._doc.pack;

    if (!packId)
      throw new Error('Missing packId in Setting.compendium()');
    
    return game.packs.get(packId) as SettingCompendium;
  };   

 
  /**
   * The id of the compendium its in
   */
  public get compendiumId(): string {
    return this.compendium.metadata.id;
  } 

  /**
   * The uuid for each topic.
   */
  public get topicIds(): Record<ValidTopic, string> | Record<never, string> {
    return this._page.system.topicIds;
  };  

  public set topicIds(value: Record<ValidTopic, string>) {
    this._page.system.topicIds = value;
  };  

  /**
   * The names of campaigns; keyed by journal entry uuid.
   */
  public get campaignNames(): Record<string, string> {
    return this._page.system.campaignNames;
  } 

  public set campaignNames(value: Record<string, string>) {
    this._page.system.campaignNames = value;
  } 

  /**
   * The IDs of nodes that are expanded in the directory.
   * Could include compendia, entries, or subentries, or campaigns.
   */
  public get expandedIds(): Record<string, boolean> {
    return this._page.system.expandedIds;
  } 

  public set expandedIds(value: Record<string, boolean>) {
    this._page.system.expandedIds = value;
  }  
  
  /**
   * The full tree hierarchy or null for topics without a hierarchy.
   */
  public get hierarchies(): Record<string, Hierarchy> {
    return this._page.system.hierarchies;
  } 

  public set hierarchies(value: Record<string, Hierarchy>) {
    this._page.system.hierarchies = value;
  }  

  /**
   * The genre of the setting.
   */
  public get genre(): string {
    return this._page.system.genre;
  } 

  public set genre(value: string) {
    this._page.system.genre = value;
  }  

  /**
   * The feeling of the setting.
   */
  public get settingFeeling(): string {
    return this._page.system.settingFeeling;
  } 

  public set settingFeeling(value: string) {
    this._page.system.settingFeeling = value;
  }

  /**
   * The description of the setting.
   */
  public get description(): string {    
    return this._page.text?.content || '';
  }

  public set description(value: string) {
    this._page.text.content = value;
  }  

  /**
   * The image for the setting.
   */
  public get img(): string {
    return this._page.system.img;
  } 

  public set img(value: string) {
    this._page.system.img = value;
  }  

  /**
   * The name styles for the setting.
   */
  public get nameStyles(): number[] {
    return this._page.system.nameStyles;
  } 

  public set nameStyles(value: number[]) {
    this._page.system.nameStyles = value;
  }

  /**
   * The roll table configuration for the setting.
   */
  public get rollTableConfig(): SettingGeneratorConfig | null {
    return this._page.system.rollTableConfig;
  } 

  public set rollTableConfig(value: SettingGeneratorConfig | null) {
    this._page.system.rollTableConfig = value;
  }

  /**
   * The name style examples for the setting.
   */
  public get nameStyleExamples(): { genre: string; settingFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] } | null {
    return this._page.system.nameStyleExamples;
  } 

  public set nameStyleExamples(value: { genre: string; settingFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] } | null) {
    this._page.system.nameStyleExamples = value;
  }

  /**
   * The related journals for the setting.
   */
  public get journals(): RelatedJournal[] {
    return this._page.system.journals;
  } 

  public set journals(value: RelatedJournal[]) {
    this._page.system.journals = value;
  }


  protected override _getDefaultContent(): Record<string, any> {
    return {
      topicIds: {},
      campaignNames: {},
      expandedIds: {},
      hierarchies: {},
      genre: '',
      settingFeeling: '',
      img: '',
      nameStyles: [],
      rollTableConfig: null,
      nameStyleExamples: null,
      journals: [],
    };
  }
  
  /**
   * Note: you should always call validate() after creating a new Setting - this ensures the 
   * compendium exists and is properly used
   * 
   * @param {SettingDoc} settingDoc - The setting Foundry JE document
   */
  constructor(settingDoc: SettingDoc) {
    super(settingDoc, ContentType.Setting);

    this.campaigns = {} as Record<string, Campaign>;
    this.topicFolders = {} as Record<ValidTopic, TopicFolder>;
  }

 
  /** 
   * Alias for settingId
   */
  public get uuid(): string {
    return this.settingId;
  }
  
  static async fromUuid(settingId: string): Promise<Setting | null> {
    const settingDoc = await ContentWrapper.docFromUuid(settingId, ContentType.Setting) as unknown as SettingDoc | null;

    if (!settingDoc)
      return null;
    
    const setting = new Setting(settingDoc as SettingDoc);
    await setting.validate();

    return setting;
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
   * The id for the setting JournalEntry (NOT the page)  
   */
  public get settingId(): string {
    return this._doc.uuid;
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
   * Create a new setting, including the compendium and the Setting content
   * @param {boolean} [makeCurrent=false] If true, sets the new setting as the current setting.
   * @param {string} [name] The name of the new setting.
   * @param {string} [settingId] The ID of the new setting.
   * @param {boolean} [skipValidation=false] If true, skips validation.  Mostly only useful for migration
   * @returns The new setting, or null if the user cancelled the dialog.
   */
  public static async create(makeCurrent = false, name = '', settingId = '', skipValidation = false): Promise<Setting | null> {
    // get the name
    let nameToUse = name || '';

    do {
      if (!nameToUse) 
        nameToUse = await FCBDialog.inputDialog(localize('dialogs.createSetting.title'), `${localize('dialogs.createSetting.settingName')}:`) || ''; 
      
      if (nameToUse) {
        let compendiumId;
        if (settingId) {
          // use the existing compendium... this is rare but useful (for ex.) when migrating or fixing things that went bad
          compendiumId = settingId;
        } else {
          // create the compendium
          compendiumId = await createCompendium(nameToUse);

          if (!compendiumId)
            throw new Error('Failed to create compendium in Setting.create()');
        }

        const newSetting = await super.create(compendiumId, ContentType.Setting, nameToUse) as Setting;
        if (skipValidation)
          return newSetting;

        await newSetting.validate();

        // set as the current setting
        if (makeCurrent) {
          await UserFlags.set(UserFlagKey.currentSetting, newSetting.settingId);
        }
        
        // If auto-refresh is enabled, populate tables in background
        const autoRefresh = ModuleSettings.get(SettingKey.autoRefreshRollTables);
        if (autoRefresh && Backend.available && Backend.api) {
          void refreshSettingRollTables(newSetting);
        }

        return newSetting;
      }
    } while (nameToUse==='');  // if hit ok, must have a value

    // if name isn't '' and we're here, then we cancelled the dialog
    return null;
  }

  // make sure we have a compendium in the folder; create a new one if needed
  // also loads all the topics
  public async validate() {
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
      this.topicIds = topicIds as Record<ValidTopic, string>;
      await this.save();
    }
  }
  
  public async collapseAll() {
    this.expandedIds = {};
    await this.save();
  }


  /**
   * Remove a campaign from the setting metadata.  
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
  public async deleteSessionFromSetting(sessionId: string) {
    delete this.expandedIds[sessionId];    
    await this.save();
  }  

  // change a campaign name inside all the setting metadata
  public async updateCampaignName(campaignId: string, name: string) {
    this.campaignNames[campaignId] = name;
    
    await this.save();
  }

  public async delete() {
    // delete the pack
    if (this.compendium) {
      await this.compendium.deleteCompendium();
    }

    // delete the setting
    const allSettings = ModuleSettings.get(SettingKey.settings);
    if (allSettings[this.settingId]) {
      delete allSettings[this.settingId];
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

/** create a new compendium and the folder structure
 * 
 * @param name - The name of the compendium
 * @returns The id of the compendium
 */
const createCompendium = async(name: string): Promise<string> => {
  const metadata = { 
    name: foundry.utils.randomID(), 
    label: `FCB - ${name}`,
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

  const compendiumId = pack.metadata.id;

  // create the folders inside
  const folderNames = [
    localize('contentFolders.settings'),
    localize('contentFolders.campaigns'),
    localize('contentFolders.entries'),
    localize('contentFolders.sessions'),
  ];

  const folders = folderNames.map((folderName) => ({
    name: folderName,
    type: 'JournalEntry' as const,
    sorting: 'a' as const,
  }));

  await Folder.createDocuments(folders, { pack: compendiumId });

  if (!folders) throw new Error("Couldn't create root folder");

  return compendiumId;
}
