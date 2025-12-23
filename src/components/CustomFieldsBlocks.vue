<template>
  <div v-if="props.content && customFields.length > 0">
    <template v-for="field in customFields" :key="field.name">
      <template v-if="field.fieldType === FieldType.Editor">
        <div class="flexrow form-group">
          <label>
            {{ field.label }}
            <button
              v-if="backendAvailable && field.aiEnabled"
              type="button"
              class="fcb-ai-button"
              :title="localize('tooltips.generateAIContent')"
              :disabled="isGeneratingAi[aiGenerationKey(field)]"
              @click.stop="onGenerateAiClick(field)"
            >
              <i class="fas fa-head-side-virus"></i>
            </button>
            <i
              v-if="field.helpText"
              class="fas fa-info-circle tooltip-icon"
              :data-tooltip="field.helpText"
              :style="field.helpLink ? 'cursor: pointer;' : ''"
              @click.stop="onHelpIconClick(field)"
            ></i>
          </label>
        </div>
        <div class="flexrow form-group">
          <Editor
            :key="`${props.content.uuid}-${field.name}`"
            :initial-content="String(values[field.name] ?? '')"
            :fixed-height="`${field.editorHeight ?? 4}rem`"
            :current-entity-uuid="props.content.uuid"
            :enable-related-entries-tracking="props.enableRelatedEntriesTracking"
            @editor-saved="(newContent: string) => onFieldValueChanged(field, newContent)"
            @related-entries-changed="onRelatedEntriesChanged"
          />
        </div>
      </template>

      <template v-else>
        <div class="flexrow form-group">
          <label class="side-label">
            {{ field.label }}
            <i
              v-if="field.helpText"
              class="fas fa-info-circle tooltip-icon"
              :data-tooltip="field.helpText"
              :style="field.helpLink ? 'cursor: pointer;' : ''"
              @click.stop="onHelpIconClick(field)"
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
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { notifyError, notifyInfo } from '@/utils/notifications';
  import { useBackendStore, useMainStore } from '@/applications/stores';
  import { nameStyles } from '@/utils/nameStyles';

  // library components
  import InputText from 'primevue/inputtext';
  import Select from 'primevue/select';
  import Checkbox from 'primevue/checkbox';

  // local components
  import Editor from '@/components/Editor.vue';

  // types
  import { CustomFieldContentType, CustomFieldDescription, FieldType } from '@/types';
  import { FCBJournalEntryPage } from '@/classes/Documents/FCBJournalEntryPage';
  import { Entry } from '@/classes';
  import { ApiCustomGeneratePostRequest, ApiCustomGeneratePostRequestContentTypeEnum } from '@/apiClient';

  ////////////////////////////////
  // props

  const props = defineProps({
    contentType: {
      type: Number as PropType<CustomFieldContentType>,
      required: true
    },
    enableRelatedEntriesTracking: {
      type: Boolean,
      required: false,
      default: false
    },
    content: {
      type: Object as PropType<FCBJournalEntryPage<any, any> | null>,
      required: false,
      default: null
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
  }>();

  ////////////////////////////////
  // store

  const backendStore = useBackendStore();
  const mainStore = useMainStore();
  const { available: backendAvailable } = storeToRefs(backendStore);
  const { currentSetting } = storeToRefs(mainStore);

  ////////////////////////////////
  // data

  const ApiContentTypeMap = {
    [CustomFieldContentType.Setting]: ApiCustomGeneratePostRequestContentTypeEnum.Setting,
    [CustomFieldContentType.Character]: ApiCustomGeneratePostRequestContentTypeEnum.Character,
    [CustomFieldContentType.PC]: ApiCustomGeneratePostRequestContentTypeEnum.Pc,
    [CustomFieldContentType.Location]: ApiCustomGeneratePostRequestContentTypeEnum.Location,
    [CustomFieldContentType.Organization]: ApiCustomGeneratePostRequestContentTypeEnum.Organization,
    [CustomFieldContentType.Campaign]: ApiCustomGeneratePostRequestContentTypeEnum.Campaign,
    [CustomFieldContentType.Arc]: ApiCustomGeneratePostRequestContentTypeEnum.Arc,
    [CustomFieldContentType.Session]: ApiCustomGeneratePostRequestContentTypeEnum.Session,
    [CustomFieldContentType.Front]: ApiCustomGeneratePostRequestContentTypeEnum.Front,
  };

  const values = reactive<Record<string, unknown>>({});

  const isGeneratingAi = reactive<Record<string, boolean>>({});

  let saveDebounceTimer: NodeJS.Timeout | undefined = undefined;

  ////////////////////////////////
  // computed data

  const customFields = computed<CustomFieldDescription[]>(() => {
    const customFieldsByType = ModuleSettings.get(SettingKey.customFields);
    return (customFieldsByType?.[props.contentType] || [])
      .filter((f) => !f.deleted)
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  });

  ////////////////////////////////
  // methods

  const aiGenerationKey = (field: CustomFieldDescription): string => {
    return `${props.content?.uuid || 'unknown'}-${field.name}`;
  };

  const selectedNameStyles = (genre: string, settingNameStyles: readonly number[]): string[] => {
    return (settingNameStyles || [])
      .map((index) => {
        const style = nameStyles[index];
        if (!style) return '';
        return style.prompt.replace('{genre}', genre || '');
      })
      .filter((style) => style !== '');
  };

  const baseDescriptionForContent = (): string => {
    if (!props.content) return '';

    switch (props.contentType) {
      case CustomFieldContentType.Session:
        return String((props.content as any).notes ?? '');
      default:
        return String((props.content as any).description ?? '');
    }
  };

  const resolvePromptFromFieldTemplate = (field: CustomFieldDescription): string => {
    if (!props.content) return '';

    const baseName = String((props.content as any).name ?? '');

    const template = String(field.aiPromptTemplate ?? '').trim();
    if (!template) {
      return `Write ${field.label} for ${baseName}.`;
    }

    const tokenValues: Record<string, string> = {
      name: baseName,
      description: baseDescriptionForContent(),
      type: String((props.content as any).type ?? ''),
      species: String((props.content as any).species ?? ''),
      parent: String((props.content as any).parentName ?? ''),
    };

    for (const key of Object.keys(values)) {
      const v = values[key];
      tokenValues[key] = typeof v === 'string' ? v : String(v ?? '');
    }

    return template.replace(/\{([^{}]*)\}/g, (_match, inner) => {
      const k = String(inner ?? '').trim();
      if (!k) return '';
      return tokenValues[k] ?? '';
    });
  };

  const buildCustomGenerateRequest = async (field: CustomFieldDescription): Promise<ApiCustomGeneratePostRequest> => {
    if (!props.content || !currentSetting.value) 
      throw new Error('No content or setting in CustomFieldsBlocks.buildCustomGenerateRequest');

    const setting = await props.content.getSetting();

    // add the other things based on topic
    let parent: Entry | null = null;
    let grandparent: Entry | null = null;
    let type: string = '';
    let species: string = '';
    let speciesDescription: string = '';

  switch (props.contentType) {
    case CustomFieldContentType.Character:
      type = (props.content as Entry)?.type ?? '';
      const speciesList = ModuleSettings.get(SettingKey.speciesList) || [];
      const speciesId = (props.content as Entry)?.speciesId;
      const speciesItem = speciesList.find((s: any) => s.id === speciesId);
      species = speciesItem?.name ?? '';
      speciesDescription = speciesItem?.description ?? '';
      break;
    case CustomFieldContentType.PC:
      break;
    case CustomFieldContentType.Location:
    case CustomFieldContentType.Organization:
      type = (props.content as Entry)?.type ?? '';

      const entry = props.content as unknown as Entry;
      const parentId = await entry.getParentId();
      if (parentId) {
        parent = await Entry.fromUuid(parentId);

        if (parent) {
          const grandparentId = await parent.getParentId();
          if (grandparentId) {
            grandparent = await Entry.fromUuid(grandparentId);
          }
        }
      }
      break;
    }

    const configuration = {
      minWords: field.configuration.minWords,
      maxWords: field.configuration.maxWords,
      tone: field.configuration.tone,
      tense: field.configuration.tense,
      pov: field.configuration.pov,
      contentRating: 'PG-13',
      includeHeadings: false,
      includeBullets: field.configuration.includeBullets,
      avoidListsLongerThan: field.configuration.avoidListsLongerThan
    }

    const request = {
      contentType: ApiContentTypeMap[props.contentType],
      name: (props.content)?.name ?? '',
      fieldLabel: field.label,
      prompt: resolvePromptFromFieldTemplate(field),
      genre: currentSetting.value.genre ?? '',
      settingFeeling: currentSetting.value.settingFeeling ?? '',

      type,
      species,
      speciesDescription,
      parentName: parent?.name || '',
      parentType: parent?.type || '',
      parentDescription: parent?.description || '',
      grandparentName: grandparent?.name || '',
      grandparentType: grandparent?.type || '',
      grandparentDescription: grandparent?.description || '',
      description: baseDescriptionForContent(),
      nameStyles: selectedNameStyles(currentSetting.value.genre ?? '', (setting as any).nameStyles || []),
      textModel: ModuleSettings.get(SettingKey.selectedTextModel),
      configuration,
    };
    return request;
  };

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

  const onHelpIconClick = (field: CustomFieldDescription) => {
    if (field.helpLink) {
      window.open(field.helpLink, '_blank');
    }
  };

  const onFieldValueChanged = (field: CustomFieldDescription, value: string | boolean) => {
    if (!props.content) return;

    values[field.name] = value;
    props.content.setCustomField(field.name, value);
    queueSave();
  };

  const onGenerateAiClick = async (field: CustomFieldDescription) => {
    if (!props.content) return;
    if (!backendAvailable.value) return;
    if (!field.aiEnabled) return;

    const key = aiGenerationKey(field);
    if (isGeneratingAi[key]) return;
    isGeneratingAi[key] = true;

    try {
      notifyInfo(`Generating ${field.label} for ${(props.content as any).name}. This may take a minute...`);
      const request = await buildCustomGenerateRequest(field);
      const result = await backendStore.generateCustom(request);
      const html = String(result?.data?.response ?? '');
      onFieldValueChanged(field, html);
      notifyInfo(`AI completed for ${(props.content as any).name} (${field.label}).`);
    } catch (e) {
      console.error(e);
      notifyError(`Failed to generate ${field.label}.`);
    } finally {
      isGeneratingAi[key] = false;
    }
  };

  const onRelatedEntriesChanged = (added: string[], removed: string[]) => {
    if (!props.enableRelatedEntriesTracking) 
      return;

    if (!props.content) 
      return;

    emit('relatedEntriesChanged', added, removed);
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
  .fcb-ai-button {
    margin-left: 0.5rem;
    padding: 0 0.25rem;
    font-size: 0.75rem;
    line-height: 1.1rem;
    height: 1.1rem;
    border: 1px solid var(--fcb-button-border);
    background: var(--fcb-surface-2);
    color: var(--fcb-text);
    border-radius: 3px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .fcb-ai-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
