<template>
  <section class="window-content standard-form">
    <div class="standard-form scrollable">
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

      <footer class="form-footer" data-application-part="footer">
        <button 
          @click="onClickReset"
        >
          <i class="fa-solid fa-undo"></i>
          <label>{{ localize('labels.reset') }}</label>
        </button>
        <button 
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

  // library components

  // local components
  import BaseTable from '@/components/BaseTable/BaseTable.vue';

  // types
  import { Species } from '@/types';
  import { DataTableCellEditCompleteEvent } from 'primevue';
  
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
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 75px;', header: 'Actions' };
    const nameColumn = { field: 'name', style: 'text-align: left; width: 20%;', header: 'Name', sortable: true, editable: true, smallEditBox: true }; 
    const descriptionColumn = { field: 'description', style: 'text-align: left', header: 'Description', sortable: true, editable: true }; 

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
      name: '!New Species',   // ! to put at top of the list to make visible (since you'll probably be there when adding)
      description: 'Description for new species',
    };
    speciesList.value.push(newSpecies);
  };

  const onCellEditComplete = async (event: DataTableCellEditCompleteEvent): Promise<void> => {
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

    // refresh the content in case something with a species dropdown is open
    if (useMainStore().currentEntry) {
      await useMainStore().refreshEntry();
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
</style>

