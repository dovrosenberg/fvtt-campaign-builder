<template>
  <div class="tab flexcol" data-group="primary" :data-tab="props.altTabId">
    <div class="tab-inner">
      <div class="fcb-description-wrapper flexrow">
        <ImagePicker
          v-model="currentImageURL"
          :title="`Select Image for ${props.name || 'Entry'}`"
          @update:modelValue="emit('imageChange', $event)"
        />        
        <div class="fcb-description-content flexcol">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch } from 'vue';
  
  // local imports
  
  // library components

  // local components
  import ImagePicker from '@/components/ImagePicker.vue'; 

  // types
  
  ////////////////////////////////
  // props
  const props = defineProps({
    imageUrl: {
      type: String,
      default: '',
      required: false,
    },
    name: {
      type: String,
      default: '',
      required: true,
    },    
    altTabId: {
      type: String,
      default: 'description',
      required: false,
    },    
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'imageChange', value: string): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const defaultImage = 'icons/svg/mystery-man.svg'; // Default Foundry image
  const currentImageURL = ref<string>(props.imageUrl ||  defaultImage); // 

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers
  watch(() => props.imageUrl, (newImageUrl) => {
    if (newImageUrl) {
      currentImageURL.value = newImageUrl || defaultImage ;
    }
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
  .fcb-description-wrapper {
    font-size: var(--font-size-20);
    font-weight: 700;
    font-family: var(--fcb-font-family);
    align-items: flex-start;
    align-self: flex-start;
    overflow-y: visible;
    width: 100%;
    height: 100%;
      
    .fcb-description-content {
      height: 100%;

      .form-group {
        margin: 4px 8px 0px 0px;
      
        label {
          max-width: 175px;
          color: var(--fcb-sheet-header-label-color);
          text-align: left;
          background: none;
          border: none;
        }
        input {
          font-size: var(--font-size-20);
          color: var(--fcb-sheet-header-detail-input-color);
        }

        select {
          border: var(--fcb-sheet-header-input-border);
          font-size: inherit;
          font-family: inherit;
          height: calc(var(--font-size-20) + 6);
          margin: 0px;
          color: var(--fcb-sheet-header-detail-input-color);
          background: var(--fcb-sheet-header-input-background);

          &:hover {
            box-shadow: 0 0 8px var(--color-shadow-primary);
          }
        }

        &.description {
          overflow: hidden; // keep the editor the right size
          margin-top: 6px;
          flex: 1;
        }
      }
    }
  }
</style>