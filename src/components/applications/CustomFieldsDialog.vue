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

          <Column field="label" :header="localize('applications.customFields.columns.label')" style="width: 18%">
            <template #body="{ data }">
              <InputText v-model="data.label" unstyled style="width: 100%" />
            </template>
          </Column>

          <Column field="name" :header="localize('applications.customFields.columns.fieldKey')" style="width: 16%">
            <template #body="{ data }">
              <InputText v-model="data.name" unstyled style="width: 100%" />
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
                :placeholder="localize('applications.customFields.labels.selectOptionsPlaceholder')"
              />
            </template>
          </Column>

          <Column field="help" :header="localize('applications.customFields.columns.help')" style="width: 18%">
            <template #body="{ data }">
              <InputText v-model="data.help" unstyled style="width: 100%" />
            </template>
          </Column>

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

  // types
  import { CustomFieldContentType, CustomFieldDescription, FieldType } from '@/types';

  type Row = {
    uuid: string;
    name: string;
    label: string;
    fieldType: FieldType;
    optionsText: string;
    help?: string;
    sortOrder: number;
  };

  const selectedType = ref<CustomFieldContentType | null>(CustomFieldContentType.Arc);

  const typeOptions = [
    { value: CustomFieldContentType.Arc, label: localize('applications.customFields.contentTypes.arc') },
    { value: CustomFieldContentType.Campaign, label: localize('applications.customFields.contentTypes.campaign') },
    { value: CustomFieldContentType.Front, label: localize('applications.customFields.contentTypes.front') },
    { value: CustomFieldContentType.Session, label: localize('applications.customFields.contentTypes.session') },
    { value: CustomFieldContentType.Character, label: localize('applications.customFields.contentTypes.character') },
    { value: CustomFieldContentType.Location, label: localize('applications.customFields.contentTypes.location') },
    { value: CustomFieldContentType.Organization, label: localize('applications.customFields.contentTypes.organization') },
    { value: CustomFieldContentType.PC, label: localize('applications.customFields.contentTypes.pc') },
    { value: CustomFieldContentType.Setting, label: localize('applications.customFields.contentTypes.setting') },
  ];

  const fieldTypeOptions = [
    { value: FieldType.Text, label: localize('applications.customFields.fieldTypes.text') },
    { value: FieldType.Select, label: localize('applications.customFields.fieldTypes.select') },
    { value: FieldType.Editor, label: localize('applications.customFields.fieldTypes.editor') },
    { value: FieldType.Boolean, label: localize('applications.customFields.fieldTypes.boolean') },
  ];

  const allCustomFields = ref<Record<CustomFieldContentType, CustomFieldDescription[]>>({} as any);
  const rows = ref<Row[]>([]);

  const toFieldKey = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const ensureUniqueKey = (baseKey: string, used: Set<string>): string => {
    let key = baseKey;
    let i = 2;
    while (!key || used.has(key)) {
      key = `${baseKey}_${i}`;
      i += 1;
    }
    used.add(key);
    return key;
  };

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
        help: f.help || '',
        sortOrder: index,
      }));
  };

  const normalizeRows = () => {
    rows.value.forEach((r, index) => {
      r.sortOrder = index;
      if (r.fieldType !== FieldType.Select) {
        r.optionsText = '';
      }
    });
  };

  const validateAndNormalizeBeforeSave = (): boolean => {
    const used = new Set<string>();

    for (const r of rows.value) {
      r.label = (r.label || '').trim();
      r.name = (r.name || '').trim();

      if (!r.label) {
        ui.notifications?.error(localize('applications.customFields.notifications.missingLabel'));
        return false;
      }

      const baseKey = toFieldKey(r.name || r.label);
      r.name = ensureUniqueKey(baseKey, used);

      if (r.fieldType !== FieldType.Select) {
        r.optionsText = '';
      }
    }

    return true;
  };

  const asDescriptions = computed<CustomFieldDescription[]>(() => {
    return rows.value
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((r) => {
        const options = r.fieldType === FieldType.Select
          ? r.optionsText.split(';').map(s => s.trim()).filter(Boolean)
          : undefined;

        return {
          name: r.name.trim(),
          label: r.label.trim(),
          fieldType: r.fieldType,
          options,
          help: r.help?.trim() || undefined,
          sortOrder: r.sortOrder,
        } as CustomFieldDescription;
      });
  });

  const onAddField = () => {
    rows.value.push({
      uuid: foundry.utils.randomID(),
      name: '',
      label: '',
      fieldType: FieldType.Text,
      optionsText: '',
      help: '',
      sortOrder: rows.value.length,
    });
  };

  const onDeleteField = (uuid: string) => {
    rows.value = rows.value.filter(r => r.uuid !== uuid);
    normalizeRows();
  };

  const onRowReorder = (event: any) => {
    const { dragIndex, dropIndex } = event;
    const reorderedRows = [...rows.value];
    const movedItem = reorderedRows.splice(dragIndex, 1)[0];
    reorderedRows.splice(dropIndex, 0, movedItem);
    reorderedRows.forEach((row, index) => {
      row.sortOrder = index;
    });
    rows.value = reorderedRows;
  };

  const onResetClick = () => {
    if (selectedType.value === null) return;
    loadRowsForType(selectedType.value);
  };

  const onSaveClick = async () => {
    if (selectedType.value === null) return;

    normalizeRows();
    if (!validateAndNormalizeBeforeSave()) return;

    const next = foundry.utils.deepClone(allCustomFields.value);
    next[selectedType.value] = asDescriptions.value;

    await ModuleSettings.set(SettingKey.customFields, next);
    allCustomFields.value = next;

    ui.notifications?.info(localize('notifications.changesSaved'));
  };

  watch(() => selectedType.value, (newType) => {
    if (newType === null) return;
    loadRowsForType(newType);
  });

  onMounted(() => {
    const raw = ModuleSettings.getClone(SettingKey.customFields);
    allCustomFields.value = raw;

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
