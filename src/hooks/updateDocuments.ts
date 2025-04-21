import { useNavigationStore, useMainStore } from '@/applications/stores';

export function registerForUpdateHooks() {
  registerForUpdateActorHook();
  registerForUpdateItemHook();
  registerForUpdateSceneHook();
}

/**
 * Register for the updateActor hook to catch when an actor's name changes and update any PCs that are linked to it
 */
function registerForUpdateActorHook() {
  Hooks.on('updateActor', async (actor, changes, _options, _userId) => {
    // Check if the name was changed
    if (changes.name) {
      const mainStore = useMainStore();
      const navigationStore = useNavigationStore();

      // find all the PCs that need to be updated
      let pcsToUpdate = new Set<string>();
      for (let campaignId in mainStore.currentWorld?.campaigns) {
        const pcs = (await mainStore.currentWorld.campaigns[campaignId].filterPCs(pc => pc.actorId === actor.uuid))
          .map(pc => pc.uuid);

        pcsToUpdate = new Set([...pcsToUpdate, ...pcs]);
      }

      // propagate all of them through all the headers 
      pcsToUpdate.forEach(async (uuid: string) => {
        await navigationStore.propagateNameChange(uuid, actor.name);
      });      

      // refresh the content window in case it's showing in a table
      await mainStore.refreshCurrentContent();
    }
  });
}

/**
 * For items, just need to update the table if needed
 */
function registerForUpdateItemHook() {
  Hooks.on('updateItem', async (_item, changes, _options, _userId) => {
    // Check if the name was changed
    if (changes.name) {
      const mainStore = useMainStore();

      // refresh the content window in case it's showing in a table
      await mainStore.refreshCurrentContent();
    }
  });
}

/**
 * For scenes, just need to update the table if needed
 */
function registerForUpdateSceneHook() {
  Hooks.on('updateScene', async (_scene, changes, _options, _userId) => {
    // Check if the name was changed
    if (changes.name) {
      const mainStore = useMainStore();

      // refresh the content window in case it's showing in a table
      await mainStore.refreshCurrentContent();
    }
  });
}