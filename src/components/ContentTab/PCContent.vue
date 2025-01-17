<template>
  <form class="'flexcol fwb-journal-subsheet ' + topic">
    <div ref="contentRef" class="sheet-container detailed flexcol">
      <header class="journal-sheet-header flexrow">
        <div class="header-details fwb-content-header">
          <h1 class="header-name flexrow">
            <i :class="`fas ${getTabTypeIcon(WindowTabType.PC)} sheet-icon`"></i>
            <InputText
              v-model="name"
              for="fwb-input-name" 
              :placeholder="localize('placeholders.sessionName')"
              :pt="{
                root: { class: 'full-height' } 
              }" 
              @update:model-value="onNameUpdate"
            />
          </h1>
          <div class="form-group fwb-content-header">
            PC stuff
          </div>
        </div>
      </header>
      <nav class="fwb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="notes">{{ localize('labels.tabs.session.notes') }}</a>
      </nav>
      <div class="fwb-tab-body flexcol">
        <div class="tab description flexcol" data-group="primary" data-tab="description">
          <div class="sheet-image">
            <!-- <img class="profile nopopout" src="{{data.src}}" data-edit="src" onerror="if (!this.imgerr) { this.imgerr = true; this.src = 'modules/monks-enhanced-journal/assets/person.png' }"> -->
          </div>
          <div class="tab-inner flexcol">
            Description
          </div>  
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="pcs">
          <div class="tab-inner flexcol">
            pcs
          </div>  
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="npcs">
          <div class="tab-inner flexcol">
            npcs
          </div>  
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="scenes">
          <div class="tab-inner flexcol">
            scenes
          </div>  
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="start">
          <div class="tab-inner flexcol">
            start
          </div>  
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="secrets">
          <div class="tab-inner flexcol">
            secrets
          </div>  
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="locations">
          <div class="tab-inner flexcol">
            locations
          </div>  
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="monsters">
          <div class="tab-inner flexcol">
            monsters
          </div>  
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="magic">
          <div class="tab-inner flexcol">
            magic
          </div>  
        </div>
      </div>
    </div>
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';
  import { nextTick, ref, watch, onMounted } from 'vue';

  // local imports
  import { useMainStore, useCampaignDirectoryStore, useNavigationStore } from '@/applications/stores';
  import { WindowTabType } from '@/types';
  import { getTabTypeIcon } from '@/utils/misc';
  import { localize } from '@/utils/game';

  // library components
  import InputText from 'primevue/inputtext';

  // local components
  
  // types
  import { Session } from '@/classes';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentSession, currentContentTab } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const tabs = ref<Tabs>();
  
  const name = ref<string>('');
  const sessionNumber = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
 
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  // debounce changes to name/number
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;
  let numberDebounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';
      if (currentSession.value && currentSession.value.name!==newValue) {
        currentSession.value.name = newValue;
        await currentSession.value.save();

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentSession.value.uuid]);
        await navigationStore.propogateNameChange(currentSession.value.uuid, newValue);
      }
    }, debounceTime);
  };

  const onNumberUpdate = (newNumber: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(numberDebounceTimer);
    
    numberDebounceTimer = setTimeout(async () => {
      const newValue = isNaN(parseInt(newNumber || '')) ? null : parseInt(newNumber as string);

      if (newValue && currentSession.value && currentSession.value.number!==newValue) {
        currentSession.value.number = newValue;
        await currentSession.value.save();

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentSession.value.uuid]);
        await navigationStore.propogateNameChange(currentSession.value.uuid, `${localize('labels.session.session')} ${newValue.toString()}`);
      }
    }, debounceTime);
  };

  ////////////////////////////////
  // watchers
  // watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
  //   if (newTab!==oldTab)
  //     tabs.value?.activate(newTab || 'description');    
  // });

  watch(currentSession, async (newSession: Session | null, oldSession: Session | null): Promise<void> => {
    // if we changed entries, reset the tab
    if (newSession?.uuid!==oldSession?.uuid )
      currentContentTab.value = 'description';

    if (newSession && newSession.uuid) {
      // load starting data values
      name.value = newSession.name || '';
      sessionNumber.value = newSession.number?.toString() || '';
    }
  });


  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    tabs.value = new Tabs({ navSelector: '.tabs', contentSelector: '.fwb-tab-body', initial: 'description', /*callback: null*/ });

    // update the store when tab changes
    tabs.value.callback = () => {
      // currentContentTab.value = tabs.value?.active || null;
    };

    tabs.value.callback = () => {
      // currentContentTab.value = tabs.value?.active || null;
    };

    // have to wait until they render
    await nextTick();
    if (contentRef.value) {
      tabs.value.bind(contentRef.value);
    }
  });


</script>

<style lang="scss">

</style>