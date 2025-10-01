import { UserFlags, UserFlagKey, ModuleSettings, SettingKey } from '@/settings'; 
import { Hierarchy, Topics, ValidTopic } from '@/types';
import { FCBDialog } from '@/dialogs';
import { Campaign, TopicFolder, RootFolder, } from '@/classes';
import { cleanTrees } from '@/utils/hierarchy';
import { localize } from '@/utils/game';
import { initializeSettingRollTables, refreshSettingRollTables } from '@/utils/nameGenerators';
import { Backend } from '@/classes';
import { DOCUMENT_TYPES, } from '@/documents';
import { FCBSetting as SettingNamespace } from '@/documents';
import { create as createHelper, update as updateHelper } from '@/classes/Documents/helpers';

type SettingCompendium = CompendiumCollection<'JournalEntry'>;

// represents a campaign setting
// it's essentially a wrapper around a SettingDoc object stored in the 
//    module settings
export class FCBSetting extends JournalEntryPage<JournalEntryPage.SubType> {
  declare system: SettingNamespace.DocModel['system'];

  protected static _folderName = 'Settings';
  protected static _defaultSystem = { 
    name: '',  
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
  
  // JournalEntries
  public campaigns: Record<string, Campaign> = {};   // Campaigns keyed by uuid 
  public topicFolders: Record<ValidTopic, TopicFolder> = {} as Record<ValidTopic, TopicFolder>;  // we load them when we load the setting (using populate()), so we assume it's never empty

 
  static async fromUuid(settingId: string): Promise<FCBSetting | null> {
    const setting = await fromUuid<JournalEntryPage>(settingId);

    if (!setting)
      return null;

    // need to change the prototype to get it as an FCBSetting
    Object.setPrototypeOf(setting, FCBSetting.prototype);
    
    await (setting as unknown as FCBSetting).populate();

    return setting as unknown as FCBSetting;
  }

  /**
  * Gets the Topics associated with the setting. If the topics are already loaded, the promise resolves
  * to the existing ones; otherwise, it loads the topics and then resolves to the set.
  * @returns {Promise<Record<ValidTopic, TopicFolder>>} A promise to the topics
  */
  public async loadTopics(): Promise<Record<ValidTopic, TopicFolder>> {
    if (!this.system.topicIds)
      throw new Error('Invalid FCBSetting.loadTopics() called before IDs loaded');

    // loop over just the numeric values
    for (const topic of Object.values(Topics).filter(t=>typeof t === 'number')) {
      if (topic !== Topics.None && !this.topicFolders[topic]) {
        const topicObj = await TopicFolder.fromUuid(this.system.topicIds[topic]);
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
    for (const id in this.system.campaignNames) {
      const campaignObj = await Campaign.fromUuid(id);
      if (!campaignObj) {
        // clean it up
        const campaignNames = this.system.campaignNames;
        delete campaignNames[id];
        
        delete this.campaigns[id];

        await this.update({
          system: {
            campaignNames
          }
        });
      } else {
        campaignObj.setting = this;
        this.campaigns[id] = campaignObj;
      }
    }

    return this.campaigns;
  }


  /**
   * Get the hierarchy for a single entry
   */
  // TODO: get rid of this
  public getEntryHierarchy(entryId: string): Hierarchy {
    return this.system.hierarchies[entryId];
  }

  /**
   * set the hierarchy for a single entry
   */
  // TODO: get rid of this
  public async setEntryHierarchy(entryId: string, value: Hierarchy) {
    await this.update({
      system: {
        hierarchies: {
          ...this.system.hierarchies,
          [entryId]: value
        }
      }
    });
  }
  
 
  public async collapseNode(id: string): Promise<void> {
    const expandedIds = { ...this.system.expandedIds }; 
    delete expandedIds[id];

    await this.update({
      system: {
        expandedIds
      }
    })
  }

  public async expandNode(id: string): Promise<void> {
    const expandedIds = { ...this.system.expandedIds }; 
    expandedIds[id] = true;

    await this.update({
      system: {
        expandedIds
      }
    })
  }


  /**
   * Create a new setting, including the compendium and the FCBSetting content
   * @param {boolean} [makeCurrent=false] If true, sets the new setting as the current setting.
   * @param {string} [name] The name of the new setting.
   * @param {string} [compendiumId] The ID of the compendium to use.
   * @param {boolean} [skipValidation=false] If true, skips validation.  Mostly only useful for migration
   * @returns The new setting, or null if the user cancelled the dialog.
   */
  public static async createSetting(makeCurrent = false, name = '', compendiumId = '', skipValidation = false): Promise<FCBSetting | null> {
    // get the name
    let nameToUse = name || '';

    do {
      if (!nameToUse) 
        nameToUse = await FCBDialog.inputDialog(localize('dialogs.createSetting.title'), `${localize('dialogs.createSetting.settingName')}:`) || ''; 
      
      if (nameToUse) {
        // using the existing compendium is rare but useful (for ex.) when migrating or fixing things that went bad

        // more typically, we create a new one
        if (!compendiumId) {
          // create the compendium
          compendiumId = await createCompendium(nameToUse);

          if (!compendiumId)
            throw new Error('Failed to create compendium in FCBSetting.create()');
        }

        const newSetting = await createHelper<FCBSetting>(compendiumId, this._folderName, DOCUMENT_TYPES.Setting, nameToUse, this._defaultSystem) as unknown as FCBSetting;
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
    } while (nameToUse==='');  // if hit ok, must have a value

    // if name isn't '' and we're here, then we cancelled the dialog
    return null;
  }

  public async update(updateData?: SettingNamespace.UpdateData): Promise<this | undefined> {
    // use the helper to make sure we update the wrapper name if needed
    return updateHelper(this, updateData);
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
    let topicIds = foundry.utils.deepClone(this.system.topicIds);
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
          throw new Error('Couldn\'t create topicFolder in FCBSetting.populateTopics()');

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
      await this.update({ system: { topicIds }});
    }
  }
  
  public async collapseAll() {
    await this.update({ system: { expandedIds:  {} } });
  }


  /**
   * Remove a campaign from the setting metadata.  
   * @param {string} campaignId - the uuid of the campaign to remove
   */
  // TODO: should delete all the sessions from expanded entries, too
  public async deleteCampaignFromSetting(campaignId: string) {
    // clone the system object for ease of maintenance
    const system = foundry.utils.deepClone(this.system);

    if (this.campaigns[campaignId]) {
      delete this.campaigns[campaignId];
    }

    delete system.campaignNames[campaignId];
    delete system.expandedIds[campaignId];

    await this.update({ system });
  }  

  // remove an entry from the setting metadata
  public async deleteEntryFromSetting(topicFolder: TopicFolder, entryId: string) {
    // clone the system object for ease of maintenance
    const system = foundry.utils.deepClone(this.system);

    const hierarchy = system.hierarchies[entryId];
    
    let topNodesCleaned = false;
    if (hierarchy) {
      // delete from any trees (also cleans up topNodes)
      if (hierarchy?.ancestors || hierarchy?.children) {
        await cleanTrees(this, topicFolder, entryId, hierarchy);
        topNodesCleaned = true;
      } else {
        // Even if there are no ancestors or children, we still need to delete the hierarchy
        delete system.hierarchies[entryId];
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
    delete system.expandedIds[entryId];

    // save the updates
    await this.update({ system });
  }  

  // remove a session from the setting metadata
  public async deleteSessionFromSetting(sessionId: string) {
    const expandedIds = foundry.utils.deepClone(this.system.expandedIds);
    delete expandedIds[sessionId];    
    await this.update({ system: { expandedIds } });
  }  

  // change a campaign name inside all the setting metadata
  public async updateCampaignName(campaignId: string, name: string) {
    const campaignNames = foundry.utils.deepClone(this.system.campaignNames);
    campaignNames[campaignId] = name;
    
    await this.update({ system: { campaignNames } });
  }

  /** Always returns undefined */
  public override async delete(): Promise<this | undefined> {
    // delete the setting
    const allSettings = ModuleSettings.get(SettingKey.settings);
    if (allSettings[this.uuid]) {
      delete allSettings[this.uuid];
    }
    await ModuleSettings.set(SettingKey.settings, allSettings);

    // Delete all associated roll tables.
    await this.deleteRollTables();

    // delete the pack - this will delete everything else
    if (!this.pack)
      throw new Error ('Missing compendium in FCBSetting.delete');

    const pack = game.packs.get(this.pack);
    if (pack) {
      await pack.deleteCompendium();
    }

    return undefined;
  }

/**
 * Deletes all roll tables and the containing folder for the setting
 */
private async deleteRollTables() : Promise<void> {
  const config = this.system.rollTableConfig;

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
    if (this.system.journals.find(j => j.journalUuid === journalId)) {
      const journals = this.system.journals.filter(j => j.journalUuid !== journalId);
      await this.update({ system: { journals }});
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
    if (this.system.journals.find(j => j.pageUuid === journalId)) {
      const journals = this.system.journals.filter(j => j.pageUuid !== journalId);
      await this.update({ system: { journals }});
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
