// this store handles actions specific to fronts
//
// library imports
import { storeToRefs, } from 'pinia';

// local imports
import { useMainStore, } from '@/applications/stores';

// types
import { DangerParticipant, GrimPortent} from '@/types';
import { Entry } from '@/classes';

// the store definition
export const frontStore = () => {
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentFront } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // actions
  /**
   * Add participant to the specified danger.
   * @param dangerIndex - Index of the danger to add to.
   * @param entryToAdd - The entry to add as a participant.
   * @param extraFields - Additional fields (e.g. role).
   * @returns The UUID of the added participant, or null.
   */
  const addParticipant = async (dangerIndex: number, entryToAdd: Entry, extraFields: Record<string, string>): Promise<string | null> => {
    if (!currentFront.value)
      return null;

    const danger = currentFront.value.dangers[dangerIndex];
    if (!danger)
      return null;

    // no duplicates
    if (danger.participants.some(p => p.uuid === entryToAdd.uuid))
      return null;

    const uuid = entryToAdd.uuid;
    currentFront.value.updateDanger(dangerIndex, {
      ...danger,
      participants: [...danger.participants, { uuid, role: extraFields.role || '' }],
    });
    await currentFront.value.save();

    await mainStore.refreshFront();

    return uuid;
  };

  /**
   * Removes a participant from the specified danger.
   * @param dangerIndex - Index of the danger.
   * @param uuid - The UUID of the participant to remove.
   * @returns True if the participant was removed, false if the danger is invalid.
   */
  const deleteParticipant = async (dangerIndex: number, uuid: string): Promise<boolean> => {
    if (!currentFront.value)
      return false;

    const danger = currentFront.value.dangers[dangerIndex];
    if (!danger)
      return false;

    currentFront.value.updateDanger(dangerIndex, {
      ...danger,
      participants: danger.participants.filter(p => p.uuid !== uuid),
    });
    await currentFront.value.save();

    await mainStore.refreshFront();
    return true;
  };

  /**
   * Update participant role in the specified danger.
   * @param dangerIndex - Index of the danger.
   * @param uuid - The UUID of the participant.
   * @param role - The new role.
   */
  const updateParticipant = async (dangerIndex: number, uuid: string, role: string): Promise<void> => {
    if (!currentFront.value)
      return;

    const danger = currentFront.value.dangers[dangerIndex];
    if (!danger)
      return;

    currentFront.value.updateDanger(dangerIndex, {
      ...danger,
      participants: danger.participants.map(p => p.uuid === uuid ? { uuid, role } : p),
    });
    await currentFront.value.save();

    await mainStore.refreshFront();
  };

  /**
   * Add a grim portent to the specified danger.
   * @param dangerIndex - Index of the danger.
   * @param description - The portent description.
   * @returns The uuid of the new portent, or null.
   */
  const addGrimPortent = async (dangerIndex: number, description = ''): Promise<string | null> => {
    if (!currentFront.value)
      return null;

    const danger = currentFront.value.dangers[dangerIndex];
    if (!danger)
      return null;

    const uuid = foundry.utils.randomID();
    currentFront.value.updateDanger(dangerIndex, {
      ...danger,
      grimPortents: [...danger.grimPortents, { uuid, description, complete: false }],
    });
    await currentFront.value.save();

    await mainStore.refreshFront();

    return uuid;
  };

  /**
   * Removes a grim portent from the specified danger.
   * @param dangerIndex - Index of the danger.
   * @param uuid - The UUID of the grim portent to remove.
   * @returns True if the portent was removed, false if the danger is invalid.
   */
  const deleteGrimPortent = async (dangerIndex: number, uuid: string): Promise<boolean> => {
    if (!currentFront.value)
      return false;

    const danger = currentFront.value.dangers[dangerIndex];
    if (!danger)
      return false;

    currentFront.value.updateDanger(dangerIndex, {
      ...danger,
      grimPortents: danger.grimPortents.filter(p => p.uuid !== uuid),
    });
    await currentFront.value.save();

    await mainStore.refreshFront();
    return true;
  };

  /**
   * Update a grim portent in the specified danger.
   * @param dangerIndex - Index of the danger.
   * @param uuid - The UUID of the portent.
   * @param description - The new description.
   * @param complete - The new complete status.
   */
  const updateGrimPortent = async (dangerIndex: number, uuid: string, description: string, complete: boolean): Promise<void> => {
    if (!currentFront.value)
      return;

    const danger = currentFront.value.dangers[dangerIndex];
    if (!danger)
      return;

    currentFront.value.updateDanger(dangerIndex, {
      ...danger,
      grimPortents: danger.grimPortents.map(p => p.uuid === uuid ? { uuid, description, complete } : p),
    });
    await currentFront.value.save();

    await mainStore.refreshFront();
  };

  /**
   * Reorder grim portents in the specified danger.
   * @param dangerIndex - Index of the danger.
   * @param reorderedPortents - The reordered portent array.
   */
  const reorderGrimPortents = async (dangerIndex: number, reorderedPortents: GrimPortent[]) => {
    if (!currentFront.value)
      return;

    const danger = currentFront.value.dangers[dangerIndex];
    if (!danger)
      return;

    currentFront.value.updateDanger(dangerIndex, {
      ...danger,
      grimPortents: reorderedPortents,
    });
    await currentFront.value.save();

    await mainStore.refreshFront();
  };

  /**
   * Reorder participants in the specified danger.
   * @param dangerIndex - Index of the danger.
   * @param reorderedParticipants - The reordered participant array.
   */
  const reorderParticipants = async (dangerIndex: number, reorderedParticipants: DangerParticipant[]) => {
    if (!currentFront.value)
      return;

    const danger = currentFront.value.dangers[dangerIndex];
    if (!danger)
      return;

    currentFront.value.updateDanger(dangerIndex, {
      ...danger,
      participants: reorderedParticipants,
    });
    await currentFront.value.save();

    await mainStore.refreshFront();
  };

  ///////////////////////////////
  // return the public interface
  return {
    addParticipant,
    deleteParticipant,
    updateParticipant,
    addGrimPortent,
    deleteGrimPortent,
    updateGrimPortent,
    reorderGrimPortents,
    reorderParticipants,
  };
};
