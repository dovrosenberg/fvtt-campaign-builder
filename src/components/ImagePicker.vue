<template>
  <div
    class="wcb-sheet-image"
    @click="onImageClick"
    @contextmenu="onContextMenu"
    :title="isDefaultImage ? 'Click to select an image' : 'Click to view image (right-click for more options)'"
  >
    <img
      class="profile"
      :src="modelValue || props.defaultImage"
      @error="onImageError"
    >
    <div v-if="!isDefaultImage" class="wcb-image-controls">
      <i class="fas fa-search-plus" title="Click to view image"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed } from 'vue';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

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
  // computed
  const isDefaultImage = computed((): boolean => {
    return !props.modelValue || props.modelValue === props.defaultImage;
  });

  ////////////////////////////////
  // methods
  // Handle image click to either view the image or open FilePicker
  const onImageClick = async (event: MouseEvent) => {
    event.preventDefault();

    // If there's no image or it's the default image, open the file picker
    if (isDefaultImage.value) {
      openFilePicker();
    } else {
      // Otherwise, show the image in a popout
      showImagePopout();
    }
  };

  // Handle right-click to show context menu with options
  const onContextMenu = (event: MouseEvent) => {
    // Only show context menu if we have a non-default image
    if (!isDefaultImage.value) {
      event.preventDefault();

      // Show context menu using the Vue context menu component
      ContextMenu.showContextMenu({
        customClass: 'wcb',
        x: event.x,
        y: event.y,
        zIndex: 300,
        items: [
          {
            icon: 'fa-eye',
            iconFontClass: 'fas',
            label: 'View Image',
            onClick: () => showImagePopout()
          },
          {
            icon: 'fa-edit',
            iconFontClass: 'fas',
            label: 'Change Image',
            onClick: () => openFilePicker()
          }
        ]
      });
    }
  };

  // Open the FilePicker to select a new image
  const openFilePicker = () => {
    // Create a new FilePicker instance using the global Foundry VTT FilePicker
    const fp = new foundry.applications.apps.FilePicker({
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

  // Show the image in a popout window
  const showImagePopout = () => {
    if (!props.modelValue) return;

    // Create a new ImagePopout instance
    const popout = new foundry.applications.apps.ImagePopout({
      window: { title: props.title || 'View Image' },
      src: props.modelValue,
      shareable: false,
      editable: false
    });

    // Display the ImagePopout
    popout.render(true);
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
    flex: 0 0 180px;
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

    .wcb-image-controls {
      position: absolute;
      bottom: 5px;
      right: 5px;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
      border-radius: 3px;
      padding: 3px 5px;
      font-size: 12px;
      opacity: 0.7;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }
    }
  }
</style>