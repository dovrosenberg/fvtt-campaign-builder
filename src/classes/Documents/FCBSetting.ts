import { toRaw } from 'vue';
import { UserFlags, UserFlagKey, ModuleSettings, SettingKey } from '@/settings'; 
import { Hierarchy, RelatedJournal, SettingGeneratorConfig, Topics, ValidTopic } from '@/types';
import { FCBDialog } from '@/dialogs';
import { TopicFolder, RootFolder, } from '@/classes';
import { cleanTrees } from '@/utils/hierarchy';
import { localize } from '@/utils/game';
import { initializeSettingRollTables, refreshSettingRollTables } from '@/utils/nameGenerators';
import { Backend } from '@/classes';
import { DOCUMENT_TYPES } from '@/documents/types';
import { FCBJournalEntryPage } from '@/classes/Documents/FCBJournalEntryPage';
import { NameStyleExample } from '@/documents';
import { cleanKeysOnSave } from '@/utils/cleanKeys';
import { Campaign } from './Campaign';

type SettingCompendium = CompendiumCollection<'JournalEntry'>;

type SettingDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.Setting>;

type FCBSettingConstructor<
  DocType extends typeof DOCUMENT_TYPES.Setting = typeof DOCUMENT_TYPES.Setting,
  DocClass extends JournalEntryPage<DocType> = JournalEntryPage<DocType>
> = {
  // constructor
  new (doc: DocClass, ...args: any[]): FCBSetting;
  // required statics used by base helpers
  _defaultSystem: DocClass['system'];
  _folderName: string;
  _documentType: DocType;
};


// represents a campaign setting
export class FCBSetting extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.Setting> {
  static override _folderName = 'Settings';
  static override _documentType = DOCUMENT_TYPES.Setting;
  static override _defaultSystem = { 
    topicIds: {},  
    campaignNames: {},  
    expandedIds: {},  
    hierarchies: {},  
    genre: '',  
    settingFeeling: '',   
    img: '',   
    nameStyles: [],   
    rollTableConfig: null,   
    nameStyleExamples: [],   
    journals: [], 
  } as unknown as SettingDocClass['system'];
  
  // JournalEntries
  public campaigns: Record<string, Campaign> = {};   // Campaigns keyed by uuid 
  public topicFolders: Record<ValidTopic, TopicFolder> = {} as Record<ValidTopic, TopicFolder>;  // we load them when we load the setting (using populate()), so we assume it's never empty
    
  static override async fromUuid<
    DocType extends typeof DOCUMENT_TYPES.Setting = typeof DOCUMENT_TYPES.Setting,
    DocClass extends JournalEntryPage<DocType> = JournalEntryPage<DocType>,
    T extends FCBSettingConstructor<DocType, DocClass>=FCBSettingConstructor<DocType, DocClass>
  > (this: T, settingId: string): Promise<InstanceType<T> | null> { 
    const setting = await super.fromUuid(settingId) as unknown as (FCBSetting | null);
    
    if (!setting)
      return null;

    await setting.populate();

    return setting as InstanceType<T>;
  }

  /**
   * The JournalEntry UUID for each topic.
   */
  public get topicIds(): Record<ValidTopic, string> | Record<never, string> {
    return this._clone.system.topicIds;
  }

  public set topicIds(value: Record<ValidTopic, string> | Record<never, string>) {
    this._clone.system.topicIds = value;
  }

  /**
   * The name keyed by JournalEntry UUID.
   */
  public get campaignNames(): Record<string, string> {
    return this._clone.system.campaignNames as Record<string, string>;
  }

  public set campaignNames(value: Record<string, string>) {
    this._clone.system.campaignNames = value;
  }

  /**
   * The IDs of nodes that are expanded in the directory.
   * Could include compendia, entries, or subentries, or campaigns.
   */
  public get expandedIds(): Record<string, boolean> {
    return this._clone.system.expandedIds as Record<string, boolean>;
  }

  public set expandedIds(value: Record<string, boolean>) {
    this._clone.system.expandedIds = value;
  }

  /**
   * The full tree hierarchy or null for topics without a hierarchy.
   */
  public get hierarchies(): Record<string, Hierarchy> {
    return this._clone.system.hierarchies as Record<string, Hierarchy>;
  }

  public set hierarchies(value: Record<string, Hierarchy>) {
    this._clone.system.hierarchies = value;
  }

