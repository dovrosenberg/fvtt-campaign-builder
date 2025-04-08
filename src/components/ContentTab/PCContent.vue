<template>
  <form>
    <div ref="contentRef" class="fcb-sheet-container flexcol" style="overflow-y: auto">
      <header class="fcb-name-header flexrow">
        <i :class="`fas ${getTabTypeIcon(WindowTabType.PC)} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="fcb-input-name" 
          unstyled
          :disabled="true"
          class="fcb-input-name"
          :pt="{
            root: { class: 'full-height' } 
          }" 
        />
      </header>
      <div class="fcb-tab-body flexrow">
        <div class="tab flexcol">
          <div class="tab-inner">
            <div class="fcb-description-wrapper flexrow">
              <div 
                class="fcb-sheet-image"
                @drop="onDropActor"
                @dragover="onDragoverActor"
                @click="onActorImageClick"
                @contextmenu.prevent="onImageContextMenu"
              >
                <div v-if="currentPC?.actorId">
                  <img 
                    class="profile"
                    :src="currentImage"
                  >
                </div>
                <div v-else>
                  Drag an actor here to link it.
                </div>
              </div>
              <div class="fcb-description-content flexcol" style="height: unset">
                <div class="flexrow form-group">
                  <LabelWithHelp
                    label-text="labels.fields.playerName"
                  />
                  <InputText
                    v-model="playerName"
                    for="fcb-input-name" 
                    class="fcb-input-name"
                    unstyled
                    @update:model-value="onPlayerNameUpdate"
                    :pt="{
                      root: { class: 'full-height' } 
                    }" 
                  />
                </div>
                <div class="flexrow form-group">
                  <LabelWithHelp
                    label-text="labels.fields.backgroundPoints"
                  />
                </div>
                <div class="flexrow form-group">
                    <Editor 
                    :initial-content="currentPC?.background || ''"
                    :has-button="true"
                    :style="{ 'height': '240px', 'margin-bottom': '6px'}"
                    @editor-saved="onBackgroundSaved"
                  />
                </div>
                <div class="flexrow form-group">
                  <LabelWithHelp
                    label-text="labels.fields.otherPlotPoints"
                  />
                </div>
                <div class="flexrow form-group">
                  <Editor 
                    :initial-content="currentPC?.plotPoints || ''"
                    :has-button="true"
                    :style="{ 'height': '240px', 'margin-bottom': '6px'}"
                    @editor-saved="onPlotPointsSaved"
                  />
                </div>
                <div class="flexrow form-group">
                  <LabelWithHelp
                    label-text="labels.fields.desiredMagicItems"
                  />
                </div>
                <div class="flexrow form-group">
                  <Editor 
                    :initial-content="currentPC?.magicItems || ''"
                    :has-button="true"
                    :style="{ 'height': '240px', 'margin-bottom': '6px'}"
                    @editor-saved="onMagicItemsSaved"
                  />
                </div>
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
  import { ref, watch, onMounted, computed, toRaw } from 'vue';

  // local imports
  import { useMainStore, useNavigationStore } from '@/applications/stores';
  import { WindowTabType } from '@/types';
  import { getTabTypeIcon, } from '@/utils/misc';
  
  // library components
  import InputText from 'primevue/inputtext';

  // local components
  import Editor from '@/components/Editor.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';

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

  const onImageContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
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
      await toRaw(actor)?.sheet?.render(true);
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