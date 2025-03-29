<template>
  <form :class="'flexcol wcb-journal-subsheet'">
    <div ref="contentRef" class="wcb-sheet-container flexcol">
      <header class="wcb-journal-sheet-header flexrow">
        <ImagePicker
          v-model="campaignImg"
          :title="`Select Image for ${currentCampaign?.name || 'Campaign'}`"
        />
        <div class="wcb-content-header">
          <h1 class="header-name flexrow">
            <i :class="`fas ${icon} sheet-icon`"></i>
            <InputText
              v-model="name"
              for="wcb-input-name" 
              class="wcb-input-name"
              unstyled
              :placeholder="namePlaceholder"                
              :pt="{
                root: { class: 'full-height' } 
              }" 
              @update:model-value="onNameUpdate"
            />
          </h1>
        </div>
      </header>
      <nav class="wcb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="description">{{ localize('labels.tabs.campaign.description') }}</a>
        <a class="item" data-tab="pcs">{{ localize('labels.tabs.campaign.pcs') }}</a>
        <a class="item" data-tab="lore">{{ localize('labels.tabs.campaign.lore') }}</a>
      </nav>
      <div class="wcb-tab-body flexcol">
        <div class="tab description flexcol" data-group="primary" data-tab="description">
          <div v-if="currentCampaign" class="tab-inner flexcol">
            <Editor 
              :initial-content="currentCampaign.description || ''"
              :has-button="true"
              @editor-saved="onDescriptionEditorSaved"
            />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="pcs">
          <div class="tab-inner flexcol">
            <CampaignPCsTab />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="lore">
          <div class="tab-inner flexcol">
            <CampaignLoreTab />
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
  
  // library components
  import InputText from 'primevue/inputtext';
  import Textarea from 'primevue/textarea';

  // local components
  import Editor from '@/components/Editor.vue';
  import CampaignPCsTab from '@/components/ContentTab/CampaignContent/CampaignPCsTab.vue';
  import CampaignLoreTab from '@/components/ContentTab/CampaignContent/CampaignLoreTab.vue';
  import ImagePicker from '@/components/ImagePicker.vue';
  
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
  const { currentCampaign, currentContentTab, currentWorld } = storeToRefs(mainStore);

  ////////////////////////////////
  // data

  const tabs = ref<foundry.applications.ux.Tabs>();
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const icon =  getTabTypeIcon(WindowTabType.Campaign);
 
  ////////////////////////////////
  // computed data
  const namePlaceholder = computed((): string => (localize('placeholders.campaignName') || ''));
  const campaignImg = computed({
    get: (): string => currentCampaign.value?.img || '',
    set: async (value: string) => {
      if (currentCampaign.value) {
        currentCampaign.value.img = value;
        await currentCampaign.value.save();
      }
    }
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
        if (currentWorld.value)
          currentWorld.value.updateCampaignName(currentCampaign.value.uuid, newValue);

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

  const onGenreSaved = async () => {
    const debounceTime = 500;
  
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      if (currentCampaign.value)
        await currentCampaign.value.save();
    }, debounceTime);
  }

  const onWorldFeelingSaved = async () => {
    const debounceTime = 500;
  
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      if (currentCampaign.value)
        await currentCampaign.value.save();
    }, debounceTime);
  }

  ////////////////////////////////
  // watchers
  watch([currentCampaign], async (): Promise<void> => {
    if (!currentCampaign.value)
      return;

    // reset the tab
    currentContentTab.value = 'description';

    // load starting data values
    name.value = currentCampaign.value.name || '';
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    tabs.value = new foundry.applications.ux.Tabs({ navSelector: '.tabs', contentSelector: '.wcb-tab-body', initial: 'description', /*callback: null*/ });

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

</style>