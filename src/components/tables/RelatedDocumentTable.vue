<template>
  <!-- A table to display/manage related scenes and actors -->
  <BaseTable
    :rows="rows"
    :columns="columns"
    :showAddButton="[DocumentLinkType.Actors, DocumentLinkType.Scenes].includes(props.documentLinkType)"
    :addButtonLabel="addButtonLabel"
    :extraAddText="extraAddText"
    :filterFields="filterFields"
    :draggable-rows="draggableRows"
    :actions="actions"

    @row-context-menu="onRowContextMenu"
    @drop-new="onDropNew"
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
  import { getValidatedData, actorDragStart, itemDragStart, foundryDragStart } from '@/utils/dragdrop';
  import { FCBDialog } from '@/dialogs';

  // library components
  import { DataTableRowContextMenuEvent } from 'primevue/datatable';

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/tables/RelatedDocumentsDialog.vue';

  // types
  import { RelatedDocumentDetails, DocumentLinkType, FoundryDragType } from '@/types';
  
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
  const filterFields = computed(() => ['name', 'documentType']);

  const draggableRows = computed(() => [DocumentLinkType.GenericFoundry, DocumentLinkType.Actors, DocumentLinkType.Items].includes(props.documentLinkType));
  
  const actions = computed(() => [{ 
    icon: 'fa-trash', 
    callback: (data: any) => onDeleteItemClick(data.uuid), 
    tooltip: localize('tooltips.deleteRelationship') 
  }]);
  
  const addButtonLabel = computed((): string => {
    if (props.documentLinkType === DocumentLinkType.Actors) {
      return localize('labels.session.addActor');
    } else if (props.documentLinkType === DocumentLinkType.Scenes) {
      return localize('labels.session.addScene');
    }
    return '';
  });

  const extraAddText = computed((): string => {
    switch (props.documentLinkType) {
      case DocumentLinkType.Actors:
        return localize('labels.session.addActorDrag');
      case DocumentLinkType.Scenes:
        return localize('labels.session.addSceneDrag');
      case DocumentLinkType.GenericFoundry:
        return localize('labels.session.addDocumentDrag');
    }
    return '';
  });


  interface RelatedDocumentGridRow { 
    uuid: string;     
    name: string;
    packId?: string | null;
    dragTooltip?: string;
    documentType?: string;
    location?: string;
  };

  const rows = computed((): RelatedDocumentGridRow[] => 
    relatedDocumentRows.value.map((item: RelatedDocumentDetails) => {
      let docType = foundry.utils.parseUuid(item.uuid)?.documentType;
      let docLabel = docType ? game.i18n.localize(`DOCUMENT.${docType}`) : '';

      const base = { 
        uuid: item.uuid, 
        name: item.name, 
        packId: item.packId, 
        documentType: docLabel,
        location: item.packId ? `${localize('labels.locations.compendium')}: ${item.packName}` : localize('labels.locations.world'),
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
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 60px; max-width: 60px', header: localize('labels.tableHeaders.actions') };
    const nameColumn = { field: 'name', style: 'text-align: left', header: localize('labels.tableHeaders.name'), sortable: true, onClick: onNameClick }; 
    const locationColumn = { field: 'location', style: 'text-align: left', header: localize('labels.tableHeaders.location'), sortable: true }; 
    const dragColumn = { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' };
    
    // Add document type column for GenericFoundry mode
    if (props.documentLinkType === DocumentLinkType.GenericFoundry) {
      const documentTypeColumn = { field: 'documentType', style: 'text-align: left', header: localize('labels.tableHeaders.type'), sortable: true };
      return [actionColumn, dragColumn,nameColumn, documentTypeColumn, locationColumn];
    }
    
    // Add drag column for actors
    else if (props.documentLinkType === DocumentLinkType.Actors) {
      return [actionColumn, dragColumn, nameColumn, locationColumn];
    } else 
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

  const onNameClick = async (_event: MouseEvent, uuid: string) => { 
    const doc = await fromUuid(uuid);
    await doc?.sheet?.render(true);
  };

  const onRowContextMenu = async (event: DataTableRowContextMenuEvent): Promise<boolean> => {
    const { originalEvent, data } = event;
    const mouseEvent = originalEvent as MouseEvent;

    //prevent the browser's default menu
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();

    // no menu for actors or generic
    if (props.documentLinkType!==DocumentLinkType.Scenes) {
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
            const scene = await fromUuid<Scene>(data.uuid);
            await scene?.view();
          }
        },
        { 
          icon: 'fa-bullseye', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENE.Activate'), 
          hidden: !!data.packId,   // can't activate in compendium
          onClick: async () => {
            const scene = await fromUuid<Scene>(data.uuid);
            await scene?.activate();
          }
        },
        { 
          icon: 'fa-bullseye', 
          iconFontClass: 'fas',
          label: localize('contextMenus.dialogs.cannotActivateFromCompendium'),
          disabled: true,
          hidden: !data.packId,   // can't activate in compendium
        },
        { 
          icon: 'fa-cogs', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENE.Configure'), 
          onClick: async () => {
            const scene = await fromUuid<Scene>(data.uuid);
            await scene?.sheet?.render(true);
          }
        },
        { 
          icon: 'fa-compass', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENE.ToggleNav'), 
          hidden: !!data.packId,   // can't nav in compendium
          onClick: async () => {
            const scene = await fromUuid<Scene>(data.uuid);
            if (!scene)
              throw new Error('Failed to load scene in RelatedDocumentTable.onRowContextMenu()');
            
            if (scene.active) {
              alert(localize('contextMenus.dialogs.cannotToggleNavigationWhileActive'));
            } else {
              await scene?.update({navigation: !scene.navigation});
            }
          }
        },
        { 
          icon: 'fa-compass', 
          iconFontClass: 'fas',
          label: localize('contextMenus.dialogs.cannotToggleNavigationFromCompendium'), 
          disabled: true,
          hidden: !data.packId,   // can't nav in compendium
        },
      ]
    });

    return true;
  };

  // call mutation to remove item from relationship
  const onDeleteItemClick = async (id: string) => {
    // show the confirmation dialog 
    const confirmed = await FCBDialog.confirmDialog(
      localize('dialogs.confirmDeleteRelationship.title'),
      localize('dialogs.confirmDeleteRelationship.message')
    );
    
    if (confirmed) {
      switch (props.documentLinkType) {
        case (DocumentLinkType.GenericFoundry):
          void relationshipStore.deleteFoundryDocument(id);
          break;
        case (DocumentLinkType.Scenes):
          void relationshipStore.deleteScene(id); 
          break;
        case (DocumentLinkType.Actors):
          void relationshipStore.deleteActor(id);
          break;
      }
    }
  };

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDropNew = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data - looking for raw Foundry data (type and uuid)
    let data = getValidatedData(event) as FoundryDragType | undefined;
    if (!data)
      return;

    // make sure it's the right format
    if (data.uuid && props.documentLinkType===DocumentLinkType.GenericFoundry) {
      // GenericFoundry mode - accept any document type
      await relationshipStore.addFoundryDocument(data.uuid);
    } else if (data.type==='Scene' && props.documentLinkType===DocumentLinkType.Scenes && data.uuid) {
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
      case DocumentLinkType.GenericFoundry:
        return await foundryDragStart(event, uuid);
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

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
</style>