  get description(): string {
    return this._clone.text?.content || '';
  }

  set description(value: string) {
    this._clone.text = {
      ...this._clone.text,
      content: value
    };
  }

  public get genre(): string {
    return this._clone.system.genre;
  }

  public set genre(value: string) {
    this._clone.system.genre = value;
  }

  public get settingFeeling(): string {
    return this._clone.system.settingFeeling;
  }

  public set settingFeeling(value: string) {
    this._clone.system.settingFeeling = value;
  }

  public get img(): string {
    return this._clone.system.img || '';
  }

  public set img(value: string) {
    this._clone.system.img = value;
  }
  
  public get nameStyles(): readonly number[] {
    return this._clone.system.nameStyles;
  }

  public set nameStyles(value: number[] | readonly number[] ) {
    this._clone.system.nameStyles = value.slice();     // we clone it so it can't be edited outside
  }

  public get rollTableConfig(): SettingGeneratorConfig | null {
    return (this._clone.system.rollTableConfig || null) as unknown as SettingGeneratorConfig | null;
  }

  public set rollTableConfig(value: SettingGeneratorConfig | null) {
    (this._clone.system.rollTableConfig as SettingGeneratorConfig | null) = value;
  }

  public get nameStyleExamples(): NameStyleExample[] | null {
    return (this._clone.system.nameStyleExamples || null) as unknown as NameStyleExample[] | null;
  } 

  public set nameStyleExamples(value: NameStyleExample[] | null) {
    (this._clone.system.nameStyleExamples as NameStyleExample[] | null) = value;
  }

  public get journals(): RelatedJournal[] {
    return this._clone.system.journals as RelatedJournal[];
  }

  public set journals(value: RelatedJournal[]) {
    (this._clone.system.journals as RelatedJournal[]) = value;
  } 

