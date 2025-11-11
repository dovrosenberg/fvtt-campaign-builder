<template>
  <li
    :class="`fcb-campaign-folder folder flexcol ${props.campaignNode.expanded ? '' : 'collapsed'} ${props.campaignNode.completed ? 'campaign-completed' : ''}`"
    :data-campaign="props.campaignNode.id"
  >
    <header class="folder-header flexrow">
      <div
        class="noborder"
        style="margin-bottom:0px"
        draggable="true"
        :data-tooltip="props.campaignNode.completed ? localize('tooltip.campaignComplete') : ''"
        @contextmenu="onCampaignContextMenu"
        @dragstart="onDragStart"
      >
        <i
          class="fas fa-folder-open fa-fw"
          style="margin-right: 4px;"
          data-testid="campaign-folder-toggle"
          @click="onCampaignFolderClick"
        ></i>
        <span data-testid="campaign-name" @click="onCampaignSelectClick">
          <span 
            :class="`node-name ${isActiveCampaign ? 'active' : ''}`"
          >
            {{ props.campaignNode.name }}
            <i v-if="props.campaignNode.completed" class="fas fa-check-circle completed-icon"></i>
          </span>
        </span>
      </div>
    </header>

    <!-- Sessions or arcs, depending on setting -->
    <ul 
      v-if="props.campaignNode.expanded"
      class="campaign-contents fcb-directory-tree"
    >
      <!-- fronts first -->
      <CampaignDirectoryFrontFolder 
        v-if="frontFolderNode"
        :front-folder-node="frontFolderNode"
        :campaign-id="props.campaignNode.id"
        class="fcb-entry-item" 
        draggable="false"
      />
      <CampaignDirectoryArcNode 
        v-for="node in sortedChildren"
        :key="'arc' + node.id"
        :arc-node="node as DirectoryArcNode"
        :top="true"
        class="fcb-entry-item" 
        draggable="true"
      />
    </ul>
  </li>
</template>

<script setup lang="ts" generic="ChildType extends DirectorySessionNode | DirectoryArcNode">
  // library imports
  import { ref, PropType, computed } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useNavigationStore, useMainStore } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { FCBDialog } from '@/dialogs';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  
  // local components
  import CampaignDirectoryArcNode from './CampaignDirectoryArcNode.vue';
  import CampaignDirectoryFrontFolder from './CampaignDirectoryFrontFolder.vue';

  // types
  import { Campaign, DirectoryArcNode, DirectoryCampaignNode, DirectorySessionNode, DirectoryFrontFolder } from '@/classes';
  import { CampaignNodeDragData, WindowTabType } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    campaignNode: {
      type: Object as PropType<DirectoryCampaignNode<ChildType>>,
      required: true,
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { isInPlayMode, currentCampaign } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  // we don't just use props node because in toggleWithLoad we want to swap it out without rebuilding
  //   the whole tree
  const currentNode = ref<DirectoryCampaignNode<ChildType>>(props.campaignNode);
  
  ////////////////////////////////
  // computed data
  const sortedChildren = computed((): DirectoryArcNode[] => {
    let children = props.campaignNode.loadedChildren;

    // if we are using fronts, strip the front folder
    if (ModuleSettings.get(SettingKey.useFronts)) {
      children = children.slice(1);
    }

    // arcs are already in order (they are kept in sortorder by manage arcs dialog)
    return children as DirectoryArcNode[];
  });

  const frontFolderNode = computed((): DirectoryFrontFolder | null => {
    if (ModuleSettings.get(SettingKey.useFronts)) {
      // front is always the first one
      return props.campaignNode.loadedChildren[0] as DirectoryFrontFolder;
    } else {
      return null;
    }
  });

  // Check if this campaign is current showing in the content window
  const isActiveCampaign = computed((): boolean => {
    return currentCampaign.value?.uuid === props.campaignNode.id;
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // handle campaign dragging
  const onDragStart = (event: DragEvent): void => {
    event.stopPropagation();

    const dragData = {
      type: 'fcb-campaign',
      campaignId: props.campaignNode.id,
      name: props.campaignNode.name
    } as CampaignNodeDragData;

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  // change campaign
  const onCampaignFolderClick = async (_event: MouseEvent) => {
    // if it's completed, don't toggle
    if (currentNode.value.completed) {
      return;
    }

    currentNode.value = await campaignDirectoryStore.toggleWithLoad(currentNode.value as DirectoryCampaignNode<ChildType>, !currentNode.value.expanded);
  };

  const onCampaignSelectClick = async (event: MouseEvent) => {
    await navigationStore.openCampaign(currentNode.value.id, {newTab: event.ctrlKey});
  };

  const onCampaignContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: getTabTypeIcon(WindowTabType.Session),
          iconFontClass: 'fas',
          disabled: isInPlayMode.value,
          label: localize('contextMenus.campaignFolder.createSession'), 
          onClick: async () => {
            const session = await campaignDirectoryStore.createSession(props.campaignNode.id);

            if (session) {
              await navigationStore.openSession(session.uuid, { newTab: true, activate: true, }); 
            }
          }
        },
        { 
          icon: getTabTypeIcon(WindowTabType.Arc),
          iconFontClass: 'fas',
          label: localize('contextMenus.campaignFolder.createArc'), 
          onClick: async () => {
            const arc = await campaignDirectoryStore.createArc(props.campaignNode.id);

            if (arc) {
              await navigationStore.openArc(arc.uuid, { newTab: true, activate: true, }); 
            }
          }
        },
        { 
          icon: getTabTypeIcon(WindowTabType.Arc),
          iconFontClass: 'fas',
          label: localize('contextMenus.campaignFolder.manageArcs'), 
          onClick: async () => {
            FCBDialog.arcManagerDialog(props.campaignNode.id);
          }
        },
        { 
          icon: 'fa-check-circle',
          iconFontClass: 'fas',
          label: props.campaignNode.completed ? localize('contextMenus.campaignFolder.markActive') : localize('contextMenus.campaignFolder.markComplete'),
          hidden: isInPlayMode.value,
          onClick: async () => {
            const campaign = await Campaign.fromUuid(props.campaignNode.id);
            if (campaign) {
              campaign.completed = !campaign.completed;
              await campaign.save();

              // Update the local node's completed status
              props.campaignNode.completed = campaign.completed;
              // Refresh the campaign directory to show the updated status
              await campaignDirectoryStore.refreshCampaignDirectoryTree();
            }
          }
        },
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.campaignFolder.delete'), 
          disabled: isInPlayMode.value,
          onClick: async () => {
            await campaignDirectoryStore.deleteCampaign(props.campaignNode.id);
          }
        },
      ]
    });
  };


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
</style>