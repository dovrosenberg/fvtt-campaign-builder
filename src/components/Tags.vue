<template>
  <div class="tags-wrapper">
    <input 
      id="fcb-tags-input" 
      :class="'tags-input' + (isInitialized ? '' : ' uninitialized')" 
      :value="JSON.stringify(currentValue)" 
      :placeholder="'Tags...'"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { onMounted, onBeforeUnmount, PropType, ref, watch } from "vue";

  // local imports
  import { ModuleSettings, SettingKey } from "@/settings";
  import { TagInfo } from "@/types";

  // library components
  import Tagify from "@yaireo/tagify"

  // local components

  // types
  type TagEventData = {
    __tagId: string;
    __isValid: boolean | string;
    value: string;
    color: string;
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: {
      type: Array as PropType<TagInfo[]>,
      required: true,
    },
    tagSetting: {   // key of setting to pull tag counts from 
      type: String as PropType<SettingKey.entryTags | SettingKey.sessionTags>,
      required: true,
    },
  });


  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', newValue: TagInfo[]): void;
    (e: 'tagAdded', newValue: TagInfo): void;
    (e: 'tagRemoved', removedValue: TagInfo): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const tagify = ref<Tagify>();
  const currentValue = ref<TagInfo[]>(props.modelValue);
  const isInitialized = ref<boolean>(false);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const rand = (min, max) => (min + Math.random() * (max - min));

  // generate a random color
  const transformTag = ( tagData: TagInfo & { color?: string; style?: string; } ) => {
    // see if there's a color
    tagData.color = ModuleSettings.get(props.tagSetting)[tagData.value]?.color;
    
    // only change it if it doesn't already have a color
    if (!tagData.color) {
      var h = rand(1, 360)|0,
          s = rand(40, 70)|0,
          l = rand(65, 72)|0;

      tagData.color = 'hsl(' + h + ',' + s + '%,' + l + '%)';
    }

    tagData.style = "--tag-bg:" + tagData.color;
  }

  const getWhitelist = () => {
    const tagList = ModuleSettings.get(props.tagSetting);
    const whitelist = [] as string[];
    for (const tag in tagList) {
      if (tagList[tag].count > 0)  // make sure count > 0
        whitelist.push(tag);
    }

    return whitelist;
  }


  ////////////////////////////////
  // event handlers
  const onTagAdded = async (event: CustomEvent<Tagify.AddEventData<any>>): Promise<void> => {
    const tagInfo = event.detail.data as TagEventData;
    const value = tagInfo.value;
    const color = tagInfo.color;

    // tagify calls add unnecesarily when rebuilding its internal list
    if (currentValue.value.find((t) => t.value === value))  
      return;
 
    if (!tagify.value)
      return;

    // see if it's valid (which includes checking for duplicates)
    if (tagInfo.__isValid !== true) 
      return;

    // add to the setting
    const tagList = ModuleSettings.get(props.tagSetting);

    tagList[value] = {
      count: (tagList[value]?.count || 0) + 1,
      color: color || undefined
    };

    await ModuleSettings.set(props.tagSetting, tagList);

    // trigger reactivity - map back to just the name of the tag
    currentValue.value = tagify.value.value.map((t) => ({ value: t.value }));

    // don't need to update the whitelist on an add because we shouldn't be adding it again
    // anyway

    // emit to the parent to update the field
    emit('update:modelValue', currentValue.value);
    emit('tagAdded', { value });  
  };

  const onTagRemoved = async (event: CustomEvent<Tagify.AddEventData<any>>): Promise<void> => {
    const tagInfo = event.detail.data as TagEventData;
    const value = tagInfo.value;

    if (!tagify.value)
      return;

    // see if it's valid (which it should be when removing, but just in case
    if (tagInfo.__isValid !== true) 
      return;

    // reduce the setting count and remove if this was the last use
    const tagList = ModuleSettings.get(props.tagSetting);
    tagList[value] = {
      ...tagList[value],
      count: (tagList[value].count || 1) - 1,
    };

    if (!tagList[value].count) 
      delete tagList[value];

    await ModuleSettings.set(props.tagSetting, tagList);

    // update the whitelist
    tagify.value.whitelist = getWhitelist();

    currentValue.value = tagify.value.value;

    // emit to the parent to update the field
    emit('update:modelValue', currentValue.value);
    emit('tagRemoved', { value });  
  };

  ////////////////////////////////
  // watchers
  watch(props.modelValue, (newVal: TagInfo[]) => {
    currentValue.value = newVal;
    
    // If tagify is already initialized, we can update it directly
    if (tagify.value && isInitialized.value) {
      // We don't need to reset isInitialized here since Tagify is already set up
      // @ts-ignore - I think the type here is specified wrong
      tagify.value?.loadOriginalValues(newVal);
    } else {
      // If we're getting new values but Tagify isn't initialized yet,
      // make sure we're showing the loading state
      isInitialized.value = false;
    }
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    const tagList = ModuleSettings.get(props.tagSetting);
    const whitelist = [] as string[];
    for (const tag in tagList) {
      if (tagList[tag].count > 0)  // make sure count > 0
        whitelist.push(tag);
    }

    // Use setTimeout to ensure the DOM is fully rendered
    setTimeout(() => {
      var input = document.getElementById("fcb-tags-input") as HTMLInputElement;

      tagify.value = new Tagify(input, {
        whitelist: getWhitelist(),
        dropdown: {
          enabled: 1,
          position: 'text',
          searchKeys: ['value'],
          tabKey: true,
        },
        transformTag: transformTag,
        callbacks: {
          add: (e) => { onTagAdded(e); },
          remove: (e) => { onTagRemoved(e); },
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
  .tags-wrapper {
    min-height: 31px;
    width: 100%;
    position: relative;
  }

  .tagify {
    min-height: 31px; /* Ensure consistent height even when empty */
    
    &:focus-within {
      outline: none;
      border-color: var(--color-border-highlight);
      box-shadow: 0 0 0 1px var(--color-border-highlight);
    }
  }

  .tags-input {
    width: 100%;
  }

  #fcb-tags-input.uninitialized {
    visibility: hidden;
  }
</style>