  /**
  * Gets the Topics associated with the setting. If the topics are already loaded, the promise resolves
  * to the existing ones; otherwise, it loads the topics and then resolves to the set.
  * @returns {Promise<Record<ValidTopic, TopicFolder>>} A promise to the topics
  */
  public async loadTopics(): Promise<Record<ValidTopic, TopicFolder>> {
    if (!this.topicIds)
      throw new Error('Invalid FCBSetting.loadTopics() called before IDs loaded');

    // loop over just the numeric values
    for (const topic of Object.values(Topics).filter(t=>typeof t === 'number')) {
      if (topic !== Topics.None && !this.topicFolders[topic]) {
        const topicObj = await TopicFolder.fromUuid(this.topicIds[topic]);
        if (!topicObj)
          throw new Error('Invalid topic uuid in FCBSetting.loadTopics()');

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
    let changes = false;

    // we clean up bad ones because various old versions may have stranded entries
    for (const id in this.campaignNames) {
      const campaignObj = await Campaign.fromUuid(id);

      if (!campaignObj) {
        // clean it up

        // because we're going to save the changes, we'll put in these things to delete the keys and
        //    then when save completes it will refresh so those won't be there any more
        // @ts-ignore
        this.campaignNames[`-=${id}`] = null;

        // clean up locally
        delete this.campaignNames[id];
        delete this.campaigns[id];

        changes = true;
      } else {
        this.campaigns[id] = campaignObj;
      }
    }

    if (changes)
      await this.save();
    return this.campaigns;
  }


  /**
   * Get the hierarchy for a single entry
   */
  // TODO: get rid of this
  public getEntryHierarchy(entryId: string): Hierarchy {
    return this.hierarchies[entryId] as Hierarchy;
  }

  /**
   * set the hierarchy for a single entry
   */
  // TODO: get rid of this
  public async setEntryHierarchy(entryId: string, value: Hierarchy) {
    this.hierarchies[entryId] = value;
    await this.save();
  }
  
 
  public async collapseNode(id: string): Promise<void> {
    delete this.expandedIds[id];
    await this.save();
  }

  public async expandNode(id: string): Promise<void> {
    this.expandedIds[id] = true;
    await this.save();
  }

  // alias for uuid
  public get settingId(): string {
    return this.uuid;
  }

  /**
   * Create a new setting, including the compendium and the FCBSetting content
   * @param {boolean} [makeCurrent=false] If true, sets the new setting as the current setting.
   * @param {string} [name] The name of the new setting.
   * @param {string} [compendiumId] The ID of the compendium to use.
   * @param {boolean} [skipValidation=false] If true, skips validation.  Mostly only useful for migration
   * @returns The new setting, or null if the user cancelled the dialog.
   */
  public static async create(makeCurrent = false, name = '', compendiumId = '', skipValidation = false): Promise<FCBSetting | null> {
    // get the name
    let nameToUse: string | null = name;

    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await FCBDialog.inputDialog(localize('dialogs.createSession.title'), `${localize('dialogs.createSession.sessionName')}:`); 
    }  

    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;
    
    // using the existing compendium is rare but useful (for ex.) when migrating or fixing things that went bad

    // more typically, we create a new one
    if (!compendiumId) {
      // create the compendium
      compendiumId = await createCompendium(nameToUse);

      if (!compendiumId)
        throw new Error('Failed to create compendium in FCBSetting.create()');
    }

    const newSetting = await super._create(compendiumId, nameToUse) as unknown as FCBSetting | null;

    if (!newSetting)
      return null;
    
    if (skipValidation)
      return newSetting;

    await newSetting.populate();

    // set as the current setting
    if (makeCurrent) {
      await UserFlags.set(UserFlagKey.currentSetting, newSetting.uuid);
    }
    
    // If auto-refresh is enabled, populate tables in background
    const autoRefresh = ModuleSettings.get(SettingKey.autoRefreshRollTables);
    if (autoRefresh && Backend.available && Backend.api) {
      void refreshSettingRollTables(newSetting);
    }

    return newSetting;
  }

  // make sure we have a compendium in the folder; create a new one if needed
  // also loads all the topics
  public async populate() {
    // load the topics and campaigns
    await this.populateTopics();
    await this.loadCampaigns();
    
    // Initialize roll tables for this setting if they don't exist - but don't wait for the generation
    await initializeSettingRollTables(this);      
  }

  private async populateTopics() {
    let updated = false;

    const topics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC] as ValidTopic[];
    const topicObjects = {} as Record<ValidTopic, TopicFolder>;

    if (!this.topicIds) {
      this.topicIds = {} as Record<ValidTopic, string>;
    }

    // load the topics, creating them if needed
    for (let i=0; i<topics.length; i++) {
      const t = topics[i];

      let topicFolder;
      if (this.topicIds[t]) {
        topicFolder = await TopicFolder.fromUuid(this.topicIds[t]);

        if (topicFolder)
          topicFolder.setting = this;
      }

      if (!topicFolder) {
        // create the missing one
        topicFolder = await TopicFolder.create(this, t);

        if (!topicFolder)
          throw new Error('Couldn\'t create topicFolder in FCBSetting.populateTopics()');

        topicFolder.setting = this;
        this.topicIds[t] = topicFolder.uuid;
        topicObjects[t] = topicFolder;

        updated = true;
      } else {
        topicObjects[t] = topicFolder;
      }
    }

    this.topicFolders = topicObjects;

    // if we changed things, save new compendia flag
    if (updated) {
      this.save();
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
    if (this.campaigns[campaignId]) {
      delete this.campaigns[campaignId];
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

    // save the updates
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

  public async save() {
    // convert unsafe keys
    this.hierarchies = cleanKeysOnSave(this.hierarchies);
    this.campaignNames = cleanKeysOnSave(this.campaignNames);
    this.expandedIds = cleanKeysOnSave(this.expandedIds);
    
    // now save the page - this will put clone back where it should be
    await super.save();
  }

  public async delete(): Promise<this | undefined> {
    // delete the setting
    const allSettings = ModuleSettings.get(SettingKey.settingIndex).filter(s=>s.settingId!==this.uuid);
    await ModuleSettings.set(SettingKey.settingIndex, allSettings);

    // Delete all associated roll tables.
    await this.deleteRollTables();

    // delete the pack - this will delete everything else
    if (!this.compendium)
      throw new Error ('Missing compendium in FCBSetting.delete');

    await toRaw(this.compendium).deleteCompendium();

    return undefined;
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
      const sessions = await campaign.getSessions();
      for (let session of sessions) {
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
      const sessions = await campaign.getSessions();

      for (let session of sessions) {
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
  const pack = await foundry.documents.collections.CompendiumCollection.createCompendium(metadata) as  SettingCompendium;
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
