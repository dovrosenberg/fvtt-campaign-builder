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

          <Column field="help" :header="localize('applications.customFields.columns.helpText')" style="width: 18%">
            <template #body="{ data }">
              <InputText v-model="data.help" unstyled style="width: 100%" />
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
    help?: string;
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

  ////////////////////////////////
  // methods

  const toFieldKey = (text: string): string => {
    const input = (text || '').toLowerCase();

    // FNV-1a 32-bit hash
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return `cf_${(hash >>> 0).toString(16).padStart(8, '0')}`;
  };

  const loadRowsForType = (type: CustomFieldContentType) => {
    const list = allCustomFields.value?.[type] || [];
    rows.value = list
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((f, index) => ({
        uuid: foundry.utils.randomID(),
        name: f.name || toFieldKey(f.label || ''),
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

      if (!r.label) {
        ui.notifications?.error(localize('applications.customFields.notifications.missingLabel'));
        return false;
      }

      const key = toFieldKey(r.label);
      if (used.has(key)) {
        ui.notifications?.error(localize('applications.customFields.notifications.duplicateKey'));
        return false;
      }

      used.add(key);
      r.name = key;

      if (r.fieldType !== FieldType.Select) {
        r.optionsText = '';
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

  ////////////////////////////////
  // watchers

  watch(() => selectedType.value, (newType) => {
    if (newType === null) return;
    loadRowsForType(newType);
  });

  ////////////////////////////////
  // lifecycle events

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
