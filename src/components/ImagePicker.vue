<template>
  <div
    class="fcb-sheet-image"
    @click="onImageClick"
    @contextmenu="onContextMenu"
    :title="isDefaultImage ? 'Click to select an image' : 'Click to view image (right-click for more options)'"
  >
    <img
      class="profile"
      :src="modelValue || getDefaultImage"
      @error="onImageError"
    >
    <div v-if="!isDefaultImage" class="fcb-image-controls">
      <i class="fas fa-search-plus" title="Click to view image"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, } from 'vue';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  import { localize } from '@/utils/game';

  // types
  import { Topics, ValidTopic, WindowTabType } from '@/types';

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
      default: '', // Will be determined by topic or windowType if not provided
    },
    topic: {
      type: Number as () => ValidTopic,
      required: false,
      default: null,
    },
    windowType: {
      type: Number as () => WindowTabType,
      required: true,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
    (e: 'create-scene', value: string): void; 
  }>();

  ////////////////////////////////
  // data
  const WINDOW_TYPE_IMAGES = {
    [WindowTabType.World]: 'icons/svg/castle.svg',
    [WindowTabType.Campaign]: 'icons/svg/ruins.svg',
    [WindowTabType.Session]: 'icons/svg/combat.svg',
    [WindowTabType.PC]: 'icons/svg/mystery-man.svg',
  };

  const TOPIC_IMAGES = {
    [Topics.Character]: 'icons/svg/mystery-man.svg',
    [Topics.Location]: 'icons/svg/oak.svg',
    [Topics.Organization]: 'icons/svg/temple.svg',
    // [Topics.Event]: 'icons/svg/obelisk.svg',
  };
  
  ////////////////////////////////
  // computed
  const getDefaultImage = computed((): string => {
    // If a specific default image is provided, use it
    if (props.defaultImage) {
      return props.defaultImage;
    }
    
    switch (props.windowType) {
      case WindowTabType.Entry:
        return TOPIC_IMAGES[props.topic];

      case WindowTabType.World:
        return WINDOW_TYPE_IMAGES[WindowTabType.World];

      case WindowTabType.Campaign:
        return WINDOW_TYPE_IMAGES[WindowTabType.Campaign];

      case WindowTabType.Session:
        return WINDOW_TYPE_IMAGES[WindowTabType.Session];

      default:
        throw new Error('Invalid window type in ImagePicker');
    }
  });

  const isDefaultImage = computed((): boolean => {
    return !props.modelValue || props.modelValue === getDefaultImage.value;
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
        customClass: 'fcb',
        x: event.x,
        y: event.y,
        zIndex: 300,
        items: [
          {
            icon: 'fa-eye',
            iconFontClass: 'fas',
            label: localize('contextMenus.image.viewImage'),
            onClick: () => showImagePopout()
          },
          {
            icon: 'fa-edit',
            iconFontClass: 'fas',
            label: localize('contextMenus.image.changeImage'),
            onClick: () => openFilePicker()
          },
          {
            icon: 'fa-trash',
            iconFontClass: 'fas',
            label: localize('contextMenus.image.removeImage'),
            onClick: () => removeImage()
          },
          {
            icon: 'fa-comment',
            iconFontClass: 'fas',
            label: localize('contextMenus.image.postToChat'),
            onClick: () => postToChat()
          },
        ].concat(props.topic === Topics.Location ?
          [{
            icon: 'fa-comment',
            iconFontClass: 'fas',
            label: localize('contextMenus.image.createScene'),
            onClick: () => createScene()
          }] :
          []
        ),
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
      target.src = getDefaultImage.value;
    }
  };

  const removeImage = () => {
    emit('update:modelValue', '');
  };

  const postToChat = () => {
    ChatMessage.create({ content: `<img src="${props.modelValue}" alt="Campaign Builder Image">` });
  };

  const createScene = () => {
    emit('create-scene', props.modelValue);
  };

  ////////////////////////////////
  // watchers
</script>

<style lang="scss">
  .fcb-sheet-image {
    flex: 0 0 180px;
    font-size: 13px;
    height: 240px;
    width: 180px;
    position: relative;
    border-radius: 5px;
    border: 1px solid var(--fcb-icon-outline);
    margin-right: 6px;
    overflow: hidden;
    cursor: pointer;

    img.profile {
      width: 100%;
      height: 100%;
      object-fit: cover;
      max-width: 100%;
      border: 0px;
      background: var(--fcb-icon-background);
      -webkit-box-shadow: 0 0 10px var(--fcb-icon-shadow) inset;
      box-shadow: 0 0 10px var(--fcb-icon-shadow) inset;
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
    }

    .fcb-image-controls {
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