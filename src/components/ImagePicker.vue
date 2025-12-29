<template>
  <div
    class="fcb-sheet-image"
    data-testid="image-picker"
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
  import { computed } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { notifyError, notifyInfo, notifyWarn } from '@/utils/notifications';
  import { localize } from '@/utils/game';
  import { useMainStore, useBackendStore } from '@/applications/stores';
  import { getTopicText } from '@/compendia';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components

  // types
  import { Topics, ValidTopic, WindowTabType } from '@/types';
  import { MenuItem } from '@imengyu/vue3-context-menu';

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
    (e: 'generate-image'): void; 
  }>();


  ////////////////////////////////
  // data
  const mainStore = useMainStore();
  const backendStore = useBackendStore();
  const { currentEntry, currentContentType } = storeToRefs(mainStore);
  const { available, isGeneratingImage } = storeToRefs(backendStore);


  ////////////////////////////////
  // data
  // these don't match the TabTypeIcons or TopicIcons because they need to be files, not icons
  const WINDOW_TYPE_IMAGES = {
    [WindowTabType.Setting]: 'icons/svg/castle.svg',
    [WindowTabType.Campaign]: 'icons/svg/ruins.svg',
    [WindowTabType.Session]: 'icons/svg/combat.svg',
    [WindowTabType.Front]: 'icons/svg/biohazard.svg', 
    [WindowTabType.Arc]: 'icons/svg/bridge.svg',
  };

  const TOPIC_IMAGES = {
    [Topics.Character]: 'icons/svg/mystery-man.svg',
    [Topics.Location]: 'icons/svg/oak.svg',
    [Topics.Organization]: 'icons/svg/temple.svg',
    [Topics.PC]: 'icons/svg/mystery-man.svg',
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

      case WindowTabType.Setting:
      case WindowTabType.Campaign:
      case WindowTabType.Session:
      case WindowTabType.Arc:
      case WindowTabType.Front:
        return WINDOW_TYPE_IMAGES[props.windowType];

      // tag results don't have images
      case WindowTabType.TagResults:
        return '';

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
    event.preventDefault();

    let items = [] as MenuItem[];

    if (isDefaultImage.value) {
      // if it's the default, all we do is add an image
      items = [
        {
          icon: 'fa-edit',
          iconFontClass: 'fas',
          label: localize('contextMenus.image.addImage'),
          onClick: () => openFilePicker()
        },
      ];

      if (available.value && props.topic !== Topics.PC) {
        items.push({
          icon: 'fa-head-side-virus',
          iconFontClass: 'fas',
          label: localize('contextMenus.image.generateImage'),
          onClick: () => generateImage(),
          disabled: isGeneratingImage.value[currentEntry.value?.uuid as string],
        });
      }
    } else {
      items = [
        // {
        //   icon: 'fa-eye',
        //   iconFontClass: 'fas',
        //   label: localize('contextMenus.image.viewImage'),
        //   onClick: () => showImagePopout()
        // },
        {
          icon: 'fa-eye',
          iconFontClass: 'fas',
          label: localize('contextMenus.image.showToPlayers'),
          onClick: () => showImageToPlayers()
        },
        {
          icon: 'fa-copy',
          iconFontClass: 'fas',
          label: localize('contextMenus.image.copyToClipboard'),
          onClick: () => copyImageToClipboard()
        },
        {
          icon: 'fa-copy',
          iconFontClass: 'fas',
          label: localize('contextMenus.image.copyLinkToClipboard'),
          onClick: () => copyImageLinkToClipboard()
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
      ];
      
      if (props.topic === Topics.Location) {
        items.push({
          icon: 'fa-image',
          iconFontClass: 'fas',
          label: localize('contextMenus.image.createScene'),
          onClick: () => createScene()
        });
      }

      if (available.value && props.topic !== Topics.PC) {
        // insert it after change image
        items.splice(items.findIndex((i)=> i.icon === 'fa-edit'), 0, {
          icon: 'fa-head-side-virus',
          iconFontClass: 'fas',
          label: localize('contextMenus.image.generateImage'),
          onClick: () => generateImage(),
          disabled: isGeneratingImage.value[currentEntry.value?.uuid as string],
        });
      }
    } 

    // Show context menu using the Vue context menu component
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items,
    });
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
      src: props.modelValue
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

  const generateImage = () => {
    emit('generate-image');
  };

  const removeImage = () => {
    emit('update:modelValue', '');
  };

  const postToChat = () => {
    ChatMessage.create({ content: `<img src="${props.modelValue}" alt="Campaign Builder Image">` });
  };

  const showImageToPlayers = async () => {
    if (!props.modelValue) return;

    // if the object is an entry, just show the topic
    // if it is anything else, show the name
    let title = '';
    switch (currentContentType.value) {
      case WindowTabType.Campaign:
      case WindowTabType.Session:
      case WindowTabType.Arc:
      case WindowTabType.Front:
        title = props.title;
        break;
      case WindowTabType.Entry:
        title = currentEntry.value?.topic ? getTopicText(currentEntry.value.topic) : 'Entry';
        break;
      
      default:
        title = 'Image';
    }


    game.socket.emit("shareImage", {
      image: props.modelValue,
      title: title,
      caption: '',
      // uuid: props.uuid,  // this can be used to limit who sees the title
      showTitle: 'showTitle',
      // users: Array.isArray(options.users) ? options.users : undefined
    });
  };

  const createScene = () => {
    if (props.modelValue) 
      emit('create-scene', props.modelValue);
  };

  const copyImageLinkToClipboard = () => {
    if (!props.modelValue) return;
    
    // if it is a relative URL, need to add the base URL (though it also likely won't work outside of Foundry)
    let url = props.modelValue;
    if (!props.modelValue.startsWith('http')) {
      const serverURL = window.location.origin;
      url = `${serverURL}/${props.modelValue}`;
      notifyWarn('Image link copied to clipboard as local URL - it will require the Foundry server to be running to work.');
    }

    navigator.clipboard.writeText(url);
  };

  const copyImageToClipboard = async () => {
    if (!props.modelValue) return;

    try {
      // Check if it's already a PNG or supported format
      const isPng = props.modelValue.toLowerCase().endsWith('.png');
      const isWebP = props.modelValue.toLowerCase().endsWith('.webp');
      const isGif = props.modelValue.toLowerCase().endsWith('.gif');
      
      // For supported formats, try direct copy first
      if (isPng || isWebP || isGif) {
        try {
          const response = await fetch(props.modelValue, { mode: 'cors', cache: 'no-store' });
          const blob = await response.blob();
          const clipboardItem = new ClipboardItem({ [blob.type]: blob });
          await navigator.clipboard.write([clipboardItem]);
          notifyInfo('Image copied to clipboard');
          return;
        } catch (directError) {
          console.warn('Direct copy failed, trying canvas conversion:', directError);
          // Fall through to canvas conversion
        }
      }

      // For JPG/JPEG or when direct copy fails, use canvas conversion
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // need to add a cachebuster to the URL to force a reload for CORS to work right
      const srcWithBust = (() => {
        const u = props.modelValue as string;
        const hasQuery = u.includes('?');
        const sep = hasQuery ? '&' : '?';
        return `${u}${sep}cb=${Date.now()}`;
      })();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = srcWithBust;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Could not convert image to blob');
        }
        
        try {
          const clipboardItem = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([clipboardItem]);
          notifyInfo('Image copied to clipboard');
        } catch (clipboardError) {
          console.error('Clipboard write failed:', clipboardError);
          fallbackCopyImage(img);
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Failed to copy image to clipboard:', error);
      notifyError('Failed to copy image to clipboard');
    }
  };

  const fallbackCopyImage = async (img: HTMLImageElement) => {
    try {
      // Fallback: create a temporary canvas and use execCommand
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      
      // Try to select and copy the canvas
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        try {
          // Create a temporary link for download as fallback
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'image.png';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          notifyInfo('Image downloaded as fallback (clipboard not available)');
        } catch (downloadError) {
          notifyError('Failed to copy or download image');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Fallback copy failed:', error);
      notifyError('Failed to copy image');
    }
  };

  ////////////////////////////////
  // watchers
</script>

<style lang="scss">
  .fcb-sheet-image {
    flex: 0 0 180px;
    font-size: var(--fcb-font-size);
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
      min-height: 240px;
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
      background-color: var(--fcb-dark-overlay);
      color: white;
      border-radius: 3px;
      padding: 3px 5px;
      font-size: var(--font-size-12);
      opacity: 0.7;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }
    }
  }
</style>