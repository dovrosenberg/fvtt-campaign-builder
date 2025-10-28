<template>
  <div class="tab flexcol" data-group="primary" :data-tab="props.altTabId" style="height: 100%;">
    <div class="tab-inner">
      <div class="fcb-description-wrapper flexrow">
        <ImagePicker
          class="fcb-description-image"
          v-model="currentImageURL"
          :title="props.name"
          :topic="props.topic"
          :window-type="props.windowType"
          @update:modelValue="emit('imageChange', $event)"
          @create-scene="onCreateScene"
          @generate-image="onGenerateImage"
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
  import { ref, watch, } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { useRelationshipStore, useMainStore } from '@/applications/stores';
  
  // library components

  // local components
  import ImagePicker from '@/components/ImagePicker.vue'; 

  // types
  import { Topics, ValidTopic, WindowTabType } from '@/types';
  import { generateImage } from '@/utils/generation';
  
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
    topic: {
      type: Number as () => ValidTopic,
      required: false,
      default: null,
    },
    windowType: {
      type: Number as () => WindowTabType,
      required: false,
      default: null,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'imageChange', value: string): void;
  }>();

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();
  const mainStore = useMainStore();
  const { currentSetting, currentEntry } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const currentImageURL = ref<string>(props.imageUrl || ''); 

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onCreateScene = async (imageURL: string) => {
    // create the scene
    const scene = await Scene.createDocuments([{
      // @ts-ignore- we know this type is valid
      type: 'Scene',
      name: props.name,
      background: {
        src: imageURL,
      },
      grid: {
        type: foundry.CONST.GRID_TYPES.GRIDLESS,
      },
      tokenVision: false,  // ensure everyone can see it
    }]);

    // add it to the linked list
    if (scene) {
      relationshipStore.addScene(scene[0].uuid);    
    }
  };

  const onGenerateImage = async () => {
    // confirm it's a legit topic
    if (!currentSetting.value || !currentEntry.value || ![Topics.Character, Topics.Location, Topics.Organization].includes(props.topic)) {
      return;
    }

    await generateImage(currentSetting.value, currentEntry.value);
  };  

  ////////////////////////////////
  // watchers
  watch(() => props.imageUrl, (newImageUrl) => {
    // Always update the image URL, even when it's empty or undefined
    currentImageURL.value = newImageUrl || '';
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
  .tab-inner {
    height: 100%;
    overflow-y: auto;
    font-family: var(--fcb-font-family);
  }

  .fcb-description-wrapper {
    font-family: var(--fcb-font-family);
    align-items: flex-start;
    align-self: flex-start;
    overflow-y: visible;
    width: 100%;
    height: 100%;
      
    .fcb-description-image {
      position: sticky;
      top: 0;
    }

    .fcb-description-content {
      flex: 1;

      .form-group {
        margin: .25rem 8px 0px 0px;
      
        label {
          font-size: var(--fcb-font-size-large);
          font-weight: 700;
          font-family: var(--fcb-font-family);
          color: var(--fcb-sheet-header-label-color);
          text-align: left;
          background: none;
          border: none;

          // this is for the labels that are on the left side of the field
          &.side-label {
            max-width: 175px;
            align-self: flex-start;
          }
        }

        // this is for ones 
        input {
          font-size: var(--fcb-font-size-large);
        }

        select {
          border: var(--fcb-sheet-header-input-border);
          font-size: inherit;
          font-family: inherit;
          height: calc(var(--fcb-font-size-header) + 6);
          margin: 0px;
          background: var(--fcb-sheet-header-input-background);

          &:hover {
            box-shadow: 0 0 8px var(--fcb-accent);
          }
        }

        &.description {
          overflow: hidden; // keep the editor the right size
          margin-top: 0.375rem;
          flex: 1;
        }
      }
    }
  }
</style>