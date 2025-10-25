<template>
  <!-- The overall directory sidebar -->
  <div
    id="fcb-directory"
    ref="root"
    class="tab flexcol journal-directory"
  >
    <!-- Directory Header -->
    <header class="fcb-directory-header">
      <div class="fcb-header-filter flexrow">
        <InputText
          v-model="filterText"
          for="fcb-directory-filter"
          unstyled
          :placeholder="localize('placeholders.filter')"
          autocomplete="off"
          :pt="{
            root: {
              class: 'full-height',
            }
          }"
        />
        <a
          class="fcb-header-control create-button"
          :data-tooltip="localize('tooltips.createSetting')"
          @click="onCreateSettingClick"
        >
          <i class="fas fa-globe"></i>
          <i class="fas fa-plus"></i>
        </a>
        <a
          class="fcb-header-control collapse-all"
          data-testid="collapse-all-button"
          :data-tooltip="localize('tooltips.collapseAllTopics')"
          @click="onCollapseAllClick"
        >
          <i class="fa-duotone fa-folder-tree"></i>
        </a>
      </div>
      <div class="fcb-header-group-type flexrow">
        <input
          id="fcb-group-by-type"
          type="checkbox"
          :checked="isGroupedByType"
          @change="onGroupTypeChange"
        >
        <label for="fcb-group-by-type">
          {{ localize('labels.groupTree') }}
        </label>
      </div>
    </header>

    <!-- First, a setting dropdown if here is more than one setting -->
    <div v-if="settingOptions.length > 1">
      <Select
        v-model="selectedSetting"
        :options="settingOptions"
        optionLabel="name"
        optionValue="uuid"
        :disabled="isInPlayMode"
        :pt="{
          root: { 
            'data-testid': 'setting-select',
            style: 'width: 100%',
            'data-tooltip': isInPlayMode ? localize('tooltips.cannotChangeSettingInPlayMode') : ''
          }
        }"
        @change="onSettingChange"
      />    
    </div>

    <Splitter layout="vertical" class="fcb-directory-splitter">
      <SplitterPanel :size="60" class="fcb-directory-panel">
        <div v-if="isSettingTreeRefreshing" class="fcb-loading-container">
          <ProgressSpinner v-if="isSettingTreeRefreshing" />
        </div>
        <div v-else class="fcb-directory-panel-wrapper fcb-setting-directory">
          <SettingDirectory />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="40" class="fcb-directory-panel">
        <div v-if="isCampaignTreeRefreshing" class="fcb-loading-container">
          <ProgressSpinner v-if="isCampaignTreeRefreshing" />
        </div>
        <div v-else class="fcb-directory-panel-wrapper fcb-campaign-directory">
          <CampaignDirectory />
        </div>
      </SplitterPanel>
    </Splitter>

    <!-- Directory Footer -->
    <!--
      <footer class="directory-footer action-buttons {{#if data.unavailable}}warning{{/if}}">
        {{~#if data.unavailable}}
          <i class="fa-solid fa-triangle-exclamation"></i>
          <a class="show-issues">{{localize "SUPPORT.UnavailableDocuments" count=data.unavailable document=data.label}}</a>
        {{/if~}}
      </footer>
    -->
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, watch, onMounted } from 'vue';
  import { storeToRefs } from 'pinia';
  import ProgressSpinner from 'primevue/progressspinner';

  // local imports
  import { localize } from '@/utils/game';
  import { useSettingDirectoryStore, useCampaignDirectoryStore, useMainStore } from '@/applications/stores';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
  import InputText from 'primevue/inputtext';
  import Splitter from 'primevue/splitter';
  import SplitterPanel from 'primevue/splitterpanel';
  import Select, { SelectChangeEvent } from 'primevue/select';

  // local components
  import CampaignDirectory from './CampaignDirectory/CampaignDirectory.vue';
  import SettingDirectory from './SettingDirectory/SettingDirectory.vue';
  
  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const settingDirectoryStore = useSettingDirectoryStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const mainStore = useMainStore();
  const { currentSetting, isInPlayMode } = storeToRefs(mainStore);
  const { filterText, isSettingTreeRefreshing, isGroupedByType, } = storeToRefs(settingDirectoryStore);
  const { isCampaignTreeRefreshing } = storeToRefs(campaignDirectoryStore);

  ////////////////////////////////
  // data
  const root = ref<HTMLElement>();
  const selectedSetting = ref<string | null>(currentSetting.value?.uuid || null);
  
  ////////////////////////////////
  // computed data
  const settingOptions = computed(() => {
    const settings = ModuleSettings.get(SettingKey.settingIndex) || [];
    
    return settings.map((setting) => ({
      name: setting.name,
      uuid: setting.settingId
    }));
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  /**
   * Handles changing the setting in the dropdown
   * @param event The change event
   */
  const onSettingChange = async (event: SelectChangeEvent) => {
    const settingId = event.value;

    if (settingId) {
      // we're changing settings
      await mainStore.setNewSetting(settingId);
    }
  };


  // close all topics
  const onCollapseAllClick = (event: MouseEvent) => {
    event.stopPropagation();

    void settingDirectoryStore.collapseAll();
  };

  // create a setting
  const onCreateSettingClick = async (event: MouseEvent) => {
    event.stopPropagation();

    await settingDirectoryStore.createSetting();
  };

  // save grouping to settings
  const onGroupTypeChange = async (event: Event) => {
    isGroupedByType.value = (event.currentTarget as HTMLInputElement)?.checked || false;
  };
  
  ////////////////////////////////
  // watchers
  watch(() => currentSetting.value?.uuid, (newSettingId) => {
    if (newSettingId !== selectedSetting.value) {
      selectedSetting.value = newSettingId || null;
    }
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    selectedSetting.value = currentSetting.value?.uuid || null;
  });
</script>

<style lang="scss">
  #fcb-directory {
    .action-buttons {
      padding-left: 30px;
    }

    .fcb-directory-splitter {
      flex: 1 1 auto;  // take up all remaining space
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.5);

      .fcb-directory-panel-wrapper {
        /* This inner container handles vertical scrolling, which allows position:sticky to work correctly. */
        overflow-y: auto;
        height: 100%;
      }

      .fcb-directory-panel {
        /* This outer container (the SplitterPanel) handles horizontal scrolling. */
        overflow-x: auto;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    }

    .fcb-directory-header {
      flex: 0;
      // background-color: var(--fcb-header-background);
      border-bottom: 1px solid var(--fcb-header-border-color);
      color: var(--fcb-sidebar-label-color);
      margin-bottom: 0px;
      padding: 8px 0px 0px 8px;
      font-family: var(--fcb-font-family);

      .fcb-header-filter {
        #fcb-directory-filter {
          flex: 1;
          height: var(--form-field-height);
        }

        .fcb-header-control {
          flex: 0 0 32px;
          justify-content: center;
          text-align: center;
          position: relative;
          display: inline-flex;
          align-items: center;

          i {
            &.fa-plus {
              position: absolute;
              top: -.4rem;
              right: .1875rem;
              // font-size: 0.6rem;
              // transform instead of font-size because if browser has a 
              //    min font size we don't want to obscure the globe
              transform: scale(0.65);
              transform-origin: top right;
              background: rgba(255, 255, 255, 0.7);
              color: black;
              padding: 1px;
              border-radius: 4px;
            }  
          }
        }
      }

      .fcb-header-group-type {
        flex: 1;
        font-size: var(--font-size-12);

        #fcb-group-by-type {
          flex: 0;
        }

        label {
          padding-left: 3px;
        }
      }
    }
  }

  // the nested tree structure
  // https://www.youtube.com/watch?v=rvKCsHS590o&t=1755s has a nice overview of how this is assembled

  ul.fcb-directory-tree > li:after, ul.fcb-directory-tree > li:before {
    display:none;
  }

  .fcb-loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
  }
</style>