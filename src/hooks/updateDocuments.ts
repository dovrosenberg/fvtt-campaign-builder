import { useNavigationStore, useMainStore, useSettingDirectoryStore, useCampaignDirectoryStore } from '@/applications/stores';
import { Topics, EntryFilterIndex } from '@/types';
import { isClientGM } from '@/utils/game';
import { JournalEntryFlagKey, moduleId } from '@/settings';
import { DOCUMENT_TYPES } from '@/documents';
import { Arc, Campaign, Entry, Session, StoryWeb, Front } from '@/classes';

export function registerForUpdateHooks() {
  // need to wait until ready so user is available
  Hooks.once('ready', () => {
    registerForActorHooks();
    registerForItemHooks();
    registerForSceneHooks();
    registerForJournalHooks();
    registerForDocumentHooks();
  });
}

/**
 * Register for the updateActor hook to catch when an actor's name changes and update any PCs that are linked to it
 */
function registerForActorHooks() {
  if (!isClientGM())
    return;

  Hooks.on('updateActor', async (actor, changes, _options, _userId) => {
    const mainStore = useMainStore();
    const navigationStore = useNavigationStore();
    const settingDirectoryStore = useSettingDirectoryStore();

    // Check if the name was changed
    if (changes.name) {
      // iterate over all settings then all PCs and campaigns within the setting
      const settings = await mainStore.getAllSettings();
      for (const setting of settings) {
        const folder = setting.topicFolders[Topics.PC];
        const pcs = await folder!.filterEntries((e: EntryFilterIndex) => (e.topic===Topics.PC && e.actorId===actor.uuid));
        for (const pc of pcs) {
          pc.name = actor.name;
          await pc.save();
          await navigationStore.propagateNameChange(pc.uuid, actor.name);
          await settingDirectoryStore.refreshSettingDirectoryTree([pc.uuid]);

          if (mainStore.currentEntry?.uuid === pc.uuid) {
            // it's not enough to refresh the entry - we need to reload from disk 
            //   to get the entry cleaned up right
            await mainStore.setNewTab(mainStore.currentTab!);
          }
        }

        // also need to update the details on campaigns
        // we don't store the name on CampaignPC any more
        // for (let campaign of Object.values(setting.campaigns)) {
        //   const pc = campaign.pcs.find(pc => pc.uuid === actor.uuid);
        //   if (pc) {
        //     pc.name = actor.name;
        //     await campaign.save();
        //   }
        // }
      }

      // refresh the content window in case it's showing in a table
      await mainStore.refreshCurrentContent();
    } else if (changes.img) {
      // just refresh in case the PC is showing
      await mainStore.refreshCurrentContent();
    }
  });

  Hooks.on('deleteActor', async (actor: Actor, _options, _userId) => {
    const mainStore = useMainStore();

    // need to remove from any PCs that are linked to it
    const settings = await mainStore.getAllSettings();
    
    for (let setting of settings) {
      await setting.deleteActorFromSetting(actor.uuid);
      await setting.deleteFoundryDocumentFromSetting(actor.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });
}

/**
 * For items, just need to update the table if needed
 */
function registerForItemHooks() {
  if (!isClientGM())
    return;

  Hooks.on('updateItem', async (_item, changes, _options, _userId) => {
    // Check if the name was changed
    if (changes.name) {
      const mainStore = useMainStore();

      // refresh the content window in case it's showing in a table
      await mainStore.refreshCurrentContent();
    }
  });

  Hooks.on('deleteItem', async (item: Item, _options, _userId) => {
    const mainStore = useMainStore();

    const settings = await mainStore.getAllSettings();
    for (let setting of settings) {
      await setting.deleteItemFromSetting(item.uuid);
      await setting.deleteFoundryDocumentFromSetting(item.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });
}

/**
 * For scenes, just need to update the table if needed
 */
function registerForSceneHooks() {
  if (!isClientGM())
    return;

  Hooks.on('updateScene', async (_scene, changes, _options, _userId) => {
    // Check if the name was changed
    if (changes.name) {
      const mainStore = useMainStore();

      // refresh the content window in case it's showing in a table
      await mainStore.refreshCurrentContent();
    }
  });

  Hooks.on('deleteScene', async (scene: Scene, _options, _userId) => {
    const mainStore = useMainStore();

    const settings = await mainStore.getAllSettings();
    for (let setting of settings) {
      await setting.deleteSceneFromSetting(scene.uuid);
      await setting.deleteFoundryDocumentFromSetting(scene.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });
}

/**
 * For journals and pages, just need to delete from any lists they are in
 */
function registerForJournalHooks() {
  if (!isClientGM())
    return;

  // @ts-ignore
  Hooks.on('preDeleteJournalEntry', async (journal: JournalEntry, _options, _userId) => {
    const mainStore = useMainStore();

    const settings = await mainStore.getAllSettings();
    for (let setting of settings) {
      // if the entry is in the setting compendium, we also need to delete the 
      //   content itself
      if (journal.pack === setting.compendiumId) {
        const settingDirectoryStore = useSettingDirectoryStore();
        const campaignDirectoryStore = useCampaignDirectoryStore();
        const navigationStore = useNavigationStore();

        // we delete from the directory stores because they do the best cleanup job
        switch (journal.getFlag(moduleId, JournalEntryFlagKey.campaignBuilderType)) {
          case DOCUMENT_TYPES.Arc:
            // arcs are a special case because they can't be deleted from 
            //   the tree
            const arc = await Arc.fromUuid(journal.uuid);
            if (arc) {
              await arc.delete(true);
              await navigationStore.cleanupDeletedEntry(journal.uuid);
              await campaignDirectoryStore.refreshCampaignDirectoryTree([journal.uuid]);
              return true;
            }
            break;
          case DOCUMENT_TYPES.Campaign:
            const campaign = await Campaign.fromUuid(journal.uuid);
            if (campaign) {
              return (await campaignDirectoryStore.deleteCampaign(journal.uuid, true));
            }
            break;
          case DOCUMENT_TYPES.Entry:
            const entry = await Entry.fromUuid(journal.uuid);
            if (entry) {
              return (await settingDirectoryStore.deleteEntry(journal.uuid, true));
            }
            break;
          case DOCUMENT_TYPES.Front:
            const front = await Front.fromUuid(journal.uuid);
            if (front) {
              return (await campaignDirectoryStore.deleteFront(journal.uuid, true));
            }
            break;
          case DOCUMENT_TYPES.Session:
            const session = await Session.fromUuid(journal.uuid);
            if (session) {
              return (await campaignDirectoryStore.deleteSession(journal.uuid, true));
            }
            break;
          case DOCUMENT_TYPES.Setting:
            if (setting.uuid === journal.uuid) {
              return (await settingDirectoryStore.deleteSetting(journal.uuid, true));
            }
            break;
          case DOCUMENT_TYPES.StoryWeb:
            const storyWeb = await StoryWeb.fromUuid(journal.uuid);
            if (storyWeb) {
              return (await campaignDirectoryStore.deleteStoryWeb(journal.uuid, true));
            }
            break;
          default:
            continue;
        }
      }
    }

    return true;
  });

  /**
   * After the foundry doc was deleted, we just clean up references to it
   */
  Hooks.on('deleteJournalEntry', async (journal: JournalEntry, _options, _userId) => {
    const mainStore = useMainStore();

    const settings = await mainStore.getAllSettings();
    for (let setting of settings) {
      await setting.deleteJournalEntryFromSetting(journal.uuid);
      await setting.deleteFoundryDocumentFromSetting(journal.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });

  /** 
   * If we delete a journal entry page, it's from foundry directly... just delete the parent, too if it's one of ours
   * 
   * Also need to delete any references to it
   */
  Hooks.on('deleteJournalEntryPage', async (journalPage: JournalEntryPage, _options, _userId) => {
    const mainStore = useMainStore();

    const settings = await mainStore.getAllSettings();

    const journal = journalPage.parent!;

    for (let setting of settings) {
      // remove any links to it regardless of internal or external
      await setting.deleteJournalEntryPageFromSetting(journalPage.uuid);

      // just delete the parent altogether if it's in a setting compendium
      if (journal.pack === setting.compendiumId) {
        await journal.delete();
      } else {
        // it's a normal one, but we need to remove from any links
        await setting.deleteJournalEntryPageFromSetting(journalPage.uuid);
        await setting.deleteFoundryDocumentFromSetting(journalPage.uuid);
      }
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });
}

/** 
 * Cover everything else
 */
function registerForDocumentHooks() {
  if (!isClientGM())
    return;

  const docTypesToHandle = [
    // "Actor",
    "Adventure",
    "Card",
    "Cards",
    // "ChatMessage",
    // "Combat",
    // "FogExploration",
    "Folder",
    // "Item",
    // "JournalEntry",
    "Macro",
    "Playlist",
    "RollTable",
    "Scene",
    "Token",
    // "Setting",
    // "User",    
  ];

  for (let docType of docTypesToHandle) {
    // @ts-ignore
    Hooks.on(`delete${docType}`, async (document: foundry.abstract.Document<any, any>, _options, _userId) => {

      const mainStore = useMainStore();

      const settings = await mainStore.getAllSettings();
      for (let setting of settings) {
        await setting.deleteFoundryDocumentFromSetting(document.uuid);
      }

      // refresh the content window in case it's showing in a table
      await mainStore.refreshCurrentContent();
    });

    // @ts-ignore
    Hooks.on(`update${docType}`, async (_document, changes, _options, _userId) => {
      const mainStore = useMainStore();

      // just refresh in case it's currently shown
      if (changes.name) {
        await mainStore.refreshCurrentContent();
      }
    });
  }
}
