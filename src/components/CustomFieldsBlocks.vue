<template>
  <div v-if="props.content && customFields.length > 0">
    <template v-for="field in customFields" :key="field.name">
      <template v-if="field.fieldType === FieldType.Editor">
        <div class="flexrow form-group">
          <label>
            {{ field.label }}
            <i
              v-if="field.help"
              class="fas fa-info-circle tooltip-icon"
              :data-tooltip="field.help"
            ></i>
          </label>
        </div>
        <div class="flexrow form-group">
          <Editor
            :key="`${props.content.uuid}-${field.name}`"
            :initial-content="String(values[field.name] ?? '')"
            fixed-height="240px"
            :current-entity-uuid="props.content.uuid"
            :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
            @editor-saved="(newContent: string) => onFieldValueChanged(field, newContent)"
          />
        </div>
      </template>

      <template v-else>
        <div class="flexrow form-group">
          <label class="side-label">
            {{ field.label }}
            <i
              v-if="field.help"
              class="fas fa-info-circle tooltip-icon"
              :data-tooltip="field.help"
            ></i>
          </label>
          <div class="form-fields">
            <InputText
              v-if="field.fieldType === FieldType.Text"
              :model-value="String(values[field.name] ?? '')"
              unstyled
              style="width: 100%"
              @update:model-value="(newValue: string | undefined) => onFieldValueChanged(field, newValue ?? '')"
            />

            <Select
              v-else-if="field.fieldType === FieldType.Select"
              :model-value="String(values[field.name] ?? '')"
              :options="selectOptionsForField(field)"
              optionLabel="label"
              optionValue="value"
              style="width: 100%"
              @update:model-value="(newValue: string | undefined) => onFieldValueChanged(field, newValue ?? '')"
            />

            <Checkbox
              v-else-if="field.fieldType === FieldType.Boolean"
              :model-value="Boolean(values[field.name])"
              binary
              @update:model-value="(newValue: boolean | undefined) => onFieldValueChanged(field, Boolean(newValue))"
            />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, reactive, watch, PropType } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { notifyError } from '@/utils/notifications';

  // library components
  import InputText from 'primevue/inputtext';
  import Select from 'primevue/select';
  import Checkbox from 'primevue/checkbox';

  // local components
  import Editor from '@/components/Editor.vue';

  // types
  import { CustomFieldContentType, CustomFieldDescription, FieldType } from '@/types';
  import { FCBJournalEntryPage } from '@/classes/Documents/FCBJournalEntryPage';

  ////////////////////////////////
  // props

  const props = defineProps({
    contentType: {
      type: Number as PropType<CustomFieldContentType>,
      required: true
    },
    content: {
      type: Object as PropType<FCBJournalEntryPage<any, any> | null>,
      required: false,
      default: null
    },
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data

  const values = reactive<Record<string, unknown>>({});

  let saveDebounceTimer: NodeJS.Timeout | undefined = undefined;

  ////////////////////////////////
  // computed data

  const customFields = computed<CustomFieldDescription[]>(() => {
    const customFieldsByType = ModuleSettings.get(SettingKey.customFields);
    return (customFieldsByType?.[props.contentType] || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  });

  ////////////////////////////////
  // methods

  const hydrateFromContent = () => {
    if (!props.content) return;

    for (const field of customFields.value) {
      const current = props.content.getCustomField(field.name);

      if (field.fieldType === FieldType.Boolean) {
        values[field.name] = Boolean(current);
      } else {
        values[field.name] = (current ?? '') as any;
      }
    }
  };

  const selectOptionsForField = (field: CustomFieldDescription): { label: string; value: string }[] => {
    return (field.options || []).map((opt) => ({ label: opt, value: opt }));
  };

  const queueSave = () => {
    if (!props.content) return;

    const debounceTime = 500;
    clearTimeout(saveDebounceTimer);

    saveDebounceTimer = setTimeout(async () => {
      try {
        await props.content?.save();
      } catch (e) {
        console.error(e);
        notifyError(localize('applications.customFieldsBlocks.notifications.saveFailed'));
      }
    }, debounceTime);
  };

  ////////////////////////////////
  // event handlers

  const onFieldValueChanged = (field: CustomFieldDescription, value: string | boolean) => {
    if (!props.content) return;

    values[field.name] = value;
    props.content.setCustomField(field.name, value);
    queueSave();
  };

  ////////////////////////////////
  // watchers

  watch(
    () => [props.content?.uuid, props.contentType, customFields.value.map((f) => f.name).join(',')],
    () => hydrateFromContent(),
    { immediate: true }
  );

  ////////////////////////////////
  // lifecycle events
</script>

<style lang="scss" scoped>
</style>
