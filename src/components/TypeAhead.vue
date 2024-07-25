<template>
  <div 
    class="fwb-typeahead"
    @keydown="onKeyDown"
  >
    <input 
      ref="inputRef"
      type="text" 
      :value="currentValue" 
      placeholder="Search..."
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

<script setup lang="ts">
  // library imports
  import { PropType, onMounted, ref, watch } from 'vue';

  // local imports

  // library components

  // local components

  // types

  ////////////////////////////////
  // props
  const props = defineProps({
    initialValue: {         // the current value of the input
      type: Object as PropType<string | { id: string, text: string }>,
      required: true,
    },
    initialList: {   // the initial list of items to include
      type: Array as PropType<string[]>,
      required: true,
    },
    allowNewItems: {
      type: Boolean,
      required: false,
      default: true,
    }
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
  const currentValue = ref<string>('');
  const idx = ref<number>(-1);   // selected index in the list (-1 for none)
  const filteredItems = ref<string[]>([]);
  const list = ref<string[]>([]);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const refreshList = (): void => {
    if (!dropdownRef.value)
      return;

    // Render the filtered items - we're not using handlebars because it's overly complicated to pass up a re-render request
    let itemHTML = '';
    for (let i=0; i<filteredItems.value.length && i<3; i++) {   // max of 3 items at a time
      itemHTML += `<div class="typeahead-entry ${i===idx.value ? 'highlighted' : ''}">${filteredItems.value[i]}</div>`;
    }

    dropdownRef.value.innerHTML = itemHTML;   
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
    filteredItems.value = !inputValue ? [] : list.value.filter((item)=>item.toLowerCase().indexOf(inputValue)!==-1);

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
      const selection = target.textContent || ''; 
      inputRef.value.value = selection;
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

          // exact match only to let us add types that are just different cases
          const match = list.value.find(item=>item===selection.toString());
          if (match) {
            // it's match, so we'll select that item but don't need to add anything (we don't use the text
            //    in the box because it might have different case)
            selection = match;
          } else {
            if (props.allowNewItems) {
              list.value.push(selection);
              hasFocus.value = false;

              emit('itemAdded', selection);
            }
          }
        } else if (idx.value!==-1) {
          // fill in the input value
          selection = filteredItems.value[idx.value];
          inputRef.value.value = selection;
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
  watch(() => props.initialList, (newList: string[]) => {
    list.value = globalThis.foundry.utils.deepClone(newList) || [];
  });

  watch(() => props.initialValue, (newValue: string) => {
    currentValue.value = newValue;
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
    list.value = globalThis.foundry.utils.deepClone(props.initialList) || [];
    currentValue.value = props.initialValue;
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