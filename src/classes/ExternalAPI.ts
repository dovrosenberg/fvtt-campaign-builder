/**
 * ExternalAPI class that provides external access to the campaign builder module functionality
 */
import { useCampaignDirectoryStore, useMainStore, } from '@/applications/stores';
import { ModuleSettings, SettingKey } from '@/settings';
import { Topics, ValidTopic } from '@/types';
import type { RelatedJournal } from '@/types';
import { log } from '@/utils/log';
import { Campaign } from '@/classes/Documents/Campaign';
import { FCBDialog } from '@/dialogs';
import { FCBSetting } from '@/classes/Documents/FCBSetting';
import { Entry } from '@/classes/Documents/Entry';
import { Session } from './Documents';

interface GetListReturnValue { 
  uuid: string; 
  name: string
};

export class ExternalAPI {
  public TOPICS = {
    Character: Topics.Character,
    Location: Topics.Location,
    Organization: Topics.Organization,
    PC: Topics.PC,
  };

  /** only available in development mode */
  public testAPI: TestAPI | null = null;

  /**
   * Initialize the API
   */
  constructor() {
    if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
      this.testAPI = new TestAPI();
    }

    log(false, 'Campaign Builder External API initialized');
  }

  public getEntries(topic: ValidTopic): GetListReturnValue[] {
    const setting = useMainStore().currentSetting;

    if (!setting)
      return [];

    try {
      const topicFolder = setting.topicFolders[topic];

      const results = [] as GetListReturnValue[];

      for (const entry of topicFolder?.entryIndex || []) {
        results.push({ uuid: entry.uuid, name: entry.name });
      }

      return results;
    } catch (_e) {
      return [];
    }
  } 

  // creates an entry in the current setting
  async createEntry(topic: ValidTopic): Promise<{uuid: string; name: string}| null> {
    const entry = await FCBDialog.createEntryDialog(topic, { } );

    if (entry) {
      return { uuid: entry.uuid, name: entry.name };
    } else {
      return null;
    }
  }

  getCampaigns(): GetListReturnValue[] {
    const setting = useMainStore().currentSetting;

    if (!setting)
      return [];

    const retval = [] as GetListReturnValue[];
    for (const index of setting.campaignIndex) {
      retval.push({ uuid: index.uuid, name: index.name })
    }

    return retval;
  }

  async createCampaign(): Promise<{uuid: string; name: string}| null> {
    const setting = useMainStore().currentSetting;

    let campaign: Campaign | null = null;
    if (setting) {
      campaign = await Campaign.create(setting);
    }

    if (campaign) {
      await useCampaignDirectoryStore().refreshCampaignDirectoryTree();
      return { uuid: campaign.uuid, name: campaign.name };
    } else {
      return null;
    }
  }

  // leaving async for now for backwards compatibility, even though not actually needed any more
  async getSessions(): Promise<GetListReturnValue[]> {
    const setting = useMainStore().currentSetting;

    if (!setting)
      return [];

    const retval = [] as GetListReturnValue[];
    for (const campaignId in setting.campaigns) {
      const campaign = setting.campaigns[campaignId];
      const sessions = await campaign.allSessions();

      for (let i=0; i<sessions.length; i++) {
        retval.push({ uuid: sessions[i].uuid, name: sessions[i].name })
      }
    }

    return retval;
  }

  // for now, no create session because it requires a campaign be specified

  getSetting(): GetListReturnValue[] {
    const setting = useMainStore().currentSetting;

    return setting ? [{ uuid: setting.uuid, name: setting.name }] : [];
  }

}

class TestAPI {
  public loaded: boolean = false;

  constructor() {
    this.loaded = true;
  }

