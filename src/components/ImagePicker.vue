<template>
  <div class="wcb-sheet-image" @click="onImageClick">
    <img
      class="profile"
      :src="modelValue || props.defaultImage"
      @error="onImageError"
    >
  </div>
</template>

<script setup lang="ts">
  // library imports

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: String,
    title: {
      type: String,
      required: false,
      default: '',
    },      
    defaultImage: {
      type: String,
      required: false,
      default: 'icons/svg/mystery-man.svg', // Default Foundry image
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
  }>();

  ////////////////////////////////
  // data

  ////////////////////////////////
  // methods
  // Handle image click to open FilePicker
  const onImageClick = async (event: MouseEvent) => {
    event.preventDefault();
    
    // Create a new FilePicker instance using the global Foundry VTT FilePicker
    const fp = new FilePicker({
      type: "image",
      current: props.modelValue || "",
      callback: async (path) => {
        // Emit the update event with the new path
        emit('update:modelValue', path);
      },
      title: props.title || 'Select Image',
    });
    
    // Display the FilePicker
    return fp.browse();
  };
  
  // Handle image loading errors
  const onImageError = (event: Event) => {
    const target = event.target as HTMLImageElement;
    if (target && !target.dataset.errorHandled) {
      target.dataset.errorHandled = 'true';
      target.src = props.defaultImage;
    }
  };
</script>

<style lang="scss">
  .wcb-sheet-image {
    flex: 0 0 160px;
    font-size: 13px;
    height: 240px;
    width: 180px;
    position: relative;
    border-radius: 5px;
    border: 1px solid var(--wcb-icon-outline);
    margin-right: 6px;
    overflow: hidden;
    cursor: pointer;

    img.profile {
      width: 100%;
      height: 100%;
      object-fit: contain;
      max-width: 100%;
      border: 0px;
      background: var(--wcb-icon-background);
      -webkit-box-shadow: 0 0 10px var(--wcb-icon-shadow) inset;
      box-shadow: 0 0 10px var(--wcb-icon-shadow) inset;
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
    }
  }
</style>