<template>
  <div class="tags-wrapper">
    <input 
      id="fcb-tags-input" 
      :class="'tags-input' + (isInitialized ? '' : ' uninitialized')" 
      data-testid="tags-input"
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

  // library components
  import Tagify from "@yaireo/tagify"

  // local components

  // types
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
    tagSetting: {   // key of setting to pull tag counts from 
      type: String as PropType<SettingKey.contentTags>,
      required: true,
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

  ////////////////////////////////
  // data
  const tagify = ref<Tagify>();
  const currentValue = ref<string[]>(props.modelValue);
  const isInitialized = ref<boolean>(false);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const rand = (min, max) => (min + Math.random() * (max - min));

  // generate a random color
  const transformTag = ( tagData: TagData ) => {
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

    // tagify calls add unnecessarily when rebuilding its internal list
    if (currentValue.value.includes(value))  
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
  watch(props.modelValue, (newVal: string[]) => {
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

      // Check if Tagify is already initialized on this input
      // @ts-ignore - Tagify adds this property to the input element
      if (input && input.__tagify) {
        // Reuse the existing Tagify instance
        // @ts-ignore
        tagify.value = input.__tagify;
        isInitialized.value = true;
        return;
      } else if (!input)
        return;

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
  .tags-wrapper {
    // TODO - do these heights need to change when font size scales? Should it be like x rem+1px or something?
    min-height: 31px;
    width: 100%;
    position: relative;
    font-family: var(--fcb-font-family);
  }

  .tagify {
    min-height: 31px; /* Ensure consistent height even when empty */
    
    &:focus-within {
      outline: none;
      border-color: var(--fcb-control-border);
      box-shadow: 0 0 0 1px var(--fcb-accent);
    }
  }

  .tagify__input::before {
    color: var(--fcb-text);
  }

  .tags-input {
    width: 100%;
    border-color: var(--fcb-control-border);
  }

  #fcb-tags-input.uninitialized {
    visibility: hidden;
  }
</style>