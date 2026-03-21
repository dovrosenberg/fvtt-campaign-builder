// Composable that provides per-panel derived state for entry content.
// Each panel that renders entry content creates its own instance, so table rows
// are scoped to that panel rather than shared globally.

// library imports
import { ref, watch, computed, type InjectionKey, type Ref, type ComputedRef } from 'vue';

// local imports
import { useContentState } from '@/composables/useContentState';
import { localize } from '@/utils/game';
import { SettingKey } from '@/settings';

// types
import { Entry } from '@/classes';
import {
  Topics,
  RelatedEntryDetails,
  RelatedDocumentDetails,
  DocumentLinkType,
} from '@/types';

export interface SessionReference {
  uuid: string;
  number: number;
  name: string;
  date: string | null;
  campaignName: string;
}

export interface EntryDerivedState {
  relatedEntryRows: Ref<RelatedEntryDetails<any, any>[]>;
  relatedDocumentRows: Ref<RelatedDocumentDetails[]>;
  sessionReferences: Ref<SessionReference[]>;
  currentDocumentType: ComputedRef<DocumentLinkType>;
}

export const ENTRY_DERIVED_STATE_KEY: InjectionKey<EntryDerivedState> = Symbol('entryDerivedState');

/**
 * Creates panel-scoped derived state for entry content (relationship rows, document rows, session references).
 * Must be called inside a component that is a descendant of a TabPanel (or fallback context).
 * @returns Reactive refs for related entry rows, document rows, and session references.
 */
