<template>
  <div class="tab-inner">
    <BaseTable
      :rows="sessionReferences"
      :columns="columns"
      :show-add-button="false"
      :show-filter="true"
      :filter-fields="['name', 'campaignName']"
      :allow-edit="false"
      :delete-item-label="localize('tooltips.deleteSession')"
      :edit-item-label="localize('tooltips.editSession')"
      :add-button-label="''"
      :track-delivery="false"
      :extra-add-text="''"
      :allow-drop-row="false"
      :show-move-to-campaign="false"
      :draggable-rows="false"
    />
  </div>
</template>

<script setup lang="ts">
// library imports
import { ref, onMounted, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';

// local imports
import { useMainStore, useNavigationStore } from '@/applications/stores';
import { localize } from '@/utils/game';
import { htmlToPlainText } from '@/utils/misc';

// library components
import BaseTable from '@/components/BaseTable/BaseTable.vue';

// types
import { Session } from '@/classes';
import { Topics } from '@/types';

// store
const mainStore = useMainStore();
const navigationStore = useNavigationStore();
const { currentEntry, currentWorld } = storeToRefs(mainStore);

// data
interface SessionReference {
  uuid: string;
  number: number;
  name: string;
  date: string | null;
  campaignName: string;
}

const sessionReferences = ref<SessionReference[]>([]);
const hasMultipleCampaigns = ref(false);

// methods
const onSessionClick = (event: MouseEvent, uuid: string) => {
  navigationStore.openSession(uuid, { newTab: event.ctrlKey, activate: true });
};

// computed
const columns = computed(() => {
  const baseColumns = [
    { field: 'number', style: 'text-align: left; width: 15%', header: localize('labels.fields.sessionNumber'), sortable: true }
  ];
  
  if (hasMultipleCampaigns.value) {
    baseColumns.push({ 
      field: 'campaignName', 
      style: 'text-align: left; width: 25%', 
      header: localize('labels.fields.campaign'), 
      sortable: true 
    });
  }

  return [
    ...baseColumns,
    { 
      field: 'name', 
      style: `text-align: left; width: ${hasMultipleCampaigns.value ? '35%' : '55%'}`, 
      header: localize('labels.fields.name'), 
      sortable: true, 
      onClick: onSessionClick 
    },
    { 
      field: 'date', 
      style: 'text-align: left; width: 25%', 
      header: localize('labels.fields.sessionDate'), 
      sortable: true 
    }
  ];
});

const findReferencesInNotes = (notes: string, entryUuid: string): boolean => {
  // This is a stub function that could be improved to find more sophisticated references
  // For now just look for the UUID in the notes
  return notes.includes(entryUuid);
};

const refreshSessionReferences = async () => {
  if (!currentEntry.value || !currentWorld.value) {
    sessionReferences.value = [];
    return;
  }

  const references: SessionReference[] = [];
  const campaigns = Object.values(currentWorld.value.campaigns);
  hasMultipleCampaigns.value = campaigns.length > 1;

  // Go through all campaigns in the world
  for (const campaign of campaigns) {
    // Get all sessions in the campaign
    const sessions = campaign.filterSessions(() => true);

    for (const session of sessions) {
      let isReferenced = false;

      // Check if entry is referenced as delivered content
      if (currentEntry.value.topic === Topics.Character) {
        const npcRef = session.npcs.find(npc => npc.uuid === currentEntry.value?.uuid);
        if (npcRef) {
          isReferenced = true;
        }
      } else if (currentEntry.value.topic === Topics.Location) {
        const locationRef = session.locations.find(loc => loc.uuid === currentEntry.value?.uuid);
        if (locationRef) {
          isReferenced = true;
        }
      }

      // Check if entry is referenced in notes
      if (!isReferenced && findReferencesInNotes(session.notes, currentEntry.value.uuid)) {
        isReferenced = true;
      }

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

// watchers
watch(() => currentEntry.value?.uuid, refreshSessionReferences);

// lifecycle
onMounted(refreshSessionReferences);

</script>

<style lang="scss" scoped>
.tab-inner {
  padding: 0.5em;
}

a {
  color: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.text-center {
  text-align: center;
}
</style> 