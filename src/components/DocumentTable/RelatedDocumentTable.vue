<template>
  <!-- A table to display/manage related scenes and actors -->
  <div 
    @drop="onDrop"
  >
    <BaseTable
      :rows="rows"
      :columns="columns"
      :showAddButton="false"
      :filterFields="filterFields"
      :allowEdit="true"
      :edit-item-label="localize('tooltips.editRelationship')"
      :delete-item-label="localize('tooltips.deleteRelationship')"

      @delete-item="onDeleteItemClick"
      @row-select="onRowSelect"
      @row-context-menu="onRowContextMenu"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed,} from 'vue';
  import { storeToRefs } from 'pinia';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local imports
  import { useMainStore, useRelationshipStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components
  import { DataTableRowContextMenuEvent } from 'primevue/datatable';

  // local components
  import BaseTable from '@/components/BaseTable/BaseTable.vue';

  // types
  import { RelatedDocumentDetails, DocumentLinkType } from '@/types';
  
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
    
  ////////////////////////////////
  // computed data
  const filterFields = computed(() => {
    let base = ['name'];

    return base;
  });

  type RelatedDocumentGridRow = { uuid: string; name: string };

  const rows = computed((): RelatedDocumentGridRow[] => 
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
  const onRowSelect = async function (event: { data: RelatedDocumentGridRow} ) { 
    const { data } = event;

    if (currentDocumentTab.value===DocumentLinkType.Actors) {
      const actor = await fromUuid(data.uuid) as Actor;
      await actor?.sheet?.render(true);
    } else if (currentDocumentTab.value===DocumentLinkType.Scenes) {
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
    if (currentDocumentTab.value===DocumentLinkType.Actors) {
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
          label: game.i18n.localize('SCENES.View'), 
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene;
            await scene?.view();
          }
        },
        { 
          icon: 'fa-bullseye', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENES.Activate'), 
          hidden: !!data.packId,   // can't activate in compendium
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene;
            await scene?.activate();
          }
        },
        { 
          icon: 'fa-bullseye', 
          iconFontClass: 'fas',
          label: 'Cannot activate from compendium',
          disabled: true,
          hidden: !data.packId,   // can't activate in compendium
        },
        { 
          icon: 'fa-cogs', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENES.Configure'), 
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene;
            await scene?.sheet?.render(true);
          }
        },
        { 
          icon: 'fa-compass', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENES.ToggleNav'), 
          hidden: !!data.packId,   // can't nav in compendium
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene;
            if (!scene)
              throw new Error('Failed to load scene in RelatedDocumentTable.onRowContextMenu()');
            
            if (scene.active) {
              alert('Cannot toggle navigation while scene is active');
            } else {
              await scene?.update({navigation: !scene.navigation});
            }
          }
        },
        { 
          icon: 'fa-compass', 
          iconFontClass: 'fas',
          label: 'Cannot toggle navigation from scene in a compendium', 
          disabled: true,
          hidden: !data.packId,   // can't nav in compendium
        },
      ]
    });

    return true;
  };

  // call mutation to remove item  from relationship
  const onDeleteItemClick = async function(_id: string) {
    // show the confirmation dialog 
    await Dialog.confirm({
      title: localize('dialogs.confirmDeleteRelationship.title'),
      content: localize('dialogs.confirmDeleteRelationship.message'),
      yes: () => { 
        if (currentDocumentTab.value===DocumentLinkType.Scenes)
          void relationshipStore.deleteScene(_id); 
        else if (currentDocumentTab.value===DocumentLinkType.Actors)
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
        if (data.type==='Scene' && currentDocumentTab.value===DocumentLinkType.Scenes && data.uuid) {
          await relationshipStore.addScene(data.uuid);
        } else if (data.type==='Actor' && currentDocumentTab.value===DocumentLinkType.Actors && data.uuid) {
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
  
  ////////////////////////////////
  // watchers
  // reload when topic changes

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
</style>
