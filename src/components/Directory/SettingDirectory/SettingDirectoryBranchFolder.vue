<!--
SettingDirectoryBranchFolder: Setting Directory Branch Folder

Purpose
- Displays a virtual "Branches" folder containing branch entries

Responsibilities
- Show expandable folder with branch icon
- Display branch entries as children
- Handle expansion/collapse state

Props
- node: DirectoryBranchFolderNode, the folder node to display
- settingId: string, the setting UUID
- topic: ValidTopic, the topic (Organization)

Emits
- None

Slots
- None

Dependencies
- Stores: settingDirectoryStore, mainStore, navigationStore

-->

<template>
  <li class="fcb-branch-folder">
    <div 
      class="details"
      :open="expanded"
    >
      <div class="summary">      
        <div 
          class="fcb-directory-expand-button"
          data-testid="branch-folder-expand-button"
          @click="onToggleClick"
        >
          <span v-if="expanded">-</span><span v-else>+</span>
        </div>
        <div class="fcb-directory-entry fcb-branch-folder-name">
          <i class="fas fa-code-branch" />
          {{ localize('labels.branchesFolder') }}
        </div>
      </div>
      <ul v-if="expanded">
        <SettingDirectoryBranchNodeComponent 
          v-for="child in sortedChildren"
          :key="child.id"
          :node="child"
          :setting-id="props.settingId"
          :topic="props.topic"
        />
      </ul>
    </div>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { computed, PropType, ref, watch } from 'vue';

  // local imports
  import { useSettingDirectoryStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components

  // local components
  import SettingDirectoryBranchNodeComponent from './SettingDirectoryBranchNode.vue';
  
  // types
  import { ValidTopic } from '@/types';
  import { DirectoryBranchFolderNode, DirectoryBranchEntryNode } from '@/classes';

  ////////////////////////////////
  // props
  const props = defineProps({
    node: { 
      type: Object as PropType<DirectoryBranchFolderNode>,
      required: true,
    },
    settingId: {
      type: String,
      required: true
    },
    topic: {
      type: Number as PropType<ValidTopic>,
      required: true
    },
  });

  ////////////////////////////////
  // emits
  
  ////////////////////////////////
  // store
  const settingDirectoryStore = useSettingDirectoryStore();
  
  ////////////////////////////////
  // data
  const expanded = ref(props.node.expanded);
  const currentNode = ref<DirectoryBranchFolderNode>(props.node);
  
  ////////////////////////////////
  // computed data
  const sortedChildren = computed((): DirectoryBranchEntryNode[] => {
    const children = currentNode.value.loadedChildren;
    return children.sort((a, b) => a.name.localeCompare(b.name));
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onToggleClick = async (_event: MouseEvent) => {
    currentNode.value = await currentNode.value.toggleWithLoad(!expanded.value);
    await settingDirectoryStore.refreshSettingDirectoryTree([currentNode.value.id]);
  };

  ////////////////////////////////
  // watchers
  watch(()=> props.node, (newValue: DirectoryBranchFolderNode) => {
    currentNode.value = newValue;
    expanded.value = newValue.expanded;
  });

  ////////////////////////////////
  // lifecycle hooks
</script>

<style lang="scss" scoped>
.fcb-branch-folder {
  .fcb-branch-folder-name {
    font-style: italic;
    color: var(--color-text-secondary);
    
    i {
      margin-right: 0.5rem;
    }
  }
}
</style>
