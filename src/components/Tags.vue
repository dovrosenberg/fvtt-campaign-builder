<template>
  <input 
    id="fcb-tags-input" 
    class="tags-input" 
    :value="currentValue" 
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
  type TagEvent = {
    detail: {
      data: {
        __tagId: string;
        __isValid: boolean | string;
        value: string;
      };
    };
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
  const currentValue = ref<TagInfo[]>([]);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onTagAdded = async (event: TagEvent): Promise<void> => {
    const tagInfo = event.detail.data;
    const value = tagInfo.value;

    // see if it's valid (which includes checking for duplicates)
    if (tagInfo.__isValid !== true) 
      return;

    // add to the setting
    const tagCounts = ModuleSettings.get(props.tagSetting);

    tagCounts[value] = (tagCounts[value] || 0) +1;

    await ModuleSettings.set(props.tagSetting, tagCounts);

    // trigger reactivity
    currentValue.value = [...currentValue.value, { value }]; 

    // emit to the parent to update the field
    emit('update:modelValue', currentValue.value);
    emit('tagAdded', { value });  
  };

  const onTagRemoved = async (event: TagEvent): Promise<void> => {
    const tagInfo = event.detail.data;
    const value = tagInfo.value;

    // see if it's valid (which it should be when removing, but just in case
    if (tagInfo.__isValid !== true) 
      return;

    // reduce the setting count and remove if this was the last use
    const tagCounts = ModuleSettings.get(props.tagSetting);
    tagCounts[value] = (tagCounts[value] || 1) - 1;

    if (!tagCounts[value]) 
      delete tagCounts[value];

    await ModuleSettings.set(props.tagSetting, tagCounts);

    currentValue.value = currentValue.value.filter((t) => t.value !== value);

    // emit to the parent to update the field
    emit('update:modelValue', currentValue.value);
    emit('tagRemoved', { value });  
  };

  ////////////////////////////////
  // watchers
  watch(props.modelValue, (newVal) => {
    tagify.value.loadOriginalValues(newVal)
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
      whitelist: whitelist,
      dropdown: {
        enabled: 1,
        delimiters: null,
        position: 'text',
        searchKeys: ['value'],
        tabKey: true,
      },
      callbacks: {
        add: (e) => { onTagAdded(e); },
        remove: (e) => { onTagRemoved(e); },
      }
    })
  });
</script>

<style lang="sass">
</style>