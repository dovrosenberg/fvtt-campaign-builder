<template>
  <Dialog 
    v-model="show"
    :title="dialogTitle"
    :buttons="[
      {
        label: 'Cancel',
        default: false,
        close: true,
      },
      {
        label: 'Try again',
        default: false,
        close: false,
        callback: onTryAgainClick
      },
      {
        label: 'Use',
        default: false,
        close: true,
        disable: !selectedOption,
        callback: onUseClick
      },
      {
        label: 'Add to world',
        default: false,
        close: true,
        disable: !selectedOption,
        callback: onAddToWorldClick
      },
    ]"
    @cancel="onCancel"
  >
    <div
      class="flexcol generate-options-dialog"
    >
      <h3>{{ localize('dialogs.generateOptions.title') }}</h3>
      <div class="options-container">
        <div v-if="loading" class="loading-container">
          <ProgressSpinner />
        </div>
        <div v-else-if="error" class="error-message">
          <span class="error-label">There was an error:</span> {{ error }}
        </div>
        <div v-else class="options-list">
          <div 
            v-for="(option, index) in options" 
            :key="index"
            class="option-item"
            :class="{ selected: selectedOptionIndex === index }"
            @click="selectOption(index)"
          >
            <div class="option-content">{{ option.description }}</div>
          </div>
          <div v-if="options.length === 0" class="no-options-message">
            No options available. Click "Try again" to generate options.
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, toRaw } from 'vue';
  
  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
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
    (e: 'addToWorld', value: string): void;
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

  ////////////////////////////////
  // computed data
  const dialogTitle = computed(() => {
    const typeName = props.generatorType.charAt(0).toUpperCase() + props.generatorType.slice(1);
    return `${typeName} Options`;
  });

  const selectedOption = computed((): string | null => {
    if (selectedOptionIndex.value === null) 
      return null;
    
    return options.value[selectedOptionIndex.value].description;
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
      // Get the generator config
      const config = ModuleSettings.get(SettingKey.generatorConfig);
      const tableUuid = config?.rollTables[props.generatorType];
      
      // Load the roll table
      rollTable.value = await fromUuid(tableUuid) as unknown as RollTable;
      
      // Draw 3 results from the table
      const draws = await toRaw(rollTable.value).drawMany(3, {
        displayChat: false
      });
      options.value = draws.results;
      
      // If we got results, select the first one by default
      if (options.value.length === 0) {
        // could happen... we're showing 3 at a time of 100... 
        // TODO - when we load the dialog, if there are too few left, refresh the generator
        throw new Error('Ran out of results in GenerateNameDialog.drawOptions');
      }
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
      unusedOptions = options.value.filter(opt => opt.id !== selectedId);
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

  const onAddToWorldClick = async () => {
    if (selectedOption.value) {
      await markUnusedOptionsAsUndrawn();
      emit('addToWorld', selectedOption.value);
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
    font-size: var(--font-size-16);
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
        border: 1px solid var(--color-border-light-tertiary);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        &.selected {
          background-color: rgba(0, 0, 0, 0.1);
          border-color: var(--color-border-highlight);
        }

        .option-content {
          font-size: var(--font-size-14);
        }
      }
      
      .no-options-message {
        text-align: center;
        font-style: italic;
        color: var(--color-text-dark-secondary);
        padding: 2rem 0;
      }
    }
  }
}
</style>