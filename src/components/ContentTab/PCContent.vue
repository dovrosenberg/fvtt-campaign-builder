<template>
  <form class="'flexcol fwb-journal-subsheet ' + topic">
    <div ref="contentRef" class="sheet-container detailed flexcol">
      <header class="journal-sheet-header flexrow">
        <div 
          class="sheet-image" 
          @drop="onDropActor"
          @click="onActorImageClick"
        >
          <div
            v-if="currentPC?.actorId"
          >
            <img 
              class="portrait" 
              :src="currentImage"
            > 
          </div>
          <div
            v-else
          >
            Drag an actor here to link it
          </div>
        </div>
        <div class="header-details fwb-content-header">
          <h1 class="header-name flexrow">
            <i :class="`fas ${getTabTypeIcon(WindowTabType.PC)} sheet-icon`"></i>
            <InputText
              v-model="name"
              for="fwb-input-name" 
              :disabled="true"
              :pt="{
                root: { class: 'full-height' } 
              }" 
            />
          </h1>
          <div class="fwb-tab-body flexcol">
            <div class="tab description flexcol" data-group="primary" data-tab="overview">
              <div class="tab-inner flexcol">
                <div>
                  <InputText
                    v-model="playerName"
                    for="fwb-input-name" 
                    @update:model-value="onPlayerNameUpdate"
                    :pt="{
                      root: { class: 'full-height' } 
                    }" 
                  />
                </div>
                Background<br>
                <Editor 
                  :initial-content="currentPC?.background || ''"
                  :has-button="true"
                  target="content-description"
                  @editor-saved="onBackgroundSaved"
                />
                Other plot points<br>
                <Editor 
                  :initial-content="currentPC?.plotPoints || ''"
                  :has-button="true"
                  target="content-description"
                  @editor-saved="onPlotPointsSaved"
                />
                Magic Items<br>
                <Editor 
                  :initial-content="currentPC?.magicItems || ''"
                  :has-button="true"
                  target="content-description"
                  @editor-saved="onMagicItemsSaved"
                />
              </div>
            </div>
          </div> 
        </div>
      </header>
    </div>
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';
  import { ref, watch, onMounted, computed } from 'vue';

  // local imports
  import { useMainStore, useNavigationStore } from '@/applications/stores';
  import { WindowTabType } from '@/types';
  import { getTabTypeIcon } from '@/utils/misc';
  
  // library components
  import InputText from 'primevue/inputtext';

  // local components
  
  // types
  import { PC } from '@/classes';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentPC } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const playerName = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
 
  ////////////////////////////////
  // computed data
  const name = computed(() => {
    if (!currentPC.value) 
      return '';

      return currentPC.value.name || '';
  });

  const currentImage = computed(() => {
    if (!currentPC.value) 
      return '';

    return currentPC.value.actor?.img || '';
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  const onDropActor = async (event: DragEvent) => {
    if (currentPC.value && event.dataTransfer?.types[0]==='text/plain') {
      try {
        let data;
        data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');
        if (data.type==='Actor') {
          currentPC.value.actorId = data.uuid;
          await currentPC.value.save();
          await mainStore.refreshPC();

          // need to refreshPC first to ensure that the new actor gets loaded so we can call name
          await navigationStore.propogateNameChange(currentPC.value.uuid, currentPC.value.name);
        }  
      } 
      catch (err) {
        return false;
      }
    }

    return true;
  }

  // debounce changes to name
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;
  
  const onPlayerNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';
      if (currentPC.value && currentPC.value.playerName!==newValue) {
        currentPC.value.playerName = newValue;
        await currentPC.value.save();
      }
    }, debounceTime);
  };

  const onActorImageClick = async () => {
    const actor = await currentPC.value?.getActor();
    if (actor)
      await actor?.sheet?.render(true);
  }

  ////////////////////////////////
  // watchers
  // watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
  //   if (newTab!==oldTab)
  //     tabs.value?.activate(newTab || 'description');    
  // });

  watch(currentPC, async (newPC: PC | null): Promise<void> => {
    if (newPC && newPC.uuid) {
      // load starting data values
      playerName.value = newPC.playerName || '';

      await newPC.getActor();
    }
  });


  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    if (currentPC.value) {
      // load starting data values
      playerName.value = currentPC.value.playerName || '';

      await currentPC.value.getActor();
    }
  });

</script>

<style lang="scss">

</style>