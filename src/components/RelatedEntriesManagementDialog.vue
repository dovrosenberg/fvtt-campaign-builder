<template>
  <Dialog
    v-model="show"
    :title="localize('dialogs.relatedEntriesManagement.title')"
    :buttons="buttons"
    :width="800"
    :height="600"
  >
    <div class="related-entries-management-content">
      <p class="description">
        {{ localize('dialogs.relatedEntriesManagement.description') }}
      </p>

      <!-- Added Items Section -->
      <div v-if="addedItems.length > 0" class="section">
        <h3>{{ localize('dialogs.relatedEntriesManagement.addedItems') }}</h3>
        <DataTable
          :value="addedItems"
          v-model:selection="selectedAddedItems"
          @update:selection="selectedAddedItems = $event"
          selection-mode="multiple"
          :meta-key-selection="false"
          class="related-items-table"
          :pt="{
            table: { style: 'min-width: 100%' },
            column: { 
              bodycell: ({ state }) => ({
                style: state.d_editing && 'padding-top: 0.6rem; padding-bottom: 0.6rem'
              })
            }
          }"
        >
          <Column selection-mode="multiple" header-style="width: 3rem"></Column>
          <Column field="name" :header="localize('labels.fields.name')" style="width: 30%"></Column>
          <Column field="topicName" :header="localize('labels.fields.topic')" style="width: 25%"></Column>
          <Column field="type" :header="localize('labels.fields.type')" style="width: 25%"></Column>
          <Column field="currentTopic" :header="localize('dialogs.relatedEntriesManagement.currentTopic')" style="width: 20%"></Column>
        </DataTable>
      </div>

      <!-- Removed Items Section -->
      <div v-if="removedItems.length > 0" class="section">
        <h3>{{ localize('dialogs.relatedEntriesManagement.removedItems') }}</h3>
        <DataTable
          :value="removedItems"
          v-model:selection="selectedRemovedItems"
          @update:selection="selectedRemovedItems = $event"
          selection-mode="multiple"
          :meta-key-selection="false"
          class="related-items-table"
          :pt="{
            table: { style: 'min-width: 100%' },
            column: { 
              bodycell: ({ state }) => ({
                style: state.d_editing && 'padding-top: 0.6rem; padding-bottom: 0.6rem'
              })
            }
          }"
        >
          <Column selection-mode="multiple" header-style="width: 3rem"></Column>
          <Column field="name" :header="localize('labels.fields.name')" style="width: 30%"></Column>
          <Column field="topicName" :header="localize('labels.fields.topic')" style="width: 25%"></Column>
          <Column field="type" :header="localize('labels.fields.type')" style="width: 25%"></Column>
          <Column field="currentTopic" :header="localize('dialogs.relatedEntriesManagement.currentTopic')" style="width: 20%"></Column>
        </DataTable>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { useMainStore, } from '@/applications/stores';
  import { searchService } from '@/utils/search';
  import { Entry } from '@/classes';
  import { Topics, ValidTopic } from '@/types';

  // library components
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';

  // local components
  import Dialog from '@/components/Dialog.vue';

  // types
  interface RelatedItemInfo {
    uuid: string;
    name: string;
    topic: ValidTopic;
    topicName: string;
    type: string;
    currentTopic: string;
    isInRelatedEntries: boolean;
  }

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false,
    },
    addedIds: {
      type: Array as () => string[],
      default: () => [],
    },
    removedIds: {
      type: Array as () => string[],
      default: () => [],
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'update', addedItems: string[], removedItems: string[]): void;
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentEntry } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const addedItems = ref<RelatedItemInfo[]>([]);
  const removedItems = ref<RelatedItemInfo[]>([]);
  const selectedAddedItems = ref<RelatedItemInfo[]>([]);
  const selectedRemovedItems = ref<RelatedItemInfo[]>([]);

  ////////////////////////////////
  // computed data
  const show = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
  });

  const buttons = computed(() => [
    {
      label: localize('labels.update'),
      icon: 'fas fa-check',
      default: true,
      callback: onUpdate,
    },
    {
      label: localize('labels.noToAll'),
      icon: 'fas fa-times',
      callback: onNoToAll,
    },
  ]);

  ////////////////////////////////
  // methods
  const getTopicName = (topic: ValidTopic): string => {
    return Topics[topic] || 'Unknown';
  };

  const getCurrentTopicName = (): string => {
    if (!currentEntry.value) return 'Unknown';
    return getTopicName(currentEntry.value.topic);
  };

  const isEntityInRelatedEntries = async (uuid: string, topic: ValidTopic): Promise<boolean> => {
    if (!currentEntry.value) return false;
    
    const relationships = currentEntry.value.relationships;
    if (!relationships || !relationships[topic]) return false;
    
    return uuid in relationships[topic];
  };

  const loadItemInfo = async (uuids: string[]): Promise<RelatedItemInfo[]> => {
    const items: RelatedItemInfo[] = [];
    
    for (const uuid of uuids) {
      try {
        // Try to get entity info from search service first
        const searchEntities = searchService.getAllEntities();
        const searchEntity = searchEntities.find(e => e.uuid === uuid);
        
        if (searchEntity && searchEntity.isEntry) {
          // It's an entry, get full details
          const entry = await Entry.fromUuid(uuid);
          if (entry) {
            const isInRelated = await isEntityInRelatedEntries(uuid, entry.topic);
            items.push({
              uuid,
              name: entry.name,
              topic: entry.topic,
              topicName: getTopicName(entry.topic),
              type: entry.type || '',
              currentTopic: getCurrentTopicName(),
              isInRelatedEntries: isInRelated,
            });
          }
        }
        // Note: We're only handling entries for now as specified in the requirements
        // Could extend to handle other entity types (campaigns, sessions, etc.) later
      } catch (error) {
        console.warn(`Failed to load entity info for UUID ${uuid}:`, error);
      }
    }
    
    return items;
  };

  ////////////////////////////////
  // event handlers
  const onUpdate = async () => {
    emit('update', selectedAddedItems.value.map(item => item.uuid), selectedRemovedItems.value.map(item => item.uuid));
    show.value = false;
  };

  const onNoToAll = () => {
    show.value = false;
  };

  ////////////////////////////////
  // watchers
  watch([() => props.addedIds, () => props.removedIds], async () => {
    if (props.modelValue) {
      // Load item information for added and removed UUIDs
      const [loadedAddedItems, loadedRemovedItems] = await Promise.all([
        loadItemInfo(props.addedIds),
        loadItemInfo(props.removedIds),
      ]);

      // Filter added items to only include those not already in related items
      addedItems.value = loadedAddedItems.filter(item => !item.isInRelatedEntries);
      
      // Filter removed items to only include those currently in related items
      removedItems.value = loadedRemovedItems.filter(item => item.isInRelatedEntries);

      // Select all items by default
      selectedAddedItems.value = [...addedItems.value];
      selectedRemovedItems.value = [...removedItems.value];
    }
  }, { immediate: true });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
