<template>
  <input 
    id="fcb-tags-input" 
    class="tags-input" 
    :value="JSON.stringify(currentValue)" 
    :placeholder="'Tags...'"
  />
</template>

<script setup lang="ts">
  // library imports
  import { onMounted, PropType, ref, watch } from "vue";

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

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const rand = (min, max) => (min + Math.random() * (max - min));

  // generate a random color
  const transformTag = ( tagData: TagInfo ) => {
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
    const tagCounts = ModuleSettings.get(props.tagSetting);
    const whitelist = [] as string[];
    for (const tag in tagCounts) {
      if (tagCounts[tag] > 0)  // make sure count > 0
        whitelist.push(tag);
    }

    return whitelist;
  }


  ////////////////////////////////
  // event handlers
  const onTagAdded = async (event: CustomEvent<Tagify.AddEventData<any>>): Promise<void> => {
    const tagInfo = event.detail.data as TagEventData;
    const value = tagInfo.value;

    if (!tagify.value)
      return;

    // see if it's valid (which includes checking for duplicates)
    if (tagInfo.__isValid !== true) 
      return;

    // add to the setting
    const tagCounts = ModuleSettings.get(props.tagSetting);

    tagCounts[value] = (tagCounts[value] || 0) +1;

    await ModuleSettings.set(props.tagSetting, tagCounts);

    // trigger reactivity
    currentValue.value = tagify.value.value;

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
    const tagCounts = ModuleSettings.get(props.tagSetting);
    tagCounts[value] = (tagCounts[value] || 1) - 1;

    if (!tagCounts[value]) 
      delete tagCounts[value];

    await ModuleSettings.set(props.tagSetting, tagCounts);

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
    // @ts-ignore - I think the type here is specified wrong
    // tagify.value?.loadOriginalValues(newVal);
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    const tagCounts = ModuleSettings.get(props.tagSetting);
    const whitelist = [] as string[];
    for (const tag in tagCounts) {
      if (tagCounts[tag] > 0)  // make sure count > 0
        whitelist.push(tag);
    }

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
    })
  });
</script>

<style lang="sass">
</style>