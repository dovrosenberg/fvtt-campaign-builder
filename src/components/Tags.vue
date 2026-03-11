<template>
  <div class="tags-wrapper" :class="{ 'uninitialized': !isInitialized }">
    <input
      ref="tagsInputRef"
      class="tags-input"
      data-testid="tags-input"
      :value="JSON.stringify(currentValue)" 
      :placeholder="'Tags...'"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { onMounted, onBeforeUnmount, PropType, ref, watch, computed } from "vue";
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore } from "@/applications/stores";
  import { ModuleSettings, SettingKey } from "@/settings";

  // library components
  import Tagify from "@yaireo/tagify"

  // local components

  // types
  import { SettingTags } from "@/types";

  interface TagEventData {
    __tagId: string;
    __isValid: boolean | string;
    value: string;
    color: string;
  };

  interface TagData {
    value: string;
    color?: string;
    style?: string;
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: {
      type: Array as PropType<string[]>,
      required: true,
    },
    whitelistSupplement: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
  });


  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', newValue: string[]): void;
    (e: 'tagAdded', newValue: string): void;
    (e: 'tagRemoved', removedValue: string): void;
    (e: 'tagClick', tag: string): void;
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentSetting } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const tagify = ref<Tagify>();
  const tagsInputRef = ref<HTMLInputElement>();
  const currentValue = ref<string[]>(props.modelValue || []);
  const isInitialized = ref<boolean>(false);

  ////////////////////////////////
  // computed data
  const tagList = computed(() => currentSetting.value?.tags || {} as SettingTags);

  ////////////////////////////////
  // methods
  const rand = (min, max) => (min + Math.random() * (max - min));

  // generate a random color
  const transformTag = ( tagData: TagData ) => {
    // First check actor tags for a color
    const actorTags = ModuleSettings.get(SettingKey.actorTags);
    const actorTag = actorTags.find((t: { name: string; color: string }) => t.name.toLowerCase() === tagData.value.toLowerCase());
    if (actorTag?.color) {
      tagData.color = actorTag.color;
      tagData.style = "--tag-bg:" + tagData.color;
      return;
    }

    // Then check scene tags for a color
    const sceneTags = ModuleSettings.get(SettingKey.sceneTags);
    const sceneTag = sceneTags.find((t: { name: string; color: string }) => t.name.toLowerCase() === tagData.value.toLowerCase());
    if (sceneTag?.color) {
      tagData.color = sceneTag.color;
      tagData.style = "--tag-bg:" + tagData.color;
      return;
    }

    // Then check the setting's tag list
    if (!tagList.value)
      return;

    // see if there's a color
    tagData.color = tagList.value[tagData.value]?.color || undefined;
    
    // only change it if it doesn't already have a color
    if (!tagData.color) {
      var h = rand(1, 360)|0,
          s = rand(40, 70)|0,
          l = rand(65, 72)|0;

      tagData.color = 'hsl(' + h + ',' + s + '%,' + l + '%)';
    }

    tagData.style = "--tag-bg:" + tagData.color;
  }

  const getWhitelist = (): string[] => {
    const whitelist = new Set<string>();
    
    // Add tags from the setting's tag list
    for (const tag in tagList.value) {
      if (tagList.value[tag].count > 0)
        whitelist.add(tag);
    }

    // Add any supplemental tags passed from parent
    for (const tag of props.whitelistSupplement) {
      whitelist.add(tag);
    }

    return Array.from(whitelist);
  }


  ////////////////////////////////
  // event handlers
  const onTagAdded = async (event: CustomEvent<Tagify.AddEventData<any>>): Promise<void> => {
    const tagInfo = event.detail.data as TagEventData;
    const value = tagInfo.value;
    const color = tagInfo.color;

    // tagify calls add unnecessarily when rebuilding its internal list
    if (currentValue.value.includes(value))  
      return;
 
    if (!tagify.value || !currentSetting.value)
      return;

    // see if it's valid (which includes checking for duplicates)
    if (tagInfo.__isValid !== true) 
      return;

    // Check if this was a supplemental whitelist - don't add to global tag list
    const isWhitelistTag = props.whitelistSupplement.includes(value);

    // Only add to the setting's global tags if it's not a whitelist tag
    if (!isWhitelistTag) {
      currentSetting.value.addTag(value, color || null);
      await currentSetting.value.save();
    }

    // trigger reactivity - map to just the string values
    currentValue.value = tagify.value.value.map((t) => t.value);

    // don't need to update the whitelist on an add because we shouldn't be adding it again
    // anyway

    // emit to the parent to update the field
    emit('update:modelValue', currentValue.value);
    emit('tagAdded', value);  
  };

  const onTagRemoved = async (event: CustomEvent<Tagify.AddEventData<any>>): Promise<void> => {
    const tagInfo = event.detail.data as TagEventData;
    const value = tagInfo.value;

    if (!tagify.value || !currentSetting.value)
      return;

    // see if it's valid (which it should be when removing, but just in case
    if (tagInfo.__isValid !== true) 
      return;

    // Save to the setting
    currentSetting.value.removeTag(value);
    await currentSetting.value.save();

    // update the whitelist
    tagify.value.whitelist = getWhitelist();

    currentValue.value = tagify.value.value.map((t) => t.value);

    // emit to the parent to update the field
    emit('update:modelValue', currentValue.value);
    emit('tagRemoved', value);  
  };

  const onTagClick = async (event: CustomEvent<Tagify.AddEventData<any>>): Promise<void> => {
    const tagInfo = event.detail.data as TagEventData;
    const value = tagInfo.value;
    
    // Emit the tag click event to parent
    emit('tagClick', value);
  };

  ////////////////////////////////
  // watchers
  watch(() => props.modelValue, (newVal: string[] | undefined) => {
    const safeVal = newVal || [];
    currentValue.value = safeVal;
    
    // If tagify is already initialized, we can update it directly
    if (tagify.value && isInitialized.value) {
      // We don't need to reset isInitialized here since Tagify is already set up
      // @ts-ignore - I think the type here is specified wrong
      tagify.value?.loadOriginalValues(safeVal);
    } else {
      // If we're getting new values but Tagify isn't initialized yet,
      // make sure we're showing the loading state
      isInitialized.value = false;
    }
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    const whitelist = [] as string[];
    for (const tag in tagList.value) {
      if (tagList.value[tag].count > 0)  // make sure count > 0
        whitelist.push(tag);
    }

    // Use setTimeout to ensure the DOM is fully rendered
    setTimeout(() => {
      const input = tagsInputRef.value;

      // Check if Tagify is already initialized on this input
      // @ts-ignore - Tagify adds this property to the input element
      if (input && input.__tagify) {
        // Reuse the existing Tagify instance
        // @ts-ignore
        tagify.value = input.__tagify;
        isInitialized.value = true;
        return;
      } else if (!input) {
        return;
      }

      tagify.value = new Tagify(input, {
        whitelist: getWhitelist(),
        dropdown: {
          enabled: 1,
          position: 'text',
          searchKeys: ['value'],
          tabKey: true,
          classname: 'fcb-tagify-dropdown',  // Custom class for scoping dropdown styles
        },
        transformTag: transformTag,
        callbacks: {
          add: (e) => { onTagAdded(e); },
          remove: (e) => { onTagRemoved(e); },
          click: (e) => { onTagClick(e); },
        }
      });

      // Mark as initialized after Tagify has been created
      isInitialized.value = true;
    }, 100);

  });
  
  // Clean up when component is unmounted
  onBeforeUnmount(() => {
    // Reset initialization state
    isInitialized.value = false;
    
    // Destroy tagify instance if it exists
    if (tagify.value) {
      tagify.value.destroy();
      tagify.value = undefined;
    }
  });
