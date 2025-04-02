<template>
  <form>
    <div ref="contentRef" class="wcb-sheet-container flexcol" style="overflow-y: auto">
      <header class="wcb-name-header flexrow">
        <i :class="`fas ${getTabTypeIcon(WindowTabType.PC)} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="wcb-input-name" 
          unstyled
          :disabled="true"
          class="wcb-input-name"
          :pt="{
            root: { class: 'full-height' } 
          }" 
        />
      </header>
      <div class="wcb-tab-body flexrow">
        <div class="tab flexcol">
          <div class="tab-inner">
            <div class="wcb-description-wrapper flexrow">
              <ImagePicker
                v-model="currentImage"
                :title="`Drag an actor here to link it`"
                @drop="onDropActor"
                @dragover="onDragoverActor"
                @click="onActorImageClick"
              />        
              <div class="wcb-description-content flexcol" style="height: unset">
                <div class="flexrow form-group">
                  <label>{{ localize('labels.fields.playerName') }}</label>
                  <InputText
                    v-model="playerName"
                    for="wcb-input-name" 
                    class="wcb-input-name"
                    unstyled
                    @update:model-value="onPlayerNameUpdate"
                    :pt="{
                      root: { class: 'full-height' } 
                    }" 
                  />
                </div>
              </div>
            </div>
            <div class="flexrow">
              <div class="flexcol">
                <label>{{ localize('labels.fields.backgroundPoints') }}</label>
                <Editor 
                  :initial-content="currentPC?.background || ''"
                  :has-button="true"
                  fixed-height="125"
                  @editor-saved="onBackgroundSaved"
                />

                <label>{{ localize('labels.fields.otherPlotPoints') }}</label>
                <Editor 
                  :initial-content="currentPC?.plotPoints || ''"
                  :has-button="true"
                  fixed-height="125"
                  @editor-saved="onPlotPointsSaved"
                />

                <label>{{ localize('labels.fields.desiredMagicItems') }}</label>
                <Editor 
                  :initial-content="currentPC?.magicItems || ''"
                  :has-button="true"
                  fixed-height="125"
                  @editor-saved="onMagicItemsSaved"
                />
              </div>  
            </div>
          </div>
        </div>
      </div>
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
  import { getTabTypeIcon, } from '@/utils/misc';
  import { localize, } from '@/utils/game';
  
  // library components
  import InputText from 'primevue/inputtext';

  // local components
  import Editor from '@/components/Editor.vue';
  import ImagePicker from '@/components/ImagePicker.vue';

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
  const name = computed(() => (currentPC.value?.name || ''));
  const currentImage = computed(() => (currentPC.value?.actor?.img || ''));

  ////////////////////////////////
  // methods
  

  ////////////////////////////////
  // event handlers
  const onDragoverActor = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDropActor = async (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // validate the drop
    if (!currentPC.value || event.dataTransfer?.types[0]!=='text/plain')
      return;
   
    try {  // in case parse fails
      let data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');

      if (data.type!=='Actor' || !data.uuid)
        return;

      currentPC.value.actorId = data.uuid;
      await currentPC.value.save();
      await mainStore.refreshPC();

      // need to refreshPC first to ensure that the new actor gets loaded so we can call name
      await navigationStore.propagateNameChange(currentPC.value.uuid, currentPC.value.name);
    }
    catch (err) {
      return;
    }      
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

  const onBackgroundSaved = async (content: string) => {
    if (!currentPC.value)
      return;

    currentPC.value.background = content;
    await currentPC.value.save();
  }

  const onPlotPointsSaved = async (content: string) => {
    if (!currentPC.value)
      return;

    currentPC.value.plotPoints = content;
    await currentPC.value.save();
  }

  const onMagicItemsSaved = async (content: string) => {
    if (!currentPC.value)
      return;

    currentPC.value.magicItems = content;
    await currentPC.value.save();
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