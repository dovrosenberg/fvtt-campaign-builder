import { toRaw } from 'vue';
import { UserFlags, UserFlagKey, ModuleSettings, SettingKey, moduleId, JournalEntryFlagKey } from '@/settings'; 
import { FCBDialog } from '@/dialogs';
import { TopicFolder, RootFolder, Entry, Session, } from '@/classes';
import { cleanTrees } from '@/utils/hierarchy';
import { localize } from '@/utils/game';
import { initializeSettingRollTables, refreshSettingRollTables } from '@/utils/nameGenerators';
import { Backend } from '@/classes';
import { DOCUMENT_TYPES } from '@/documents/types';
import { FCBJournalEntryPage, FCBJournalEntryPageStatic } from '@/classes/Documents/FCBJournalEntryPage';
import { entryIndexFields, NameStyleExamples, sessionIndexFields, } from '@/documents';
import { cleanKeysOnSave, } from '@/utils/cleanKeys';
import { Campaign } from './Campaign';
import { ArcBasicIndex, CampaignBasicIndex, EntryFilterIndex, Hierarchy, RelatedJournal, TopicBasicIndex, SessionFilterIndex, SessionIndex, SettingGeneratorConfig, Topics, ValidTopic, ValidTopicRecord } from '@/types';
import { updateGlobalSetting, removeGlobalSetting } from '@/utils/globalSettings';

type SettingCompendium = CompendiumCollection<'JournalEntry'>;

type SettingDocClass = JournalEntryPage<typeof DOCUMENT_TYPES.Setting>;

// represents a campaign setting
export class FCBSetting extends FCBJournalEntryPage<typeof DOCUMENT_TYPES.Setting> {
  static override _documentType = DOCUMENT_TYPES.Setting;
  static override _defaultSystem = { 
    topics: {
      [Topics.Character]: { topic: Topics.Character, topNodes: [], types: [], entries: {} },
      [Topics.Location]: { topic: Topics.Location, topNodes: [], types: [], entries: {} },
      [Topics.Organization]: { topic: Topics.Organization, topNodes: [], types: [], entries: {} },
      [Topics.PC]: { topic: Topics.PC, topNodes: [], types: [], entries: {} },
    },
    campaigns: {},  
    expandedIds: {},  
    hierarchies: {},  
    genre: '',  
    settingFeeling: '',   
    img: '',   
    nameStyles: [],   
    rollTableConfig: null,   
    nameStyleExamples: { genre: '', settingFeeling: '', examples: [] },   
    journals: [], 
  } as unknown as SettingDocClass['system'];
  
  // JournalEntries
  public campaigns: Record<string, Campaign>= {};   // Campaigns keyed by uuid 

  /** these are the the class objects - see topics for just the flattened system data */
  public topicFolders: ValidTopicRecord<TopicFolder> = {};  // we load them when we load the setting (using populate()), so we assume it's never empty
    
  static override async fromUuid<
    T extends FCBJournalEntryPageStatic<any, any>
  > (this: T, settingId: string): Promise<InstanceType<T> | null> { 
    const setting = await super.fromUuid(settingId) as unknown as (FCBSetting | null);
    
    if (!setting)
      return null;

    await setting.populate();

    return setting as InstanceType<T>;
  }