export function useEntryDerivedState(): EntryDerivedState {
  // get panel-scoped content refs
  const { currentEntry, currentContentTab, currentSetting } = useContentState();

  // table row state
  const relatedEntryRows = ref<RelatedEntryDetails<any, any>[]>([]);
  const relatedDocumentRows = ref<RelatedDocumentDetails[]>([]);
  const sessionReferences = ref<SessionReference[]>([]);

  // derived from content tab
  const currentDocumentType = computed((): DocumentLinkType => {
    if (!currentContentTab.value)
      return DocumentLinkType.None;

    switch (currentContentTab.value) {
      case 'scenes':
        return DocumentLinkType.Scenes;
      case 'actors':
        return DocumentLinkType.Actors;
      case 'foundry':
        return DocumentLinkType.GenericFoundry;
      default:
        return DocumentLinkType.None;
    }
  });

  // watchers to rebuild rows
  watch(() => currentEntry.value, async () => {
    await _refreshRows();
  });

  watch(() => currentContentTab.value, async () => {
    await _refreshRows();
  });

  /** Check if a UUID appears in session notes */
  const _findReferencesInNotes = (notes: string, entryUuid: string): boolean => {
    return notes.includes(entryUuid);
  };

  /** Rebuild all row data based on current entry and content tab */
  const _refreshRows = async () => {
    if (!currentEntry.value || !currentContentTab.value) {
      relatedEntryRows.value = [];
      relatedDocumentRows.value = [];
      sessionReferences.value = [];
    } else {
      let topic: Topics;
      switch (currentContentTab.value) {
        case 'characters':
          topic = Topics.Character;
          break;
        case 'locations':
          topic = Topics.Location;
          break;
        case 'organizations':
          topic = Topics.Organization;
          break;
        case 'pcs':
          topic = Topics.PC;
          break;
        case 'scenes':
          topic = Topics.None;
          break;
        case 'actors':
          topic = Topics.None;
          break;
        case 'sessions':
          topic = Topics.None;
          await _refreshSessionReferences();
          break;
        case 'foundry':
          topic = Topics.None;
          break;
        default:
          topic = Topics.None;
      }

      if (topic !== Topics.None) {
        // Get the raw relationship data
        const rawRows = currentEntry.value.relationships ? Object.values(currentEntry.value.relationships[topic]!) : [];
        
        // For character entries, load actors for drag functionality
        if (topic === Topics.Character) {
          const enrichedRows = await Promise.all(rawRows.map(async (row) => {
            const entry = await Entry.fromUuid(row.uuid);
            // Use manual actor if present, otherwise fall back to tag-associated actor
            const draggableId = entry?.actors?.[0] || entry?.getFoundryTags(SettingKey.actorTags)?.[0]?.uuid || undefined;
            return {
              ...row,
              draggableId,
              dragTooltip: draggableId ? localize('tooltips.dragToScene') : undefined,
            };
          }));
          relatedEntryRows.value = enrichedRows;
        } else {
          relatedEntryRows.value = rawRows;
        }
        relatedDocumentRows.value = [];
      } else if (currentDocumentType.value === DocumentLinkType.Scenes) {
        relatedEntryRows.value = [];

        const sceneList = [] as RelatedDocumentDetails[];
        for (let i = 0; i < currentEntry.value.scenes.length; i++) {
          const scene = await foundry.utils.fromUuid(currentEntry.value.scenes[i] as `Scene.${string}`) as Scene;

          if (!scene)
            continue;

          sceneList.push({
            uuid: currentEntry.value.scenes[i],
            name: scene.name,
            packId: scene.pack,
            packName: scene.pack ? game.packs?.get(scene.pack)?.title ?? null : null,
          });
        }
        relatedDocumentRows.value = sceneList;
      } else if (currentDocumentType.value === DocumentLinkType.Actors) {
        relatedEntryRows.value = [];

        const actorList = [] as RelatedDocumentDetails[];
        for (let i = 0; i < currentEntry.value.actors.length; i++) {
          const actor = await foundry.utils.fromUuid<Actor>(currentEntry.value.actors[i]);
          if (!actor)
            continue;

          actorList.push({
            uuid: currentEntry.value.actors[i],
            name: actor.name,
            packId: actor.pack,
            packName: actor.pack ? game.packs?.get(actor.pack)?.title ?? null : null,
          });
        }
        relatedDocumentRows.value = actorList;
      } else if (currentDocumentType.value === DocumentLinkType.GenericFoundry) {
        relatedEntryRows.value = [];

        const docList = [] as RelatedDocumentDetails[];
        for (let i = 0; i < currentEntry.value.foundryDocuments.length; i++) {
          const doc = await foundry.utils.fromUuid(currentEntry.value.foundryDocuments[i]);
          if (!doc)
            continue;

          docList.push({
            uuid: currentEntry.value.foundryDocuments[i],
            name: doc.name || '???',
            packId: doc.pack,
            packName: doc.pack ? game.packs?.get(doc.pack)?.title ?? null : null,
          });
        }
        relatedDocumentRows.value = docList;
      } else {
        relatedEntryRows.value = [];
        relatedDocumentRows.value = [];
      }
    }
  };

  /** Rebuild session references for the current entry */
  const _refreshSessionReferences = async () => {
    if (!currentEntry.value || !currentSetting.value) {
      sessionReferences.value = [];
      return;
    }

    const references: SessionReference[] = [];
    const campaigns = Object.values(currentSetting.value.campaigns);

    // Go through all campaigns in the setting
    for (const campaign of campaigns) {
      const sessions = await campaign.allSessions();

      for (const session of sessions) {
        let isReferenced = false;

        // Check if entry is referenced as delivered content
        if (currentEntry.value.topic === Topics.Character) {
          const npcRef = session.npcs.find(npc => npc.uuid === currentEntry.value?.uuid && npc.delivered);
          if (npcRef)
            isReferenced = true;
        } else if (currentEntry.value.topic === Topics.Location) {
          const locationRef = session.locations.find(loc => loc.uuid === currentEntry.value?.uuid && loc.delivered);
          if (locationRef)
            isReferenced = true;
        }

        // Check if entry is referenced in notes
        if (!isReferenced && _findReferencesInNotes(session.description, currentEntry.value.uuid))
          isReferenced = true;

        if (isReferenced) {
          references.push({
            uuid: session.uuid,
            number: session.number,
            name: session.name,
            date: session.date?.toLocaleDateString() || null,
            campaignName: campaign.name
          });
        }
      }
    }

    // Sort by session number
    references.sort((a, b) => a.number - b.number);
    sessionReferences.value = references;
  };

  return {
    relatedEntryRows,
    relatedDocumentRows,
    sessionReferences,
    currentDocumentType,
  };
}
