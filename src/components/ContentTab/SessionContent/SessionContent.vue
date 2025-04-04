<template>
  <form>
    <div ref="contentRef" class="wcb-sheet-container flexcol">
      <header class="wcb-name-header flexrow">
        <i :class="`fas ${getTabTypeIcon(WindowTabType.Session)} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="wcb-input-name" 
          class="wcb-input-name"
          unstyled
          :placeholder="localize('placeholders.sessionName')"
          :pt="{
            root: { class: 'full-height' } 
          }" 
          @update:model-value="onNameUpdate"
        />
      </header>
      <nav class="wcb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="start">{{ localize('labels.tabs.session.start') }}</a>
        <a class="item" data-tab="lore">{{ localize('labels.tabs.session.lore') }}</a>
        <a class="item" data-tab="scenes">{{ localize('labels.tabs.session.scenes') }}</a>
        <a class="item" data-tab="locations">{{ localize('labels.tabs.session.locations') }}</a>
        <a class="item" data-tab="npcs">{{ localize('labels.tabs.session.npcs') }}</a>
        <a class="item" data-tab="monsters">{{ localize('labels.tabs.session.monsters') }}</a>
        <a class="item" data-tab="magic">{{ localize('labels.tabs.session.magic') }}</a>
        <a class="item" data-tab="description">{{ localize('labels.tabs.session.notes') }}</a>
        <a class="item" data-tab="pcs">{{ localize('labels.tabs.session.pcs') }}</a>
      </nav>
      <div class="wcb-tab-body flexrow">
        <DescriptionTab
          :name="currentSession?.name || 'Session'"
          :image-url="currentSession?.img"
          @image-change="onImageChange"
        >
          <div class="flexrow form-group">
            <label>{{ localize('labels.fields.sessionNumber') }}</label>
            <InputText
              v-model="sessionNumber"
              for="wcb-input-number" 
              unstyled
              :placeholder="localize('placeholders.sessionNumber')"
              :pt="{
                root: { class: 'full-height' } 
              }" 
              @update:model-value="onNumberUpdate"
            />
          </div>
          <div class="flexrow form-group">
            <label>{{ localize('labels.fields.sessionDate') }}</label>
            <DatePicker 
              v-model="sessionDate"
              :show-button-bar="true"
            />   
          </div>
          <div class="flexrow form-group description">
            <Editor 
              :initial-content="currentSession?.notes || ''"
              :has-button="true"
              @editor-saved="onNotesEditorSaved"
            />
          </div>
        </DescriptionTab>
        <div class="tab flexcol" data-group="primary" data-tab="pcs">
          <div class="tab-inner">
            <CampaignPCsTab />
          </div>
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="npcs">
          <div class="tab-inner">
            <SessionNPCTab />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="scenes">
          <div class="tab-inner">
            <SessionSceneTab />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="start">
          <div class="tab-inner">
            <Editor 
              :initial-content="currentSession?.startingAction || ''"
              :has-button="true"
              @editor-saved="onStartEditorSaved"
            />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="lore">
          <div class="tab-inner">
            <SessionLoreTab />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="locations">
          <div class="tab-inner">
            <SessionLocationTab />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="monsters">
          <div class="tab-inner">
            <SessionMonsterTab />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="magic">
          <div class="tab-inner">
            <SessionItemTab />
          </div>  
        </div>
      </div>
    </div>
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';
  import { nextTick, ref, watch, onMounted, } from 'vue';

  // local imports
  import { useMainStore, useCampaignDirectoryStore, useNavigationStore, } from '@/applications/stores';
  import { WindowTabType } from '@/types';
  import { getTabTypeIcon } from '@/utils/misc';
  import { localize } from '@/utils/game'

  // library components
  import InputText from 'primevue/inputtext';
  import DatePicker from 'primevue/datepicker';
	
  // local components
  import CampaignPCsTab from '@/components/ContentTab/CampaignContent/CampaignPCsTab.vue';
  import Editor from '@/components/Editor.vue';
  import SessionLocationTab from '@/components/ContentTab/SessionContent/SessionLocationTab.vue';
  import SessionItemTab from '@/components/ContentTab/SessionContent/SessionItemTab.vue';
  import SessionNPCTab from '@/components/ContentTab/SessionContent/SessionNPCTab.vue';
  import SessionMonsterTab from '@/components/ContentTab/SessionContent/SessionMonsterTab.vue';
  import SessionSceneTab from '@/components/ContentTab/SessionContent/SessionSceneTab.vue';
  import SessionLoreTab from '@/components/ContentTab/SessionContent/SessionLoreTab.vue';
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue'; 

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
  const tabs = ref<foundry.applications.ux.Tabs>();
  
  const name = ref<string>('');
  const sessionNumber = ref<string>('');
  const sessionDate = ref<Date | undefined>(undefined);

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
        await navigationStore.propagateNameChange(currentSession.value.uuid, newValue);
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
        await navigationStore.propagateNameChange(currentSession.value.uuid, `${localize('labels.session.session')} ${newValue.toString()}`);
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

  const onImageChange = async (imageUrl: string) => {
    if (currentSession.value) {
      currentSession.value.img = imageUrl;
      await currentSession.value.save();
    }
  }


  ////////////////////////////////
  // watchers
  watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
    if (newTab!==oldTab)
      tabs.value?.activate(newTab || 'start');
  });

  let dateDebounceTimer: NodeJS.Timeout | undefined = undefined;
  watch(sessionDate, async (newDate: Date | undefined): Promise<void> => {
    const debounceTime = 500;
  
    clearTimeout(dateDebounceTimer);
    
    dateDebounceTimer = setTimeout(async () => {
      if (currentSession.value && currentSession.value.date?.toISOString()!==newDate?.toISOString()) {
        currentSession.value.date = newDate || null;
        await currentSession.value.save();
      }
    }, debounceTime);
  });

  watch(currentSession, async (newSession: Session | null): Promise<void> => {
    if (!currentContentTab.value)
      currentContentTab.value = 'start';

    tabs.value?.activate(currentContentTab.value); 

    if (newSession && newSession.uuid) {
      // load starting data values
      name.value = newSession.name || '';
      sessionNumber.value = newSession.number?.toString() || '';
      sessionDate.value = newSession.date || undefined;
    }
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
    if (contentRef.value) {
      tabs.value.bind(contentRef.value);
    }
  });


</script>

<style lang="scss">

</style>