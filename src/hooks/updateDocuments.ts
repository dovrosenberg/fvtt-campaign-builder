import { useNavigationStore, useMainStore } from '@/applications/stores';

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
  Hooks.on('updateActor', async (actor, changes, _options, _userId) => {
    const mainStore = useMainStore();
    const navigationStore = useNavigationStore();

    // Check if the name was changed
    if (changes.name) {
      // find all the PCs that need to be updated
      let pcsToUpdate = new Set<string>();
      for (let campaignId in mainStore.currentSetting?.campaigns) {
        const pcs = (await mainStore.currentSetting.campaigns[campaignId].filterPCs(pc => pc.actorId === actor.uuid))
          .map(pc => pc.uuid);

        pcsToUpdate = new Set([...pcsToUpdate, ...pcs]);
      }

      // propagate all of them through all the headers 
      pcsToUpdate.forEach(async (uuid: string) => {
        await navigationStore.propagateNameChange(uuid, actor.name);
      });      

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
    const worlds = await mainStore.getAllWorlds();
    
    for (let setting of worlds) {
      await setting.deleteActorFromWorld(_actor.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });
}

/**
 * For items, just need to update the table if needed
 */
function registerForItemHooks() {
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

    const worlds = await mainStore.getAllWorlds();
    for (let setting of worlds) {
      await setting.deleteItemFromWorld(_item.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });
}

/**
 * For scenes, just need to update the table if needed
 */
function registerForSceneHooks() {
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

    const worlds = await mainStore.getAllWorlds();
    for (let setting of worlds) {
      await setting.deleteSceneFromWorld(_scene.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });
}

/**
 * For journals and pages, just need to delete from any lists they are in
 */
function registerForJournalHooks() {
  Hooks.on('deleteJournalEntry', async (_journal, _options, _userId) => {
    const mainStore = useMainStore();

    const worlds = await mainStore.getAllWorlds();
    for (let setting of worlds) {
      await setting.deleteJournalEntryFromWorld(_journal.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });

  Hooks.on('deleteJournalEntryPage', async (_journal, _options, _userId) => {
    const mainStore = useMainStore();

    const worlds = await mainStore.getAllWorlds();
    for (let setting of worlds) {
      await setting.deleteJournalEntryPageFromWorld(_journal.uuid);
    }

    // refresh the content window in case it's showing in a table
    await mainStore.refreshCurrentContent();
  });
}