.related-entries-management-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;

  .description {
    margin-bottom: 1rem;
    color: var(--color-text-dark-secondary);
    font-size: var(--font-size-14);
    line-height: 1.4;
  }

  .section {
    h3 {
      margin-bottom: 0.75rem;
      font-size: var(--font-size-16);
      font-weight: 600;
      color: var(--color-text-dark-primary);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 0.25rem;
    }
  }

  .related-items-table {
    border: 1px solid var(--color-border-light-tertiary);
    border-radius: 4px;
    
    :deep(.p-datatable-thead > tr > th) {
      background-color: var(--color-bg-btn);
      color: var(--color-text-light-heading);
      font-weight: 600;
      font-size: var(--font-size-12);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid var(--color-border-light-tertiary);
    }

    :deep(.p-datatable-tbody > tr) {
      &:nth-child(even) {
        background-color: rgba(0, 0, 0, 0.02);
      }

      &:hover {
        background-color: var(--color-bg-option-hover);
      }

      &.p-highlight {
        background-color: var(--color-bg-option-active);
        color: var(--color-text-light-primary);
      }
    }

    :deep(.p-datatable-tbody > tr > td) {
      padding: 0.5rem 0.75rem;
      font-size: var(--font-size-13);
      border-bottom: 1px solid var(--color-border-light-tertiary);
    }
  }

  .no-changes {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-dark-secondary);
    font-style: italic;
  }
}
</style> 