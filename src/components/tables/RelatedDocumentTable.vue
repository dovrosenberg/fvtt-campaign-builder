<template>
  <!-- A table to display/manage related scenes and actors -->
  <div class="related-document-table-wrapper flexcol">
    <!-- Info message for tag-associated actors/scenes -->
    <div v-if="tagAssociatedInfo" class="tag-associated-info">
      <i class="fas fa-info-circle"></i>
      <span>{{ tagAssociatedInfo }}</span>
      <span v-if="tagAssociatedDocName" 
        class="tag-associated-doc-name"
        :class="{ 'draggable': props.documentLinkType === DocumentLinkType.Actors }"
        :draggable="props.documentLinkType === DocumentLinkType.Actors"
        :data-tooltip="docNameTooltip"
        @click="onTagAssociatedDocClick"
        @contextmenu="onTagAssociatedDocContextMenu"
        @dragstart="onTagAssociatedDocDragStart"
        @dragend="DragDropService.dragEnd"
      >
        {{ tagAssociatedDocName }}
      </span>
    </div>
    <BaseTable
    :rows="rows"
    :columns="columns"
    :show-add-button="[DocumentLinkType.Actors, DocumentLinkType.Scenes].includes(props.documentLinkType)"
    :add-button-label="addButtonLabel"
    :extra-add-text="extraAddText"
    :filter-fields="filterFields"
    :actions="actions"
    :can-reorder="props.documentLinkType === DocumentLinkType.Actors"
    :table-test-id="docTableTestId"

    @row-context-menu="onRowContextMenu"
    @drop-new="onDropNew"
    @dragover="DragDropService.standardDragover"
    @dragstart="onDragstart"
    @add-item="onAddItem"
    @reorder="onReorder"
  />
  <RelatedDocumentsDialog
    v-if="[DocumentLinkType.Actors, DocumentLinkType.Scenes].includes(props.documentLinkType)"
    v-model="showPicker"
    :document-type="props.documentLinkType===DocumentLinkType.Actors ? 'actor' : 'scene'"
    @added="onDocumentAddedClick"
  />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, PropType, ref, inject } from 'vue';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local imports
  import { useRelationshipStore } from '@/applications/stores';
  import { ENTRY_DERIVED_STATE_KEY } from '@/composables/useEntryDerivedState';
  import { useContentState } from '@/composables/useContentState';
  import { localize } from '@/utils/game';
  import DragDropService from '@/utils/dragDrop';
  import { FCBDialog } from '@/dialogs';
  import { notifyWarn } from '@/utils/notifications';
  import { SettingKey } from '@/settings';

  // library components
  import { DataTableRowContextMenuEvent } from 'primevue/datatable';

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/dialogs/RelatedDocumentsDialog.vue';

  // types
  import { BaseTableColumn, RelatedDocumentDetails, DocumentLinkType, FoundryDragType, FoundryTag } from '@/types';
  
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
  const { relatedDocumentRows } = inject(ENTRY_DERIVED_STATE_KEY)!;
  const { currentEntry } = useContentState();

  ////////////////////////////////
  // data
  const showPicker = ref<boolean>(false);
  const tagAssociatedDoc = ref<{ uuid: string; name: string; packId?: string | null } | null>(null);
    
  ////////////////////////////////
  // computed data
  const filterFields = computed(() => ['name', 'documentType']);

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

  const docTableTestId = computed((): string => {
    switch (props.documentLinkType) {
      case DocumentLinkType.Actors: return 'actors-table';
      case DocumentLinkType.Scenes: return 'scenes-table';
      case DocumentLinkType.GenericFoundry: return 'foundry-table';
      default: return 'documents-table';
    }
  });


  interface RelatedDocumentGridRow { 
    uuid: string;     
    name: string;
    packId?: string | null;
    dragTooltip?: string;
    draggableId?: string;  // for drag functionality
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

      // Add dragTooltip and draggableId for actors,, items, generic foundry
      if ([DocumentLinkType.Actors, DocumentLinkType.Items, DocumentLinkType.GenericFoundry].includes(props.documentLinkType)) {
        return {
          ...base,
          draggableId: item.uuid,  // the foundry document uuid
          dragTooltip: localize('tooltips.dragToScene')
        };
      }

      return base;
    })
  );

  const columns = computed((): BaseTableColumn[] => {
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

  /**
   * Computed info message for tag-associated actors/scenes.
   * Returns null if no tag association or if there are manually-added documents.
   * Also populates tagAssociatedDoc with the document info.
   */
  const tagAssociatedInfo = computed((): string | null => {
    // Reset the doc info
    tagAssociatedDoc.value = null;

    // Only show for Actors or Scenes tabs
    if (props.documentLinkType !== DocumentLinkType.Actors && props.documentLinkType !== DocumentLinkType.Scenes)
      return null;

    // Don't show on actors if there are manually-added documents
    if (props.documentLinkType === DocumentLinkType.Actors && rows.value.length > 0)
      return null;

    const entry = currentEntry.value;
    if (!entry)
      return null;

    const setting = props.documentLinkType === DocumentLinkType.Actors ?
      SettingKey.actorTags :
      SettingKey.sceneTags;

    const tags = entry.getFoundryTags(setting);
    if (tags.length === 0)
      return null;

    // Warn if multiple tags
    if (tags.length > 1) {
      const msg = props.documentLinkType === DocumentLinkType.Actors ?
        localize('tags.multipleActorTagsWarning', { name: tags[0].name }) :
        localize('tags.multipleSceneTagsWarning', { name: tags[0].name });
      notifyWarn(msg);
    }

    // display the associated tag and load the document info
    const tag = tags[0];
    if (tag.uuid) {
      // Load the document info for display
      foundry.utils.fromUuid(tag.uuid).then((doc: foundry.abstract.Document | null) => {
        if (doc) {
          tagAssociatedDoc.value = { uuid: tag.uuid, name: doc.name || 'Unknown', packId: doc.pack };
        }
      });

      const msg = props.documentLinkType === DocumentLinkType.Actors ?
        localize('tags.actorAssociated', { tagName: tag.name }) :
        localize('tags.sceneAssociated', { tagName: tag.name });
      return msg;
    }

    return null;
  });

  /**
   * Computed document name for the tag-associated actor/scene.
   */
  const tagAssociatedDocName = computed((): string | null => {
    return tagAssociatedDoc.value?.name || null;
  });

  /**
   * Computed tooltip for the document name link.
   */
  const docNameTooltip = computed((): string => {
    if (props.documentLinkType === DocumentLinkType.Actors) {
      return localize('tags.dragActorHint');
    }
    return localize('tags.clickSceneHint');
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

  const onNameClick = async (_event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) => {
    const doc = await foundry.utils.fromUuid(rowData.uuid);
    await doc?.sheet?.render(true);
  };

  /**
   * Handle click on tag-associated scene name - open scene configuration.
   */
  const onTagAssociatedDocClick = async () => {
    if (!tagAssociatedDoc.value)
      return;

    // For scenes, open the sheet (configuration)
    if (props.documentLinkType === DocumentLinkType.Scenes) {
      const scene = await foundry.utils.fromUuid<Scene>(tagAssociatedDoc.value.uuid);
      await scene?.sheet?.render(true);
    }
  };

  /**
   * Show the scene context menu at the specified position.
   */
  const showSceneContextMenu = (event: MouseEvent, data: { uuid: string; packId?: string | null }) => {
    event.preventDefault();
    event.stopPropagation();

    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-eye', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENE.View'), 
          onClick: async () => {
            const scene = await foundry.utils.fromUuid<Scene>(data.uuid);
            await scene?.view();
          }
        },
        { 
          icon: 'fa-bullseye', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENE.Activate'), 
          hidden: !!data.packId,   // can't activate in compendium
          onClick: async () => {
            const scene = await foundry.utils.fromUuid<Scene>(data.uuid);
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
            const scene = await foundry.utils.fromUuid<Scene>(data.uuid);
            await scene?.sheet?.render(true);
          }
        },
        { 
          icon: 'fa-compass', 
          iconFontClass: 'fas',
          label: game.i18n.localize('SCENE.ToggleNav'), 
          hidden: !!data.packId,   // can't nav in compendium
          onClick: async () => {
            const scene = await foundry.utils.fromUuid<Scene>(data.uuid);
            if (!scene)
              throw new Error('Failed to load scene in RelatedDocumentTable.showSceneContextMenu()');
            
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
  };

  /**
   * Handle drag start on tag-associated actor name - start Foundry actor drag.
   */
  const onTagAssociatedDocDragStart = async (event: DragEvent) => {
    if (!tagAssociatedDoc.value || props.documentLinkType !== DocumentLinkType.Actors)
      return;

    await DragDropService.actorDragStart(event, tagAssociatedDoc.value.uuid);
  };

  /**
   * Handle right-click on tag-associated scene name - show context menu.
   */
  const onTagAssociatedDocContextMenu = (event: MouseEvent) => {
    if (!tagAssociatedDoc.value || props.documentLinkType !== DocumentLinkType.Scenes)
      return;

    showSceneContextMenu(event, tagAssociatedDoc.value);
  };

  const onRowContextMenu = (event: DataTableRowContextMenuEvent): boolean => {
    // no menu for actors or generic
    if (props.documentLinkType !== DocumentLinkType.Scenes) {
      return false;
    }

    showSceneContextMenu(event.originalEvent as MouseEvent, event.data);
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

  const onDropNew = async(event: DragEvent) => {
    event.preventDefault();  

    // parse the data - looking for raw Foundry data (type and uuid)
    let data = DragDropService.getValidatedData(event) as FoundryDragType | undefined;
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

  const onDragstart = async (event: DragEvent, uuid: string) => {
    switch (props.documentLinkType) {
      case DocumentLinkType.Actors:
        return await DragDropService.actorDragStart(event, uuid);
      case DocumentLinkType.Items:
        return await DragDropService.itemDragStart(event, uuid);
      case DocumentLinkType.GenericFoundry:
        return await DragDropService.foundryDragStart(event, uuid);
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

  /** Handle reordering of actors */
  const onReorder = async (reorderedRows: { uuid: string }[]) => {
    if (props.documentLinkType === DocumentLinkType.Actors) {
      const reorderedUuids = reorderedRows.map(row => row.uuid);
      await relationshipStore.reorderActors(reorderedUuids);
    }
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss" scoped>
  .tag-associated-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    background: var(--color-bg-light);
    border: 1px solid var(--color-border-light);
    border-radius: 4px;
    color: var(--color-text-light);
    font-size: 0.9rem;

    i {
      color: var(--fcb-primary);
    }
  }

  .tag-associated-doc-name {
    font-weight: bold;
    color: var(--fcb-primary);
    cursor: pointer;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--color-bg-highlight);
    }

    &.draggable {
      cursor: grab;
      
      &:active {
        cursor: grabbing;
      }
    }
  }
</style>
