<template>
  <div v-if="content && customFields.length > 0">
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
              @click.stop="onGenerateAiClick(field.name)"
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
            :key="`${content.uuid}-${field.name}`"
            :initial-content="String(values[field.name] ?? '')"
            :fixed-height="editorHeights[field.name] ? editorHeights[field.name] : (field.editorHeight ?? 4)"
            :resizable="true"
            :current-entity-uuid="content.uuid"
            @editor-saved="(newContent: string) => onFieldValueChanged(field, newContent)"
            @editor-resized="(height: number) => onEditorResized(field, height)"
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
  import { computed, reactive, watch, PropType, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { notifyError, notifyInfo } from '@/utils/notifications';
  import { useBackendStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { nameStyles } from '@/utils/nameStyles';
  import { promptReplace } from '@/utils/generation';
  import { replaceUUIDsInText } from '@/utils/sanitizeHtml';

  // library components
  import InputText from 'primevue/inputtext';
  import Select from 'primevue/select';
  import Checkbox from 'primevue/checkbox';

  // local components
  import Editor from '@/components/Editor.vue';

  // types
  import { CustomFieldContentType, CustomFieldDescription, FieldType } from '@/types';
  import { Arc, Campaign, Entry, FCBSetting, Front, Session } from '@/classes';
  import { ApiCustomGeneratePostRequest, ApiCustomGeneratePostRequestContentTypeEnum } from '@/apiClient';

  ////////////////////////////////
  // props

  const props = defineProps({
    contentType: {
      type: Number as PropType<CustomFieldContentType>,
      required: true
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
  }>();

  ////////////////////////////////
  // store

  const backendStore = useBackendStore();
  const { available: backendAvailable } = storeToRefs(backendStore);
  const { currentSetting, currentArc, currentSession, currentCampaign, currentEntry, currentFront } = useContentState();

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
  const editorHeights = reactive<Record<string, number>>({});

  const isGeneratingAi = reactive<Record<string, boolean>>({});

  let saveDebounceTimer: NodeJS.Timeout | undefined = undefined;

  ////////////////////////////////
  // computed data

  const content = computed((): Entry | Campaign | Arc | Front | Session | FCBSetting | null => {
    switch (props.contentType) {
      case CustomFieldContentType.Arc:
        return currentArc.value;

      case CustomFieldContentType.Campaign:
        return currentCampaign.value;

      case CustomFieldContentType.Front:
        return currentFront.value;

      case CustomFieldContentType.Session:
        return currentSession.value;

      case CustomFieldContentType.Setting:
        return currentSetting.value;

      case CustomFieldContentType.Character:
      case CustomFieldContentType.PC:
      case CustomFieldContentType.Location:
      case CustomFieldContentType.Organization:
        return currentEntry.value;

      default:
        throw new Error(`Unsupported content type in CustomFieldsBlocks.content(): ${props.contentType}`);
    }
  });

  const customFields = computed<CustomFieldDescription[]>(() => {
    ModuleSettings.getReactiveVersion();
    const customFieldsByType = ModuleSettings.get(SettingKey.customFields);
    return (customFieldsByType?.[props.contentType] || [])
      .filter((f) => !f.deleted)
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  });

  ////////////////////////////////
  // methods

  const aiGenerationKey = (field: CustomFieldDescription): string => {
    return `${content.value?.uuid || 'unknown'}-${field.name}`;
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

  const resolvePromptFromFieldTemplate = async (field: CustomFieldDescription): Promise<string> => {
    if (!content.value) return '';

    const baseName = String(content.value.name ?? '');

    const template = String(field.aiPromptTemplate ?? '').trim();
    if (!template) {
      return `Write ${field.label} for ${baseName}.`;
    }

    return await promptReplace(
      template, 
      baseName, 
      await replaceUUIDsInText(String((content.value as any).description ?? '')),
      String((content.value as any).type ?? ''),
      String((content.value as any).species ?? ''),
      String((content.value as any).parentName ?? ''),
      values as Record<string, boolean>
    );
  };

  const buildCustomGenerateRequest = async (field: CustomFieldDescription): Promise<ApiCustomGeneratePostRequest> => {
    if (!content.value || !currentSetting.value) 
      throw new Error('No content or setting in CustomFieldsBlocks.buildCustomGenerateRequest');

    const setting = await content.value.getSetting();

    // add the other things based on topic
    let parent: Entry | null = null;
    let grandparent: Entry | null = null;
    let type: string = '';
    let species: string = '';
    let speciesDescription: string = '';

  switch (props.contentType) {
    case CustomFieldContentType.Character:
      type = (content.value as Entry)?.type ?? '';
      const speciesList = ModuleSettings.get(SettingKey.speciesList) || [];
      const speciesId = (content.value as Entry)?.speciesId;
      const speciesItem = speciesList.find((s: any) => s.id === speciesId);
      species = speciesItem?.name ?? '';
      speciesDescription = speciesItem?.description ?? '';
      break;
    case CustomFieldContentType.PC:
      break;
    case CustomFieldContentType.Location:
    case CustomFieldContentType.Organization:
      type = (content.value as Entry)?.type ?? '';

      const entry = content.value as unknown as Entry;
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
      minWords: field.configuration?.minWords,
      maxWords: field.configuration?.maxWords,
      tone: field.configuration?.tone,
      tense: field.configuration?.tense,
      pov: field.configuration?.pov,
      contentRating: 'PG-13',
      includeHeadings: false,
      includeBullets: field.configuration?.includeBullets,
      avoidListsLongerThan: field.configuration?.avoidListsLongerThan
    }

    const request = {
      contentType: ApiContentTypeMap[props.contentType],
      name: (content.value)?.name ?? '',
      fieldLabel: field.label,
      prompt: await resolvePromptFromFieldTemplate(field),
      genre: currentSetting.value.genre ?? '',
      settingFeeling: currentSetting.value.settingFeeling ?? '',

      type,
      species,
      speciesDescription,
      parentName: parent?.name || '',
      parentType: parent?.type || '',
      parentDescription: await replaceUUIDsInText(parent?.description || ''),
      grandparentName: grandparent?.name || '',
      grandparentType: grandparent?.type || '',
      grandparentDescription: await replaceUUIDsInText(grandparent?.description || ''),
      description: await replaceUUIDsInText(String((content.value as any).description ?? '')),
      nameStyles: selectedNameStyles(currentSetting.value.genre ?? '', (setting as any).nameStyles || []),
      textModel: ModuleSettings.get(SettingKey.selectedTextModel),
      configuration,
    };
    return request;
  };

  const hydrateFromContent = () => {
    if (!content.value) 
      return;

    for (const field of customFields.value) {
      const current = content.value.getCustomField(field.name);

      if (field.fieldType === FieldType.Boolean) {
        values[field.name] = Boolean(current);
      } else {
        values[field.name] = (current ?? '') as any;
      }

      // Load custom height if it exists
      if (field.fieldType === FieldType.Editor) {
        const storedHeight = content.value.getCustomFieldHeight(field.name);
        if (storedHeight) {
          editorHeights[field.name] = storedHeight;
        } else if (field.editorHeight) {
          editorHeights[field.name] = field.editorHeight;
        }
      }
    }
  };

  const selectOptionsForField = (field: CustomFieldDescription): { label: string; value: string }[] => {
    return (field.options || []).map((opt) => ({ label: opt, value: opt }));
  };

  const queueSave = () => {
    if (!content.value) return;

    const debounceTime = 500;
    clearTimeout(saveDebounceTimer);

    // Capture the content reference at the time the debounce starts,
    // so we save to the correct document even if the tab switches before the debounce fires
    const contentToSave = content.value;

    saveDebounceTimer = setTimeout(async () => {
      try {
        await contentToSave?.save();
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
    if (!content.value) return;

    values[field.name] = value;
    content.value.setCustomField(field.name, value);
    queueSave();
  };

  const onEditorResized = (field: CustomFieldDescription, height: number) => {
    if (!content.value) return;

    editorHeights[field.name] = height;
    content.value.setCustomFieldHeight(field.name, height);
    queueSave();
  };

  const onGenerateAiClick = async (fieldName: string) => {
    // we load the field rather than just taking from the vue template because settings might have been updated
    const field = ModuleSettings.get(SettingKey.customFields)?.[props.contentType]?.find((f) => f.name === fieldName);
    if (!field) return;

    if (!content.value) return;
    if (!backendAvailable.value) return;
    if (!field.aiEnabled) return;

    // if there's already a value there, confirm that user wants to overwrite
    if (!(await FCBDialog.confirmDialog('Overwrite field?', `Are you sure you want to overwrite ${field.label} with new text?`)))
      return;

    const key = aiGenerationKey(field);
    if (isGeneratingAi[key]) return;
    isGeneratingAi[key] = true;

    try {
      notifyInfo(`Generating ${field.label} for ${(content.value as any).name}. This may take a minute...`);
      const request = await buildCustomGenerateRequest(field);
      const result = await backendStore.generateCustom(request);
      const html = String(result?.data?.response ?? '');
      onFieldValueChanged(field, html);
      notifyInfo(`AI completed for ${(content.value as any).name} (${field.label}).`);
    } catch (e) {
      console.error(e);
      notifyError(`Failed to generate ${field.label}.`);
    } finally {
      isGeneratingAi[key] = false;
    }
  };

  const onRelatedEntriesChanged = (added: string[], removed: string[]) => {
    if (!ModuleSettings.get(SettingKey.autoRelationships)) 
      return;

    if (!content.value) 
      return;

    emit('relatedEntriesChanged', added, removed);
  };
  
  ////////////////////////////////
  // watchers

  watch(() => [content.value?.uuid, props.contentType], () => {
      hydrateFromContent();
    },
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
