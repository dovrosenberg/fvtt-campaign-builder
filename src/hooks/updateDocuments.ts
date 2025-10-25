import { useNavigationStore, useMainStore, useSettingDirectoryStore } from '@/applications/stores';
import { Topics, EntryFilterIndex } from '@/types';
import { isClientGM } from '@/utils/game';

export function registerForUpdateHooks() {
  registerForActorHooks();
  registerForItemHooks();
  registerForSceneHooks();
  registerForJournalHooks();
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
        const pcs = await setting.filterEntries((e: EntryFilterIndex) => e.topic===Topics.PC, true);
        for (const pc of pcs) {
          if (pc.actorId !== actor.uuid)
            continue;
          
          pc.name = actor.name;
          await pc.save();
          await navigationStore.propagateNameChange(pc.uuid, actor.name);
          await settingDirectoryStore.refreshSettingDirectoryTree([pc.uuid]);
        }

        // also need to update the details on campaigns
        for (let campaign of Object.values(setting.campaigns)) {
          const pc = campaign.pcs.find(pc => pc.uuid === actor.uuid);
          if (pc) {
            pc.name = actor.name;
            await campaign.save();
          }
        }
      }

      // refresh the content window in case it's showing in a table
      await mainStore.refreshCurrentContent();
    } else if (changes.img) {
      // just refresh in case the PC is showing
      await mainStore.refreshCurrentContent();
    }
  });

  Hooks.on('deleteActor', async (_actor, _options, _userId) => {
    const mainStore = useMainStore();

    // need to remove from any PCs that are linked to it
    const settings = await mainStore.getAllSettings();
    
    for (let setting of settings) {
      await setting.deleteActorFromSetting(_actor.uuid);
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

  Hooks.on('deleteItem', async (_item, _options, _userId) => {
    const mainStore = useMainStore();

    const settings = await mainStore.getAllSettings();
    for (let setting of settings) {
      await setting.deleteItemFromSetting(_item.uuid);
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

  Hooks.on('deleteScene', async (_scene, _options, _userId) => {
    const mainStore = useMainStore();

    const settings = await mainStore.getAllSettings();
    for (let setting of settings) {
      await setting.deleteSceneFromSetting(_scene.uuid);
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

  Hooks.on('deleteJournalEntry', async (_journal, _options, _userId) => {
    const mainStore = useMainStore();

    const settings = await mainStore.getAllSettings();
    for (let setting of settings) {
      await setting.deleteJournalEntryFromSetting(_journal.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });

  Hooks.on('deleteJournalEntryPage', async (_journal, _options, _userId) => {
    const mainStore = useMainStore();

    const settings = await mainStore.getAllSettings();
    for (let setting of settings) {
      await setting.deleteJournalEntryPageFromSetting(_journal.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });
}
