<template>
  <form
    v-if="currentSetting"
  >
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow" data-testid="setting-name-header">
        <i :class="`fas ${icon} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="fcb-input-name"
          class="fcb-input-name"
          unstyled
          :placeholder="namePlaceholder"
          :pt="{
            root: { class: 'full-height' }
          }"
          @update:model-value="onNameUpdate"
        />
        <button
          class="fcb-generate-button"
          data-testid="setting-generate-button"
          @click="onGenerateButtonClick"
          :disabled="generateDisabled"
          :title="`${localize('tooltips.settingGenerateContent')}${generateDisabled ? ` - ${localize('tooltips.backendNotAvailable')}` : ''}`"
        >
          <i class="fas fa-head-side-virus"></i>
        </button>
      </header>
      <ContentTabStrip 
        default-tab="description"
        :tabs="tabs" 
      >
        <DescriptionTab 
          :name="currentSetting.name || 'Setting'"
          :image-url="currentSetting.img"
          :window-type="WindowTabType.Setting"
          :show-image="ModuleSettings.get(SettingKey.showImages)?.settings ?? true"
          @image-change="onImageChange"
        >
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.fields.settingGenre"
              help-text="help.settingGenre" 
            />
            <InputText
              v-model="currentSetting.genre"
              type="text"
              unsyled
              data-testid="setting-genre-input"
              style="width: 250px; font-family: var(--fcb-font-family)"
              @update:model-value="onGenreSaved"
            />
          </div>
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.fields.settingFeeling"
              help-text="help.settingFeeling" 
            />
            <Textarea
              v-model="currentSetting.settingFeeling"
              rows="3"
              data-testid="setting-feeling-textarea"
              unstyled
              style="width: calc(100% - 2px); font-family: var(--fcb-font-family)"
              @update:model-value="onSettingFeelingSaved"
            />
          </div>
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.fields.settingDescription"
              top-label
            />
          </div>
          <div class="flexrow form-group fcb-description">
            <Editor
                :initial-content="currentSetting.description || ''"
                :fixed-height="descriptionHeight"
                :resizable="true"
                :current-entity-uuid="currentSetting?.uuid"
                @editor-saved="onDescriptionEditorSaved"
                @editor-resized="onDescriptionEditorResized"
              />
          </div>

          <CustomFieldsBlocks
            v-if="currentSetting"
            :content-type="CustomFieldContentType.Setting"
          />
        </DescriptionTab>
        <JournalTab
          :initial-journals="currentSetting.journals"
          @journals-updated="onJournalsUpdate"
        />
      </ContentTabStrip>
    </div>
  </form>	 
  <ConfigureNamesDialog
    v-if="currentSetting"
    v-model="showConfigureNamesDialog"
    :initial-selected-styles="currentSetting.nameStyles ? [...currentSetting.nameStyles] : [0]"
    @save="onNameStylesSave"
  />
</template>

<script setup lang="ts">

  // library imports
  import { computed, onMounted, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getTabTypeIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { useMainStore, useNavigationStore, useSettingDirectoryStore } from '@/applications/stores';
  import TitleUpdaterService from '@/utils/titleUpdater';
  import { useBackendStore } from '@/applications/stores';
  import { notifyWarn } from '@/utils/notifications';
  import { ModuleSettings, SettingKey } from '@/settings/ModuleSettings';

  // library components
  import InputText from 'primevue/inputtext';
  import Textarea from 'primevue/textarea';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import Editor from '@/components/Editor.vue';
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue';
  import JournalTab from '@/components/ContentTab/JournalTab.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import ConfigureNamesDialog from '@/components/AIGeneration/ConfigureNamesDialog.vue';
  import ContentTabStrip from '@/components/ContentTab/ContentTabStrip.vue';
  
  // types
  import { CustomFieldContentType, RelatedJournal, WindowTabType, } from '@/types';
  import { FCBSetting } from '@/classes';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const settingDirectoryStore = useSettingDirectoryStore();
  const backendStore = useBackendStore();
  const { currentSetting } = storeToRefs(mainStore);
  const { available } = storeToRefs(backendStore);

  ////////////////////////////////
  // data
  const name = ref<string>('');
  const icon = getTabTypeIcon(WindowTabType.Setting);
  const showConfigureNamesDialog = ref<boolean>(false);
  const descriptionHeight = ref<number>(18.75);  // for handling description editor height

  ////////////////////////////////
  // computed data
  const namePlaceholder = computed((): string => (localize('placeholders.settingName') || ''));
  const generateDisabled = computed(() => !available.value);
  
  const tabs = computed(() => [
    { id: 'description', label: localize('labels.description') },
    { id: 'journals', label: localize('labels.journals') },
  ]);

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  const onDescriptionEditorResized = async (height: number) => {
    if (!currentSetting.value)
      return;
    
    descriptionHeight.value = height;
    currentSetting.value?.setCustomFieldHeight('###description###', height);
    await currentSetting.value?.save();
  };

  // debounce changes to name
  let debounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      const newValue = newName || '';

      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('notifications.nameRequired'));
        name.value = currentSetting.value?.name!;
        return;
      }

      if (currentSetting.value && currentSetting.value.name!==newValue) {
        currentSetting.value.name = newValue;
        await currentSetting.value.save();

        TitleUpdaterService.updateWindowTitle(newName || null);
        await settingDirectoryStore.refreshSettingDirectoryTree([currentSetting.value.uuid]);
        await navigationStore.propagateNameChange(currentSetting.value.uuid, newValue);
        await mainStore.propagateSettingNameChange(currentSetting.value);
      }
    }, debounceTime);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentSetting.value)
      return;

    currentSetting.value.description = newContent;
    await currentSetting.value.save();
  };

  const onGenreSaved = async () => {
    const debounceTime = 500;
  
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      if (currentSetting.value)
        await currentSetting.value.save();
    }, debounceTime);
  }

  const onSettingFeelingSaved = async () => {
    const debounceTime = 500;
  
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      if (currentSetting.value)
        await currentSetting.value.save();
    }, debounceTime);
  }

  const onImageChange = async (imageUrl: string) => {
    if (currentSetting.value) {
      currentSetting.value.img = imageUrl;
      await currentSetting.value.save();
    }
  }

  const onGenerateButtonClick = (event: MouseEvent): void => {
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    // Show context menu
    const menuItems = [
      {
        icon: 'fa-cog',
        iconFontClass: 'fas',
        label: localize('contextMenus.generate.configureNames'),        
        onClick: () => {
          showConfigureNamesDialog.value = true;
        }
      },
    ];

    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: menuItems,
    });
  };

  const onJournalsUpdate = async (newJournals: RelatedJournal[]) => {
    if (currentSetting.value) {
      currentSetting.value.journals = newJournals;
      await currentSetting.value.save();
    }
  };

  const onNameStylesSave = async (selectedStyles: number[]) => {
    if (currentSetting.value) {
      currentSetting.value.nameStyles = selectedStyles;
      await currentSetting.value.save();
    }
    showConfigureNamesDialog.value = false;
  };

  ////////////////////////////////
  // watchers
  watch(currentSetting, async (newSetting: FCBSetting | null): Promise<void> => {
    if (newSetting && newSetting.uuid) {
      // load starting data values
      descriptionHeight.value = newSetting.getCustomFieldHeight('###description###') || 18.75;
    }
  });
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // load starting data values
    name.value = currentSetting.value?.name || '';
  });


</script>

<style lang="scss">
</style>
