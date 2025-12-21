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
          :value="rows"
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

          <Column field="editorHeight" header="Height" style="width: 8%">
            <template #body="{ data }">
              <InputNumber
                v-model="data.editorHeight"
                unstyled
                fluid
                :min="1"
                :max="10"
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

  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import Button from 'primevue/button';
  import Select from 'primevue/select';
  import InputText from 'primevue/inputtext';
  import InputNumber from 'primevue/inputnumber';

  // types
  import { CustomFieldContentType, CustomFieldDescription, FieldType } from '@/types';
  import { makeCustomFieldKeyUnique, toCustomFieldKey } from '@/utils/customFields';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  type Row = {
    uuid: string;
    name: string;
    label: string;
    fieldType: FieldType;
    optionsText: string;
    editorHeight: number | null;
    helpText?: string;
    deleted?: boolean;
    sortOrder: number;
  };

  ////////////////////////////////
  // data

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
    { value: FieldType.Text, label: localize('applications.customFields.fieldTypes.text') },
    { value: FieldType.Select, label: localize('applications.customFields.fieldTypes.select') },
    { value: FieldType.Editor, label: localize('applications.customFields.fieldTypes.editor') },
    { value: FieldType.Boolean, label: localize('applications.customFields.fieldTypes.boolean') },
  ];

  const allCustomFields = ref<Record<CustomFieldContentType, CustomFieldDescription[]>>({} as any);
  const rows = ref<Row[]>([]);

  const visibleRows = computed<Row[]>(() => {
    return rows.value.filter((r) => !r.deleted);
  });

  ////////////////////////////////
  // computed data

  const asDescriptions = computed<CustomFieldDescription[]>(() => {
    return rows.value
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((r) => {
        const options = r.fieldType === FieldType.Select
          ? r.optionsText.split(';').map(s => s.trim()).filter(Boolean)
          : undefined;

        const editorHeight = r.fieldType === FieldType.Editor
          ? (r.editorHeight != null && Number.isFinite(r.editorHeight) && r.editorHeight > 0 ? r.editorHeight : 4)
          : undefined;

        return {
          name: r.name.trim(),
          label: r.label.trim(),
          fieldType: r.fieldType,
          options,
          editorHeight,
          helpText: r.helpText?.trim() || undefined,
          deleted: r.deleted ? true : undefined,
          sortOrder: r.sortOrder,
        } as CustomFieldDescription;
      });
  });

  ////////////////////////////////
  // methods

  const loadRowsForType = (type: CustomFieldContentType) => {
    const list = allCustomFields.value?.[type] || [];
    rows.value = list
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((f, index) => ({
        uuid: foundry.utils.randomID(),
        name: f.name || '',
        label: f.label || '',
        fieldType: f.fieldType,
        optionsText: (f.options || []).join(';'),
        editorHeight: f.fieldType === FieldType.Editor ? (f.editorHeight ?? 4) : null,
        helpText: f.helpText || '',
        deleted: f.deleted || false,
        sortOrder: index,
      }));
  };

  const normalizeRows = () => {
    // note deleted rows get intermingled on sortorder, but it doesn't matter
    rows.value.forEach((r, index) => {
      r.sortOrder = index;
      if (r.fieldType !== FieldType.Select) {
        r.optionsText = '';
      }

      if (r.fieldType !== FieldType.Editor) {
        r.editorHeight = null;
      } else if (r.editorHeight == null || !Number.isFinite(r.editorHeight) || r.editorHeight <= 0) {
        r.editorHeight = 4;
      }
    });
  };

  const validateAndNormalizeBeforeSave = (): boolean => {
    // Reserve existing names so auto-generated keys won't collide.
    const reservedNames = new Set<string>(
      rows.value
        .map((r) => (r.name || '').trim())
        .filter((n) => n.length > 0)
    );

    // shouldn't happen, but a new row (no name) that's already marked deleted should get removed
    rows.value = rows.value.filter((r) => !r.deleted || r.name?.trim());

    for (const r of rows.value) {
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

      if (r.fieldType !== FieldType.Select) {
        r.optionsText = '';
      }

      if (r.fieldType !== FieldType.Editor) {
        r.editorHeight = null;
      } else {
        const height = r.editorHeight;
        if (height == null || !Number.isFinite(height) || height <= 0) {
          r.editorHeight = 4;
        }
      }
    }

    return true;
  };


  ////////////////////////////////
  // event handlers

  const onAddField = () => {
    rows.value.push({
      uuid: foundry.utils.randomID(),
      name: '',
      label: '',
      fieldType: FieldType.Text,
      optionsText: '',
      editorHeight: null,
      helpText: '',
      deleted: false,
      sortOrder: rows.value.length,
    });
  };

  // rows preivously saved get soft-deleted; rows just added get deleted
  const onDeleteField = (uuid: string) => {
    const row = rows.value.find((r) => r.uuid === uuid);
    if (row) {
      if (!row.name.trim()) {
        rows.value = rows.value.filter((r) => r.uuid !== uuid);
      } else {
        row.deleted = true;
      }
    }
    normalizeRows();
  };

  const onRowReorder = (event: any) => {
    const { dragIndex, dropIndex } = event;
    const visible = [...visibleRows.value];
    const deleted = rows.value.filter((r) => r.deleted);

    const movedItem = visible.splice(dragIndex, 1)[0];
    visible.splice(dropIndex, 0, movedItem);
    rows.value = [...visible, ...deleted];

    normalizeRows();
  };

  const onResetClick = () => {
    if (selectedType.value === null) return;
    loadRowsForType(selectedType.value);
  };

  const onSaveClick = async () => {
    if (selectedType.value === null) return;

    normalizeRows();
    if (!validateAndNormalizeBeforeSave()) return;

    const savedNames = new Set<string>(
      (allCustomFields.value?.[selectedType.value] || []).map((f) => (f.name || '').trim()).filter(Boolean)
    );

    rows.value = rows.value.filter((r) => {
      if (!r.deleted) return true;
      const name = (r.name || '').trim();
      return name.length > 0 && savedNames.has(name);
    });

    normalizeRows();

    allCustomFields.value[selectedType.value] = asDescriptions.value;

    await ModuleSettings.set(SettingKey.customFields, allCustomFields.value);

    ui.notifications?.info(localize('notifications.changesSaved'));
  };

  ////////////////////////////////
  // watchers

  watch(() => selectedType.value, (newType) => {
    if (newType === null) return;
    loadRowsForType(newType);
  });

  ////////////////////////////////
  // lifecycle events

  onMounted(() => {
    allCustomFields.value = ModuleSettings.get(SettingKey.customFields);

    if (selectedType.value !== null) {
      loadRowsForType(selectedType.value);
    }
  });
</script>

<style lang="scss" scoped>
  .fcb-action-icon {
    cursor: pointer;
    margin-right: 3px;
  }
</style>
