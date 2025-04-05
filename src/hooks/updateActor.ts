import { useNavigationStore, useMainStore } from '@/applications/stores';

/**
 * Register for the updateActor hook to catch when an actor's name changes and update any PCs that are linked to it
 */
export function registerForUpdateActorHook() {
  Hooks.on('updateActor', async (actor, changes, _options, _userId) => {
    // Check if the name was changed
    if (changes.name) {
      const mainStore = useMainStore();
      const navigationStore = useNavigationStore();

      // if it's currently being displayed, refresh the tab
      if (mainStore.currentPC && mainStore.currentPC?.actorId === actor.uuid) {
        await mainStore.refreshPC();
      }

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
    }
  });
}