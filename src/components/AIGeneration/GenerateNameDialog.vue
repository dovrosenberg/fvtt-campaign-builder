<template>
  <Teleport to="body">
    <Dialog 
      v-model="show"
      :title="dialogTitle"
      :buttons="[
        {
          label: localize('labels.cancel'),
          default: false,
          close: true,
        },
        {
          label: localize('labels.tryAgain'),
          default: false,
          close: false,
          disable: tooFewOptions,
          callback: onTryAgainClick
        },
        {
          label: localize('labels.useOnce'),
          default: false,
          close: true,
          disable: !selectedOption,
          callback: onUseClick
        },
        {
          label: localize('labels.addToSetting'),
          default: false,
          close: true,
          disable: !selectedOption,
          callback: onAddToSettingClick
        },
      ]"
      @cancel="onCancel"
    >
      <div
        class="flexcol generate-options-dialog"
      >
        <h3 style="margin-top: 1rem;">{{ localize('dialogs.generateNameDialog.title') }}</h3>
        <div class="options-container">
          <div v-if="loading" class="loading-container">
            <ProgressSpinner />
          </div>
          <div v-else-if="error" class="error-message">
            <span class="error-label">{{ localize('dialogs.generateNameDialog.errorMessage') }}</span> {{ error }}
          </div>
          <div v-else class="options-list">
            <div 
              v-for="(option, index) in options" 
              :key="index"
              class="option-item"
              :class="{ selected: selectedOptionIndex === index }"
              @click="selectOption(index)"
            >
              <div class="option-content">{{ option.name || option.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, toRaw, } from 'vue';
  
  // local imports
  import { localize } from '@/utils/game';
  import { useMainStore } from '@/applications/stores';
  import { GeneratorType } from '@/types';
  
  // library components
  import ProgressSpinner from 'primevue/progressspinner';
  
  // local components
  import Dialog from '@/components/Dialog.vue';

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    generatorType: {
      type: String as PropType<GeneratorType>,
      required: true,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'use', value: string): void;
    (e: 'addToSetting', value: string): void;
    (e: 'generate', value: string): void;
  }>();

  ////////////////////////////////
  // data
  const show = ref<boolean>(props.modelValue);
  const options = ref<TableResult[]>([]);
  const selectedOptionIndex = ref<number | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string>('');
  const rollTable = ref<RollTable | null>(null);
  const tooFewOptions = ref<boolean>(false);  // not enough to try again

  ////////////////////////////////
  // computed data
  const dialogTitle = computed(() => {
    const typeName = props.generatorType.charAt(0).toUpperCase() + props.generatorType.slice(1);
    return `${typeName} Options`;
  });

  const selectedOption = computed((): string | null => {
    if (selectedOptionIndex.value === null) 
      return null;
    
    const option = options.value[selectedOptionIndex.value];
    return option.name || option.description;
  });

  ////////////////////////////////
  // methods
  const resetDialog = () => {
    options.value = [];
    selectedOptionIndex.value = null;
    error.value = '';
    loading.value = false;
    show.value = false;
    emit('update:modelValue', false);
  };

  const selectOption = (index: number) => {
    selectedOptionIndex.value = index;
  };

  const drawOptions = async () => {
    loading.value = true;
    error.value = '';
    options.value = [];
    selectedOptionIndex.value = null;
    
    try {
      // Get the current setting and its roll table config
      const mainStore = useMainStore();
      const currentSetting = mainStore.currentSetting;
      
      if (!currentSetting) {
        throw new Error('No current setting selected');
      }
      
      const config = currentSetting.rollTableConfig;
      const tableUuid = config?.rollTables[props.generatorType];
      
      if (!tableUuid) {
        throw new Error(`No roll table configured for ${props.generatorType} in current setting`);
      }
      
      // Load the roll table
      rollTable.value = await fromUuid<RollTable>(tableUuid);
      
      if (!rollTable.value)
        throw new Error('Invalid uuid in GenerateNameDialog.drawOptions()');
      
      // figure out how many to draw
      const desiredCount = 3;
      const remaining = toRaw(rollTable.value).results.size;

      // If we got results, select the first one by default
      if (remaining === 0) {
        // could happen... we're showing 3 at a time of 100... 
        throw new Error('Ran out of results in GenerateNameDialog.drawOptions');
      } else if (remaining <= desiredCount) {
        // TODO - when we load the dialog, if there are too few left, refresh the generator
        tooFewOptions.value = true;
      }

      // Draw 3 results from the table
      const draws = await toRaw(rollTable.value).drawMany(Math.min(desiredCount, remaining), {
        displayChat: false
      });
      options.value = draws.results;      
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  };

  const markUnusedOptionsAsUndrawn = async () => {
    if (!rollTable.value) return;
    
    // Find all results that match our options except the selected one
    let unusedOptions = [] as TableResult[];

    if (selectedOptionIndex.value) {
      const selectedId = options.value[selectedOptionIndex.value].id;
      unusedOptions = options.value.filter(opt => opt.id !== selectedId) as TableResult[];
    }
    
    // Mark them as undrawn
    if (unusedOptions.length > 0) {
      await toRaw(rollTable.value).updateEmbeddedDocuments("TableResult", unusedOptions.map((opt: TableResult) => ({
        _id: opt.id,
        drawn: false,
      })));
    }
  };

  ////////////////////////////////
  // event handlers
  const onUseClick = async () => {
    if (selectedOption.value) {
      await markUnusedOptionsAsUndrawn();
      emit('use', selectedOption.value);
    }
    resetDialog();
  };

  const onAddToSettingClick = async () => {
    if (selectedOption.value) {
      await markUnusedOptionsAsUndrawn();
      emit('addToSetting', selectedOption.value);
    }
    resetDialog();
  };

  const onTryAgainClick = async () => { 
    // if we didn't like any of them we throw them all out
    await drawOptions();
  };
  
  const onCancel = async () => {
    // restore them all
    selectedOptionIndex.value = null;
    await markUnusedOptionsAsUndrawn();
    resetDialog();
  };
  
  ////////////////////////////////
  // watchers
  // when the dialog changes state, alert parent (so v-model works)
  watch(() => show.value, async (newValue) => {
    emit('update:modelValue', newValue);
  });

  // when the prop changes state, update internal value
  watch(() => props.modelValue, async (newValue) => {
    show.value = newValue;
    
    // If the dialog is being opened, draw options
    if (newValue) {
      await drawOptions();
    }
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
.generate-options-dialog {
  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: var(--fcb-font-size-header);
    font-weight: 600;
  }

  .options-container {
    min-height: 200px;
    max-height: 300px;
    overflow-y: auto;
    
    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
    }
    
    .error-message {
      color: red;
      padding: 1rem;
      
      .error-label {
        font-weight: bold;
      }
    }
    
    .options-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      
      .option-item {
        padding: 0.75rem;
        border: 1px solid var(--fcb-control-border);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover {
          background-color: var(--fcb-accent-200);
        }
        
        &.selected {
          background-color: var(--fcb-surface-2);
          border-color: var(--fcb-accent);
        }

        .option-content {
          font-size: var(--fcb-font-size-large);
        }
      }
    }
  }
}
</style>