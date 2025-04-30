<template>
  <!-- A table to display/manage related scenes and actors -->
  <BaseTable
    :rows="rows"
    :columns="columns"
    :showAddButton="[DocumentLinkType.Actors, DocumentLinkType.Scenes].includes(props.documentLinkType)"
    :addButtonLabel="addButtonLabel"
    :extraAddText="extraAddText"
    :filterFields="filterFields"
    :allowEdit="true"
    :edit-item-label="localize('tooltips.editRelationship')"
    :delete-item-label="localize('tooltips.deleteRelationship')"
    :draggable-rows="[DocumentLinkType.Actors, DocumentLinkType.Items].includes(props.documentLinkType)"

    @delete-item="onDeleteItemClick"
    @row-select="onRowSelect"
    @row-context-menu="onRowContextMenu"
    @drop="onDrop"
    @dragover="onDragover"
    @dragstart="onDragStart"
    @add-item="onAddItem"
  />
  <RelatedDocumentsDialog
    v-if="[DocumentLinkType.Actors, DocumentLinkType.Scenes].includes(props.documentLinkType)"
    v-model="showPicker"
    :document-type="props.documentLinkType===DocumentLinkType.Actors ? 'actor' : 'scene'"
    @added="onDocumentAddedClick"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, PropType, ref } from 'vue';
  import { storeToRefs } from 'pinia';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local imports
  import { useRelationshipStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { getValidatedData, actorDragStart, itemDragStart } from '@/utils/dragdrop';

  // library components
  import { DataTableRowContextMenuEvent } from 'primevue/datatable';

  // local components
  import BaseTable from '@/components/BaseTable/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/Tables/RelatedDocumentsDialog.vue';

  // types
  import { RelatedDocumentDetails, DocumentLinkType } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    documentLinkType: { 
      type:Number as PropType<DocumentLinkType>, 
      required: true,
    },
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();

  const { relatedDocumentRows, } = storeToRefs(relationshipStore);

  ////////////////////////////////
  // data
  const showPicker = ref<boolean>(false);
    
  ////////////////////////////////
  // computed data
  const filterFields = computed(() => {
    let base = ['name'];

    return base;
  });

  const addButtonLabel = computed((): string => {
    if (props.documentLinkType === DocumentLinkType.Actors) {
      return localize('labels.session.addActor');
    } else if (props.documentLinkType === DocumentLinkType.Scenes) {
      return localize('labels.session.addScene');
    }
    return '';
  });

  const extraAddText = computed((): string => {
    if (props.documentLinkType === DocumentLinkType.Actors) {
      return localize('labels.session.addActorDrag');
    } else if (props.documentLinkType === DocumentLinkType.Scenes) {
      return localize('labels.session.addSceneDrag');
    }
    return '';
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

      // Add dragTooltip for actors
      if (props.documentLinkType === DocumentLinkType.Actors) {
        return {
          ...base,
          dragTooltip: localize('tooltips.dragActorFromEntry')
        };
      }

      return base;
    })
  );

  const columns = computed((): any[] => {
    // for now, just action and name
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };
    const nameColumn = { field: 'name', style: 'text-align: left', header: 'Name', sortable: true }; 
    const locationColumn = { field: 'location', style: 'text-align: left', header: 'Location', sortable: true }; 
    
    // Add drag column for actors
    if (props.documentLinkType === DocumentLinkType.Actors) {
      const dragColumn = { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' };
      return [actionColumn, dragColumn, nameColumn, locationColumn];
    }

    return [actionColumn, nameColumn, locationColumn];
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDocumentAddedClick = async (documentUuid: string) => {
    if (props.documentLinkType===DocumentLinkType.Actors) {
      await relationshipStore.addActor(documentUuid);
    } else if (props.documentLinkType===DocumentLinkType.Scenes) {
      await relationshipStore.addScene(documentUuid);
    }
  };

  const onRowSelect = async (event: { data: RelatedDocumentGridRow}) => { 
    const { data } = event;

    if (props.documentLinkType===DocumentLinkType.Actors) {
      const actor = await fromUuid(data.uuid) as Actor | null;
      await actor?.sheet?.render(true);
    } else if (props.documentLinkType===DocumentLinkType.Scenes) {
      const scene = await fromUuid(data.uuid) as Scene | null;
      await scene?.sheet?.render(true);
    }
  
    // Need to test open/activate for things in compendiums
  };

  const onRowContextMenu = async (event: DataTableRowContextMenuEvent): Promise<boolean> => {
    const { originalEvent, data } = event;
    const mouseEvent = originalEvent as MouseEvent;

    //prevent the browser's default menu
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();

    // no menu for actors
    if (props.documentLinkType===DocumentLinkType.Actors) {
      return false;
    }

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: mouseEvent.x,
      y: mouseEvent.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-eye', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENE.View'), 
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene | null;
            await scene?.view();
          }
        },
        { 
          icon: 'fa-bullseye', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENE.Activate'), 
          hidden: !!data.packId,   // can't activate in compendium
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene | null;
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
          label: game.i18n.localize('SCENE.Configure'), 
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene | null;
            await scene?.sheet?.render(true);
          }
        },
        { 
          icon: 'fa-compass', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENE.ToggleNav'), 
          hidden: !!data.packId,   // can't nav in compendium
          onClick: async () => {
            const scene = await fromUuid(data.uuid) as Scene | null;
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
  const onDeleteItemClick = async (_id: string) => {
    // show the confirmation dialog 
    await Dialog.confirm({
      title: localize('dialogs.confirmDeleteRelationship.title'),
      content: localize('dialogs.confirmDeleteRelationship.message'),
      yes: () => { 
        if (props.documentLinkType===DocumentLinkType.Scenes)
          void relationshipStore.deleteScene(_id); 
        else if (props.documentLinkType===DocumentLinkType.Actors)
          void relationshipStore.deleteActor(_id); 
      },
      no: () => {},
    });
  };

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDrop = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // make sure it's the right format
    if (data.type==='Scene' && props.documentLinkType===DocumentLinkType.Scenes && data.uuid) {
      await relationshipStore.addScene(data.uuid);
    } else if (data.type==='Actor' && props.documentLinkType===DocumentLinkType.Actors && data.uuid) {
      await relationshipStore.addActor(data.uuid);
    }
  };

  const onDragStart = async (event: DragEvent, uuid: string) => {
    switch (props.documentLinkType) {
      case DocumentLinkType.Actors:
        return await actorDragStart(event, uuid);
      case DocumentLinkType.Items:
        return await itemDragStart(event, uuid);
    }

    return;    
  }

  const onAddItem = () => {
    if (props.documentLinkType === DocumentLinkType.Actors) {
      showPicker.value = true;
    } else if (props.documentLinkType === DocumentLinkType.Scenes) {
      showPicker.value = true;
    }
  }

  ////////////////////////////////
  // watchers
  // reload when topic changes

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
</style>
