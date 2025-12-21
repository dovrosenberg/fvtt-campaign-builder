<template>
  <section class="standard-form">
    <div class="fcb-sheet-container flexcol primevue-only">
      <div class="standard-form" style="padding: 0.5rem 0.75rem;">
        <div class="form-group">
          <label>{{ localize('applications.customFields.labels.contentType') }}</label>
          <div class="form-fields">
            <Select
              v-model="selectedType"
              :options="typeOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="localize('applications.customFields.labels.selectType')"
            />
          </div>
          <p class="hint">{{ localize('applications.customFields.labels.contentTypeHint') }}</p>
        </div>
      </div>

      <div style="flex: 1; min-height: 0; padding: 0 0.75rem 0.75rem 0.75rem;">
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
              <Checkbox v-model="data.indexed" binary @update:model-value="onIndexedCheckboxChange" />
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

        <div v-else class="standard-form" style="padding: 1rem;">
          {{ localize('applications.customFields.labels.selectTypePrompt') }}
        </div>
      </div>

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
    </div>
  </section>
</template>

<script setup lang="ts">
  // library imports
  import { computed, onMounted, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { useMainStore } from '@/applications/stores';
  import { searchService } from '@/utils/search';
  import { makeCustomFieldKeyUnique, toCustomFieldKey } from '@/utils/customFields';

  // library components
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import Button from 'primevue/button';
  import Select from 'primevue/select';
  import InputText from 'primevue/inputtext';
  import InputNumber from 'primevue/inputnumber';
  import Checkbox from 'primevue/checkbox';

  // local components

  // types
  import { CustomFieldContentType, CustomFieldDescription, FieldType } from '@/types';

  type Row = {
    uuid: string;
    name: string;
    label: string;
    fieldType: FieldType;
    optionsText: string;
    indexed: boolean;
    editorHeight: number | null;
    helpText?: string;
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

  ////////////////////////////////
  // data

  const DEFAULT_EDITOR_SIZE = 10;
  const MAX_EDITOR_SIZE = 50;

  const selectedType = ref<CustomFieldContentType | null>(CustomFieldContentType.Arc);

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
    { value: FieldType.Boolean, label: localize('applications.customFields.fieldTypes.boolean') },
  ];

  const allCustomFields = ref<Record<CustomFieldContentType, CustomFieldDescription[]>>({} as any);

  const workingRowsByType = ref<Partial<Record<CustomFieldContentType, Row[]>>>({});

  // Track whether any "Search?" checkbox was toggled; used to force a rebuild on save.
  const indexedToggled = ref<boolean>(false);

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


  ////////////////////////////////
  // methods

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
        const base = toCustomFieldKey(r.label);
        const unique = makeCustomFieldKeyUnique(base, reservedNames);
        r.name = unique;
        reservedNames.add(unique);
      }

      r.indexed = !!r.indexed;

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
          deleted: r.deleted ? true : undefined,
          indexed: r.indexed ?? false,
          sortOrder: r.sortOrder,
        } as CustomFieldDescription;
      });
  };


  ////////////////////////////////
  // event handlers

  const onIndexedCheckboxChange = () => {
    // Any toggle is enough to require a rebuild; we don't attempt to diff the before/after state.
    indexedToggled.value = true;
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
  };

  const onSaveClick = async () => {
    if (selectedType.value === null) return;

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

    ui.notifications?.info(localize('notifications.changesSaved'));

    if (indexedToggled.value && currentSetting.value) {
      // Rebuild search index to reflect any changes to which custom fields are searchable.
      void searchService.buildIndex(currentSetting.value)
        .catch((e) => console.error('Failed to rebuild search index after custom field indexed changes', e));
    }
  };

  ////////////////////////////////
  // watchers

  watch(() => selectedType.value, (newType) => {
    if (newType === null) return;
    // Ensure the newly-selected type has a working copy initialized from the last saved settings.
    ensureWorkingRowsForType(newType);
  });

  ////////////////////////////////
  // lifecycle hooks

  onMounted(() => {
    // Load the last-saved custom fields from module settings.
    allCustomFields.value = ModuleSettings.get(SettingKey.customFields);

    // Initialize working copies for all types so switching does not lose changes.
    for (const opt of typeOptions) {
      ensureWorkingRowsForType(opt.value);
    }
  });
</script>

<style lang="scss" scoped>
  .fcb-action-icon {
    cursor: pointer;
    margin-right: 3px;
  }
</style>
