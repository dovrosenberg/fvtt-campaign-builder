<template>
  <div class="tab-inner">
    <BaseTable
      ref="availableIdeaRef"
      :show-add-button="true"
      :show-filter="false"
      :filter-fields="[]"
      :add-button-label="localize('labels.campaign.addIdea')"
      :allow-drop-row="false"
      :grouped="isGrouped"
      :groups="ideaGroups"
      :rows="ideaRows"
      :columns="columns"
      :allow-edit="true"
      :edit-item-label="localize('tooltips.editRow')"
      :actions="actions"
      :enable-related-entries-tracking="props.arcMode && ModuleSettings.get(SettingKey.autoRelationships)"
      @related-entries-changed="(added, removed) => emit('relatedEntriesChanged', added, removed)"
      @add-item="onAddIdea"
      @cell-edit-complete="onCellEditComplete"
      @reorder="groupedTable.onReorder"
      @reorder-group="(items) => groupedTable.onReorderGroup(items, ideaGroups)"
      @group-add="groupedTable.onGroupAdd"
      @group-edit="groupedTable.onGroupEdit"
      @group-delete="groupedTable.onGroupDelete"
    >
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, inject, } from 'vue';

  // local imports
  import { useCampaignStore, useArcStore, } from '@/applications/stores';
  import { CAMPAIGN_DERIVED_STATE_KEY } from '@/composables/useCampaignDerivedState';
  import { ARC_DERIVED_STATE_KEY } from '@/composables/useArcDerivedState';
  import { useGroupedTable } from '@/composables/useGroupedTable';
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  
  // types
  import { BaseTableColumn, CampaignTableTypes, CellEditCompleteEvent, GroupableItem } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    arcMode: {
      type: Boolean,
      default: false
    }
  })

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
  }>();

  ////////////////////////////////
  // store
  const campaignStore = useCampaignStore();
  const arcStore = useArcStore();
  const campaignDerivedState = inject(CAMPAIGN_DERIVED_STATE_KEY, null);
  const arcDerivedState = inject(ARC_DERIVED_STATE_KEY, null);
  const campaignIdeaRows = computed(() => campaignDerivedState?.ideaRows.value ?? []);
  const campaignIdeaGroups = computed(() => campaignDerivedState?.ideaGroups.value ?? []);
  const arcIdeaRows = computed(() => arcDerivedState?.ideaRows.value ?? []);
  const arcIdeaGroups = computed(() => arcDerivedState?.ideaGroups.value ?? []);

  ////////////////////////////////
  // data
  const availableIdeaRef = ref<InstanceType<typeof BaseTable> | null>(null);

  ////////////////////////////////
  // computed data
  const store = computed(() => props.arcMode ? arcStore : campaignStore);
  const ideaRows = computed(() => props.arcMode ? arcIdeaRows.value : campaignIdeaRows.value);
  const ideaGroups = computed(() => props.arcMode ? arcIdeaGroups.value : campaignIdeaGroups.value);
  const isGrouped = computed(() => {
    // Access reactive version to create dependency on settings changes
    ModuleSettings.getReactiveVersion();
    return ModuleSettings.get(SettingKey.tableGroupingSettings)?.[
      props.arcMode ?
      GroupableItem.ArcIdeas :
      GroupableItem.CampaignIdeas
  ] || false;
  });

  // Grouped table composable
  const groupedTable = useGroupedTable(
    props.arcMode ? arcStore.groupStores[GroupableItem.ArcIdeas] : campaignStore.groupStores[GroupableItem.CampaignIdeas]
  );

  const actions = computed(() => {
    return [
      { 
        icon: 'fa-trash', 
        callback: (data, removedUUIDs) => onDeleteIdea(data.uuid, removedUUIDs), 
        tooltip: localize('tooltips.deleteIdea'),
      },
      { 
        icon: 'fa-arrow-up',
        display: () => props.arcMode,
        callback: (data) => onMoveToCampaign(data.uuid), 
        tooltip: localize('tooltips.moveToCampaign') 
      },
      { 
        icon: 'fa-arrow-down', 
        display: () => !props.arcMode,
        callback: (data) => onMoveToArc(data.uuid), 
        tooltip: localize('tooltips.moveToLatestArc') 
      },
      { 
        icon: 'fa-arrow-right', 
        display: () => !props.arcMode,
        callback: (data) => onMoveToToDo(data.uuid), 
        tooltip: localize('tooltips.moveToToDo') 
      },
    ];
  });

  const columns = computed((): BaseTableColumn[] => {
    // add actions    
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };

    const columns = [ actionColumn ] as BaseTableColumn[];
    for (const col of campaignStore.extraFields[CampaignTableTypes.Idea]) {
      columns.push(col);
    }

    return columns;
  });


  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDeleteIdea = async (uuid: string, removedUUIDs?: string[]) => {
    const deleted = await store.value.deleteIdea(uuid);
    if (deleted && removedUUIDs && removedUUIDs.length > 0) {
      emit('relatedEntriesChanged', [], removedUUIDs);
    }
  };

  const onAddIdea = async () => {
    // Add the idea and get the UUID of the newly added item
    const ideaUuid = await store.value.addIdea();

    // If we successfully added an idea, put its description column into edit mode
    if (ideaUuid) {
      // We need to wait for the DOM to update first
      setTimeout(() => {
        if (availableIdeaRef.value) {
          availableIdeaRef.value.setEditingRow(ideaUuid);
        }
      }, 50); // Small delay to ensure the DOM has updated
    }
  };

  const onCellEditComplete = async (event: CellEditCompleteEvent) => {
    const { data, newValue, field } = event;
    
    if (field === 'text') {
      await store.value.updateIdea(data.uuid, newValue as string);
    }
  };

  const onMoveToToDo = async (uuid: string) => {
    await campaignStore.moveIdeaToToDo(uuid);
  };

  const onMoveToCampaign = async (uuid: string) => {
    await arcStore.moveIdeaToCampaign(uuid);
  };

  const onMoveToArc = async (uuid: string) => {
    await campaignStore.moveIdeaToArc(uuid);
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style> 