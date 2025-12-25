<template>
  <section class="standard-form">
    <div class="fcb-sheet-container flexcol species-list">
      <div class="species-list-table" data-application-part="content" style="overflow: hidden; height: calc(100vh - 325px);">
        <ScrollPanel style="flex: 1; min-height: 0; height: 100%; width: 100%;" :pt="{ wrapper: { style: 'height: 100%; width: 100%; scrollbar-width: thin; scrollbar-color: var(--fcb-scrollbar) var(--fcb-scrollbar-thumb)' }, content: { style: 'width: 100%; box-sizing: border-box' } }">
          <BaseTable
            :rows="rows"
            :columns="columns"
            :show-add-button="true"
            :show-filter="false"
            :allow-edit="true"
            :add-button-label="localize('applications.speciesList.labels.add')"
            :delete-item-label="localize('applications.speciesList.labels.delete')"
            @delete-item="onDeleteItem"
            @add-item="onAddItem"
            @cell-edit-complete="onCellEditComplete"
          />
        </ScrollPanel>
      </div>

      <footer class="form-footer" data-application-part="footer">
      <button 
        data-testid="species-list-reset-button"
        @click="onClickReset"
      >
        <i class="fa-solid fa-undo"></i>
        <label>{{ localize('labels.reset') }}</label>
      </button>
      <button 
        data-testid="species-list-save-button"
        @click="onClickSubmit"
      >
        <i class="fa-solid fa-save"></i>
        <label>{{ localize('labels.saveChanges') }}</label>
      </button>
    </footer>
    </div>
  </section>
</template> 

<script setup lang="ts">
  // library imports
  import { computed, onMounted, ref } from 'vue';
  
  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';
  import { speciesListApp } from '@/applications/settings/SpeciesListApplication';
  import { localize } from '@/utils/game';
  import { useMainStore } from '@/applications/stores';
  import { isCampaignBuilderAppOpen } from '@/utils/appWindow';

  // library components
  import ScrollPanel from 'primevue/scrollpanel';

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';

  // types
  import { Species, CellEditCompleteEvent } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  
  ////////////////////////////////
  // data
  // we need to add a uuid to use with the table and support deleting
  const speciesList = ref<Species[]>([]);

  ////////////////////////////////
  // computed data
  const rows = computed((): { uuid: string, name: string, description: string }[] => (
    speciesList.value.map((s) => ({
      name: s.name,
      description: s.description,
      uuid: s.id,
    })
  )));

  const columns = computed((): any[] => {
    // for now, just action and name
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 75px;', header: localize('labels.tableHeaders.actions') };
    const nameColumn = { field: 'name', style: 'text-align: left; width: 20%;', header: localize('labels.tableHeaders.name'), sortable: true, editable: true, smallEditBox: true }; 
    const descriptionColumn = { field: 'description', style: 'text-align: left', header: localize('labels.tableHeaders.description'), sortable: true, editable: true }; 

    return [actionColumn, nameColumn, descriptionColumn];
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDeleteItem = async (uuid: string): Promise<void> => {
    // Remove the species from our list
    const speciesIndex = speciesList.value.findIndex(s => s.id === uuid);
    if (speciesIndex !== -1) {
      speciesList.value.splice(speciesIndex, 1);
    }
  };

  const onAddItem = async (): Promise<void> => {
    // Add a new empty species to our list
    const newSpecies = {
      id: foundry.utils.randomID(),
      name: `!${localize('applications.speciesList.newSpecies')}`,   // ! to put at top of the list to make visible (since you'll probably be there when adding)
      description: localize('applications.speciesList.newDescription'),
    };
    speciesList.value.push(newSpecies);
  };

  const onCellEditComplete = async (event: CellEditCompleteEvent): Promise<void> => {
    const { data, field, newValue } = event;
    
    // Find the species in our list and update the specific field
    const speciesIndex = speciesList.value.findIndex(s => s.id === data.uuid);
    if (speciesIndex !== -1) {
      speciesList.value[speciesIndex] = {
        ...speciesList.value[speciesIndex],
        [field]: newValue,
      };
    }
  };

  const onClickSubmit = async () => {
    await ModuleSettings.set(SettingKey.speciesList, speciesList.value);

    // Emit a custom event to notify all SpeciesSelect components to refresh
    document.dispatchEvent(new CustomEvent('fcb-species-list-updated'));

    if (isCampaignBuilderAppOpen()) {
      await useMainStore().refreshCurrentContent();
    }

    // close
    speciesListApp?.close();
  }

  const onClickReset = async () => {
    speciesList.value =  [...ModuleSettings.get(SettingKey.speciesList)];
  }

  ////////////////////////////////
  // watchers
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // load the settings
    speciesList.value =  [...ModuleSettings.get(SettingKey.speciesList)];
  })
  

</script>

<style lang="scss">
  // Apply scrollbar styles to ScrollPanel
  .p-scrollpanel-wrapper {
    scrollbar-width: thin;
    scrollbar-color: var(--fcb-scrollbar) var(--fcb-scrollbar-thumb);
  }
  
  .p-scrollpanel-wrapper::-webkit-scrollbar {
    width: 8px;
  }
  
  .p-scrollpanel-wrapper::-webkit-scrollbar-track {
    background: var(--fcb-scrollbar);
  }
  
  .p-scrollpanel-wrapper::-webkit-scrollbar-thumb {
    background-color: var(--fcb-scrollbar-thumb);
    border-radius: 4px;
  }

  .fcb-species-list {
    background-color: var(--fcb-surface);
  }

  .fcb-species-list .window-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    /* scrolling is now handled by ScrollPanel */
    overflow: hidden;
  }

  .fcb-species-list .fcb-sheet-container {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
  }

  .fcb-species-list .species-list-table {
    flex: 1 1 auto;
    min-height: 0;
    /* scrolling is now handled by ScrollPanel */
    overflow: hidden;
  }

  /* keep the footer visible while content scrolls */
  .fcb-species-list .form-footer {
    // keep footer pinned to the bottom of the scrolling area
    position: sticky;
    flex: 0 0 auto;
    bottom: 0;
    background-color: var(--fcb-surface);
    z-index: 1;
    margin-top: auto;
  }
</style>

