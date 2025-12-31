<template>
  <ConfigDialogLayout ref="contentRef">
    <template #header>
      <div class="standard-form" style="padding: 0.5rem 0;">
        <div class="flexrow" style="font-size: var(--font-size-16);">
          <label style="flex: 0 1 auto; padding-right: 20px;">{{ localize('applications.customFields.labels.contentType') }}</label>
          <div>
            <Select
              v-model="selectedType"
              :options="typeOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="localize('applications.customFields.labels.selectType')"
              :pt="{
                root: {
                  style: 'width: 200px',
                },
              }"
            />
          </div>
        </div>
      </div>
      
          <nav class="fcb-sheet-navigation flexrow tabs" data-group="custom-fields-dialog">
            <a class="item" data-tab="fields">{{ localize('applications.customFields.tabs.fields') }}</a>
            <a v-if="backendAvailable" class="item" data-tab="images">{{ localize('applications.customFields.tabs.images') }}</a>
          </nav>
    </template>

    <template #scrollSection>
      <div class="fcb-tab-body flexrow">
        <!-- Fields Tab -->
        <div class="tab flexcol" data-group="custom-fields-dialog" data-tab="fields">
          <DataTable
            v-if="selectedType !== null"
            :value="visibleRows"
            data-key="uuid"
            size="small"
            scrollable
            scroll-height="flex"
            :pt="{
              header: { style: 'border: none' },
              table: { style: 'margin: 0px; table-layout: fixed;' },
              thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
              row: {
                style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;',
              },
            }"
            @row-reorder="onRowReorder"
          >
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 0.5rem;">
                  <Button
                    unstyled
                    :label="localize('labels.add')"
                    style="flex: initial; width:auto;"
                    @click="onAddField"
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

            <Column :rowReorder="true" headerStyle="width: 3rem" :reorderableColumn="false" />

            <Column field="actions" :header="localize('labels.tableHeaders.actions')" style="width: 4rem">
              <template #body="{ data }">
                <a
                  v-if="backendAvailable && data.fieldType === FieldType.Editor"
                  class="fcb-action-icon"
                  :data-tooltip="localize('applications.customFields.labels.aiTemplate')"
                  @click.stop="onOpenAiTemplateDialog(data)"
                >
                  <i class="fas fa-head-side-virus"></i>
                </a>
                <a
                  class="fcb-action-icon"
                  :data-tooltip="localize('applications.customFields.labels.delete')"
                  @click.stop="onDeleteField(data.uuid)"
                >
                  <i class="fas fa-trash"></i>
                </a>
              </template>
            </Column>

            <Column field="label" :header="localize('applications.customFields.columns.label')" style="width: 18%">
              <template #body="{ data }">
                <InputText v-model="data.label" unstyled style="width: 100%" />
              </template>
            </Column>

            <Column field="fieldType" :header="localize('labels.fields.type')" style="width: 15%">
              <template #body="{ data }">
                <Select
                  v-model="data.fieldType"
                  :options="fieldTypeOptions"
                  optionLabel="label"
                  optionValue="value"
                  @update:model-value="() => onFieldTypeChanged(data)"
                />
              </template>
            </Column>

            <Column field="options" :header="localize('applications.customFields.columns.selectOptions')" style="width: 25%">
              <template #body="{ data }">
                <InputText
                  v-model="data.optionsText"
                  unstyled
                  style="width: 100%"
                  :disabled="data.fieldType !== FieldType.Select"
                  :placeholder="data.fieldType === FieldType.Select ? localize('applications.customFields.labels.selectOptionsPlaceholder') : ''"
                />
              </template>
            </Column>

            <Column v-if="showIndexedColumn" field="indexed" header="Search?" style="width: 7%">
              <template #body="{ data }">
                <Checkbox
                  v-model="data.indexed"
                  binary
                  :disabled="data.fieldType === FieldType.Boolean"
                  @update:model-value="onIndexedCheckboxChange"
                />
              </template>
            </Column>

            <Column field="editorHeight" header="Height" style="width: 8%">
              <template #body="{ data }">
                <InputNumber
                  v-model="data.editorHeight"
                  unstyled
                  fluid
                  :min="1"
                  :max="MAX_EDITOR_SIZE"
                  :max-fraction-digits="1"
                  :disabled="data.fieldType !== FieldType.Editor"
                />
              </template>
            </Column>

            <Column field="help" :header="localize('applications.customFields.columns.helpText')" style="width: 18%">
              <template #body="{ data }">
                <InputText v-model="data.helpText" unstyled style="width: 100%" />
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- Images Tab -->
        <div v-if="backendAvailable" class="tab flexcol" data-group="custom-fields-dialog" data-tab="images">
          <div class="scrollable-content">
            <div class="standard-form" style="padding-right: 1rem;">
              <div class="form-group" style="padding-top: .75rem">
                <p class="hint">{{ localize('applications.customFields.images.promptHint') }}</p>
              </div>
              <div class="form-group">
                <label>{{ localize('applications.customFields.images.labels.fieldToken') }}</label>
                <div class="form-fields" style="display: flex; gap: 0.5rem; align-items: center;">
                  <Select
                    v-model="selectedAiImageTokenKey"
                    :options="aiImageTokenOptions"
                    optionLabel="label"
                    optionValue="value"
                    :placeholder="localize('applications.customFields.images.labels.selectField')"
                    style="flex: 1; min-width: 0;"
                  />
                  <button type="button" @click="onInsertAiImageTokenClick" :disabled="!selectedAiImageTokenKey">
                    <i class="fas fa-plus"></i>
                    <label>{{ localize('applications.customFields.images.labels.insert') }}</label>
                  </button>
                </div>
              </div>

              <div class="form-group stacked">
                <label>{{ localize('applications.customFields.images.labels.prompt') }}</label>
                <div class="form-fields">
                  <textarea
                    ref="aiImagePromptRef"
                    v-model="aiImagePrompt"
                    rows="4"
                    style="width: 100%;"
                  />
                </div>
              </div>

              <div v-if="aiImagePromptValidationError" class="form-group">
                <p class="hint" style="color: red;">
                  {{ aiImagePromptValidationError }}
                </p>
              </div>

              <div class="form-group stacked">
                <label>{{ localize('applications.customFields.images.labels.descriptionField') }}</label>
                <div class="form-fields">
                  <Select
                    v-model="selectedDescriptionField"
                    :options="descriptionFieldOptions"
                    optionLabel="label"
                    optionValue="value"
                    style="width: 100%;"
                  />
                </div>
              </div>


              <div class="form-group stacked">
                <label>{{ localize('applications.customFields.images.labels.imageConfiguration') }}</label>
                <div class="form-fields" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; align-items: center; width: 100%; box-sizing: border-box; padding-right: 1rem;">
                  <div style="display: contents;">
                    <label style="grid-column: 1;">{{ localize('applications.customFields.images.labels.artStyle') }}</label>
                    <InputText v-model="aiImageConfig.artStyle" unstyled style="grid-column: 2; width: 100%;" :placeholder="localize('applications.customFields.images.labels.artStylePlaceholder')" />
                  </div>

                  <div style="display: contents;">
                    <label style="grid-column: 1;">{{ localize('applications.customFields.images.labels.medium') }}</label>
                    <InputText v-model="aiImageConfig.medium" unstyled style="grid-column: 2; width: 100%;" :placeholder="localize('applications.customFields.images.labels.mediumPlaceholder')" />
                  </div>

                  <div style="display: contents;">
                    <label style="grid-column: 1;">{{ localize('applications.customFields.images.labels.modelStyle') }}</label>
                    <InputText v-model="aiImageConfig.modelStyle" unstyled style="grid-column: 2; width: 100%;" :placeholder="localize('applications.customFields.images.labels.modelStylePlaceholder')" />
                  </div>

                  <div style="display: contents;">
                    <label style="grid-column: 1;">{{ localize('applications.customFields.images.labels.contentRating') }}</label>
                    <InputText v-model="aiImageConfig.contentRating" unstyled style="grid-column: 2; width: 100%;" :placeholder="localize('applications.customFields.images.labels.contentRatingPlaceholder')" />
                  </div>

                  <div style="display: contents;">
                    <label style="grid-column: 1;">{{ localize('applications.customFields.images.labels.composition') }}</label>
                    <InputText v-model="aiImageConfig.composition" unstyled style="grid-column: 2; width: 100%;" :placeholder="localize('applications.customFields.images.labels.compositionPlaceholder')" />
                  </div>

                  <div style="display: contents;">
                    <label style="grid-column: 1;">{{ localize('applications.customFields.images.labels.lighting') }}</label>
                    <InputText v-model="aiImageConfig.lighting" unstyled style="grid-column: 2; width: 100%;" :placeholder="localize('applications.customFields.images.labels.lightingPlaceholder')" />
                  </div>

                  <div style="display: contents;">
                    <label style="grid-column: 1;">{{ localize('applications.customFields.images.labels.colorPalette') }}</label>
                    <InputText v-model="aiImageConfig.colorPalette" unstyled style="grid-column: 2; width: 100%;" :placeholder="localize('applications.customFields.images.labels.colorPalettePlaceholder')" />
                  </div>

                  <div style="display: contents;">
                    <label style="grid-column: 1;">{{ localize('applications.customFields.images.labels.camera') }}</label>
                    <InputText v-model="aiImageConfig.camera" unstyled style="grid-column: 2; width: 100%;" :placeholder="localize('applications.customFields.images.labels.cameraPlaceholder')" />
                  </div>

                  <div style="display: contents;">
                    <label style="grid-column: 1;">{{ localize('applications.customFields.images.labels.mood') }}</label>
                    <InputText v-model="aiImageConfig.mood" unstyled style="grid-column: 2; width: 100%;" :placeholder="localize('applications.customFields.images.labels.moodPlaceholder')" />
                  </div>

                  <div style="display: contents;">
                    <label style="grid-column: 1;">{{ localize('applications.customFields.images.labels.negativePrompt') }}</label>
                    <InputText v-model="aiImageConfig.negativePrompt" unstyled style="grid-column: 2; width: 100%;" :placeholder="localize('applications.customFields.images.labels.negativePromptPlaceholder')" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <footer class="form-footer" data-application-part="footer">
        <button @click="onResetClick">
          <i class="fa-solid fa-undo"></i>
          <label>{{ localize('labels.reset') }}</label>
        </button>
        <button class="fcb-save-button" @click="onSaveClick" :disabled="selectedType === null">
          <i class="fa-solid fa-save"></i>
          <label>{{ localize('labels.saveChanges') }}</label>
        </button>
      </footer>
    </template>
  </ConfigDialogLayout>

  <Dialog
    v-if="backendAvailable"
    v-model="showAiTemplateDialog"
    :title="localize('applications.customFields.aiDialog.title')"
    :width="720"
    :buttons="aiDialogButtons"
    @cancel="onAiTemplateDialogCancel"
  >
    <div class="standard-form">
      <div class="form-group">
        <label>{{ localize('applications.customFields.aiDialog.labels.enabled') }}</label>
        <div class="form-fields">
          <Checkbox v-model="aiDialogEnabled" binary />
        </div>
      </div>

      <div class="form-group stacked">
        <label>{{ localize('applications.customFields.aiDialog.labels.promptTemplate') }}</label>
        <p class="hint">{{ localize('applications.customFields.aiDialog.labels.fieldTokenHint') }}</p>
      </div>

      <div class="form-group">
        <label>{{ localize('applications.customFields.aiDialog.labels.fieldToken') }}</label>
        <div class="form-fields" style="display: flex; gap: 0.5rem; align-items: center;">
          <Select
            v-model="selectedAiTokenKey"
            :options="aiTokenOptions"
            optionLabel="label"
            optionValue="value"
            :placeholder="localize('applications.customFields.aiDialog.labels.selectField')"
            style="flex: 1; min-width: 0;"
          />
          <button type="button" @click="onInsertAiTokenClick" :disabled="!selectedAiTokenKey">
            <i class="fas fa-plus"></i>
            <label>{{ localize('applications.customFields.aiDialog.labels.insert') }}</label>
          </button>
        </div>
      </div>

      <div class="form-group stacked">
        <div class="form-fields">
          <textarea
            ref="aiPromptTextareaRef"
            v-model="aiDialogPromptTemplate"
            rows="8"
            style="width: 100%;"
          />
        </div>
        <p v-if="aiTemplateValidationError" class="hint" style="color: red; margin-top: 0.25rem;">
          {{ aiTemplateValidationError }}
        </p>
      </div>

      <div class="form-group stacked">
        <label>{{ localize('applications.customFields.aiDialog.labels.configuration') }}</label>
        <div class="form-fields" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; align-items: center;">
          <div style="display: contents;">
            <label style="grid-column: 1;">{{ localize('applications.customFields.aiDialog.labels.minWords') }}</label>
            <InputNumber v-model="aiDialogMinWords" :min="0" unstyled fluid style="grid-column: 2;" />
          </div>

          <div style="display: contents;">
            <label style="grid-column: 1;">{{ localize('applications.customFields.aiDialog.labels.maxWords') }}</label>
            <InputNumber v-model="aiDialogMaxWords" :min="0" unstyled fluid style="grid-column: 2;" />
          </div>

          <div style="display: contents;">
            <label style="grid-column: 1;">{{ localize('applications.customFields.aiDialog.labels.writingStyle') }}</label>
            <InputText v-model="aiDialogTone" unstyled style="grid-column: 2; width: 100%;" />
          </div>

          <div style="display: contents;">
            <label style="grid-column: 1;">{{ localize('applications.customFields.aiDialog.labels.tense') }}</label>
            <InputText v-model="aiDialogTense" unstyled style="grid-column: 2; width: 100%;" />
          </div>

          <div style="display: contents;">
            <label style="grid-column: 1;">{{ localize('applications.customFields.aiDialog.labels.pointOfView') }}</label>
            <InputText v-model="aiDialogPov" unstyled style="grid-column: 2; width: 100%;" />
          </div>

          <div style="display: contents;">
            <label style="grid-column: 1;">{{ localize('applications.customFields.aiDialog.labels.allowLists') }}</label>
            <Checkbox v-model="aiDialogIncludeBullets" binary style="grid-column: 2;" />
          </div>

          <div style="display: contents;">
            <label style="grid-column: 1;">{{ localize('applications.customFields.aiDialog.labels.avoidListsLongerThan') }}</label>
            <InputNumber v-model="aiDialogAvoidListsLongerThan" :min="0" unstyled fluid style="grid-column: 2;" />
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
  // library imports
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { useMainStore } from '@/applications/stores';
  import { useBackendStore } from '@/applications/stores';
  import { customFieldsApp } from '@/applications/settings/CustomFieldsApplication';
  import { searchService } from '@/utils/search';
  import { isCampaignBuilderAppOpen } from '@/utils/appWindow';
  import { makeCustomFieldKeyUnique } from '@/utils/customFields';
  import { generateIdFromName } from '@/utils/idGeneration';

  // library components
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import Button from 'primevue/button';
  import Select from 'primevue/select';
  import InputText from 'primevue/inputtext';
  import InputNumber from 'primevue/inputnumber';
  import Checkbox from 'primevue/checkbox';

  // local components
  import Dialog from '@/components/Dialog.vue';
  import ConfigDialogLayout from '@/components/layout/ConfigDialogLayout.vue';

  // local components

  // types
  import { CustomFieldContentType, CustomFieldDescription, FieldType } from '@/types';
  import type { ImageConfiguration } from '@/settings';

  type AiTokenOption = {
    label: string;
    value: string;
  };
  type AiConfiguration = {
    minWords: number;
    maxWords: number;
    tone: string;
    tense: string;
    pov: string;
    includeBullets: boolean;
    avoidListsLongerThan: number;
  };

  type Row = {
    uuid: string;
    name: string;
    label: string;
    fieldType: FieldType;
    optionsText: string;
    indexed: boolean;
    editorHeight: number | null;
    helpText?: string;
    helpLink?: string;
    aiEnabled: boolean;
    aiPromptTemplate: string;
    configuration: AiConfiguration | null;
    deleted?: boolean;
    sortOrder: number;
  };



  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  const mainStore = useMainStore();
  const { currentSetting } = storeToRefs(mainStore);

  const backendStore = useBackendStore();
  const { available: backendAvailable } = storeToRefs(backendStore);

  ////////////////////////////////
  // data

  const DEFAULT_EDITOR_SIZE = 10;
  const MAX_EDITOR_SIZE = 50;

  const DEFAULT_AI_CONFIGURATION = {
    minWords: 120,
    maxWords: 250,
    tone: 'evocative, practical, table-ready',
    tense: 'present',
    pov: 'third person',
    includeBullets: true,
    avoidListsLongerThan: 5,
  } as const;

  const selectedType = ref<CustomFieldContentType | null>(CustomFieldContentType.Arc);
  const contentRef = ref<{ rootEl: HTMLElement | null } | null>(null);
  let tabs: foundry.applications.ux.Tabs | null = null;

  const typeOptions = [
    { value: CustomFieldContentType.Arc, label: localize('labels.arc.arc') },
    { value: CustomFieldContentType.Campaign, label: localize('labels.campaign.campaign') },
    { value: CustomFieldContentType.Front, label: localize('labels.front.front') },
    { value: CustomFieldContentType.Session, label: localize('labels.session.session') },
    { value: CustomFieldContentType.Character, label: localize('labels.character.character') },
    { value: CustomFieldContentType.Location, label: localize('labels.location.location') },
    { value: CustomFieldContentType.Organization, label: localize('labels.organization.organization') },
    { value: CustomFieldContentType.PC, label: localize('labels.pc.pc') },
    { value: CustomFieldContentType.Setting, label: localize('labels.setting.setting') },
  ];

  const fieldTypeOptions = [
    { value: FieldType.Text, label: localize('applications.customFields.fieldTypes.input') },
    { value: FieldType.Select, label: localize('applications.customFields.fieldTypes.select') },
    { value: FieldType.Editor, label: localize('applications.customFields.fieldTypes.editor') },
    { value: FieldType.Boolean, label: localize('applications.customFields.fieldTypes.checkbox') },
  ];

  const allCustomFields = ref<Record<CustomFieldContentType, CustomFieldDescription[]>>({} as any);

  const workingRowsByType = ref<Partial<Record<CustomFieldContentType, Row[]>>>({});

  // Track whether any "Search?" checkbox was toggled; used to force a rebuild on save.
  const indexedToggled = ref<boolean>(false);

  // AI dialog
  const showAiTemplateDialog = ref<boolean>(false);
  const aiDialogTargetRow = ref<Row | null>(null);
  const aiDialogEnabled = ref<boolean>(false);
  const aiDialogPromptTemplate = ref<string>('');
  const aiDialogMinWords = ref<number>(DEFAULT_AI_CONFIGURATION.minWords);
  const aiDialogMaxWords = ref<number>(DEFAULT_AI_CONFIGURATION.maxWords);
  const aiDialogTone = ref<string>(DEFAULT_AI_CONFIGURATION.tone);
  const aiDialogTense = ref<string>(DEFAULT_AI_CONFIGURATION.tense);
  const aiDialogPov = ref<string>(DEFAULT_AI_CONFIGURATION.pov);
  const aiDialogIncludeBullets = ref<boolean>(DEFAULT_AI_CONFIGURATION.includeBullets);
  const aiDialogAvoidListsLongerThan = ref<number>(DEFAULT_AI_CONFIGURATION.avoidListsLongerThan);
  const selectedAiTokenKey = ref<string | null>(null);
  const aiPromptTextareaRef = ref<HTMLTextAreaElement | null>(null);

  // AI Image prompts
  const aiImagePromptRef = ref<HTMLTextAreaElement | null>(null);
  const aiImagePrompt = ref<string>('');
  const selectedAiImageTokenKey = ref<string | null>(null);
  const aiImagePrompts = ref<Record<CustomFieldContentType, string>>({} as any);
  const selectedDescriptionField = ref<string>('description');
  
  // AI Image configuration
  const aiImageConfig = ref<Partial<ImageConfiguration>>({});
  const aiImageConfigurations = ref<Record<CustomFieldContentType, ImageConfiguration>>({} as any);
  
  // Default image configuration
  const DEFAULT_IMAGE_CONFIGURATION: ImageConfiguration = {
    contentRating: 'PG-13',
  };


  ////////////////////////////////
  // computed data


  /**
   * Returns the visible rows for the currently selected type.
   *
   * The table renders only non-deleted rows, but we keep deleted rows in the working copy for persistence.
   */
  const visibleRows = computed<Row[]>(() => {
    if (selectedType.value === null) return [];

    // The table renders only non-deleted rows, but we keep deleted rows in the working copy for persistence.
    return (workingRowsByType.value[selectedType.value] || []).filter((r) => !r.deleted);
  });

  /**
   * Returns whether the "Search?" column should be shown for the currently selected type.
   *
   * Only these content types participate in search indexing.
   */
  const showIndexedColumn = computed<boolean>(() => {
    // Only these content types participate in search indexing.
    const t = selectedType.value;
    return t === CustomFieldContentType.Arc
      || t === CustomFieldContentType.Front
      || t === CustomFieldContentType.Session
      || t === CustomFieldContentType.Character
      || t === CustomFieldContentType.Location
      || t === CustomFieldContentType.Organization
      || t === CustomFieldContentType.PC;
  });

  type BuiltInAiToken = {
    key: string;
    labelKey: string;
  };

  const builtInAiTokensByType: Partial<Record<CustomFieldContentType, BuiltInAiToken[]>> = {
    [CustomFieldContentType.Session]: [
      { key: 'name', labelKey: 'labels.fields.name' },
      { key: 'notes', labelKey: 'labels.fields.notes' },
    ],
    [CustomFieldContentType.Character]: [
      { key: 'name', labelKey: 'labels.fields.name' },
      { key: 'description', labelKey: 'labels.description' },
      { key: 'species', labelKey: 'labels.fields.species' },
      { key: 'type', labelKey: 'labels.fields.type' },
    ],
    [CustomFieldContentType.Location]: [
      { key: 'name', labelKey: 'labels.fields.name' },
      { key: 'description', labelKey: 'labels.labels.description' },
      { key: 'type', labelKey: 'labels.fields.type' },
      { key: 'parent', labelKey: 'labels.fields.parent' },
    ],
    [CustomFieldContentType.Organization]: [
      { key: 'name', labelKey: 'labels.fields.name' },
      { key: 'description', labelKey: 'labels.labels.description' },
      { key: 'type', labelKey: 'labels.fields.type' },
      { key: 'parent', labelKey: 'labels.fields.parent' },
    ],
    [CustomFieldContentType.PC]: [
      { key: 'name', labelKey: 'labels.fields.name' },
      { key: 'description', labelKey: 'labels.description' },
    ],
    [CustomFieldContentType.Setting]: [
      { key: 'name', labelKey: 'labels.fields.name' },
      { key: 'description', labelKey: 'labels.description' },
    ],
    [CustomFieldContentType.Campaign]: [
      { key: 'name', labelKey: 'labels.fields.name' },
      { key: 'description', labelKey: 'labels.description' },
    ],
    [CustomFieldContentType.Arc]: [
      { key: 'name', labelKey: 'labels.fields.name' },
      { key: 'description', labelKey: 'labels.description' },
    ],
    [CustomFieldContentType.Front]: [
      { key: 'name', labelKey: 'labels.fields.name' },
      { key: 'description', labelKey: 'labels.description' },
    ],
  };

  const excludedAiTokenKey = computed<string | null>(() => {
    const row = aiDialogTargetRow.value;
    if (!row) return null;
    return (row.name || '').trim() || generateIdFromName(row.label || '');
  });

  const aiTokenOptions = computed<AiTokenOption[]>(() => {
    if (selectedType.value == null) return [];

    const type = selectedType.value;
    const excludedKey = excludedAiTokenKey.value;

    const rows = (workingRowsByType.value[type] || []).filter(r => !r.deleted);
    const seen = new Set<string>();

    const result: AiTokenOption[] = [];

    const builtIns = builtInAiTokensByType[type] || [];
    for (const t of builtIns) {
      const key = (t.key || '').trim();
      if (!key) continue;
      if (excludedKey && key === excludedKey) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      const label = `${localize(t.labelKey)} (${key})`;
      result.push({ label, value: key });
    }

    for (const r of rows) {
      const key = (r.name || '').trim() || generateIdFromName(r.label || '');
      if (!key) continue;
      if (excludedKey && key === excludedKey) continue;
      if (seen.has(key)) continue;
      seen.add(key);

      const label = (r.label || '').trim() ? `${r.label.trim()} (${key})` : key;
      result.push({ label, value: key });
    }

    return result;
  });

  const aiTemplateValidationError = computed<string>(() => {
    if (selectedType.value == null) return '';

    const template = aiDialogPromptTemplate.value || '';
    if (!template.trim()) return '';

    const validKeys = new Set<string>(aiTokenOptions.value.map((o) => o.value));
    const tokenKeyPattern = /^[a-z0-9_+]+$/;

    const invalid: string[] = [];
    const seen = new Set<string>();
    const tokenRegex = /\{([^{}]*)\}/g;
    for (const match of template.matchAll(tokenRegex)) {
      const inner = (match?.[1] ?? '').trim();
      const raw = match?.[0] ?? '';

      if (!inner) {
        if (!seen.has(raw)) {
          invalid.push(raw);
          seen.add(raw);
        }
        continue;
      }

      if (!tokenKeyPattern.test(inner) || !validKeys.has(inner)) {
        if (!seen.has(raw)) {
          invalid.push(raw);
          seen.add(raw);
        }
      }
    }

    if (!invalid.length) return '';
    return `${localize('applications.customFields.aiDialog.errors.invalidTokens')} ${invalid.join(', ')}`;
  });

  // AI Image prompts computed properties
  const aiImageTokenOptions = computed<AiTokenOption[]>(() => {
    if (selectedType.value == null) return [];

    const type = selectedType.value;
    const rows = (workingRowsByType.value[type] || []).filter(r => !r.deleted);
    const seen = new Set<string>();

    const result: AiTokenOption[] = [];

    const builtIns = builtInAiTokensByType[type] || [];
    for (const t of builtIns) {
      const key = (t.key || '').trim();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      const label = `${localize(t.labelKey)} (${key})`;
      result.push({ label, value: key });
    }

    for (const r of rows) {
      const key = (r.name || '').trim() || generateIdFromName(r.label || '');
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);

      const label = (r.label || '').trim() ? `${r.label.trim()} (${key})` : key;
      result.push({ label, value: key });
    }

    return result;
  });

  const aiImagePromptValidationError = computed<string>(() => {
    if (selectedType.value == null) return '';

    const template = aiImagePrompt.value || '';
    if (!template.trim()) return '';

    const validKeys = new Set<string>(aiImageTokenOptions.value.map((o) => o.value));
    const tokenKeyPattern = /^[a-z0-9_+]+$/;

    const invalid: string[] = [];
    const seen = new Set<string>();

    // Find all tokens in the template
    const matches = template.matchAll(/\{([^}]+)\}/g);
    for (const match of matches) {
      const token = match[1];
      if (!seen.has(token) && !validKeys.has(token) && tokenKeyPattern.test(token)) {
        invalid.push(token);
        seen.add(token);
      }
    }

    if (!invalid.length) return '';
    return `${localize('applications.customFields.aiImage.errors.invalidTokens')} ${invalid.join(', ')}`;
  });

  const descriptionFieldOptions = computed<AiTokenOption[]>(() => {
    if (selectedType.value == null) return [];

    const type = selectedType.value;
    const rows = (workingRowsByType.value[type] || []).filter(r => !r.deleted);
    const result: AiTokenOption[] = [];

    // Always include description/notes
    if (selectedType.value === CustomFieldContentType.Session) {
      result.push({ value: 'description', label: localize('labels.fields.notes') });
    } else {
      result.push({ value: 'description', label: localize('labels.description') });
    }

    // Add custom fields (excluding system fields)
    for (const row of rows) {
      const key = generateIdFromName(row.label || '');
      if (!key) 
        continue;
      
      result.push({
        value: key,
        label: row.label || key,
      });
    }

    return result;
  });

  const aiDialogButtons = computed(() => [
    {
      label: localize('labels.cancel'),
      close: true,
      callback: () => onAiTemplateDialogCancel(),
    },
    {
      label: localize('labels.saveChanges'),
      disable: !!aiTemplateValidationError.value,
      close: true,
      default: true,
      callback: () => onAiTemplateDialogSave(),
    },
  ]);



  ////////////////////////////////
  // methods

  const aiTokenForKey = (key: string) => `{${key}}`;

  /**
   * Convert persisted custom field definitions into a working list for the table.
   *
   * Adds a runtime `uuid` for row identity and normalizes optional fields.
   */
  const rowsFromDescriptions = (list: CustomFieldDescription[]): Row[] => {
    return (list || [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((f, index) => ({
        uuid: foundry.utils.randomID(),
        name: f.name || '',
        label: f.label || '',
        fieldType: f.fieldType,
        optionsText: (f.options || []).join(';'),
        indexed: f.indexed ?? false,
        editorHeight: f.fieldType === FieldType.Editor ? (f.editorHeight ?? DEFAULT_EDITOR_SIZE) : null,
        helpText: f.helpText || '',
        helpLink: f.helpLink || undefined,
        aiEnabled: f.aiEnabled ?? false,
        aiPromptTemplate: f.aiPromptTemplate || '',
        configuration: (f as any).configuration ?? null,
        deleted: f.deleted || false,
        sortOrder: index,
      }));
  };

  /**
   * Ensures there is a working rows array for a given content type.
   *
   * If one does not exist yet, it is initialized from the last-saved settings.
   */
  const ensureWorkingRowsForType = (type: CustomFieldContentType): Row[] => {
    const existing = workingRowsByType.value?.[type];
    if (existing) return existing;

    const list = allCustomFields.value?.[type] || [];
    const initialized = rowsFromDescriptions(list);
    workingRowsByType.value[type] = initialized;
    return initialized;
  };

  /**
   * Normalizes row fields that are derived from other fields.
   *
   * Responsibilities:
   * - Updates `sortOrder` to match the current array order.
   * - Clears `optionsText` when the type is not Select.
   * - Clears or clamps `editorHeight` based on Editor vs non-Editor.
   */
  const normalizeRows = (targetRows: Row[]) => {
    // note deleted rows get intermingled on sortorder, but it doesn't matter
    targetRows.forEach((r, index) => {
      r.sortOrder = index;
      if (r.fieldType !== FieldType.Select) {
        r.optionsText = '';
      }

      if (r.fieldType === FieldType.Boolean) {
        r.indexed = false;
      }

      if (r.fieldType !== FieldType.Editor) {
        r.editorHeight = null;
      } else if (r.editorHeight == null || !Number.isFinite(r.editorHeight) || r.editorHeight <= 0) {
        r.editorHeight = DEFAULT_EDITOR_SIZE;
      }
    });
  };

  /**
   * Validates and normalizes all rows before persisting.
   *
   * Responsibilities:
   * - Rejects non-deleted rows without a label.
   * - Generates a unique `name` (key) when missing.
   * - Removes rows that were added and deleted in this same session
   * - Coerces boolean fields like `indexed`.
   */
  const validateAndNormalizeBeforeSave = (targetRows: Row[]): boolean => {
    // Reserve existing names so auto-generated keys won't collide.
    const reservedNames = new Set<string>(
      targetRows
        .map((r) => (r.name || '').trim())
        .filter((n) => n.length > 0)
    );

    // shouldn't happen, but a new row (no name) that's already marked deleted should get removed
    for (let i = targetRows.length - 1; i >= 0; i--) {
      const r = targetRows[i];
      if (r?.deleted && !(r.name || '').trim()) {
        targetRows.splice(i, 1);
      }
    }

    for (const r of targetRows) {
      r.label = (r.label || '').trim();

      if (!r.deleted && !r.label) {
        ui.notifications?.error(localize('applications.customFields.notifications.missingLabel'));
        return false;
      }

      r.name = (r.name || '').trim();

      if (!r.name) {
        const base = generateIdFromName(r.label);
        const unique = makeCustomFieldKeyUnique(base, reservedNames);
        r.name = unique;
        reservedNames.add(unique);
      }

      r.indexed = !!r.indexed;
      r.aiEnabled = !!r.aiEnabled;
      r.aiPromptTemplate = r.aiPromptTemplate ?? '';

      if (r.fieldType === FieldType.Boolean) {
        r.indexed = false;
      }

      if (r.fieldType !== FieldType.Select) {
        r.optionsText = '';
      }

      if (r.fieldType !== FieldType.Editor) {
        r.editorHeight = null;
      } else {
        const height = r.editorHeight;
        if (height == null || !Number.isFinite(height) || height <= 0) {
          r.editorHeight = DEFAULT_EDITOR_SIZE;
        }
      }
    }

    return true;
  };

  /**
   * Converts working table rows into the persisted CustomFieldDescription format.
   *
   * Responsibilities:
   * - Parses Select options from `optionsText`.
   * - Normalizes Editor height.
   * - Trims user text fields.
   */
  const rowsToDescriptions = (targetRows: Row[]): CustomFieldDescription[] => {
    return targetRows
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((r) => {
        const options = r.fieldType === FieldType.Select
          ? r.optionsText.split(';').map(s => s.trim()).filter(Boolean)
          : undefined;

        const editorHeight = r.fieldType === FieldType.Editor
          ? (r.editorHeight != null && Number.isFinite(r.editorHeight) && r.editorHeight > 0 ? r.editorHeight : DEFAULT_EDITOR_SIZE)
          : undefined;

        return {
          name: r.name.trim(),
          label: r.label.trim(),
          fieldType: r.fieldType,
          options,
          editorHeight,
          helpText: r.helpText?.trim() || undefined,
          helpLink: r.helpLink || undefined,
          deleted: r.deleted ? true : undefined,
          indexed: r.indexed ?? false,
          aiEnabled: r.aiEnabled ? true : undefined,
          aiPromptTemplate: r.aiPromptTemplate?.trim() || undefined,
          configuration: r.configuration ?? undefined,
          sortOrder: r.sortOrder,
        } as CustomFieldDescription;
      });
  };



  const insertIntoAiTemplate = async (text: string) => {
    const el = aiPromptTextareaRef.value;
    if (!el) {
      aiDialogPromptTemplate.value = (aiDialogPromptTemplate.value || '') + text;
      return;
    }

    const current = aiDialogPromptTemplate.value || '';
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    aiDialogPromptTemplate.value = current.slice(0, start) + text + current.slice(end);

    await nextTick();
    const nextPos = start + text.length;
    el.focus();
    el.setSelectionRange(nextPos, nextPos);
  };

  const insertIntoAiImageTemplate = async (text: string) => {
    const el = aiImagePromptRef.value;
    if (!el) {
      aiImagePrompt.value = (aiImagePrompt.value || '') + text;
      return;
    }

    const current = aiImagePrompt.value || '';
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    aiImagePrompt.value = current.slice(0, start) + text + current.slice(end);

    await nextTick();
    const nextPos = start + text.length;
    el.focus();
    el.setSelectionRange(nextPos, nextPos);
  };

  ////////////////////////////////
  // event handlers

  const onFieldTypeChanged = (row: Row) => {
    if (!row) return;
    if (row.fieldType === FieldType.Boolean) {
      row.indexed = false;
    }

    if (row.fieldType !== FieldType.Editor) {
      row.editorHeight = null;
      return;
    }

    if (row.editorHeight == null || !Number.isFinite(row.editorHeight) || row.editorHeight <= 0) {
      row.editorHeight = DEFAULT_EDITOR_SIZE;
    }
  };

  const onIndexedCheckboxChange = () => {
    // Any toggle is enough to require a rebuild; we don't attempt to diff the before/after state.
    indexedToggled.value = true;
  };
  const onOpenAiTemplateDialog = async (row: Row) => {
    if (!backendAvailable.value) return;
    if (row.fieldType !== FieldType.Editor) return;

    aiDialogTargetRow.value = row;
    aiDialogEnabled.value = row.aiEnabled ?? false;
    aiDialogPromptTemplate.value = row.aiPromptTemplate ?? '';

    const rawCfg = (row as any).configuration || {};
    const mergedCfg = {
      ...DEFAULT_AI_CONFIGURATION,
      ...rawCfg,
    } as any;

    const minWords = Number.isFinite(Number(mergedCfg.minWords)) ? Number(mergedCfg.minWords) : DEFAULT_AI_CONFIGURATION.minWords;
    const maxWords = Number.isFinite(Number(mergedCfg.maxWords)) ? Number(mergedCfg.maxWords) : DEFAULT_AI_CONFIGURATION.maxWords;
    const includeBullets = Boolean(mergedCfg.includeBullets ?? DEFAULT_AI_CONFIGURATION.includeBullets);
    const avoidListsLongerThan = Number.isFinite(Number(mergedCfg.avoidListsLongerThan))
      ? Number(mergedCfg.avoidListsLongerThan)
      : DEFAULT_AI_CONFIGURATION.avoidListsLongerThan;

    aiDialogMinWords.value = minWords;
    aiDialogMaxWords.value = maxWords;
    aiDialogTone.value = String(mergedCfg.tone ?? DEFAULT_AI_CONFIGURATION.tone);
    aiDialogTense.value = String(mergedCfg.tense ?? DEFAULT_AI_CONFIGURATION.tense);
    aiDialogPov.value = String(mergedCfg.pov ?? DEFAULT_AI_CONFIGURATION.pov);
    aiDialogIncludeBullets.value = includeBullets;
    aiDialogAvoidListsLongerThan.value = avoidListsLongerThan;

    selectedAiTokenKey.value = null;
    showAiTemplateDialog.value = true;

    await nextTick();
    aiPromptTextareaRef.value?.focus();
  };

  const onAiTemplateDialogSave = () => {
    if (aiTemplateValidationError.value) return;
    if (!aiDialogTargetRow.value) {
      showAiTemplateDialog.value = false;
      return;
    }

    aiDialogTargetRow.value.aiEnabled = aiDialogEnabled.value;
    aiDialogTargetRow.value.aiPromptTemplate = aiDialogPromptTemplate.value ?? '';

    const minWords = Number.isFinite(aiDialogMinWords.value) ? Math.max(0, Math.floor(aiDialogMinWords.value)) : DEFAULT_AI_CONFIGURATION.minWords;
    let maxWords = Number.isFinite(aiDialogMaxWords.value) ? Math.max(0, Math.floor(aiDialogMaxWords.value)) : DEFAULT_AI_CONFIGURATION.maxWords;
    if (maxWords < minWords) maxWords = minWords;
    const includeBullets = Boolean(aiDialogIncludeBullets.value ?? DEFAULT_AI_CONFIGURATION.includeBullets);
    const avoidListsLongerThan = Number.isFinite(aiDialogAvoidListsLongerThan.value)
      ? Math.max(0, Math.floor(aiDialogAvoidListsLongerThan.value))
      : DEFAULT_AI_CONFIGURATION.avoidListsLongerThan;

    aiDialogTargetRow.value.configuration = {
      minWords,
      maxWords,
      tone: String(aiDialogTone.value ?? DEFAULT_AI_CONFIGURATION.tone),
      tense: String(aiDialogTense.value ?? DEFAULT_AI_CONFIGURATION.tense),
      pov: String(aiDialogPov.value ?? DEFAULT_AI_CONFIGURATION.pov),
      includeBullets,
      avoidListsLongerThan,
    };
    aiDialogTargetRow.value = null;
    showAiTemplateDialog.value = false;
  };

  const onAiTemplateDialogCancel = () => {
    aiDialogTargetRow.value = null;
    showAiTemplateDialog.value = false;
  };

  const onInsertAiTokenClick = async () => {
    if (!selectedAiTokenKey.value) return;
    await insertIntoAiTemplate(aiTokenForKey(selectedAiTokenKey.value));
  };

  const onInsertAiImageTokenClick = async () => {
    if (!selectedAiImageTokenKey.value) return;
    await insertIntoAiImageTemplate(aiTokenForKey(selectedAiImageTokenKey.value));
  };

  const onAddField = () => {
    if (selectedType.value == null) return;

    const targetRows = workingRowsByType.value[selectedType.value] || [];
    // Add a new, unsaved row with defaults.
    targetRows.push({
      uuid: foundry.utils.randomID(),
      name: '',
      label: '',
      fieldType: FieldType.Text,
      optionsText: '',
      indexed: false,
      editorHeight: null,
      helpText: '',
      helpLink: undefined,
      aiEnabled: false,
      aiPromptTemplate: '',
      configuration: { ...DEFAULT_AI_CONFIGURATION },
      deleted: false,
      sortOrder: targetRows.length,
    });

    if (selectedType.value !== null) {
      // Reassign the array to ensure Vue notices the nested mutation inside the working map.
      workingRowsByType.value[selectedType.value] = [...targetRows];
      // Normalize derived values like sort order and editor height.
      normalizeRows(workingRowsByType.value[selectedType.value]!);
    }
  };

  // rows previously saved get soft-deleted; rows just added get deleted
  const onDeleteField = (uuid: string) => {
    if (selectedType.value == null) return;

    const targetRows = workingRowsByType.value[selectedType.value] || [];

    const index = targetRows.findIndex((r) => r.uuid === uuid);
    if (index === -1) return;

    const row = targetRows[index];
    if (!row.name.trim()) {
      // New, unsaved rows are removed entirely.
      targetRows.splice(index, 1);
    } else {
      // Previously-saved rows are soft-deleted so we can persist the deletion on save.
      row.deleted = true;
    }

    if (selectedType.value !== null) {
      // Reassign the array to ensure Vue notices the nested mutation inside the working map.
      workingRowsByType.value[selectedType.value] = [...targetRows];
      normalizeRows(workingRowsByType.value[selectedType.value]!);
    }
  };

  const onRowReorder = (event: any) => {
    if (selectedType.value == null) return;

    const { dragIndex, dropIndex } = event;
    const targetRows = workingRowsByType.value[selectedType.value] || [];
    const visible = [...visibleRows.value];
    // Deleted rows are not shown in the table, but we keep them at the end of the working list.
    const deleted = targetRows.filter((r) => r.deleted);

    const movedItem = visible.splice(dragIndex, 1)[0];
    visible.splice(dropIndex, 0, movedItem);
    const nextRows = [...visible, ...deleted];

    if (selectedType.value !== null) {
      // Persist the reorder into the working rows for this type.
      workingRowsByType.value[selectedType.value] = nextRows;
      normalizeRows(nextRows);
    }
  };

  const onResetClick = () => {
    if (selectedType.value === null) 
      return;

    // Reset only the currently-selected type to the last saved configuration.
    workingRowsByType.value[selectedType.value] = rowsFromDescriptions(allCustomFields.value?.[selectedType.value] || []);
    
    // Reset the AI Image prompt to the last saved value
    aiImagePrompt.value = aiImagePrompts.value[selectedType.value] || '';
    
    // Reset the AI Image configuration to the last saved value
    aiImageConfig.value = { ...DEFAULT_IMAGE_CONFIGURATION, ...(aiImageConfigurations.value[selectedType.value] || {}) };
  };

  const onSaveClick = async () => {
    if (selectedType.value === null) return;

    // Save the current AI Image prompt before saving
    if (selectedType.value !== null) {
      aiImagePrompts.value[selectedType.value] = aiImagePrompt.value;
    }
    
    // Save the current AI Image configuration before saving
    if (selectedType.value !== null) {
      // Remove empty values from the config
      const cleanedConfig: ImageConfiguration = {
        ...aiImageConfig.value,
        descriptionField: selectedDescriptionField.value,
      };
      
      // Remove empty values from all other fields
      for (const [key, value] of Object.entries(cleanedConfig)) {
        if (value !== null && value !== undefined && value !== '' && key !== 'descriptionField') {
          (cleanedConfig as any)[key] = value;
        } else if (value === null || value === undefined || value === '') {
          delete (cleanedConfig as any)[key];
        }
      }
      aiImageConfigurations.value[selectedType.value] = cleanedConfig;
    }

    // Validate and normalize all content types so this dialog saves everything in one operation.
    for (const opt of typeOptions) {
      const type = opt.value;
      const typeRows = ensureWorkingRowsForType(type);
      normalizeRows(typeRows);
      if (!validateAndNormalizeBeforeSave(typeRows)) {
        // Leave the user on the first invalid type so they can fix the issue.
        selectedType.value = type;
        return;
      }
      workingRowsByType.value[type] = typeRows;
    }

    const nextCustomFields: Record<CustomFieldContentType, CustomFieldDescription[]> = {
      ...(allCustomFields.value as any)
    };

    for (const opt of typeOptions) {
      const type = opt.value;
      const typeRows = workingRowsByType.value[type] || [];

      const savedNames = new Set<string>(
        (allCustomFields.value?.[type] || []).map((f) => (f.name || '').trim()).filter(Boolean)
      );

      // Keep deleted rows only if they existed in the previously saved config.
      const filteredRows = typeRows.filter((r) => {
        if (!r.deleted) return true;
        const name = (r.name || '').trim();
        return name.length > 0 && savedNames.has(name);
      });

      normalizeRows(filteredRows);
      nextCustomFields[type] = rowsToDescriptions(filteredRows);
      workingRowsByType.value[type] = filteredRows;
    }

    allCustomFields.value = nextCustomFields;

    // Persist all custom field definitions for all content types.
    await ModuleSettings.set(SettingKey.customFields, allCustomFields.value);

    // Save AI Image prompts
    await ModuleSettings.set(SettingKey.aiImagePrompts, aiImagePrompts.value);
    
    // Save AI Image configurations
    await ModuleSettings.set(SettingKey.aiImageConfigurations, aiImageConfigurations.value);

    if (isCampaignBuilderAppOpen()) {
      await mainStore.refreshCurrentContent();
    }

    ui.notifications?.info(localize('notifications.changesSaved'));

    if (indexedToggled.value && currentSetting.value) {
      // Rebuild search index to reflect any changes to which custom fields are searchable.
      void searchService.buildIndex(currentSetting.value)
        .catch((e) => console.error('Failed to rebuild search index after custom field indexed changes', e));
    }

    await customFieldsApp?.close();
  };

  ////////////////////////////////
  // watchers

  watch(() => selectedType.value, (newType) => {
    if (newType === null) {
      aiImagePrompt.value = '';
      aiImageConfig.value = { ...DEFAULT_IMAGE_CONFIGURATION };
      selectedDescriptionField.value = 'description';
      return;
    }
    
    // Load the AI Image prompt for the new type
    aiImagePrompt.value = aiImagePrompts.value[newType] || '';
    
    // Load the AI Image configuration for the new type
    const config = { ...DEFAULT_IMAGE_CONFIGURATION, ...(aiImageConfigurations.value[newType] || {}) };
    aiImageConfig.value = config;
    selectedDescriptionField.value = config.descriptionField || 'description';
    
    // Ensure the newly-selected type has a working copy initialized from the last saved settings.
    ensureWorkingRowsForType(newType);
  });

  ////////////////////////////////
  // lifecycle hooks

  onMounted(() => {
    // Load the last-saved custom fields from module settings.
    allCustomFields.value = ModuleSettings.get(SettingKey.customFields);

    // Load AI Image prompts
    aiImagePrompts.value = ModuleSettings.get(SettingKey.aiImagePrompts) || {} as any;
    
    // Load AI Image configurations
    aiImageConfigurations.value = ModuleSettings.get(SettingKey.aiImageConfigurations) || {} as any;

    // Initialize working copies for all types so switching does not lose changes.
    for (const opt of typeOptions) {
      ensureWorkingRowsForType(opt.value);
    }

    // Initialize the AI Image prompt for the default selected type
    if (selectedType.value !== null) {
      aiImagePrompt.value = aiImagePrompts.value[selectedType.value] || '';
      aiImageConfig.value = { ...DEFAULT_IMAGE_CONFIGURATION, ...(aiImageConfigurations.value[selectedType.value] || {}) };
    }

    // Initialize Foundry tabs
    nextTick(() => {
      const el = contentRef.value?.rootEl;
      
      if (el) {
        tabs = new foundry.applications.ux.Tabs({ 
          group: 'custom-fields-dialog', 
          navSelector: '.tabs', 
          contentSelector: '.fcb-tab-body', 
          initial: 'fields',
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
  .fcb-tab-body {
    display: flex;
    height: 100%;
  }

  .tab {
    display: none;
    height: 100%;
    flex-direction: column;
    min-height: 0;
  }

  .tab.active {
    display: flex;
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

  .fcb-sheet-container {
    :deep(input:disabled),
    :deep(textarea:disabled),
    :deep(select:disabled),
    :deep(.p-disabled) {
      background: rgba(0, 0, 0, 0.18) !important;
    }
  }
</style>
