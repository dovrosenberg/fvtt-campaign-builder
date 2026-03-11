<!--
AssociationTagsDialog: Configure Actor and Scene Tag Associations

Purpose
- Provides a tabbed dialog for configuring tags that are associated with actors (for characters) and scenes (for locations).

Responsibilities
- Manage actor tag associations (name, color, linked actor)
- Manage scene tag associations (name, color, linked scene)
- Validate that tag names are unique across both lists
- Persist changes only when save button is clicked

Props
- None

Emits
- None

Slots
- None

Dependencies
- Stores: None
- Composables: None
- Services/API: ModuleSettings

-->

<template>
  <ConfigDialogLayout ref="contentRef">
    <template #header>
      <nav class="fcb-sheet-navigation flexrow tabs" data-group="assoc-tags-dialog">
        <a class="item" data-tab="characters">
          {{ localize('applications.associationTags.tabs.characters') }}
        </a>
        <a class="item" data-tab="locations">
          {{ localize('applications.associationTags.tabs.locations') }}
        </a>
      </nav>
    </template>

    <template #scrollSection>
      <div class="fcb-tab-body flexrow">
        <!-- Characters Tab (Actor Tags) -->
        <div class="tab flexcol" data-group="assoc-tags-dialog" data-tab="characters">
          <DataTable
            :value="workingActorTags"
            data-key="id"
            size="small"
            :pt="{
              header: { style: 'border: none' },
              table: { style: 'margin: 0px; table-layout: fixed;' },
              thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
              row: {
                style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;',
              },
            }"
          >
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 0.5rem;">
                  <Button
                    unstyled
                    :label="localize('labels.add')"
                    style="flex: initial; width:auto;"
                    @click="onAddActorTag"
                  >
                    <template #icon>
                      <i class="fas fa-plus"></i>
                    </template>
                  </Button>
                </div>
              </div>
            </template>

            <template #empty>
              {{ localize('labels.noResults') }}
            </template>

            <Column field="actions" :header="localize('labels.tableHeaders.actions')" style="width: 100px">
              <template #body="{ data }">
                <a
                  class="fcb-action-icon"
                  :data-tooltip="localize('labels.delete')"
                  @click.stop="onDeleteActorTag(data.id)"
                >
                  <i class="fas fa-trash"></i>
                </a>
              </template>
            </Column>

            <Column field="name" :header="localize('applications.associationTags.columns.name')" >
              <template #body="{ data }">
                <InputText v-model="data.name" unstyled style="width: 100%" @blur="onActorTagNameBlur(data)" />
              </template>
            </Column>

            <Column field="color" :header="localize('applications.associationTags.columns.color')" >
              <template #body="{ data }">
                <FoundryColorPicker v-model="data.color" />
              </template>
            </Column>

            <Column field="uuid" :header="localize('applications.associationTags.columns.actor')" >
              <template #body="{ data }">
                <Select
                  v-model="data.uuid"
                  :options="actorOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="localize('applications.associationTags.labels.noSelection')"
                  class="w-full"
                  @change="onActorSelect(data, $event)"
                />
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- Locations Tab (Scene Tags) -->
        <div class="tab flexcol" data-group="assoc-tags-dialog" data-tab="locations">
          <DataTable
            :value="workingSceneTags"
            data-key="id"
            size="small"
            :pt="{
              header: { style: 'border: none' },
              table: { style: 'margin: 0px; table-layout: fixed;' },
              thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
              row: {
                style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;',
              },
            }"
          >
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 0.5rem;">
                  <Button
                    unstyled
                    :label="localize('labels.add')"
                    style="flex: initial; width:auto;"
                    @click="onAddSceneTag"
                  >
                    <template #icon>
                      <i class="fas fa-plus"></i>
                    </template>
                  </Button>
                </div>
              </div>
            </template>

            <template #empty>
              {{ localize('labels.noResults') }}
            </template>

            <Column field="actions" :header="localize('labels.tableHeaders.actions')" style="width: 100px">
              <template #body="{ data }">
                <a
                  class="fcb-action-icon"
                  :data-tooltip="localize('labels.delete')"
                  @click.stop="onDeleteSceneTag(data.id)"
                >
                  <i class="fas fa-trash"></i>
                </a>
              </template>
            </Column>

            <Column field="name" :header="localize('applications.associationTags.columns.name')" >
              <template #body="{ data }">
                <InputText v-model="data.name" unstyled style="width: 100%" @blur="onSceneTagNameBlur(data)" />
              </template>
            </Column>

            <Column field="color" :header="localize('applications.associationTags.columns.color')" >
              <template #body="{ data }">
                <FoundryColorPicker v-model="data.color" />
              </template>
            </Column>

            <Column field="uuid" :header="localize('applications.associationTags.columns.scene')" >
              <template #body="{ data }">
                <Select
                  v-model="data.uuid"
                  :options="sceneOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="localize('applications.associationTags.labels.noSelection')"
                  class="w-full"
                  @change="onSceneSelect(data, $event)"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </div>
    </template>

    <template #footer>
      <button @click="onResetClick">
        <i class="fa-solid fa-undo"></i>
        <label>{{ localize('labels.reset') }}</label>
      </button>
      <button class="fcb-save-button" @click="onSaveClick">
        <i class="fa-solid fa-save"></i>
        <label>{{ localize('labels.saveChanges') }}</label>
      </button>
    </template>
  </ConfigDialogLayout>
