<template>
  <!-- For some reason, submitting this form (and only this form, not any of the other content forms) by hitting enter in the name input crashes the browser -->
  <form @submit.prevent="">
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow" style="margin-bottom: 10px;">
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
      </header>
      <div class="fcb-sheet-subtab-container flexrow">
        <div class="fcb-subtab-wrapper">
          <nav class="fcb-sheet-navigation flexrow tabs" data-group="primary">
            <a class="item" data-tab="description">{{ localize('labels.tabs.campaign.description') }}</a>
            <a class="item" data-tab="pcs">{{ localize('labels.tabs.campaign.pcs') }}</a>
            <a class="item" data-tab="lore">{{ localize('labels.tabs.campaign.lore') }}</a>
            <a class="item" data-tab="ideas">{{ localize('labels.tabs.campaign.ideas') }}</a>
            <a class="item" v-if="showToDoTab" data-tab="todo">{{ localize('labels.tabs.campaign.toDo') }} ({{ currentCampaign?.todoItems.length || 0 }})</a>
          </nav>
          <div class="fcb-tab-body flexrow">
            <DescriptionTab 
              :name="currentCampaign?.name || 'Campaign'"
              :image-url="currentCampaign?.img"
              :window-type="WindowTabType.Campaign"
              @image-change="onImageChange"
            >
              <div class="flexrow form-group">
                <LabelWithHelp
                  label-text="labels.fields.campaignDescription"
                  top-label
                />
              </div>
              <div class="flexrow form-group">
                <Editor 
                  :initial-content="currentCampaign?.description || ''"
                  :style="{ 'height': '240px', 'margin-bottom': '6px'}"
                  @editor-saved="onDescriptionEditorSaved"
                />
              </div>
              <div class="flexrow form-group">
                <LabelWithHelp
                  label-text="labels.fields.campaignHouseRules"
                  top-label
                />
              </div>
              <div class="flexrow form-group">
                <Editor 
                  :initial-content="currentCampaign?.houseRules || ''"
                  :style="{ 'height': '240px', 'margin-bottom': '6px'}"
                  @editor-saved="onHouseRulesEditorSaved"
                />
              </div>
            </DescriptionTab>
            <div class="tab flexcol" data-group="primary" data-tab="pcs">
              <div class="tab-inner">
                <CampaignPCsTab />
              </div>
            </div>
            <div class="tab flexcol" data-group="primary" data-tab="lore">
              <div class="tab-inner">
                <CampaignLoreTab />
              </div>
            </div>
            <div class="tab flexcol" data-group="primary" data-tab="ideas">
              <div class="tab-inner">
                <CampaignIdeasTab />
              </div>
            </div>
            <div v-if="showToDoTab" class="tab flexcol" data-group="primary" data-tab="todo">
              <div class="tab-inner">
                <CampaignToDoTab />
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getTabTypeIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useMainStore, useNavigationStore } from '@/applications/stores';
  import { ModuleSettings, SettingKey } from '@/settings';
  
  // library components
  import InputText from 'primevue/inputtext';

  // local components
  import Editor from '@/components/Editor.vue';
  import CampaignPCsTab from '@/components/ContentTab/CampaignContent/CampaignPCsTab.vue';
  import CampaignLoreTab from '@/components/ContentTab/CampaignContent/CampaignLoreTab.vue';
  import CampaignToDoTab from '@/components/ContentTab/CampaignContent/CampaignToDoTab.vue';
  import CampaignIdeasTab from '@/components/ContentTab/CampaignContent/CampaignIdeasTab.vue';
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';

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
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentCampaign, currentContentTab, currentSetting } = storeToRefs(mainStore);

  ////////////////////////////////
  // data

  const tabs = ref<foundry.applications.ux.Tabs>();
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const icon =  getTabTypeIcon(WindowTabType.Campaign);
 
  ////////////////////////////////
  // computed data
  const namePlaceholder = computed((): string => (localize('placeholders.campaignName') || ''));

  const showToDoTab = computed(() => {
    return ModuleSettings.get(SettingKey.enableToDoList);
  });

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
      if (currentCampaign.value && currentCampaign.value.name!==newValue) {
        currentCampaign.value.name = newValue;
        await currentCampaign.value.save();

        // need to make sure the mapping is right, because that's where refreshCampaignDirectoryTree pulls from
        if (currentSetting.value)
          currentSetting.value.updateCampaignName(currentCampaign.value.uuid, newValue);

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentCampaign.value.uuid]);
        await navigationStore.propagateNameChange(currentCampaign.value.uuid, newValue);
      }
    }, debounceTime);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentCampaign.value)
      return;

    currentCampaign.value.description = newContent;
    await currentCampaign.value.save();
  };

  const onHouseRulesEditorSaved = async (newContent: string) => {
    if (!currentCampaign.value)
      return;

    currentCampaign.value.houseRules = newContent;
    await currentCampaign.value.save();
  };

  const onImageChange = async (imageUrl: string) => {
    if (currentCampaign.value) {
      currentCampaign.value.img = imageUrl;
      await currentCampaign.value.save();
    }
  }

  ////////////////////////////////
  // watchers
  watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
    if (newTab!==oldTab)
      tabs.value?.activate(newTab || 'description');
  });

  watch(currentCampaign, async (): Promise<void> => {
    if (!currentCampaign.value)
      return;

    if (!currentContentTab.value)
      currentContentTab.value = 'description';

    tabs.value?.activate(currentContentTab.value); 

    // load starting data values
    name.value = currentCampaign.value.name || '';
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
  });


</script>

<style lang="scss">
  .fcb-sheet-subtab-container {
    flex: 1;
    min-height: 0;
    display: flex;
    padding-bottom: 10px;
  }

  .fcb-subtab-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .fcb-tab-body {
    flex: 1;
    min-height: 0;
  }
</style>