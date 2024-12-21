<template>
  <form class="'flexcol fwb-journal-subsheet ' + topic">
    <div ref="contentRef" class="sheet-container detailed flexcol">
      <header class="journal-sheet-header flexrow">
        <div class="sheet-image">
          <!-- <img class="profile nopopout" src="{{data.src}}" data-edit="src" onerror="if (!this.imgerr) { this.imgerr = true; this.src = 'modules/monks-enhanced-journal/assets/person.png' }"> -->
        </div>
        <div class="header-details fwb-content-header">
          <h1 class="header-name flexrow">
            <i :class="`fas ${getTabTypeIcon(WindowTabType.Session)} sheet-icon`"></i>
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
            <label>{{ localize('labels.fields.sessionNumber') }}</label>
            <InputText
              v-model="sessionNumber"
              for="fwb-input-number" 
              :placeholder="localize('placeholders.sessionNumber')"
              :pt="{
                root: { class: 'full-height' } 
              }" 
              @update:model-value="onNumberUpdate"
            />
          </div>
          <div>
            <nav class="fwb-sheet-navigation flexrow stage-tabs" data-group="stage">
              <a class="item" data-tab="preparation">{{ localize('labels.tabs.preparation') }}</a>
              <a class="item" data-tab="gamtime">{{ localize('labels.tabs.gametime') }}</a>
            </nav>
          </div>
        </div>
      </header>
      <div class="fwb-tab-body flexcol">
        <div class="tab description flexcol" data-group="stage" data-tab="preparation">
          <div class="tab-inner flexcol">
            Prep tab<br>

            <nav class="fwb-sheet-navigation flexrow detail-tabs" data-group="primary">
              <a class="item" data-tab="description">{{ localize('labels.tabs.description') }}</a>
            </nav>
          </div>  
        </div>
        <div class="tab description flexcol" data-group="stage" data-tab="gametime">
          <div class="tab-inner flexcol">
            Game time tab
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
  const { currentSession } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const stageTabs = ref<Tabs>();
  const detailTabs = ref<Tabs>();
  
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

      if (currentSession.value && currentSession.value.number!==newValue) {
        currentSession.value.number = newValue;
        await currentSession.value.save();

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentSession.value.uuid]);
        await navigationStore.propogateNameChange(currentSession.value.uuid, newValue);
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
    // // if we changed entries, reset the tab
    // if (newEntry?.uuid!==oldEntry?.uuid )
    //   currentContentTab.value = 'description';

    // if (!newEntry || !newEntry.uuid) {
    //   topic.value = null;
    // } else {
    //   let newTopic;

    //   newTopic = newEntry.topic as ValidTopic;
    //   if (!newTopic) 
    //     throw new Error('Invalid entry topic in EntryContent.watch-currentEntry');

    //   // we're going to show a content page
    //   topic.value = newTopic;

    //   // load starting data values
    //   name.value = newEntry.name || '';

    //   // set the parent and valid parents
    //   if (!newEntry.uuid) {
    //     parentId.value = null;
    //     validParents.value = [];
    //   } else {
    //     if (currentWorldId.value) {
    //       parentId.value = WorldFlags.getHierarchy(currentWorldId.value, newEntry.uuid)?.parentId || null;
      
    //       // TODO - need to refresh this somehow if things are moved around in the directory
    //       validParents.value = validParentItems(currentWorldId.value, newTopic, newEntry).map((e)=> ({
    //         id: e.id,
    //         label: e.name || '',
    //       }));
    //     }
    //   }
  
    //   // reattach the editor to the new entry
    //   rawDocument.value = newEntry.raw;
    // }
  });


  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    stageTabs.value = new Tabs({ navSelector: '.stage-tabs', contentSelector: '.fwb-tab-body', initial: 'preparation', /*callback: null*/ });
    detailTabs.value = new Tabs({ navSelector: '.detail-tabs', contentSelector: '.fwb-tab-body', initial: 'description', /*callback: null*/ });

    // update the store when tab changes
    stageTabs.value.callback = () => {
      // currentContentTab.value = tabs.value?.active || null;
    };

    detailTabs.value.callback = () => {
      // currentContentTab.value = tabs.value?.active || null;
    };

    // have to wait until they render
    await nextTick();
    if (contentRef.value) {
      stageTabs.value.bind(contentRef.value);
      detailTabs.value.bind(contentRef.value);
    }
  });


</script>

<style lang="scss">

</style>