</template>

<script setup lang="ts">
  // library imports
  import { onMounted, ref, nextTick } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { associationTagsApp } from '@/applications/settings/AssociationTagsApplication';
  import { FoundryTag } from '@/types';
  import { notifyError, notifyInfo, notifyWarn } from '@/utils/notifications';

  // library components
  import { Button, InputText, DataTable, Column, Select } from 'primevue';

  // local components
  import FoundryColorPicker from './FoundryColorPicker.vue';
  import ConfigDialogLayout from '@/components/layout/ConfigDialogLayout.vue';

  // types
  interface WorkingFoundryTag extends FoundryTag {
    foundryName?: string;  // display name for the associated actor/scene
  }

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const contentRef = ref<{ rootEl: HTMLElement | null } | null>(null);
  let tabs: foundry.applications.ux.Tabs | null = null;

  // Working copies that only persist when save is clicked
  const workingActorTags = ref<WorkingFoundryTag[]>([]);
  const workingSceneTags = ref<WorkingFoundryTag[]>([]);

  // Original values for reset functionality
  const originalActorTags = ref<WorkingFoundryTag[]>([]);
  const originalSceneTags = ref<WorkingFoundryTag[]>([]);

  // Options for Select components
  const actorOptions = ref<{ value: string; label: string }[]>([]);
  const sceneOptions = ref<{ value: string; label: string }[]>([]);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  /**
   * Load the name for an actor or scene from its UUID
   */
  const loadFoundryName = async (uuid: string): Promise<string | undefined> => {
    if (!uuid)
      return undefined;
    
    const doc = await foundry.utils.fromUuid(uuid);
    return doc?.name || undefined;
  };

  /**
   * Load actor and scene options from Foundry for Select components
   */
  const loadFoundryOptions = () => {
    // Load actors
    actorOptions.value = [
      { value: '', label: localize('applications.associationTags.labels.noSelection') },
      ...game.actors.map(a => ({ value: a.uuid, label: a.name })),
    ];

    // Load scenes
    sceneOptions.value = [
      { value: '', label: localize('applications.associationTags.labels.noSelection') },
      ...game.scenes.map(s => ({ value: s.uuid, label: s.name })),
    ];
  };

  /**
   * Load settings from module storage and initialize working copies
   */
  const loadSettings = async () => {
    const persistedActorTags = ModuleSettings.get(SettingKey.actorTags) as FoundryTag[];
    const persistedSceneTags = ModuleSettings.get(SettingKey.sceneTags) as FoundryTag[];
    
    // Load actor tags with names
    originalActorTags.value = await Promise.all(
      persistedActorTags.map(async (t) => ({
        ...t,
        foundryName: await loadFoundryName(t.uuid),
      }))
    );
    
    // Load scene tags with names
    originalSceneTags.value = await Promise.all(
      persistedSceneTags.map(async (t) => ({
        ...t,
        foundryName: await loadFoundryName(t.uuid),
      }))
    );
    
    // Initialize working copies
    workingActorTags.value = JSON.parse(JSON.stringify(originalActorTags.value));
    workingSceneTags.value = JSON.parse(JSON.stringify(originalSceneTags.value));
  };

  /**
   * Check if a tag name exists in the other list (cross-list validation)
   */
  const isNameDuplicate = (name: string, currentList: 'actor' | 'scene', excludeId?: string): boolean => {
    const normalizedName = name.toLowerCase().trim();
    
    if (currentList === 'actor') {
      return workingSceneTags.value.some(t => t.name.toLowerCase().trim() === normalizedName && t.id !== excludeId);
    }
    else {
      return workingActorTags.value.some(t => t.name.toLowerCase().trim() === normalizedName && t.id !== excludeId);
    }
  };

  /**
   * Reset working copies to their original saved values
   */
  const onResetClick = () => {
    workingActorTags.value = JSON.parse(JSON.stringify(originalActorTags.value));
    workingSceneTags.value = JSON.parse(JSON.stringify(originalSceneTags.value));
  };

  ////////////////////////////////
  // event handlers
  /**
   * Validate and save the current working copies to module storage
   */
  const onSaveClick = async () => {
    // Validate unique tag names within each list
    const actorNames = new Set(workingActorTags.value.map(t => t.name.toLowerCase().trim()));
    const sceneNames = new Set(workingSceneTags.value.map(t => t.name.toLowerCase().trim()));
    
    if (actorNames.size !== workingActorTags.value.length) {
      notifyError(localize('applications.associationTags.notifications.duplicateActorNames'));
      return;
    }
    
    if (sceneNames.size !== workingSceneTags.value.length) {
      notifyError(localize('applications.associationTags.notifications.duplicateSceneNames'));
      return;
    }
    
    // Check for cross-list duplicates
    for (const actorTag of workingActorTags.value) {
      if (isNameDuplicate(actorTag.name, 'actor', actorTag.id)) {
        notifyError(localize('applications.associationTags.notifications.duplicateName', { name: actorTag.name }));
        return;
      }
    }
    
    for (const sceneTag of workingSceneTags.value) {
      if (isNameDuplicate(sceneTag.name, 'scene', sceneTag.id)) {
        notifyError(localize('applications.associationTags.notifications.duplicateName', { name: sceneTag.name }));
        return;
      }
    }
    
    // Save to settings (without the transient name fields)
    const persistedActorTags: FoundryTag[] = workingActorTags.value.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      uuid: t.uuid,
    }));
    
    const persistedSceneTags: FoundryTag[] = workingSceneTags.value.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      uuid: t.uuid,
    }));
    
    await ModuleSettings.set(SettingKey.actorTags, persistedActorTags);
    await ModuleSettings.set(SettingKey.sceneTags, persistedSceneTags);
    
    // Update original values
    originalActorTags.value = JSON.parse(JSON.stringify(workingActorTags.value));
    originalSceneTags.value = JSON.parse(JSON.stringify(workingSceneTags.value));
    
    notifyInfo(localize('notifications.changesSaved'));
    
    // Close the dialog
    await associationTagsApp?.close();
  };

  /**
   * Add a new actor tag to the working list
   */
  const onAddActorTag = () => {
    const newTag: WorkingFoundryTag = {
      id: foundry.utils.randomID(),
      name: '',
      color: '#000000',
      uuid: '',
      foundryName: undefined,
    };
    workingActorTags.value.push(newTag);
  };

  /**
   * Delete an actor tag from the working list
   */
  const onDeleteActorTag = (id: string) => {
    workingActorTags.value = workingActorTags.value.filter(t => t.id !== id);
  };

  /**
   * Validate actor tag name on blur
   */
  const onActorTagNameBlur = (tag: WorkingFoundryTag) => {
    if (tag.name && isNameDuplicate(tag.name, 'actor', tag.id)) {
      notifyWarn(localize('applications.associationTags.notifications.duplicateName', { name: tag.name }));
    }
  };

  /**
   * Add a new scene tag to the working list
   */
  const onAddSceneTag = () => {
    const newTag: WorkingFoundryTag = {
      id: foundry.utils.randomID(),
      name: '',
      color: '#000000',
      uuid: '',
      foundryName: undefined,
    };
    workingSceneTags.value.push(newTag);
  };

  /**
   * Delete a scene tag from the working list
   */
  const onDeleteSceneTag = (id: string) => {
    workingSceneTags.value = workingSceneTags.value.filter(t => t.id !== id);
  };

  /**
   * Validate scene tag name on blur
   */
  const onSceneTagNameBlur = (tag: WorkingFoundryTag) => {
    if (tag.name && isNameDuplicate(tag.name, 'scene', tag.id)) {
      notifyWarn(localize('applications.associationTags.notifications.duplicateName', { name: tag.name }));
    }
  };

  /**
   * Handle actor selection change
   */
  const onActorSelect = async (tag: WorkingFoundryTag, event: { value: string }) => {
    tag.uuid = event.value;
    tag.foundryName = await loadFoundryName(event.value);
  };

  /**
   * Handle scene selection change
   */
  const onSceneSelect = async (tag: WorkingFoundryTag, event: { value: string }) => {
    tag.uuid = event.value;
    tag.foundryName = await loadFoundryName(event.value);
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle hooks
  onMounted(async () => {
    loadFoundryOptions();
    await loadSettings();
    
    // Initialize Foundry tabs
    nextTick(() => {
      const el = contentRef.value?.rootEl;
      
      if (el) {
        tabs = new foundry.applications.ux.Tabs({ 
          group: 'assoc-tags-dialog', 
          navSelector: '.tabs', 
          contentSelector: '.fcb-tab-body', 
          initial: 'characters',
          callback: () => {
            // No callback needed for now
          }
        });
        tabs.bind(el);
      }
    });
  });
</script>

<style lang="scss" scoped>
  .tab {
    display: none;
    height: 100%;
    flex-direction: column;
    min-height: 0;
  }

  .tab.active {
    display: flex;
  }

  .fcb-tab-body {
    display: flex;
    height: 100%;
  }

  .fcb-action-icon {
    cursor: pointer;
    color: var(--color-text-light-primary);
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--color-bg-highlight);
    }
  }

  .w-full {
    width: 100%;
  }
</style>
