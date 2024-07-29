<template>
  <div 
    class="fwb-typeahead"
    @keydown="onKeyDown"
  >
    <input 
      v-model="currentValue" 
      type="text"
      :placeholder="`${localize('fwb.placeholders.search')}...`"
      @input="onInput"
    >
    <div 
      id="fwb-ta-dropdown" 
      class="fwb-ta-dropdown"
      @click="onDropdownClick"
    >
      <div
        v-for="(item, i) in filteredItems"
        :key="i"
        :class="`typeahead-entry ${i===idx ? 'highlighted' : ''}`" 
        :data-id="objectMode ? (item as ListItem).id : item"
      >
        {{ objectMode ? (item as ListItem).label : item }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends string | { id: string; label: string}">
  // library imports
  import { PropType, computed, onMounted, ref, watch } from 'vue';

  // local imports
  import { localize } from '@/utils/game';

  // library components

  // local components

  // types
  type ListItem = {id: string; label: string;};

  ////////////////////////////////
  // props
  const props = defineProps({
    initialValue: {         // the initial value (string or id)
      type: String,
      required: true,
    },
    initialList: {   // the initial list of items to include
      type: Array as PropType<T[]>,
      required: true,
    },
    allowNewItems: {   // can we add new items?  can't be used if the items are objects
      type: Boolean,
      required: false,
      default: true,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'itemAdded', newValue: string): void;
    (e: 'selectionMade', selectedValue: string): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const hasFocus = ref<boolean>(false);
  const currentValue = ref<string>('');   // the current value of the input text
  const idx = ref<number>(-1);   // selected index in the list (-1 for none)
  const filteredItems = ref<T[]>([]);
  const list = ref<T[]>([]);

  ////////////////////////////////
  // computed data
  const objectMode = computed(() => props.initialList.length>0 && isObject(props.initialList[0]));

  ////////////////////////////////
  // methods
  function isObject(value: unknown): value is { id: string; label: string } {
    return typeof value === 'object' && value !== null && 'id' in value && 'label' in value;
  }

  const getLabel = (i: number) => (objectMode.value ? (filteredItems.value[i] as ListItem).label : (filteredItems.value[i] as string));

  ////////////////////////////////
  // event handlers
  // listen for input changes
  const onInput = () => {
    // note that we have the focus
    hasFocus.value = true;

    // blank everything out if the string is empty (so box closes)
    if (!currentValue.value) {
      filteredItems.value = [];
    } else {
      // filter
      const inputValue = currentValue.value.toLowerCase() || '';
      if (objectMode.value) {
        filteredItems.value = !inputValue ? [] : list.value.filter((item)=>(item as ListItem).label.toLowerCase().indexOf(inputValue)!==-1);
      } else {
        filteredItems.value = !inputValue ? [] : list.value.filter((item)=>(item as string).toLowerCase().indexOf(inputValue)!==-1);
      }
    }

    // Render the filtered items
    // we clear the index if we're typing
    idx.value = -1;
  };

  // Event listener for item clicks
  const onDropdownClick = async (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    if (!target)
      return;

    if (target.classList.contains('typeahead-entry')) {
      const selection = (objectMode.value ? target.dataset.id : target.textContent) || ''; 

      currentValue.value = objectMode.value ? target.textContent || '' : selection;
      filteredItems.value = [];

      hasFocus.value = false;
      emit('selectionMade', selection);
    }
  };

  // capture keydown for up, down, enter
  const onKeyDown = async (event: KeyboardEvent): Promise<void> => {
    // if no list, don't need to do anything
    if (!filteredItems.value)
      return;

    // either arrow starts at 0 if we're not highlighting something yet
    if (['ArrowUp', 'ArrowDown'].includes(event.key) && idx.value===-1) {
      if (filteredItems.value.length>0) 
        idx.value = 0;
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (filteredItems.value.length>0) 
          idx.value = ((idx.value || 0) - 1 + filteredItems.value.length) % filteredItems.value.length;
        return;

      case 'ArrowDown':
        event.preventDefault();
        if (filteredItems.value.length>0)
          idx.value = ((idx.value || 0) + 1) % filteredItems.value.length;
        return;

      case 'Enter':
      case 'Tab': {
        let selection = '';

        // if nothing selected, check for a match or add something new
        // if box is empty, we don't add a new value, but we still say blank was seleted
        if (idx.value===-1 && currentValue.value) {
          // exact match only to let us add values that are just different cases
          const match = objectMode.value ? (list.value as ListItem[]).find(item=>item.label===selection.toString())?.id : (list.value as string[]).find(item=>item===selection.toString());
          if (match) {
            // it's match, so we'll select that item but don't need to add anything (we don't use the text
            //    in the box because it might have different case)
            selection = match;
          } else if (props.allowNewItems && !objectMode.value) {
            selection = currentValue.value;
            list.value.push(selection);
            hasFocus.value = false;

            emit('itemAdded', selection);
          } else {
            // there's no match but we're not allowed to add - reset back to the original
            // find the initial item
            const initialItem = objectMode.value ? props.initialList.find((item: ListItem)=>item.id===props.initialValue) as ListItem : props.initialValue;

            currentValue.value = objectMode.value ? initialItem.label : initialItem;

            // set the selection to be the id of the current item (this assumes there is only 1 valid match)
            selection = objectMode.value ? initialItem.id : initialItem;
          }
        } else if (idx.value!==-1) {
          // fill in the input value
          selection = objectMode.value ? (filteredItems.value as ListItem[])[idx.value].id : (filteredItems.value as string[])[idx.value];
          currentValue.value = getLabel(idx.value);
        }
  
        // close the list
        idx.value = -1;
        filteredItems.value = [];
        hasFocus.value = false;

        emit('selectionMade', selection);

        return;
      }

      default:
        return;
    }
  };

  ////////////////////////////////
  // watchers
  watch(() => props.initialList, (newList: T[]) => {
    list.value = globalThis.foundry.utils.deepClone(newList) || [];
  });

  watch(() => props.initialValue, (newValue: string) => {
    currentValue.value = objectMode.value ? (props.initialList.find((item)=>(item as ListItem).id===newValue) as ListItem).label : newValue;
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    // watch for clicks anywhere outside the control
    document.addEventListener('click', async (event: MouseEvent) => {
      if (hasFocus.value && event.target && (!event.target.closest || !(event.target as HTMLElement)?.closest('.fwb-typeahead'))) {
        // we were in it, but now we're not; treat as if we'd tabbed out
        await onKeyDown({key:'Tab'} as KeyboardEvent);
      }
    });

    // create our working list
    list.value = globalThis.foundry.utils.deepClone(props.initialList) as T[] || [] as T[];
    currentValue.value = objectMode.value ? (props.initialList.find((id)=>id===props.initialValue) as ListItem).label : props.initialValue;
  });


</script>

<style lang="scss">
  .fwb-typeahead {
    position: relative;
    overflow-y: visible;
    z-index: 1000;

    .fwb-ta-dropdown {
      position: absolute;
      margin-top: 2px;
      padding: 0;
      display: flex;
      flex-direction: column;
      box-shadow: 0 0 5px #555555;
      border-radius: 3px;
      width: calc(100% - 2px);
      
      .typeahead-entry {
        background-color: var(--fwb-header-tab-background);
        padding: 1px 3px;
        margin: 1px 0;
        font-size: 1rem;
        font-weight: normal;
        font-family: Signika, sans-serif;

        &.highlighted {
          background: #55559922;
        }
      }
    }
  }
</style>