<template>
  <form
    v-if="currentSetting"
  >
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow">
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
          @click="onGenerateButtonClick"
          :disabled="generateDisabled"
          :title="`${localize('tooltips.worldGenerateContent')}${generateDisabled ? ` - ${localize('tooltips.backendNotAvailable')}` : ''}`"
        >
          <i class="fas fa-head-side-virus"></i>
        </button>
      </header>     
      <nav class="fcb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="description">{{ localize('labels.tabs.campaign.description') }}</a>
      </nav>
      <div class="fcb-tab-body flexrow">
        <DescriptionTab 
          :name="currentSetting.name || 'World'"
          :image-url="currentSetting.img"
          :window-type="WindowTabType.World"
          @image-change="onImageChange"
        >
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.fields.worldGenre"
              help-text="help.worldGenre" 
            />
            <InputText
              v-model="currentSetting.genre"
              type="text"
              style="width: 250px; font-family: var(--font-body)"
              @update:model-value="onGenreSaved"
            />
          </div>
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.fields.worldFeeling"
              help-text="help.worldFeeling" 
            />
            <Textarea
              v-model="currentSetting.worldFeeling"
              rows="3"
              style="width: calc(100% - 2px); font-family: var(--font-body)"
              @update:model-value="onWorldFeelingSaved"
            />
          </div>
          <div class="flexrow form-group description">
            <Editor
                :initial-content="currentSetting.description || ''"
                @editor-saved="onDescriptionEditorSaved"
              />
          </div>
        </DescriptionTab>
      </div>
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
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getTabTypeIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { useMainStore, useNavigationStore, useSettingDirectoryStore } from '@/applications/stores';
  import { updateWindowTitle } from '@/utils/titleUpdater';
  import { Backend } from '@/classes';

  // library components
  import InputText from 'primevue/inputtext';
  import Textarea from 'primevue/textarea';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import Editor from '@/components/Editor.vue';
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import ConfigureNamesDialog from '@/components/AIGeneration/ConfigureNamesDialog.vue';

  // types
  import { WindowTabType, } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const settingDirectoryStore = useSettingDirectoryStore();
  const { currentContentTab, currentSetting, currentTab } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const tabs = ref<foundry.applications.ux.Tabs>();
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const icon =  getTabTypeIcon(WindowTabType.Campaign);
  const showConfigureNamesDialog = ref<boolean>(false);

  ////////////////////////////////
  // computed data
  const namePlaceholder = computed((): string => (localize('placeholders.worldName') || ''));
  const generateDisabled = computed(() => !Backend.available);
  
  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // debounce changes to name
  let debounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      const newValue = newName || '';
      if (currentSetting.value && currentSetting.value.name!==newValue) {
        currentSetting.value.name = newValue;
        await currentSetting.value.save();

        updateWindowTitle(newName || null);
        await settingDirectoryStore.refreshSettingDirectoryTree([currentSetting.value.uuid]);
        await navigationStore.propagateNameChange(currentSetting.value.uuid, newValue);
        await mainStore.propagateWorldNameChange(currentSetting.value);
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

  const onWorldFeelingSaved = async () => {
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

  const onNameStylesSave = async (selectedStyles: number[]) => {
    if (currentSetting.value) {
      currentSetting.value.nameStyles = selectedStyles;
      await currentSetting.value.save();
    }
    showConfigureNamesDialog.value = false;
  };

  ////////////////////////////////
  // watchers
  watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
    if (newTab!==oldTab)
      tabs.value?.activate(newTab || 'description');    
  });

  watch(currentTab, () => {
    if (!currentContentTab.value)
        currentContentTab.value = 'description';

      tabs.value?.activate(currentContentTab.value); 
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    tabs.value = new foundry.applications.ux.Tabs({ navSelector: '.tabs', contentSelector: '.fcb-tab-body', initial: 'description', /*callback: null*/ });

    // update the store when tab changes
    tabs.value.callback = () => {
      currentContentTab.value = tabs.value?.active || null;
    };

    // have to wait until they render
    await nextTick();
    if (contentRef.value)
      tabs.value.bind(contentRef.value);

    // load starting data values
    name.value = currentSetting.value?.name || '';
  });


</script>

<style lang="scss">
</style>