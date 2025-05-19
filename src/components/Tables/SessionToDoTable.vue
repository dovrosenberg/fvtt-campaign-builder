<template>
  <!-- a table for use in sessions - handles items that can be moved to the next session, marked done, etc. -->
  <div class="primevue-only">
    <BaseTable
      ref="baseTableRef"
      :show-add-button="false"
      :show-filter="false"
      :filter-fields="[]"
      :track-delivery="true"
      :allow-drop-row="false"
      :delete-item-label="''"
      :toggle-item-label="localize('tooltips.toggleItem')"
      :rows="props.rows"
      :columns="columns"
      :allow-edit="false"
      :show-move-to-campaign="false"
      :draggable-rows="false"
      @row-select="(event) => emit('toggleItem', event)"
      @toggle-item="(uuid) => emit('toggleItem', uuid)"
    >
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, computed, ref } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  // library components
  
  // local components
  import BaseTable from '@/components/BaseTable/BaseTable.vue';

  // types
  type SessionTableGridRow = { uuid: string; delivered: boolean } & Record<string, any>;

  ////////////////////////////////
  // props
  const props = defineProps({
    rows: {
      type: Array as PropType<SessionTableGridRow[]>,
      required: true,
    },
    columns: {
      type: Array as PropType<any[]>,
      required: true,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'toggleItem', uuid: string): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const baseTableRef = ref<any>(null);

  ////////////////////////////////
  // computed data
  const columns = computed((): any[] => {
    // they all have some standard columns
    const actionColumn = { field: 'todoActions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Complete' };

    const columns = [ actionColumn ];
    for (const col of props.columns) {
      columns.push(col);
    }

    return columns;
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
</style>
