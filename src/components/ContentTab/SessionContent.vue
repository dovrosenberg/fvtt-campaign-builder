<template>
  <form class="'flexcol fwb-journal-subsheet ' + topic">
    <div ref="contentRef" class="fwb-sheet-container detailed flexcol">
      <header class="fwb-journal-sheet-header flexrow">
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
          <div class="flexrow">
            <div class="form-group fwb-content-header flexcol">
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
            <div class="form-group fwb-content-header flexcol">
              <label>{{ localize('labels.fields.sessionDate') }}</label>
              <Datepicker 
                v-model="sessionDate"
                :typeable="true"
                :clearable="true"
                :weekStartsOn="0"
              />   
            </div>
          </div>
        </div>
      </header>
      <nav class="fwb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="notes">{{ localize('labels.tabs.session.notes') }}</a>
        <a class="item" data-tab="pcs">{{ localize('labels.tabs.session.pcs') }}</a>
        <a class="item" data-tab="start">{{ localize('labels.tabs.session.start') }}</a>
        <a class="item" data-tab="lore">{{ localize('labels.tabs.session.lore') }}</a>
        <a class="item" data-tab="scenes">{{ localize('labels.tabs.session.scenes') }}</a>
        <a class="item" data-tab="locations">{{ localize('labels.tabs.session.locations') }}</a>
        <a class="item" data-tab="npcs">{{ localize('labels.tabs.session.npcs') }}</a>
        <a class="item" data-tab="monsters">{{ localize('labels.tabs.session.monsters') }}</a>
        <a class="item" data-tab="magic">{{ localize('labels.tabs.session.magic') }}</a>
      </nav>
      <div class="fwb-tab-body flexcol">
        <div class="tab description flexcol" data-group="primary" data-tab="notes">
          <div class="tab-inner flexcol">
            <Editor 
              :initial-content="currentSession?.notes || ''"
              :has-button="true"
              @editor-saved="onNotesEditorSaved"
            />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="pcs">
          <div class="tab-inner flexcol">
            <CampaignPCsTable />
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
            <Editor 
              :initial-content="currentSession?.startingAction || ''"
              :has-button="true"
              @editor-saved="onStartEditorSaved"
            />
          </div>  
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="secrets">
          <div class="tab-inner flexcol">
            secrets
          </div>  
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="locations">
          <div class="tab-inner flexcol">
            <SessionTable 
              :rows="[]"
              :columns="[]"  
              :delete-item-label="localize('tooltips.deleteLocation')"   
              :allow-edit="false"
              :show-add-button="true"
              :add-button-label="localize('labels.session.addLocation')" 
              @add-item="onAddLocation"
              @delete-item="onDeleteLocation"
              @mark-item-done="onMarkLocationDone"
              @unmark-item-done="onUnmarkLocationDone"
              @move-to-next-session="onMoveLocationToNext"        
            />
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
  import { useMainStore, useCampaignDirectoryStore, useNavigationStore, useSessionStore } from '@/applications/stores';
  import { WindowTabType } from '@/types';
  import { getTabTypeIcon } from '@/utils/misc';
  import { localize } from '@/utils/game'

  // library components
  import InputText from 'primevue/inputtext';
  import Datepicker from 'vue3-datepicker'
	
  // local components
  import CampaignPCsTable from '@/components/DocumentTable/CampaignPCsTable.vue';
  import Editor from '@/components/Editor.vue';
  import SessionTable from '@/components/DocumentTable/SessionTable.vue';

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
  const sessionStore = useSessionStore();
  const { currentSession, currentContentTab } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const tabs = ref<Tabs>();
  
  const name = ref<string>('');
  const sessionNumber = ref<string>('');
  const sessionDate = ref<Date>(new Date());

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

  const onNotesEditorSaved = async (newContent: string) => {
    if (!currentSession.value)
      return;

    currentSession.value.notes = newContent;
    await currentSession.value.save();
  };

  const onStartEditorSaved = async (newContent: string) => {
    if (!currentSession.value)
      return;

    currentSession.value.startingAction = newContent;
    await currentSession.value.save();
  };

  const onAddLocation = async () => {
  };

  const onDeleteLocation = async (uuid: string) => {
    await sessionStore.deleteLocation(uuid);
  }

  const onMarkLocationDone = async (uuid: string) => {
    await sessionStore.markLocationDelivered(uuid, true);
  }

  const onUnmarkLocationDone = async (uuid: string) => {
    await sessionStore.markLocationDelivered(uuid, false);
  }

  const onMoveLocationToNext = async (uuid: string) => {
    await sessionStore.moveLocationToNext(uuid);
  }

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