<template>
  <div ref="contentRef" class="fcb-sheet-container flexcol">
    <header class="fcb-name-header flexrow">
      <i :class="`fas ${getTabTypeIcon(WindowTabType.Front)} sheet-icon`"></i>
      <InputText
        v-model="name"
        for="fcb-input-name" 
        class="fcb-input-name"
        unstyled
        :placeholder="localize('placeholders.dangerName')"
        :pt="{
          root: { class: 'full-height' } 
        }" 
        @update:model-value="onNameUpdate"
      />
    </header>
    <!-- <ContentTabStrip 
      :tabs="tabs" 
      default-tab="description"
    >
      <DescriptionTab
        :name="currentFront?.name || 'Front'"
        :image-url="currentFront?.img"
        :window-type="WindowTabType.Front"
        alt-tab-id="description"
        @image-change="onImageChange"
      > -->
        <div class="flexrow form-group">
          <LabelWithHelp
            label-text="labels.fields.impendingDoom"
          />
          <TextArea
            v-model="impendingDoom"
            rows="3"
            data-testid="danger-impending-doom"
            unstyled
            style="width: calc(100% - 2px); font-family: var(--fcb-font-family)"
            @update:model-value="onImpendingDoomSaved"
          />
        </div>
        <div 
          class="flexrow form-group"
        >
          <LabelWithHelp
            label-text="labels.fields.description"
            top-label
          />
        </div>
        <div 
          class="flexrow form-group"
        >
          <Editor 
            :initial-content="currentDanger?.description || ''"
            fixed-height="240px"
            :current-entity-uuid="currentFront?.uuid"
            @editor-saved="onDescriptionEditorSaved"
          />
        </div>
      <!-- </DescriptionTab>
    </ContentTabStrip> -->
  </div>
</template>

<script setup lang="ts">

  // library imports
  import { computed, ref, watch, onBeforeUnmount } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, } from '@/applications/stores';
  import { localize } from '@/utils/game'
  import { getTabTypeIcon } from '@/utils/misc';
  import { notifyWarn } from '@/utils/notifications';

  // library components
  import TextArea from 'primevue/textarea';

  // local components
  import Editor from '@/components/Editor.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';

  // types
  import { Danger, WindowTabType, } from '@/types';
import { onMounted } from 'vue';
 
  ////////////////////////////////
  // props
  const props = defineProps({
    index: {
      type: Number,
      required: true,
    },
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  // const frontStore = useFrontStore();
  const mainStore = useMainStore();
  const { currentFront } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const name = ref<string>('New Danger');
  const impendingDoom = ref<string>('');

  ////////////////////////////////
  // computed data
  const currentDanger = computed(() => currentFront.value?.dangers[props.index] || null);

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  // debounce changes to name
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';

      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('errors.nameRequired'));
        name.value = currentDanger.value?.name!;
        return;
      }

      if (currentFront.value && currentDanger.value && currentDanger.value.name!==newValue) {
        currentDanger.value.name = newValue;
        currentFront.value.updateDanger(props.index, currentDanger.value);
        await currentFront.value.save();
      }
    }, debounceTime);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentFront.value || !currentDanger.value)
      return;

    currentDanger.value.description = newContent;
    currentFront.value.updateDanger(props.index, currentDanger.value);
    await currentFront.value.save();
  };

  // const onDragoverNew = (event: DragEvent) => {
  //   event.preventDefault();  
  //   event.stopPropagation();

  //   if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
  //     event.dataTransfer.dropEffect = 'none';
  // }

  // const onDropNew = async(event: DragEvent) => {
  //   event.preventDefault();  

  //   // parse the data 
  //   let data = getValidatedData(event);
  //   if (!data)
  //     return;

  //   // make sure it's the right format
  //   if (data.topic !== Topics.Location || !data.childId) {
  //     return;
  //   }

  //   await sessionStore.addLocation(data.childId);      
  // };

  const refreshDanger = () => {
    if (currentDanger.value) {
      name.value = currentDanger.value.name || localize('placeholders.dangerName');
      impendingDoom.value = currentDanger.value.impendingDoom || '';
    }
  };

  ////////////////////////////////
  // watchers
  watch(currentDanger, async (newDanger: Danger | null): Promise<void> => {
    if (newDanger) {
      refreshDanger();
    }
  });
  

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    if (currentDanger.value) {
      refreshDanger();
    }
  });

  // cleanup timers on unmount
  onBeforeUnmount(() => {
    clearTimeout(nameDebounceTimer);
  });
  

</script>

<style lang="scss">

</style>