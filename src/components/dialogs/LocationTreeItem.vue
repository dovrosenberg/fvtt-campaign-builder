<!--
LocationTreeItem: Location Tree Item

Purpose
- Displays a single location node in a tree with a checkbox for selection

Responsibilities
- Show location name with checkbox
- Allow expansion/collapse of children
- Emit toggle events when checkbox is clicked
- Disable checkboxes for locations that already have branches

Props
- node: LocationNode, the location node to display
- selectedIds: Set<string>, set of selected location UUIDs
- disabledIds: Set<string>, set of location UUIDs that already have branches
- depth: number, nesting depth for indentation

Emits
- toggle: when checkbox is clicked, emits location UUID

Slots
- None

Dependencies
- PrimeVue Checkbox

-->

<template>
  <div class="location-tree-item">
    <div 
      class="location-row" 
      :style="{ paddingLeft: `${depth * 20}px` }"
    >
      <Checkbox
        :modelValue="isSelected"
        :binary="true"
        :disabled="isDisabled"
        @update:modelValue="onToggle"
        :pt="{
          root: { class: 'location-checkbox' },
          input: { class: 'location-checkbox-input' }
        }"
      />
      
      <span 
        v-if="hasChildren" 
        class="expand-icon"
        @click="toggleExpand"
      >
        <i :class="expanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" />
      </span>
      <span v-else class="expand-icon-placeholder" />
      
      <span class="location-name" :class="{ 'disabled': isDisabled }">{{ node.name }}</span>
      
      <span v-if="isDisabled" class="existing-branch-label">
        {{ localize('dialogs.createBranches.existingBranch') }}
      </span>
    </div>
    
    <div v-if="expanded && hasChildren" class="location-children">
      <LocationTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-ids="selectedIds"
        :disabled-ids="disabledIds"
        :depth="depth + 1"
        @toggle="onChildToggle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType } from 'vue';

  // library components
  import Checkbox from 'primevue/checkbox';

  // local imports
  import { localize } from '@/utils/game';

  // types
  interface LocationNode {
    id: string;
    name: string;
    children: LocationNode[];
  }

  ////////////////////////////////
  // props
  const props = defineProps({
    node: {
      type: Object as PropType<LocationNode>,
      required: true,
    },
    selectedIds: {
      type: Object as PropType<Set<string>>,
      required: true,
    },
    disabledIds: {
      type: Object as PropType<Set<string>>,
      default: () => new Set<string>(),
    },
    depth: {
      type: Number,
      default: 0,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'toggle', value: string): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const expanded = ref(false);

  ////////////////////////////////
  // computed data
  const isSelected = computed(() => props.selectedIds.has(props.node.id));

  const isDisabled = computed(() => props.disabledIds.has(props.node.id));
  
  const hasChildren = computed(() => props.node.children.length > 0);

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  function onToggle(): void {
    emit('toggle', props.node.id);
  }

  function onChildToggle(locationId: string): void {
    emit('toggle', locationId);
  }

  function toggleExpand(): void {
    expanded.value = !expanded.value;
  }

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle hooks
</script>

<style scoped lang="scss">
.location-tree-item {
  user-select: none;
}

.location-row {
  display: flex;
  align-items: center;
  padding: 4px 0;
  cursor: pointer;
  
  &:hover {
    background-color: var(--color-bg-hover);
  }
}

.location-checkbox {
  margin-right: 8px;
}

.expand-icon {
  width: 16px;
  margin-right: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
  
  &:hover {
    color: var(--color-text-primary);
  }
}

.expand-icon-placeholder {
  width: 16px;
  margin-right: 8px;
}

.location-name {
  flex: 1;
  
  &.disabled {
    color: var(--color-text-secondary);
    font-style: italic;
  }
}

.existing-branch-label {
  margin-left: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.85em;
}

.location-children {
  // Children are indented via the depth prop
}
</style>
