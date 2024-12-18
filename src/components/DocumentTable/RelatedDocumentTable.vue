<template>
  <!-- A table to display/manage related scenes and actors -->
  <div 
    class="primevue-only"
    @drop="onDrop"
  >
    <DataTable
      v-model:filters="pagination.filters"
      data-key="uuid"
      :value="rows"
      size="small"
      paginator
      paginator-position="bottom"
      paginator-template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
      current-page-report-template="{first} to {last} of {totalRecords}"
      :sort-field="pagination.sortField"
      :sort-order="pagination.sortOrder"
      :default-sort-order="1"
      :total-records="rows.length"
      :global-filter-fields="filterFields"
      :rows="pagination.rowsPerPage"
      filter-display="row"
      selection-mode="single" 
      :pt="{
        header: { style: 'border: none' },
        thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
        row: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
        pcPaginator: { 
          // these are needed to override the foundry button styling
          first: {
            style: 'width: auto', 
          },
          root: { style: 'background: inherit', }
        },
        table: { style: 'margin: 0px;'}
      }"
      @row-select="onRowSelect"
      @row-contextmenu="onRowContextMenu"
    >
      <template #header>
        <div style="display: flex; justify-content: space-between;">
          <div></div>
          <IconField icon-position="left">
            <InputIcon>
              <i class="fas fa-search"></i>
            </InputIcon>
            <InputText 
              v-model="pagination.filters.global.value"  
              placeholder="Keyword Search"
            />
          </IconField>
        </div>
      </template>
      <template #empty>
        {{ localize('fwb.labels.noResults') }} 
      </template>
      <template #loading>
        {{ localize('fwb.labels.loading') }}...
      </template>

      <Column 
        v-for="col of columns" 
        :key="col.field" 
        :field="col.field" 
        :header="col.header" 
        :header-style="col.style"
        :body-style="col.style"
        :sortable="col.sortable"
      >
        <!-- actions column format-->
        <template
          v-if="col.field==='actions'"
          #body="{ data }"
        >
          <a 
            class="" 
            :data-tooltip="localize('fwb.tooltips.deleteRelationship')"
            @click.stop="onDeleteItemClick(data.uuid)" 
          >
            <i class="fas fa-trash"></i>
          </a>
        </template>

        <!-- template to add the filter headers fof name/type/role columns -->
        <!-- <template 
          v-if="['name', 'type', 'role'].includes(col.field)"
          #filter="{ filterModel, filterCallback }"
        >
          <InputText 
            v-model="filterModel.value" 
            type="text" 
            :placeholder="`Search by ${col.header}`" 
            @input="filterCallback()" 
          />
        </template> -->
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed,} from 'vue';
  import { storeToRefs } from 'pinia';
  import { FilterMatchMode } from '@primevue/core/api';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local imports
  import { useMainStore, useRelationshipStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components
  import DataTable, { DataTableRowContextMenuEvent } from 'primevue/datatable';
  import Column from 'primevue/column';
  import InputText from 'primevue/inputtext';
  import IconField from 'primevue/iconfield';
  import InputIcon from 'primevue/inputicon';

  // local components

  // types
  import { TablePagination, RelatedDocumentDetails, DocumentTab } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();
  const mainStore = useMainStore();

  const { currentDocumentTab } = storeToRefs(mainStore);
  const { relatedDocumentRows, } = storeToRefs(relationshipStore);

  ////////////////////////////////
  // data
    
  ref<string>('');   // text to filter the table rows
  const pagination = ref<TablePagination>({
    sortField: 'name', 
    sortOrder: 1, 
    first: 0,
    page: 1,
    rowsPerPage: 5, 
    filters: {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      name: { value: null, matchMode: FilterMatchMode.CONTAINS },
      type: { value: null, matchMode: FilterMatchMode.CONTAINS },
      role: { value: null, matchMode: FilterMatchMode.CONTAINS },  // TODO: support any extra columns
    },
  });

  ////////////////////////////////
  // computed data
  const filterFields = computed(() => {
    let base = ['name'];

    return base;
  });

  type GridRow = { uuid: string; name: string };

  const rows = computed((): GridRow[] => 
    relatedDocumentRows.value.map((item: RelatedDocumentDetails) => {
      const base = { 
        uuid: item.uuid, 
        name: item.name, 
        packId: item.packId, 
        location: item.packId ? `Compendium: ${item.packName}` : 'World',
      };

      return base;
    })
  );

  const columns = computed((): any[] => {
    // for now, just action and name
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };
    const nameColumn = { field: 'name', style: 'text-align: left', header: 'Name', sortable: true }; 
    const locationColumn = { field: 'location', style: 'text-align: left', header: 'Location', sortable: true }; 

    return [actionColumn, nameColumn, locationColumn];
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onRowSelect = async function (event: { data: GridRow} ) { 
    const { data } = event;

    if (currentDocumentTab.value===DocumentTab.Actors) {
      const actor = await fromUuid(data.uuid) as Actor;
      await actor?.sheet?.render(true);
    } else if (currentDocumentTab.value===DocumentTab.Scenes) {
      const scene = await fromUuid(data.uuid) as Scene;
      await scene?.sheet?.render(true);
    }
  
    // Need to test open/activate for things in compendiums
  };

  const onRowContextMenu = async function (event: DataTableRowContextMenuEvent): Promise<boolean> {
    const { originalEvent, data } = event;
    const mouseEvent = originalEvent as MouseEvent;

    //prevent the browser's default menu
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();

    // no menu for actors
    if (currentDocumentTab.value===DocumentTab.Actors) {
      return false;
    }

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fwb',
      x: mouseEvent.x,
      y: mouseEvent.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-eye', 
          iconFontClass: 'fas',
          label: localize('SCENES.View'), 
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene;
            await scene?.view();
          }
        },
        { 
          icon: 'fa-bullseye', 
          iconFontClass: 'fas',
          label: localize('SCENES.Activate'), 
          hidden: data.packId,   // can't activate in compendium
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene;
            await scene?.activate();
          }
        },
        { 
          icon: 'fa-cogs', 
          iconFontClass: 'fas',
          label: localize('SCENES.Configure'), 
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene;
            await scene?.sheet?.render(true);
          }
        },
        { 
          icon: 'fa-compass', 
          iconFontClass: 'fas',
          label: localize('SCENES.ToggleNav'), 
          hidden: data.packId,   // can't nav in compendium
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene;
            if (scene.active) {
              alert('Cannot toggle navigation while scene is active');
            } else {
              await scene?.update({navigation: !scene.navigation});
            }
          }
        },
      ]
    });

    return true;
  };

  // call mutation to remove item  from relationship
  const onDeleteItemClick = async function(_id: string) {
    // show the confirmation dialog 
    await Dialog.confirm({
      title: localize('fwb.dialogs.confirmDeleteRelationship.title'),
      content: localize('fwb.dialogs.confirmDeleteRelationship.message'),
      yes: () => { 
        if (currentDocumentTab.value===DocumentTab.Scenes)
          void relationshipStore.deleteScene(_id); 
        else if (currentDocumentTab.value===DocumentTab.Actors)
          void relationshipStore.deleteActor(_id); 
      },
      no: () => {},
    });
  };

  const onDrop = async(event: DragEvent) => {
    if (event.dataTransfer?.types[0]==='text/plain') {
      try {
        let data;
        data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');

        // make sure it's the right format
        if (data.type==='Scene' && currentDocumentTab.value===DocumentTab.Scenes && data.uuid) {
          await relationshipStore.addScene(data.uuid);
        } else if (data.type==='Actor' && currentDocumentTab.value===DocumentTab.Actors && data.uuid) {
          await relationshipStore.addActor(data.uuid);
        }

        return true;
      }
      catch (err) {
        return false;
      }
    } else {
      return false;
    }
  };
  
  const onPaginationChanged = async function (newPagination: TablePagination | { filter: string; pagination: TablePagination }) {
    // // this gets called for filter changes and pagination changes, but with a different argument !?
    // if (Object.keys(newPagination).includes('pagination')) {
    //   relationshipStore.relatedItemPagination[props.topic] = {
    //     ...(newPagination as {pagination: TablePagination}).pagination,
    //     filter: newPagination.filter,
    //   };
    // } else {
    //   relationshipStore.relatedItemPagination[props.topic] = {
    //     ...(newPagination as TablePagination),
    //     filter: relationshipStore.relatedItemPagination[props.topic].filter,
    //   };
    // }
  };

  ////////////////////////////////
  // watchers
  // reload when topic changes

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
  .action-icon {
    cursor: pointer;
  }
</style>