  public setTopic(topicId: ValidTopic, value: TopicFolder) {
    this._clone.system.topics[topicId] = {
      topNodes: value.topNodes.slice(),
      types: value.types.slice(),
      topic: value.topic,
    };
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

  /** these are the the indexes for the topics (see topicFolders for the class objects) */
  public get topics(): ValidTopicRecord<TopicBasicIndex> {
    return this._clone.system.topics;
  }

  /** these are the the indexes for the campaigns (see campaigns for the class objects) */
  public set topics(value: ValidTopicRecord<TopicBasicIndex>) {
    this._clone.system.topics = value;
  }

  /** indexes for campaigns/sessions */
  public get campaignIndex(): CampaignBasicIndex[] {
    return this._clone.system.campaignIndex;
  }

  public set campaignIndex(value: CampaignBasicIndex[]) {
    this._clone.system.campaignIndex = value;
  }

  public getIndexForArc(uuid: string): ArcBasicIndex | null {
    // search every campaign for it
    for (const campaign of this._clone.system.campaignIndex) {
      const arc = campaign.arcs.find(arc => arc.uuid === uuid);
      if (arc)
        return arc;
    }
    return null;
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

  public get nameStyleExamples(): NameStyleExamples {
    return this._clone.system.nameStyleExamples as NameStyleExamples;
  } 

  public set nameStyleExamples(value: NameStyleExamples) {
    // @ts-ignore
    this._clone.system.nameStyleExamples = value;
  }

  public get journals(): RelatedJournal[] {
    return this._clone.system.journals as RelatedJournal[];
  }

  public set journals(value: RelatedJournal[]) {
    (this._clone.system.journals as RelatedJournal[]) = value;
  } 


  /**
  * Gets the Campaigns associated with the setting. If the campaigns are already loaded, the promise resolves
  * to the existing ones; otherwise, it loads the campaigns and then resolves to the set.
  * @returns {Promise<Record<string, Campaign>>} A promise to the campaigns 
  */
  public async loadCampaigns(): Promise<Record<string, Campaign>> {
    // we clean up bad ones because various old versions may have stranded entries
    for (const index of this.campaignIndex) {
      const campaign = await Campaign.fromUuid(index.uuid);

      if (!campaign) {
        // clean it up
        this.campaignIndex = this.campaignIndex.filter((c) => c.uuid !== index.uuid);
        delete this.campaigns[index.uuid];
      } else {
        this.campaigns[index.uuid] = campaign;
      }
    }

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
   * @param {boolean} [skipValidation=false] If true, skips validation and RollTables.  Mostly only useful for migration
   * @returns The new setting, or null if the user cancelled the dialog.
   */
  public static async create(makeCurrent = false, name = '', compendiumId = '', skipValidation = false): Promise<FCBSetting | null> {
    // get the name
    let nameToUse: string | null = name;

    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await FCBDialog.inputDialog(localize('dialogs.createSetting.title'), `${localize('dialogs.createSetting.settingName')}:`); 
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

    const newSetting = await super._create(compendiumId, nameToUse, '') as unknown as FCBSetting | null;

    if (!newSetting)
      return null;
        
    // add to index
    const indexes = ModuleSettings.get(SettingKey.settingIndex);
    indexes.push({
      name: nameToUse,
      settingId: newSetting.uuid,
      packId: compendiumId,
    });
    await ModuleSettings.set(SettingKey.settingIndex, indexes);
    
    // add to master list
    updateGlobalSetting(newSetting);

    await newSetting.populate(skipValidation);

    if (skipValidation)
      return newSetting;

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
  // skipRollTables used for migration/testing
  public async populate(skipRollTables = false) {
    // load the campaigns and topics
    await this.loadCampaigns();
    this.populateTopics();
    
    // Initialize roll tables for this setting if they don't exist - but don't wait for the generation
    if (!skipRollTables)
      await initializeSettingRollTables(this);      
  }

  private populateTopics() {
    const topicList = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC] as ValidTopic[];

    if (!this._clone.system.topics || Object.keys(this._clone.system.topics).length === 0) {
      this._clone.system.topics = {
        [Topics.Character]: { topic: Topics.Character, topNodes: [], types: [], entries: {} },
        [Topics.Location]: { topic: Topics.Location, topNodes: [], types: [], entries: {} },
        [Topics.Organization]: { topic: Topics.Organization, topNodes: [], types: [], entries: {} },
        [Topics.PC]: { topic: Topics.PC, topNodes: [], types: [], entries: {} },
      } as unknown as ValidTopicRecord<TopicBasicIndex>;
    }

    // load the topics
    for (let i=0; i<topicList.length; i++) {
      const t = topicList[i];

      // @ts-ignore - ignore conversion of ValidTopic to string
      this.topicFolders[t] = new TopicFolder(t, this);
    }
  }

  /**
   * Given a filter function, returns all the matching Entries
   * inside this setting
   * 
   * @param {(e: EntryFilterIndex) => boolean} filterFn - The filter function
   * @returns {Entry[]} The entries that pass the filter 
   */
  public async filterEntries(filterFn: (e: EntryFilterIndex) => boolean): Promise<Entry[]> { 
    // get all the journal entries
    const indexEntries = await toRaw(this.compendium).getIndex(entryIndexFields());

    // find the entries 
    const entries = indexEntries
      // first find the relevant ones
      .filter((e)=> (
        e.flags?.[moduleId]?.[JournalEntryFlagKey.campaignBuilderType]===DOCUMENT_TYPES.Entry &&
        !!e.pages && e.pages!.length > 0
      ))
      .map((e) => ({ 
        name: e.name, 
        id: e._id,
        uuid: e.uuid,
        actorId: e.pages![0].system.actorId,
        type: e.pages![0].system.type
      } as EntryFilterIndex))

      // now filter by the function passed in 
      .filter((e: EntryFilterIndex)=> filterFn(e)) || [];

    if (entries.length===0)
      return [];

    let retval = [] as Entry[];
    for (let i=0; i<entries.length; i++) {
      const entry = await Entry.fromUuid(entries[i].uuid);
      if (entry)
        retval.push(entry);
    }

    return retval;
  }

  /**
   * Given a filter function, returns all the matching Sessions
   * inside this setting
   * 
   * @param {(e: SessionFilterIndex) => boolean} filterFn - The filter function
   * @returns {Session[]} The sessions that pass the filter 
   */
  public async filterSessions(filterFn: (s: SessionFilterIndex) => boolean): Promise<Session[]> { 
    // get all the journal entries
    const indexSessions = await toRaw(this.compendium).getIndex(sessionIndexFields());

    // find the sessions 
    const sessions = indexSessions
      // first find the relevant ones
      .filter((e)=> (
        e.flags?.[moduleId]?.[JournalEntryFlagKey.campaignBuilderType]===DOCUMENT_TYPES.Session &&
        !!e.pages && e.pages!.length > 0
      ))
      .map((e) => ({ 
        name: e.name, 
        id: foundry.utils.parseUuid(e.uuid).id,
        uuid: e.uuid,
        number: e.pages![0].system.number,
        date: e.pages![0].system.date,
      } as SessionFilterIndex))

      // now filter by the function passed in 
      .filter((s: SessionFilterIndex)=> filterFn(s)) || [];

    if (sessions.length===0)
      return [];

    let retval = [] as Session[];
    for (let i=0; i<sessions.length; i++) {
      const session = await Session.fromUuid(sessions[i].uuid);
      if (session)
        retval.push(session);
    }

    return retval;
  }

  /**
   * Returns all the entries inside the setting
   * 
   * @returns {Entry[]} The entries
   */
  public async allEntries(): Promise<Entry[]> { 
    return await this.filterEntries(() => true);
  }

  /**
   * Returns all the sessions inside the setting
   * 
   * @returns {Session[]} The entries
   */
  public async allSessions(): Promise<Session[]> { 
    return await this.filterSessions(() => true);
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

    this.campaignIndex = this.campaignIndex.filter((c) => c.uuid !== campaignId);
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

  
  public async deleteIdFromExpandedList(id: string) {
    delete this.expandedIds[id];
    await this.save();
  }
  
  protected _prepData(data: SettingDocClass): void {
    // convert unsafe keys
    data.system.hierarchies = cleanKeysOnSave(data.system.hierarchies);
    data.system.expandedIds = cleanKeysOnSave(data.system.expandedIds);
  }
  
  public async save() {
    const nameChanged = this._clone.name !== this._doc.name;

    // we attempt to save first - because if it fails, we don't 
    //    want to adjust anything else
    try {
      // populate the topic folders; important in case we changed anything in topics
      this.populateTopics();

      // now save the setting - this will put clone back where it should be
      await super.save();
    } catch (error) {
      throw error;
    }

    // settings have long lived-cache... we need to refresh that in case we modified 
    //    something that was a copy
    updateGlobalSetting(this);

    // finally, update the setting index if needed
    if (nameChanged) {
      const settingIndex = ModuleSettings.get(SettingKey.settingIndex);
      const settingIndexUpdated = settingIndex.map((s)=> (
        s.settingId !== this.uuid ? 
          s : 
          {
            ...s,
            name: this.name,
          }
      ));
      await ModuleSettings.set(SettingKey.settingIndex, settingIndexUpdated);
      }
  }

  public async delete(): Promise<this | undefined> {
    // delete the setting
    const allSettings = ModuleSettings.get(SettingKey.settingIndex).filter(s=>s.settingId!==this.uuid);
    await ModuleSettings.set(SettingKey.settingIndex, allSettings);

    // Delete all associated roll tables.
    await this.deleteRollTables();

    // remove from master
    removeGlobalSetting(this.uuid);

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
    for (let pc of (await this.topicFolders[Topics.PC]!.filterEntries((e)=>e.actorId === actorId))) {
      pc.actorId = '';
      await pc.save();
    }

    for (let campaign of Object.values(this.campaigns)) {
      // remove from any monsters that are linked to it
      const sessions = await campaign.allSessions();
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
    for (let character of (await this.topicFolders[Topics.Character]!.allEntries())) {
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
    for (let locations of (await this.topicFolders[Topics.Location]!.allEntries())) {
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
      const sessions = await campaign.allSessions();

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
      for (let entry of (await topic.allEntries())) {
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
      for (let entry of (await topic.allEntries())) {
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
    localize('contentFolders.sessions'),
    localize('contentFolders.campaigns'),
    localize('contentFolders.entries'),
    localize('contentFolders.fronts'),
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