</script>

<style lang="scss">
  // tagify might be used elsewhere, but we don't have a ton of control over these class names
  .fcb .tags-wrapper {
    // TODO - do these heights need to change when font size scales? Should it be like x rem+1px or something?
    min-height: 31px;
    width: 100%;
    position: relative;
    font-family: var(--fcb-font-family);
  }

  .fcb .tagify {
    min-height: 31px; /* Ensure consistent height even when empty */
    
    &:focus-within {
      outline: none;
      border-color: var(--fcb-control-border);
      box-shadow: 0 0 0 1px var(--fcb-accent);
    }
  }

  .fcb .tagify__input::before {
    color: var(--fcb-text);
  }

  .fcb .tags-input {
    width: 100%;
    border-color: var(--fcb-control-border);
  }

  .fcb .tags-wrapper.uninitialized {
    visibility: hidden;
  }
</style>

<style lang="scss">
  // Dropdown styles for .fcb-tagify-dropdown class
  // These styles are NOT prefixed with .fcb because the dropdown renders at body level
  // We use the custom classname 'fcb-tagify-dropdown' to scope these styles to our dropdown only
  .fcb-tagify-dropdown {
    display: block;
    position: absolute;
    z-index: 9999;
    background: var(--fcb-list-background, #fff);
    border: 1px solid var(--fcb-control-border, #ddd);
    border-radius: 3px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    
    .tagify__dropdown__wrapper {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .tagify__dropdown__item {
      padding: 6px 10px;
      cursor: pointer;
      color: var(--fcb-text, #000);
      
      &:hover, &--active {
        background-color: var(--fcb-list-highlight-bg, #e0e0e0);
        color: var(--fcb-list-highlight-text, #000);
      }
    }
  }
</style>
