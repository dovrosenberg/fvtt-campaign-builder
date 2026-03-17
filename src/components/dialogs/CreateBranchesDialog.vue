<!--
CreateBranchesDialog: Create Branches Dialog

Purpose
- Displays a dialog for selecting locations to create branches for an organization

Responsibilities
- Show a tree of locations with checkboxes for selection
- Allow user to select multiple locations (no auto-select children)
- Create branch entries for selected locations on confirm
- Refresh directory tree after creation

Props
- modelValue: boolean, dialog visibility
- organizationId: string, UUID of the parent organization

Emits
- update:modelValue: when dialog visibility changes
- confirm: when confirmed, emits array of created branch entries

Slots
- None

Dependencies
- PrimeVue Checkbox, Tree
- Stores: mainStore, settingDirectoryStore

-->

<template>
  <Teleport to="body">
    <Dialog
      v-model="show"
      :title="title"
      :buttons="buttons"
      @cancel="onCancel"
    >
      <div class="create-branches-dialog">
        <p class="dialog-message">{{ message }}</p>
        
        <div class="location-tree-container">
          <div v-if="loading" class="loading-message">
            {{ localize('dialogs.createBranches.loading') }}
          </div>
          <div v-else-if="locationNodes.length === 0" class="empty-message">
            {{ localize('dialogs.createBranches.noLocations') }}
          </div>
          <div v-else class="location-tree">
            <LocationTreeItem
              v-for="node in locationNodes"
              :key="node.id"
              :node="node"
              :selected-ids="selectedLocationIds"
              :disabled-ids="existingBranchIds"
              @toggle="toggleSelection"
            />
          </div>
        </div>
        
        <div v-if="selectedCount > 0" class="selection-summary">
          {{ localize('dialogs.createBranches.selectedCount', { count: String(selectedCount) }) }}
        </div>
      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, computed, toRaw } from 'vue';

  // local imports
  import Dialog from './Dialog.vue';
  import LocationTreeItem from './LocationTreeItem.vue';
  import { useMainStore, useSettingDirectoryStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { Topics, Hierarchy } from '@/types';
  import { Entry } from '@/classes';
  import { searchService } from '@/utils/search';

  // types
  interface LocationNode {
    id: string;
    name: string;
    children: LocationNode[];
    existingBranch: boolean;
  }

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: {
      type: Boolean,
      required: true,
    },
    organizationId: {
      type: String,
      required: true,
    },
    });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'confirm', value: Entry[]): void;
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const settingDirectoryStore = useSettingDirectoryStore();

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const selectedLocationIds = ref<Set<string>>(new Set());
  const locationNodes = ref<LocationNode[]>([]);
  const loading = ref(false);
  const organizationName = ref<string>('');
  const existingBranchIds = ref<Set<string>>(new Set());

  ////////////////////////////////
  // computed data
  const title = computed(() => localize('dialogs.createBranches.title'));
  
  const message = computed(() => 
    localize('dialogs.createBranches.message', { organization: organizationName.value })
  );
  
  const selectedCount = computed(() => selectedLocationIds.value.size);
  
  const buttons = computed(() => [
    {
      label: localize('labels.cancel'),
      close: true,
      callback: () => onCancel(),
    },
    {
      label: localize('labels.ok'),
      close: true,
      default: true,
      disabled: selectedCount.value === 0,
      callback: () => onConfirm(),
    },
  ]);

  ////////////////////////////////
  // methods
  /**
   * Creates branch entries for the selected locations.
   * Each branch is an organization entry with isBranch=true and a locationParentId.
   * 
   * @returns Array of created branch entries
   */
  async function createBranches(): Promise<Entry[]> {
    const setting = mainStore.currentSetting;
    if (!setting) {
      return [];
    }

    // Get the organization
    const organization = await Entry.fromUuid(props.organizationId);
    if (!organization) {
      return [];
    }

    // Get the organization topic folder
    const topicFolder = setting.topicFolders[Topics.Organization];
    if (!topicFolder) {
      return [];
    }

    const createdBranches: Entry[] = [];
    const locationIds = Array.from(selectedLocationIds.value);

    // Collect all hierarchy updates to batch them - use Map to avoid duplicates
    const hierarchyUpdates = new Map<string, Hierarchy>();

    for (const locationId of locationIds) {
      // Get the location for naming
      const location = await Entry.fromUuid(locationId);
      if (!location) {
        console.warn(`Location not found: ${locationId}, skipping branch`);
        continue;
      }

      // Generate branch name: "Org Name (Location Name)"
      const branchName = `${organization.name} (${location.name})`;

      // Create the branch entry - pass parentId to prevent adding to topNodes
      const branch = await Entry.create(topicFolder, { name: branchName, type: organization.type, parentId: props.organizationId });
      
      if (!branch) {
        console.warn(`Failed to create branch for location: ${locationId}`);
        continue;
      }

      // Mark as branch
      branch.isBranch = true;
      
      // Save the branch to set the isBranch flag
      await branch.save();

      // Create hierarchy for the branch (don't save yet - batch it)
      const branchHierarchy: Hierarchy = {
        parentId: props.organizationId,
        locationParentId: locationId,
        ancestors: [props.organizationId],
        children: [],
        childBranches: [],
        type: organization.type,
      };
      
      hierarchyUpdates.set(branch.uuid, branchHierarchy);

      // Add branch to organization's childBranches (don't save yet - batch it)
      const orgHierarchy = setting.getEntryHierarchy(props.organizationId);
      if (orgHierarchy) {
        orgHierarchy.childBranches = [...(orgHierarchy.childBranches || []), branch.uuid];
        hierarchyUpdates.set(props.organizationId, orgHierarchy);
      }

      // Add branch to location's childBranches (don't save yet - batch it)
      const locHierarchy = setting.getEntryHierarchy(locationId);
      if (locHierarchy) {
        locHierarchy.childBranches = [...(locHierarchy.childBranches || []), branch.uuid];
        hierarchyUpdates.set(locationId, locHierarchy);
      }

      // Add to search index
      try {
        await searchService.addOrUpdateEntryIndex(branch, setting);
      }
      catch (error) {
        console.error('Failed to add branch to search index:', error);
      }

      createdBranches.push(branch);
    }

    // Apply all hierarchy updates in batch
    for (const [entryId, hierarchy] of hierarchyUpdates) {
      setting.hierarchies[entryId] = hierarchy;
    }

    // Save the setting once with all updates
    await setting.save();

    return createdBranches;
  }

  /**
   * Builds a tree of location nodes from the setting's location hierarchy.
   * Marks locations that already have branches for this organization.
   * 
   * @returns Object with nodes array and set of location IDs that already have branches
   */
  async function buildLocationTree(): Promise<{ nodes: LocationNode[]; existingBranchIds: Set<string> }> {
    const setting = mainStore.currentSetting;
    if (!setting)
      return { nodes: [], existingBranchIds: new Set() };

    const locationFolder = setting.topicFolders[Topics.Location];
    if (!locationFolder)
      return { nodes: [], existingBranchIds: new Set() };

    const hierarchies = setting.hierarchies;
    const nodes: LocationNode[] = [];

    // Get existing branch location IDs from organization's childBranches
    const orgHierarchy = hierarchies[props.organizationId];
    const existingBranchIds = new Set<string>();
    
    if (orgHierarchy?.childBranches) {
      for (const branchId of orgHierarchy.childBranches) {
        const branchHierarchy = hierarchies[branchId];
        if (branchHierarchy?.locationParentId) {
          existingBranchIds.add(branchHierarchy.locationParentId);
        }
      }
    }

    // Build nodes for all locations
    const nodeMap = new Map<string, LocationNode>();
    for (const entry of locationFolder.entryIndex) {
      nodeMap.set(entry.uuid, {
        id: entry.uuid,
        name: entry.name,
        children: [],
        existingBranch: existingBranchIds.has(entry.uuid),
      });
    }

    // Connect children to parents
    for (const entry of locationFolder.entryIndex) {
      const node = nodeMap.get(entry.uuid);
      const hierarchy = hierarchies[entry.uuid];
      
      if (!node)
        continue;

      if (hierarchy?.parentId && nodeMap.has(hierarchy.parentId)) {
        const parentNode = nodeMap.get(hierarchy.parentId)!;
        parentNode.children.push(node);
      }
    }

    // Return only top-level nodes (no parent)
    for (const entry of locationFolder.entryIndex) {
      const hierarchy = hierarchies[entry.uuid];
      if (!hierarchy?.parentId) {
        const node = nodeMap.get(entry.uuid);
        if (node)
          nodes.push(node);
      }
    }

    // Sort by name and return
    return { nodes: sortNodes(nodes), existingBranchIds };
  }

  /**
   * Recursively sorts location nodes and their children by name.
   */
  function sortNodes(nodes: LocationNode[]): LocationNode[] {
    return nodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(node => ({
        ...node,
        children: sortNodes(node.children),
      }));
  }

  ////////////////////////////////
  // event handlers
  function toggleSelection(locationId: string): void {
    if (selectedLocationIds.value.has(locationId)) {
      selectedLocationIds.value.delete(locationId);
    } else {
      selectedLocationIds.value.add(locationId);
    }
    // Force reactivity update
    selectedLocationIds.value = new Set(selectedLocationIds.value);
  }

  async function onConfirm(): Promise<void> {
    // Create the branches
    const branches = await createBranches();

    // Force reload of organization and location nodes so they get updated childBranches
    // This ensures the branch folder appears with the new branches
    const locationIds = Array.from(selectedLocationIds.value);
    await settingDirectoryStore.refreshSettingDirectoryTree([props.organizationId, ...locationIds]);

    emit('confirm', branches);
    emit('update:modelValue', false);
  }

  function onCancel(): void {
    emit('confirm', []);
    emit('update:modelValue', false);
  }

  ////////////////////////////////
  // watchers
  watch(() => props.modelValue, async (newValue) => {
    show.value = newValue;
    if (newValue) {
      // Reset selection and load locations
      selectedLocationIds.value = new Set();
      loading.value = true;
      
      // Fetch organization name
      const organization = await Entry.fromUuid(props.organizationId);
      organizationName.value = organization?.name ?? '';
      
      const result = await buildLocationTree();
      locationNodes.value = result.nodes;
      existingBranchIds.value = result.existingBranchIds;
      loading.value = false;
    }
  }, { immediate: true });

  watch(show, (newValue) => {
    emit('update:modelValue', newValue);
  });
</script>

<style scoped lang="scss">
.create-branches-dialog {
  min-width: 400px;
  max-width: 600px;
}

.dialog-message {
  margin-bottom: 1rem;
}

.location-tree-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--color-border-light);
  border-radius: 4px;
  padding: 0.5rem;
}

.loading-message,
.empty-message {
  padding: 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.location-tree {
  display: flex;
  flex-direction: column;
}

.selection-summary {
  margin-top: 1rem;
  font-weight: bold;
}
</style>
