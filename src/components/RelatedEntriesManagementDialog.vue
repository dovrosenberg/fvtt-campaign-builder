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
      <div v-if="addedEntries.length > 0" class="section">
        <h3>{{ localize('dialogs.relatedEntriesManagement.addedItems') }}</h3>
        <DataTable
          :value="addedRows"
          v-model:selection="selectedAddedItems"
          data-key="uuid" 
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
        </DataTable>
      </div>

      <!-- Removed Items Section -->
      <div v-if="removedEntries.length > 0" class="section">
        <h3>{{ localize('dialogs.relatedEntriesManagement.removedItems') }}</h3>
        <DataTable
          :value="removedRows"
          v-model:selection="selectedRemovedItems"
          data-key="uuid" 
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
        </DataTable>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, watch } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
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
    (e: 'update', addedItems: Entry[], removedItems: Entry[]): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const addedEntries = ref<Entry[]>([]);
  const removedEntries = ref<Entry[]>([]);
  const selectedAddedItems = ref<{ uuid: string }[]>([]);
  const selectedRemovedItems = ref<{ uuid: string }[]>([]);

  ////////////////////////////////
  // computed data
  const addedRows = computed(() => {
    return addedEntries.value.map(item => ({
      uuid: item.uuid,
      name: item.name,
      topic: item.topic,
      topicName: getTopicName(item.topic),
      type: item.type,
    }));
  });

  const removedRows = computed(() => {
    return removedEntries.value.map(item => ({
      uuid: item.uuid,
      name: item.name,
      topic: item.topic,
      topicName: getTopicName(item.topic),
      type: item.type,
    }));
  });

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

  ////////////////////////////////
  // event handlers
  const onUpdate = async () => {
    emit(
      'update', 
      addedEntries.value.filter((e) => selectedAddedItems.value.find((info) => info.uuid===e.uuid)), 
      removedEntries.value.filter((e) => selectedRemovedItems.value.find((info) => info.uuid===e.uuid))
    );
    show.value = false;
  };

  const onNoToAll = () => {
    show.value = false;
  };

  ////////////////////////////////
  // watchers
  watch(() => props.addedIds, async () => {
    if (props.modelValue) {
      addedEntries.value = [];

      for (const uuid of props.addedIds) {
        const entry = await Entry.fromUuid(uuid);
        if (entry)
          addedEntries.value.push(entry);
      }
      
      // Select all items by default
      selectedAddedItems.value = props.addedIds.map(id => ({ uuid: id }));
    }
  }, { immediate: true });

  watch(() => props.removedIds, async () => {
    if (props.modelValue) {
      removedEntries.value = [];
      
      for (const uuid of props.removedIds) {
        const entry = await Entry.fromUuid(uuid);
        if (entry)
          removedEntries.value.push(entry);
      }

      // Select all items by default
      selectedRemovedItems.value = props.removedIds.map(id => ({ uuid: id }));
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