// starts from an assumed empty world and creates the base settings
import { SettingDescriptor } from '@e2etest/data/setting';
import { sharedContext } from '@e2etest/sharedContext';
import { Topics, ValidTopic } from '@/types';

const topicValues = {
  Character: Topics.Character,
  Location: Topics.Location,
  Organization: Topics.Organization,
  PC: Topics.PC,
}

export const populateSetting = async (settingDescriptor: SettingDescriptor) => {
  const page = sharedContext.page!;

  // we're going to do this all manually
  await page.evaluate(async ({settingDescriptor, tv}: {settingDescriptor: SettingDescriptor, tv: typeof topicValues}) => {
    const api = game.modules.get('campaign-builder')?.api.testAPI;

    const setting = await api.createSetting(settingDescriptor.name, false);
    console.error(`Setting created ${settingDescriptor.name}`);
    
    if (!setting) {
      throw new Error('Failed to create setting in populateSetting()');
    }
    
    setting.genre = settingDescriptor.genre;
    setting.settingFeeling = settingDescriptor.settingFeeling;
    setting.description = settingDescriptor.description;

    // create entries and collect UUIDs by topic
    const entryUuids = {} as Partial<Record<Topics, {uuid: string, name: string}[]>>;
    for (const topicKey in settingDescriptor.topics) {
      const topic = Number.parseInt(topicKey) as ValidTopic;
      entryUuids[topic] = [];
      for (const descriptor of settingDescriptor.topics[topic]) {
        const entryUuid = await api.createEntry(topic, descriptor.name, settingDescriptor.name);
        if (!entryUuid) {
          throw new Error('Failed to create entry in populateSetting()');
        }
        entryUuids[topic].push({ uuid: entryUuid, name: descriptor.name });
        console.error(`Entry created ${descriptor.name}`);
      }
    }

    // create campaigns and sessions, collecting session UUIDs
    const sessionUuids = [];
    for (const campaignDescriptor of settingDescriptor.campaigns) {
      const campaign = await api.createCampaign(setting, campaignDescriptor.name);
      if (!campaign) {
        throw new Error('Failed to create campaign in populateSetting()');
      }

      for (const sessionDescriptor of campaignDescriptor.sessions) {
        const session = await api.createSession(campaign, sessionDescriptor.name);
        if (!session) {
          throw new Error('Failed to create session in populateSetting()');
        }
        sessionUuids.push(session.uuid);
        console.error(`Session created ${sessionDescriptor.name}`);
      }
      console.error(`Campaign created ${campaignDescriptor.name}`);
    }

    // add relationships, journals, foundry docs, and session NPCs for the first character
    const charEntries = entryUuids[tv.Character];
    if (charEntries && charEntries.length > 0) {
      const char1 = charEntries[0];

      // character-to-character relationship
      if (charEntries.length > 1) {
        await api.linkEntries(char1.uuid, charEntries[1].uuid, { relationship: 'Rival' });
      }

      // character-to-location relationship
      const locEntries = entryUuids[tv.Location];
      if (locEntries && locEntries.length > 0) {
        await api.linkEntries(char1.uuid, locEntries[0].uuid, { relationship: 'Home' });
      }

      // character-to-organization relationship
      const orgEntries = entryUuids[tv.Organization];
      if (orgEntries && orgEntries.length > 0) {
        await api.linkEntries(char1.uuid, orgEntries[0].uuid, { relationship: 'Member' });
      }

      // add a journal to the first character
      const journal = await JournalEntry.create({ name: `${char1.name}'s Journal` });
      if (journal) {
        await api.addJournalToEntry(char1.uuid, journal.uuid);
        // verify journal was saved
        const verifyEntry = await api.getEntry(char1.uuid);
        console.error(`Journal added to ${char1.name}, journals count: ${verifyEntry?.journals?.length ?? 'undefined'}`);
      }

      // add a foundry document to the first character
      const foundryDoc = await JournalEntry.create({ name: 'Background Notes' });
      if (foundryDoc) {
        const entry = await api.getEntry(char1.uuid);
        if (entry) {
          entry.foundryDocuments = [...entry.foundryDocuments, foundryDoc.uuid];
          await entry.save();
        }
      }

      // add the first character to the first session's NPCs (delivered=true so it shows on sessions tab)
      if (sessionUuids.length > 0) {
        await api.addNPCToSession(sessionUuids[0], char1.uuid, true);
        console.error(`NPC added to session ${sessionUuids[0]} for ${char1.name}`);
      }
    }

    console.error(`Setting populated ${settingDescriptor.name}`);

    await setting.save();
    console.error(`Setting created ${settingDescriptor.name}`);
  }, { settingDescriptor, tv: topicValues});
}



