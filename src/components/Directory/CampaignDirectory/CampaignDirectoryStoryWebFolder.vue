<template>
  <li
    :class="'fcb-topic-folder folder entry flexcol ' + (storyWebFolderNode.expanded ? '' : 'collapsed')"
    :data-arc="props.storyWebFolderNode.id" 
  >
    <header class="folder-header flexrow">
      <div
        class="noborder"
        style="margin-bottom:0px"
        @contextmenu="onFolderContextMenu"
        @click="onStoryWebFolderClick"
      >
        <i
          class="fas fa-folder-open fa-fw"
          style="margin-right: 4px;"
          data-testid="campaign-folder-toggle"
        ></i>
        <i :class="'icon fas ' + getTabTypeIcon(WindowTabType.StoryWeb)" style="margin-right: 4px;"></i>
        <span data-testid="story-web-folder">
          <span class="node-name">
            {{ localize('contentFolders.storyWebs') }}
          </span>
        </span>
      </div>
    </header>

    <!-- These are the story webs -->
    <ul 
      v-if="props.storyWebFolderNode.expanded"
      class="campaign-contents fcb-directory-tree"
    >
      <CampaignDirectoryStoryWebNode 
        v-for="node in sortedChildren"
        :key="node.id"
        :story-web-node="node as DirectoryStoryWebNode"
        :top="true"
        class="fcb-entry-item" 
        draggable="true"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType, computed } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useNavigationStore, useMainStore } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  
  // local components
  import CampaignDirectoryStoryWebNode from './CampaignDirectoryStoryWebNode.vue';
  
  // types
  import { DirectoryStoryWebFolder, DirectoryStoryWebNode, StoryWeb,  } from '@/classes';
  import { WindowTabType } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    storyWebFolderNode: {
      type: Object as PropType<DirectoryStoryWebFolder>,
      required: true,
    },
    campaignId: {
      type: String,
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
  const { isInPlayMode } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  // we don't just use props node because in toggleWithLoad we want to swap it out without rebuilding
  //   the whole tree
  const currentNode = ref<DirectoryStoryWebFolder>(props.storyWebFolderNode);
  
  ////////////////////////////////
  // computed data
  const sortedChildren = computed((): DirectoryStoryWebNode[] => {
    const children = props.storyWebFolderNode.loadedChildren;
    return children.sort((a, b) => a.name.localeCompare(b.name));
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

    // handle front dragging
  // TODO - probably need to put drag handlers back in too - see campaign
  // const onDragStart = (event: DragEvent): void => {
  //   event.stopPropagation();

  //   const dragData = {
  //     type: 'fcb-campaign',
  //     campaignId: props.campaignNode.id,
  //     name: props.campaignNode.name
  //   } as CampaignNodeDragData;

  //   event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  // };

  const onStoryWebFolderClick = async () => {
    await campaignDirectoryStore.toggleWithLoad(currentNode.value as DirectoryStoryWebFolder, !currentNode.value.expanded);
  };

  const onFolderContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: e.x,
      y: e.y,
      zIndex: 300,
      items: [
        { 
          icon: getTabTypeIcon(WindowTabType.StoryWeb),
          iconFontClass: 'fas',
          disabled: isInPlayMode.value,
          label: localize('contextMenus.campaignFolder.createStoryWeb'), 
          onClick: async () => {
            const storyWeb = await campaignDirectoryStore.createStoryWeb(props.campaignId);

            if (storyWeb) {
              await navigationStore.openStoryWeb(storyWeb.uuid, { newTab: true, activate: true, }); 
            }
          }
        },
      ]
    });
  };
</script>
