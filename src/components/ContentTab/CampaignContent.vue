<template>
  <form :class="'flexcol fwb-journal-subsheet'">
    <div ref="contentRef" class="sheet-container detailed flexcol">
      <header class="journal-sheet-header flexrow">
        <div class="sheet-image">
          <!-- <img class="profile nopopout" src="{{data.src}}" data-edit="src" onerror="if (!this.imgerr) { this.imgerr = true; this.src = 'modules/monks-enhanced-journal/assets/person.png' }"> -->
        </div>
        <div class="header-details fwb-content-header">
          <h1 class="header-name flexrow">
            <i :class="`fas ${icon} sheet-icon`"></i>
            <InputText
              v-model="name"
              for="fwb-input-name" 
              :placeholder="namePlaceholder"                
              :pt="{
                root: { class: 'full-height' } 
              }" 
              @update:model-value="onNameUpdate"
            />
          </h1>
        </div>
      </header>
      <nav class="fwb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="description">{{ localize('labels.tabs.description') }}</a>
        <a class="item" data-tab="pcs">{{ localize('labels.tabs.pcs') }}</a>
      </nav>
      <div class="fwb-tab-body flexcol">
        <div class="tab description flexcol" data-group="primary" data-tab="description">
          <div class="tab-inner flexcol">
            <Editor 
              :initial-content="currentCampaign?.description || ''"
              :has-button="true"
              target="content-description"
              @editor-saved="onDescriptionEditorSaved"
            />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="pcs">
          <div class="tab-inner flexcol">
            <CampaignPCsTable />
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

  // local components
  import Editor from '@/components/Editor.vue';
  import CampaignPCsTable from '@/components/DocumentTable/CampaignPCsTable.vue';
  
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
  const { currentCampaign, currentContentTab } = storeToRefs(mainStore);

  ////////////////////////////////
  // data

  const tabs = ref<Tabs>();
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const icon =  getTabTypeIcon(WindowTabType.Campaign);
 
  ////////////////////////////////
  // computed data
  const namePlaceholder = computed((): string => (localize('placeholders.campaignName') || ''));
  
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

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentCampaign.value.uuid]);
        await navigationStore.propogateNameChange(currentCampaign.value.uuid, newValue);
      }
    }, debounceTime);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentCampaign.value)
      return;

    currentCampaign.value.description = newContent;
    await currentCampaign.value.save();

    //need to reset
    // if it's not automatic, clear and reset the documentpage
    // (this._partials.DescriptionEditoras as Editor).attachEditor(descriptionPage, newContent);
  };

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
    tabs.value = new Tabs({ navSelector: '.tabs', contentSelector: '.fwb-tab-body', initial: 'description', /*callback: null*/ });

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