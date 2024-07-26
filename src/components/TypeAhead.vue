<template>
  <div 
    class="fwb-typeahead"
    @keydown="onKeyDown"
  >
    <input 
      ref="inputRef"
      type="text" 
      :value="currentValue" 
      :placeholder="`${localize('fwb.placeholders.search')}...`"
      @input="onInput"
    >
    <div 
      id="fwb-ta-dropdown" 
      ref="dropdownRef"
      class="fwb-ta-dropdown"
      @click="onDropdownClick"
    ></div>
  </div>
</template>

<script setup lang="ts" generic="T extends string | { id: string; label: string}">
  // library imports
  import { PropType, computed, onMounted, ref, watch } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
import { initial } from 'lodash';

  // library components

  // local components

  // types
  type ListItem = {id: string; label: string;};

  ////////////////////////////////
  // props
  const props = defineProps({
    initialValue: {         // the current value of the input (string or id)
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
  const inputRef = ref<HTMLInputElement | null>(null);
  const dropdownRef = ref<HTMLSelectElement | null>(null);
  const hasFocus = ref<boolean>(false);
  const currentValue = ref<string>('');   // the string or the id
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

  const refreshList = (): void => {
    if (!dropdownRef.value)
      return;

    // Render the filtered items
    let itemHTML = '';
    for (let i=0; i<filteredItems.value.length && i<3; i++) {   // max of 3 items at a time.value
      itemHTML += `<div class="typeahead-entry ${i===idx.value ? 'highlighted' : ''}" ${objectMode.value  ? 'data-id="' + (filteredItems.value as ListItem[])[i].id + '"' : ''}}>${getLabel(0)}</div>`;
    }

    dropdownRef.value.innerHTML = itemHTML;   

    // if we're not allowed to add items, set the index
    if (!props.allowNewItems || objectMode.value) {
      idx.value = filteredItems.value.length ? 0 : -1;
    }
  };

  ////////////////////////////////
  // event handlers
  // listen for input changes
  const onInput = () => {
    if (!inputRef.value)
      return;

    // note that we have the focus
    hasFocus.value = true;

    const inputValue = inputRef.value.value?.toString().toLowerCase() || '';

    // blank everything out if the string is empty (so box closes)
    if (objectMode.value) {
      filteredItems.value = !inputValue ? [] : list.value.filter((item)=>(item as ListItem).label.toLowerCase().indexOf(inputValue)!==-1);
    } else {
      filteredItems.value = !inputValue ? [] : list.value.filter((item)=>(item as string).toLowerCase().indexOf(inputValue)!==-1);
    }

    // Render the filtered items
    // we clear the index if we're typing
    idx.value = -1;
    refreshList();
  };

  // Event listener for item clicks
  const onDropdownClick = async (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    if (!inputRef.value || !dropdownRef.value || !target)
      return;

    if (target.classList.contains('typeahead-entry')) {
      const selection = (objectMode.value ? target.dataset.id : target.textContent) || ''; 

      inputRef.value.value = objectMode.value ? target.textContent || '' : selection;
      dropdownRef.value.innerHTML = ''; // Clear the dropdown

      hasFocus.value = false;
      emit('selectionMade', selection);
    }
  };

  // capture keydown for up, down, enter
  const onKeyDown = async (event: KeyboardEvent): Promise<void> => {
    // if no list, don't need to do anything
    if (!filteredItems.value || !inputRef.value)
      return;

    // either arrow starts at 0 if we're not highlighting something yet
    if (['ArrowUp', 'ArrowDown'].includes(event.key) && idx.value===-1) {
      idx.value = 0;
      refreshList();
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        idx.value = ((idx.value || 0) - 1 + filteredItems.value.length) % filteredItems.value.length;
        refreshList();
        return;

      case 'ArrowDown':
        event.preventDefault();
        idx.value = ((idx.value || 0) + 1) % filteredItems.value.length;
        refreshList();
        return;

      case 'Enter':
      case 'Tab': {
        let selection = '';

        // if nothing selected, check for a match or add something new
        // if box is empty, we don't add a new value, but we still say blank was seleted
        if (idx.value===-1 && inputRef.value?.value?.toString()) {
          selection = inputRef.value.value?.toString() as string;

          // exact match only to let us add values that are just different cases
          const match = objectMode.value ? (list.value as ListItem[]).find(item=>item.label===selection.toString())?.id : (list.value as string[]).find(item=>item===selection.toString());
          if (match) {
            // it's match, so we'll select that item but don't need to add anything (we don't use the text
            //    in the box because it might have different case)
            selection = match;
          } else if (props.allowNewItems && !objectMode.value) {
            list.value.push(selection);
            hasFocus.value = false;

            emit('itemAdded', selection);
          }
        } else if (idx.value!==-1) {
          // fill in the input value
          selection = objectMode.value ? (filteredItems.value as ListItem[])[idx.value].id : (filteredItems.value as string[])[idx.value];
          inputRef.value.value = getLabel(idx.value);
        }
  
        // close the list
        filteredItems.value = [];
        refreshList();

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
      if (hasFocus.value && event.currentTarget && !(event.currentTarget as HTMLElement)?.closest('.fwb-typeahead')) {
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
        background: #99999922;
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