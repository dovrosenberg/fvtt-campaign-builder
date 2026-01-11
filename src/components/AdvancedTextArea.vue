<!--
AdvancedTextArea: Enhanced textarea component with UUID support

Purpose
- Provides a textarea that can accept UUID drops and auto-convert text to UUID references

Responsibilities
- Handle drag and drop of UUIDs from directory tree
- Auto-convert entity names to UUID references on save
- Display enriched HTML with clickable links when not in edit mode
- Manage edit/display mode toggle

Props
- id: string, the ID to assign to the textarea
- modelValue: string, the current text content
- editMode: boolean, whether to show as editable textarea or display div
- settingId: string, the current setting UUID for enrichment
- currentEntityUuid: string, UUID of current entity to exclude from auto-conversion
- enableEntityLinking: boolean, whether to auto-convert names to UUIDs (default: true)
- placeholder: string, placeholder text for the textarea
- rows: number, number of rows for the textarea (default: 3)

Emits
- update:modelValue: string, when the content changes

Slots
- None

Dependencies
- Stores: none
- Composables: none
- Services/API: uuidHandler utilities

-->

<template>
  <div class="fcb-advanced-text-area" :class="{ 'display-mode': !editMode }">
    <!-- Edit mode: show textarea -->
    <textarea
      v-if="editMode"
      ref="textareaRef"
      v-model="internalValue"
      :placeholder="placeholder"
      :rows="rows"
      :id="props.id"
      class="form-textarea"
      @dragover="onDragover"
      @drop="onDrop"
    ></textarea>
  
    <!-- Display mode: show enriched HTML -->
    <div
      v-else
      ref="displayRef"
      class="display-content"
      v-html="enrichedContent"
    ></div>  
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  
  // local imports
  import { handleUuidDropOnTextarea, enrichUuidLinks } from '@/utils/uuidHandler';
  import DragDropService from '@/utils/dragDrop'; 
  
  // library components

  // local components

  // types

  ////////////////////////////////
  // props
  const props = defineProps({
    /** will be put on the textarea */
    id: {
      type: String,
      required: false,
      default: '',
    },
    modelValue: {
      type: String,
      required: false,
      default: '',
    },
    editMode: {
      type: Boolean,
      required: false,
      default: true,
    },
    settingId: {
      type: String,
      required: false,
      default: null,
    },
    currentEntityUuid: {
      type: String,
      required: false,
      default: undefined,
    },
    enableEntityLinking: {
      type: Boolean,
      required: false,
      default: true,
    },
    placeholder: {
      type: String,
      required: false,
      default: '',
    },
    rows: {
      type: Number,
      required: false,
      default: 3,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const textareaRef = ref<HTMLTextAreaElement>();
  const enrichedContent = ref<string>('');

  ////////////////////////////////
  // computed data
  const internalValue = computed({
    get: (): string => props.modelValue || '',
    set: (value: string): void => {
      emit('update:modelValue', value);
    }
  });

  ////////////////////////////////
  // methods
  /**
   * Updates the enriched display content
   */
  const updateDisplayContent = async(content: string): Promise<void> => {    
    enrichedContent.value = await enrichUuidLinks(props.settingId, content);
  };

  /**
   * Focuses the textarea
   */
  const focus = async(): Promise<void> => {
    if (textareaRef.value && props.editMode) {
      await nextTick();
      textareaRef.value.focus();
    }
  };  

  ////////////////////////////////
  // event handlers
  const onDragover = (event: DragEvent): void => {
    if (!props.editMode) return;
    DragDropService.standardDragover(event);
  };

  const onDrop = async(event: DragEvent): Promise<void> => {
    if (!props.editMode || !textareaRef.value) {
      return;
    }
    
    await handleUuidDropOnTextarea(event, textareaRef.value);
  };

  ////////////////////////////////
  // watchers
  watch(() => props.modelValue, async (newValue) => {
    // Update display content when in display mode
    if (!props.editMode) {
      await updateDisplayContent(newValue || '');
    }
  });

  watch(() => props.editMode, async (newMode) => {
    if (newMode) {
      // Switching to edit mode - focus textarea
      await focus();
    } else {
      // Switching to display mode - update enriched content
      await updateDisplayContent(internalValue.value);
    }
  });

  watch(() => props.settingId, async () => {
    // Re-process display content when setting changes
    if (!props.editMode) {
      await updateDisplayContent(internalValue.value);
    }
  });

  ////////////////////////////////
  // lifecycle hooks
  onMounted(async () => {
    // Initialize display content if starting in display mode
    if (!props.editMode) {
      await updateDisplayContent(internalValue.value);
    }
  });

  // Expose methods
  defineExpose({ focus });
</script>

<style lang="scss" scoped>
  .fcb-advanced-text-area {
    width: 100%;
    
    .form-textarea {
      width: 100%;
      min-height: 80px;
      resize: vertical;
      
      &:focus {
        outline: none;
      }
      
      &:disabled {
        background: var(--color-bg-disabled);
        color: var(--color-text-disabled);
        cursor: not-allowed;
      }
    }
    
    .display-content {
      width: 100%;
      line-height: 1.5;
      white-space: pre-wrap;
      
      // Style for enriched links
      :deep(.content-link) {
        color: var(--color-primary);
        text-decoration: underline;
        
        &:hover {
          color: var(--color-primary-dark);
          text-decoration: none;
        }
        
        &.broken {
          color: var(--color-text-disabled);
          text-decoration: line-through;
        }
      }
    }    
  }
</style>
