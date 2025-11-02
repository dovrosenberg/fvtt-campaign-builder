<template>
  <div class="fcb-description-wrapper flexrow">
    <div ref="contentRef" class="fcb-sheet-container flexcol" style="overflow-y: visible">
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
      
      <!-- Impending Doom -->
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
      
      <!-- Description -->
      <div class="flexrow form-group">
        <LabelWithHelp
          label-text="labels.fields.description"
          top-label
        />
      </div>
      <div class="flexrow form-group">
        <Editor
          :initial-content="currentDanger?.description || ''"
          fixed-height="120px"
          :current-entity-uuid="currentFront?.uuid"
          @editor-saved="onDescriptionEditorSaved"
        />
      </div>
      
      <!-- Participants -->
      <div class="flexrow form-group">
        <LabelWithHelp
          label-text="labels.fields.participants"
          top-label
        />
      </div>
      <RelatedItemTable
        :topic="Topics.Character"
        :extra-fields="[
          { field: 'role', header: localize('labels.fields.role') }
        ]"
      />
      
      <!-- Motivation -->
      <div class="flexrow form-group">
        <LabelWithHelp
          label-text="labels.fields.motivation"
          top-label
        />
      </div>
      <div class="flexrow form-group">
        <TextArea
          v-model="motivation"
          rows="3"
          data-testid="danger-motivation"
          unstyled
          style="width: 100%; font-family: var(--fcb-font-family)"
          @update:model-value="onMotivationSaved"
        />
      </div>
      
      <!-- Opposition -->
      <div class="flexrow form-group">
        <LabelWithHelp
          label-text="labels.fields.opposition"
          top-label
        />
      </div>
      <RelatedItemTable
        :topic="Topics.Character"
        :extra-fields="[
          { field: 'role', header: localize('labels.fields.role') }
        ]"
      />
      
      <!-- Grim Portents -->
      <div class="flexrow form-group">
        <LabelWithHelp
          label-text="labels.fields.grimPortents"
          top-label
        />
      </div>
      <div class="flexcol form-group">
        <SessionTable
          ref="sessionTableRef"
          :rows="mappedVignetteRows"
          :columns="grimPortentColumns"
          :delete-item-label="localize('tooltips.deleteVignette')"
          :allow-edit="true"
          :edit-item-label="localize('tooltips.editRow')"
          :show-add-button="true"
          :add-button-label="localize('labels.session.addVignette')"
          :help-text="localize('labels.session.vignetteHelpText')"
          help-link="https://slyflourish.com/scenes_catch_all_step.html"
          :can-reorder="true"
          @add-item="onAddVignette"
          @delete-item="onDeleteVignette"
          @mark-item-delivered="onMarkVignetteDelivered"
          @unmark-item-delivered="onUnmarkVignetteDelivered"
          @move-to-next-session="onMoveVignetteToNext"
          @cell-edit-complete="onCellEditComplete"
          @reorder="onReorder"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, onMounted, onBeforeUnmount, computed, toRef } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { getTabTypeIcon } from '@/utils/misc';
  
  // library components
  import TextArea from 'primevue/textarea';
  import InputText from 'primevue/inputtext';
  
  // local components
  import Editor from '@/components/Editor.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import RelatedItemTable from '@/components/tables/RelatedItemTable.vue';

  // types
  import { Danger, WindowTabType, Topics } from '@/types';
import { notifyWarn } from 'src/utils/notifications';

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
  const mainStore = useMainStore();
  const { currentFront } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const contentRef = ref<HTMLElement | null>(null);
  const name = ref('');
  const impendingDoom = ref('');
  const motivation = ref('');
  const grimPortents = ref<string[]>([]);
  
  ////////////////////////////////
  // computed data
  const currentDanger = computed(() => currentFront.value?.dangers[props.index] || null);
  const grimPortentColumns = computed(() => [
    { field: 'description', style: 'text-align: left', header: 'Grim Portent', editable: true },
  ]);

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

  
  const onImpendingDoomSaved = () => {
    if (!currentDanger.value) return;
    
    currentDanger.value.impendingDoom = impendingDoom.value;
    saveDanger();
  };
  
  const onMotivationSaved = () => {
    if (!currentDanger.value) return;
    
    currentDanger.value.motivation = motivation.value;
    saveDanger();
  };
  
  const onDescriptionEditorSaved = (newContent: string) => {
    if (!currentDanger.value) return;
    
    currentDanger.value.description = newContent;
    saveDanger();
  };
  
  const onGrimPortentChanged = (index: number, value: string) => {
    if (!currentDanger.value) return;
    
    if (!currentDanger.value.grimPortents) {
      currentDanger.value.grimPortents = [];
    }
    
    currentDanger.value.grimPortents[index] = value;
    saveDanger();
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

  const addGrimPortent = () => {
    if (!currentDanger.value) return;
    
    if (!currentDanger.value.grimPortents) {
      currentDanger.value.grimPortents = [];
    }
    
    currentDanger.value.grimPortents.push('');
    grimPortents.value = [...currentDanger.value.grimPortents];
    saveDanger();
  };
  
  const removeGrimPortent = (index: number) => {
    if (!currentDanger.value || !currentDanger.value.grimPortents) return;
    
    currentDanger.value.grimPortents.splice(index, 1);
    grimPortents.value = [...currentDanger.value.grimPortents];
    saveDanger();
  };
  
  const saveDanger = async () => {
    if (!currentFront.value || !currentDanger.value) return;
    
    // Update the danger in the front
    const updatedDangers = [...currentFront.value.dangers];
    updatedDangers[props.index] = currentDanger.value;
    
    // Save the front with the updated danger
    currentFront.value.dangers = updatedDangers;
    await currentFront.value.save();
  };

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