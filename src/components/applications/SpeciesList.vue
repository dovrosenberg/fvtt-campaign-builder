<template>
  <section class="window-content standard-form">
    <div class="standard-form scrollable">
      <BaseTable
        :rows="rows"
        :columns="columns"
        :show-add-button="true"
        :show-filter="false"
        :add-button-label="localize('applications.speciesList.labels.add')"
        :delete-item-label="localize('applications.speciesList.labels.delete')"
        @edit-item="onEditItem"
        @delete-item="onDeleteItem"
        @add-item="onAddItem"
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

  // library components

  // local components
  import BaseTable from '@/components/BaseTable/BaseTable.vue';

  // types
  import { Species } from '@/types';
  
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
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 100px; max-width: 100px', header: 'Actions' };
    const nameColumn = { field: 'name', style: 'text-align: left', header: 'Name', sortable: true }; 
    const descriptionColumn = { field: 'description', style: 'text-align: left', header: 'Description', sortable: true }; 

    return [actionColumn, nameColumn, descriptionColumn];
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onClickSubmit = async () => {
    await ModuleSettings.set(SettingKey.speciesList, speciesList.value);

    // close
    speciesListApp?.close();
  }

  const onClickReset = async () => {
    speciesList.value =  ModuleSettings.get(SettingKey.speciesList);
  }

  ////////////////////////////////
  // watchers
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // load the settings
    speciesList.value =  ModuleSettings.get(SettingKey.speciesList);
  })
  

</script>

<style lang="scss">
</style>

