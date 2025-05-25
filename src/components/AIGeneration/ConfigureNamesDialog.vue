<template>
  <Teleport to="body">
    <Dialog 
      v-model="show"
      :title="localize('dialogs.configureNames.title')"
      :buttons="[
        {
          label: localize('labels.cancel'),
          default: false,
          close: true,
        },
        {
          label: localize('labels.save'),
          default: true,
          close: true,
          disable: loading || selectedStyles.length === 0,
          callback: onSaveClick
        },
      ]"
      @cancel="onCancel"
    >
      <div
        class="flexcol configure-names-dialog"
      >
        <p>{{ localize('dialogs.configureNames.description') }}</p>
        
        <div v-if="!loading && !error && stylesSummary.length > 0" class="styles-summary">
          <div v-for="summary in stylesSummary" :key="summary.styleName" class="style-summary">
            <strong>{{ summary.styleName }}:</strong> {{ summary.names }}
          </div>
        </div>
        
        <div v-if="loading" class="loading-container">
          <ProgressSpinner />
        </div>
        <div v-else-if="error" class="error-message">
          <span class="error-label">{{ localize('dialogs.configureNames.errorMessage') }}</span> {{ error }}
        </div>
        <div v-else>
          <div class="style-list-container">
            <div v-for="(preview, index) in previewData" :key="index" class="style-item">
              <Checkbox 
                v-model="selectedStyles" 
                :value="index" 
                :binary="false"
                :inputId="`style-checkbox-${index}`"
              />
              <label :for="`style-checkbox-${index}`" class="style-label">{{ displayNames[index] }}</label>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { localize } from '@/utils/game';
  import { Backend } from '@/classes';
  import { useMainStore } from '@/applications/stores';
  import { nameStyles, } from '@/utils/nameStyles';
  
  // library components
  import ProgressSpinner from 'primevue/progressspinner';
  import Checkbox from 'primevue/checkbox';
  
  // local components
  import Dialog from '@/components/Dialog.vue';

  // types
  import { ApiNamePreviewPost200ResponsePreviewInner } from '@/apiClient/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    initialSelectedStyles: {
      type: Array as PropType<number[]>,
      required: false,
      default: () => [0],
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'save', value: number[]): void;
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentWorld } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const show = ref<boolean>(props.modelValue);
  const loading = ref<boolean>(false);
  const error = ref<string>('');
  const previewData = ref<ApiNamePreviewPost200ResponsePreviewInner[]>([]);
  const selectedStyles = ref<number[]>([...props.initialSelectedStyles]);


  ////////////////////////////////
  // computed
  // Define the name styles (computed to react to world changes)
  const nameStylePrompts = computed(() => 
    nameStyles.map(style => style.prompt.replace('{genre}', currentWorld.value?.genre || 'Fantasy'))
  );

  // Define display names (shorter versions for UI)
  const displayNames = computed(() => {
    return nameStyles.map(style => style.displayName);
  });

  // Generate summary of selected styles with their example names
  const stylesSummary = computed(() => {
    if (!previewData.value || previewData.value.length === 0) {
      return [];
    }

    return nameStyles.map((nameStyle, idx) => {
      const preview = previewData.value[idx];
      const styleName = nameStyle.displayName;
      
      if (!preview) return null;

      const allNames = [
        ...(preview.people || []),
        ...(preview.locations || [])
      ];

      return {
        styleName,
        names: allNames.join(', ')
      };
    }).filter((summary): summary is { styleName: string; names: string } => summary !== null);
  });

  ////////////////////////////////
  // methods
  const resetDialog = () => {
    error.value = '';
    show.value = false;
    emit('update:modelValue', false);
  };

  const loadPreviewData = async () => {
    if (!currentWorld.value) return;
    
    loading.value = true;
    error.value = '';
    
    try {
      const response = await Backend.api.apiNamePreviewPost({
        nameStyles: nameStylePrompts.value,
        genre: currentWorld.value.genre,
        worldFeeling: currentWorld.value.worldFeeling
      });
      
      previewData.value = response.data.preview;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  };

  ////////////////////////////////
  // event handlers
  const onSaveClick = () => {
    emit('save', selectedStyles.value);
    resetDialog();
  };
  
  const onCancel = () => {
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
    
    // If the dialog is being opened, load preview data
    if (newValue) {
      await loadPreviewData();
    }
  });

  // when initialSelectedStyles changes, update the internal value
  watch(() => props.initialSelectedStyles, (newValue) => {
    selectedStyles.value = [...newValue];
  });
</script>

<style lang="scss" scoped>
.configure-names-dialog {
  p {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .styles-summary {
    background-color: rgba(0, 0, 0, 0.05);
    border: 1px solid var(--color-border-light-tertiary);
    border-radius: 4px;
    padding: 0.75rem;
    margin-bottom: 1rem;
    
    .style-summary {
      margin-bottom: 0.5rem;
      font-size: var(--font-size-14);
      
      &:last-child {
        margin-bottom: 0;
      }
      
      strong {
        color: var(--color-text-dark-primary);
      }
    }
  }

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
  
  .style-list-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    
    .style-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      .style-label {
        font-weight: 500;
        font-size: var(--font-size-14);
        cursor: pointer;
      }
    }
  }
}
</style>