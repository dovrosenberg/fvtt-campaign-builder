<template>
  <BaseTable
    :rows="rows"
    :columns="columns"
    :show-add-button="true"
    :showFilter="false"
    :allow-drop-row="false"
    :add-button-label="localize('labels.add')"
    :extra-add-text="localize('labels.storyWeb.addStoryWebDrag')"
    :actions="actions"
    @add-item="onAddItem"
    @dragoverNew="DragDropService.standardDragover"
    @drop-new="onDropNew"
    @reorder="onReorder"
  />
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  import { useMainStore, useNavigationStore, useCampaignStore, useArcStore, useSessionStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { localize } from '@/utils/game';
  import { FCBDialog } from '@/dialogs';
  import DragDropService from '@/utils/dragDrop'; 
  
  import BaseTable from '@/components/tables/BaseTable.vue';

  import { Arc, Campaign, Session, StoryWeb } from '@/classes';
  import { BaseTableColumn, StoryWebNodeDragData, BaseTableGridRow } from '@/types';
  
  interface StoryWebRow {
    uuid: string;
    name: string;
  }

  const props = defineProps({
    mode: {
      type: String as () => 'campaign' | 'arc' | 'session',
      required: true,
    },
  });

  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignStore = useCampaignStore();
  const arcStore = useArcStore();
  const sessionStore = useSessionStore();
  const { currentCampaign, currentArc, currentSession } = useContentState();

  const rows = ref<StoryWebRow[]>([]);

  const store = computed(() => {
    switch (props.mode) {
      case 'campaign':
        return campaignStore;
      case 'arc':
        return arcStore;
      case 'session':
        return sessionStore;
      default:
        return null;
    }
  });

  const entity = computed(() => {
    switch (props.mode) {
      case 'campaign':
        return currentCampaign.value;
      case 'arc':
        return currentArc.value;
      case 'session':
        return currentSession.value;
      default:
        return null;
    }
  });

  const campaign = computed((): Campaign | null => {
    if (props.mode === 'campaign')
      return currentCampaign.value;

    return (entity.value as Arc | Session | null)?.campaign || null;
  });

  const columns = computed((): BaseTableColumn[] => [
    { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' },
    { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick },
  ]);

  const actions = computed(() => ([
    {
      icon: 'fa-trash',
      callback: (data) => onDeleteStoryWeb(data.uuid),
      tooltip: localize('tooltips.deleteRelationship'),
    },
  ]));

  const onNameClick = async (event: MouseEvent, data: Record<string, unknown> & { uuid: string; }) => {
    await navigationStore.openStoryWeb(data.uuid, { newTab: event.ctrlKey, activate: true, panelIndex: event.altKey ? -1 : undefined });
  };

  const refreshRows = async () => {
    const c = campaign.value;
    const e = entity.value as any;

    if (!c || !e) {
      rows.value = [];
      return;
    }

    const selectedIds = (e.storyWebs || []) as string[];
    if (selectedIds.length === 0) {
      rows.value = [];
      return;
    }

    // we need to get them into the right order
    const storyWebs = await c.filterStoryWebs((s) => selectedIds.includes(s.uuid));
    
    // Create a map for quick lookup
    const storyWebMap = new Map(storyWebs.map((s: StoryWeb) => [s.uuid, s]));
    
    // Preserve the order from selectedIds
    rows.value = selectedIds
      .map((id) => storyWebMap.get(id)!)
      .map((s: StoryWeb) => ({ uuid: s.uuid, name: s.name }));
  };

  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    if (!entity.value)
      return;

    const reorderedWebs = reorderedRows.map((row) => row.uuid);
    await store.value?.reorderStoryWebs(reorderedWebs);
    await entity.value.save();

    await mainStore.refreshCurrentContent();
    await refreshRows();
  };

  const onAddItem = async () => {
    const c = campaign.value;
    const e = entity.value as any;
    if (!c || !e)
      return;

    const all = await c.filterStoryWebs(() => true);
    const selected = new Set<string>(((e.storyWebs || []) as string[]));

    const options = all
      .filter((w: StoryWeb) => !selected.has(w.uuid))
      .map((w: StoryWeb) => ({ id: w.uuid, label: w.name }));

    const selectedItemId = await FCBDialog.relatedItemDialog(
      localize('contentFolders.storyWebs'),
      localize('labels.add'),
      options,
    );
    if (!selectedItemId)
      return;

    const next = new Set<string>(((e.storyWebs || []) as string[]));
    next.add(selectedItemId);
    e.storyWebs = Array.from(next);
    await e.save();

    await mainStore.refreshCurrentContent();
    await refreshRows();
  };

  const onDropNew = async (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!campaign.value || !entity.value)
      return;

    const data = DragDropService.getValidatedData(event);
    if (!data || DragDropService.getType(data) !== 'fcb-storyWeb' || !('fcbData' in data && (data.fcbData as StoryWebNodeDragData)?.storyWebId))
      return;

    const selectedItemId = (data.fcbData as StoryWebNodeDragData)?.storyWebId;

    // Only allow story webs that are part of this campaign
    const matches = await campaign.value.filterStoryWebs((s) => s.uuid === selectedItemId);
    if (matches.length === 0)
      return;

    const next = new Set<string>(((entity.value.storyWebs || []) as string[]));
    if (next.has(selectedItemId))
      return;

    next.add(selectedItemId);
    entity.value.storyWebs = Array.from(next);
    await entity.value.save();

    await mainStore.refreshCurrentContent();
    await refreshRows();
  };

  const onDeleteStoryWeb = async (uuid: string) => {
    const e = entity.value as any;
    if (!e)
      return;

    if (!(await FCBDialog.confirmDialog(localize('dialogs.confirmDeleteRelationship.title'), localize('dialogs.confirmDeleteRelationship.message'))))
      return;

    const next = ((e.storyWebs || []) as string[]).filter((id: string) => id !== uuid);
    e.storyWebs = next;
    await e.save();

    await mainStore.refreshCurrentContent();
    await refreshRows();
  };

  watch([campaign, entity], async () => {
    await refreshRows();
  }, { immediate: true });
</script>

<style lang="scss" scoped>
</style>