  /** should only be used for testing purposes - this will delete all of
   *  the data associated with this module (settings, campaigns, entries)
   */
  public async resetAll(): Promise<void> {
    // super dangerous - only load this code in development mode
    if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
      for (const setting of await useMainStore().getAllSettings()) {
        await setting.delete();
      }
    } else {
      throw new Error('resetAll() can only be called in development mode');
    }
  }


  /**
   * Creates a new setting
   * @param name The name of the setting
   * @param makeCurrent Whether to make this the current setting
   * @returns The new setting
   */
  public async createSetting(name: string, makeCurrent = true): Promise<FCBSetting | null> {
    return await FCBSetting.create(makeCurrent, name, '', true);
  }

  public async createCampaign(setting: FCBSetting, name: string): Promise<Campaign | null> {
    return await Campaign.create(setting, name);
  }

  public async createSession(campaign: Campaign, name: string): Promise<Session | null> {
    return await Session.create(campaign, name);
  }

  /**
   * Creates a new entry in the specified setting.
   * @param topic The topic for the entry
   * @param name The name of the entry
   * @param settingName The name of the setting (will be looked up)
   * @returns The created entry or null
   */
  public async createEntry(topic: ValidTopic, name: string, settingName: string): Promise<string | null> {
    // Find the setting by name
    const allSettings = await useMainStore().getAllSettings();
    const setting = allSettings.find(s => s.name === settingName);
    if (!setting) {
      return null;
    }

    const entry = await Entry.create(setting.topicFolders[topic]!, { name });

    if (entry) {
      // Create hierarchy for the entry (required for filtering/type changes)
      await setting.setEntryHierarchy(entry.uuid, {
        parentId: '',
        ancestors: [],
        children: [],
        type: '',
        locationParentId: null,
        childBranches: [],
      });
      return entry.uuid;
    }

    return null;
  }

  /**
   * Deletes an entry by UUID.
   * @param uuid The UUID of the entry to delete
   */
  public async deleteEntry(uuid: string): Promise<void> {
    const entry = await Entry.fromUuid(uuid);
    if (entry) {
      await entry.delete();
    }
  }

  /**
   * Gets an entry by UUID.
   * @param uuid The UUID of the entry
   * @returns The Entry instance or null
   */
  public async getEntry(uuid: string): Promise<Entry | null> {
    return await Entry.fromUuid(uuid);
  }

  /**
   * Adds a bidirectional relationship between two entries.
   * @param entry1Uuid UUID of the first entry
   * @param entry2Uuid UUID of the second entry
   * @param extraFields Extra fields to save with the relationship (e.g., { relationship: 'Friend' })
   */
  public async linkEntries(entry1Uuid: string, entry2Uuid: string, extraFields: Record<string, string>): Promise<void> {
    const entry1 = await Entry.fromUuid(entry1Uuid);
    const entry2 = await Entry.fromUuid(entry2Uuid);
    if (!entry1 || !entry2) {
      throw new Error('Invalid entry in TestAPI.linkEntries()');
    }

    const entry1Topic = entry1.topic;
    const entry2Topic = entry2.topic;

    // Add relationship to entry1
    const entry1Rels = foundry.utils.deepClone(entry1.relationships);
    if (!entry1Rels[entry2Topic]) {
      entry1Rels[entry2Topic] = {};
    }
    entry1Rels[entry2Topic][entry2.uuid] = {
      uuid: entry2.uuid,
      name: entry2.name,
      topic: entry2.topic,
      type: entry2.type || '',
      extraFields: extraFields,
    };
    entry1.relationships = entry1Rels;
    await entry1.save();

    // Add relationship to entry2
    const entry2Rels = foundry.utils.deepClone(entry2.relationships);
    if (!entry2Rels[entry1Topic]) {
      entry2Rels[entry1Topic] = {};
    }
    entry2Rels[entry1Topic][entry1.uuid] = {
      uuid: entry1.uuid,
      name: entry1.name,
      topic: entry1.topic,
      type: entry1.type || '',
      extraFields: extraFields,
    };
    entry2.relationships = entry2Rels;
    await entry2.save();
  }

  /**
   * Adds an NPC to a session.
   * @param sessionUuid The UUID of the session
   * @param npcUuid The UUID of the NPC entry
   * @param delivered Whether the NPC is marked as delivered (shows on sessions tab)
   */
  public async addNPCToSession(sessionUuid: string, npcUuid: string, delivered: boolean = false): Promise<void> {
    const session = await Session.fromUuid(sessionUuid);
    if (!session) {
      throw new Error('Failed to load session in TestAPI.addNPCToSession()');
    }
    await session.addNPC(npcUuid, delivered);
  }

  /**
   * Adds a journal to an entry.
   * @param entryUuid The UUID of the entry
   * @param journalUuid The UUID of the JournalEntry to link
   */
  public async addJournalToEntry(entryUuid: string, journalUuid: string): Promise<void> {
    const entry = await Entry.fromUuid(entryUuid);
    if (!entry) {
      throw new Error('Failed to load entry in TestAPI.addJournalToEntry()');
    }

    const compositeUuid = `${journalUuid}||`;

    // prevent duplicates
    if (entry.journals.some(j => j.uuid === compositeUuid)) {
      return;
    }

    const newJournalLink: RelatedJournal = {
      uuid: compositeUuid,
      journalUuid: journalUuid,
      anchor: null,
      pageUuid: null,
      packId: null,
      packName: null,
      groupId: null,
    };

    entry.journals = [...entry.journals, newJournalLink];
    await entry.save();
  }

  /**
   * Gets the names of all settings in the world
   * @returns Array of setting names
   */
  public getSettingNames(): string[] {
    // Return from the setting index since getAllSettings is async
    const settingIndex = ModuleSettings.get(SettingKey.settingIndex) || [];
    return settingIndex.map((s: { name: string }) => s.name);
  }
}