<template>
  <div 
    ref="containerRef"
    class="fcb-typeahead"
    @keydown="onKeyDown"
  >
    <input 
      v-model="currentValue" 
      type="text"
      :placeholder="`${localize('placeholders.search')}...`"
      @input="onInput"
    />
    <div 
      id="fcb-ta-dropdown" 
      class="fcb-ta-dropdown"
    >
      <!-- Add row shown separately before the filtered items -->
      <div
        v-if="showAddOption"
        :class="`typeahead-entry add ${idx===0 ? 'highlighted' : ''}`"
        @click="(event) => {event.stopPropagation(); addCurrentValue(); }"
        >
        <i class="fas fa-plus"></i> {{ localize('labels.add') }} "{{ currentValue }}"
      </div>

      <!-- Render the filtered items -->
      <div
        v-for="(item, i) in filteredItems"
        :key="i"
        :class="`typeahead-entry ${idx === (showAddOption ? i+1 : i) ? 'highlighted' : ''}`"
        :data-id="objectMode ? (item as ListItem).id : (item as string)"
        @click="onDropdownClick"
      >
        {{ objectMode ? (item as ListItem).label : (item as string) }}
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
  type ListItem = {id: string; label: string};

  ////////////////////////////////
  // props
  const props = defineProps({
    /**  the initial value (string or id) */
    initialValue: {         
      type: String,
      required: true,
    },
    /**  the initial list of items to include */
    initialList: {    
      type: Array as PropType<T[]>,
      required: true,
    },
    /** can we add new items?  */
    allowNewItems: {   
      type: Boolean,
      required: false,
      default: true,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'itemAdded', newValue: { id: string; label: string; } | string): void;

    /** in object mode returns key, value; is value mode 1st param is the text and 2nd is undefined */
    (e: 'selectionMade', selectedValue: string, selectedName?: string): void;
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
  const containerRef = ref<HTMLElement | null>(null);

  ////////////////////////////////
  // computed data
   /** Determines whether we're in object mode (id/label) or string mode */
   const objectMode = computed(() => props.initialList.length>0 && isObject(props.initialList[0]));

  /** Whether to show the synthetic Add row */
  const showAddOption = computed(() => {
    if (!props.allowNewItems)
      return false;
    const txt = (currentValue.value || '').trim();
    if (!txt)
      return false;
    if (objectMode.value) {
      return !(list.value as ListItem[]).some(item => item.label === txt);
    } else {
      return !(list.value as string[]).some(item => item === txt);
    }
  });

  // No dropdownItems list; we render Add separately before filteredItems

  ////////////////////////////////
  // methods
    /**
   * Type guard to check if a value is a ListItem object.
   * @param value The value to check
   * @returns True if the value is an object with id and label
   */
  function isObject(value: unknown): value is { id: string; label: string } {
    return typeof value === 'object' && value !== null && 'id' in value && 'label' in value;
  }

  /** Adds the current text as a new item and emits itemAdded */
  function addCurrentValue() {
    const text = (currentValue.value || '').trim();
    if (!text || !props.allowNewItems)
      return;
    
    if (objectMode.value) {
      // make up a temp id
      const id = foundry.utils.randomID(12);
      
      (list.value as ListItem[]).push({ id, label: text });
    } else {
      (list.value as string[]).push(text);
    }

    hasFocus.value = false;
    idx.value = -1;
    filteredItems.value = [];
    emit('itemAdded', text);
  }


  ////////////////////////////////
  // event handlers
  // listen for input changes
  /**
   * Handles text input changes and filters the list of items.
   */
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

    // Default highlight rules:
    // - If Add is shown and there are other items, highlight the first real item (index 1 overall)
    // - If Add is shown and there are no other items, highlight Add (index 0)
    // - Otherwise, highlight the first item if present
    if (showAddOption.value) {
      idx.value = filteredItems.value.length > 0 ? 1 : 0;
    } else {
    idx.value = filteredItems.value.length > 0 ? 0 : -1;
    }
  };

  /**
   * Handles a click on the Add button.
   */
  const onAddClick = () => {
    addCurrentValue();

    // close the list
    idx.value = -1;
    filteredItems.value = [];
  };


  /**
   * Handles a click on an item in the dropdown list.
   * @param event Mouse click event
   */
  const onDropdownClick = async (event: MouseEvent) => {
    event.stopPropagation();

    const target = event.target as HTMLElement;

    if (!target)
      return;

    const row = target.closest('.typeahead-entry') as HTMLElement | null;
    if (!row)
      return;

    const selection = (objectMode.value ? row.dataset.id : row.textContent) || '';
    currentValue.value = objectMode.value ? row.textContent || '' : selection;
    filteredItems.value = [];

    hasFocus.value = false;
    emit('selectionMade', selection, row.textContent || '' );
  };


  /**
   * Handles keyboard navigation and selection.
   * @param event Keyboard event
   */
  const onKeyDown = async (event: KeyboardEvent): Promise<void> => {
    // if no list, don't need to do anything
    if (!filteredItems.value)
      return;

    const totalCount = filteredItems.value.length + (showAddOption.value ? 1 : 0);

    // either arrow starts at 1st entry if we're not highlighting something yet
    if (['ArrowUp', 'ArrowDown'].includes(event.key) && idx.value===-1) {
      if (totalCount > 0) {
        idx.value = showAddOption.value ? (filteredItems.value.length > 0 ? 1 : 0) : 0;
      }

      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (totalCount>0)
          idx.value = ((idx.value || 0) - 1 + totalCount) % totalCount;
        return;

      case 'ArrowDown':
        event.preventDefault();
        if (totalCount>0)
          idx.value = ((idx.value || 0) + 1) % totalCount;
        return;

      case 'Enter':
      case 'Tab': {
        // if it's enter, preventDefault, but tab we need to allow it
        if (event.key==='Enter') {
          event.preventDefault();
        }

        // first handle nothing in the list
        if (totalCount===0) {
          if (currentValue.value) {
            // check the full list just to be sure it's not in there
            // shouldn't happen because filtered list is empty
            // exact match only to let us add values that are just different cases
            const match = objectMode.value ? (list.value as ListItem[]).find(item=>item.label===currentValue.value)?.id : (list.value as string[]).find(item=>item===currentValue.value);
            if (match) {
              // it's match, so we'll select that item but don't need to add anything (we don't use the text
              //    in the box because it might have different case)
              const label = objectMode.value ? currentValue.value : match;
              emit('selectionMade', match, label);
            } else if (props.allowNewItems) {
              // list is empty; we have text - create a new one
              addCurrentValue();
            } else {
              // there's no match but we're not allowed to add - reset back to the original
              // find the initial item
              if (objectMode.value) {
                const initialItem = (props.initialList as { id: string; label: string}[]).find((item: ListItem)=>item.id===props.initialValue);

                // if it's not there (ex. it got deleted at some point) replace with nothing
                currentValue.value = initialItem?.label || '';

                // set the selection to be the id of the current item (this assumes there is only 1 valid match)
                if (props.initialList.length > 0) {
                  const selection = initialItem?.id || '';
                  emit('selectionMade', selection, initialItem?.label || '');
                }
              } else {
                const selection = props.initialValue;
                currentValue.value = selection;
                emit('selectionMade', selection);
              }
            }
          } else {
            // nothing in the list and no value in the box means we are choosing blank
            emit('selectionMade', '', '');
          }
 
        } else if (idx.value!==-1) {
          // we have a list and a valid index
          // first see if it's the add option
          if (showAddOption.value && idx.value === 0) {
              addCurrentValue();
          } else {
            // we need to pick the selected item
            // fill in the input value
            const adjustedIndex = idx.value - (showAddOption.value ? 1 : 0);

            if (adjustedIndex >= 0 && adjustedIndex < filteredItems.value.length) {
              const value = filteredItems.value[adjustedIndex];
              const label = objectMode.value ? (value as unknown as ListItem).label : (value as unknown as string);
              const selection = objectMode.value ? (value as unknown as ListItem).id : (value as unknown as string);
              currentValue.value = label;
              emit('selectionMade', selection, label);
            }
          }
        } else {
          // there's something in the list but no valid index - set a valid index
          idx.value = showAddOption.value ? (filteredItems.value.length > 0 ? 1 : 0) : 0;
        }
  
        // close the list
        idx.value = -1;
        filteredItems.value = [];
        hasFocus.value = false;

        return;
      }

      default:
        return;
    }
  };

  ////////////////////////////////
  // watchers
  watch(() => props.initialList, (newList: T[]) => {
    list.value = foundry.utils.deepClone(newList) || [];
    
    // Update the current display value if we're in object mode and have a current value
    // This handles the case where the label of an existing item changes
    if (objectMode.value && props.initialValue) {
      const updatedItem = (newList as ListItem[]).find((item: ListItem) => item.id === props.initialValue);
      if (updatedItem) {
        currentValue.value = updatedItem.label;
      }
    }
  });

  watch(() => props.initialValue, (newValue: string) => {
    currentValue.value = objectMode.value ? (props.initialList.find((item)=>(item as ListItem).id===newValue) as ListItem)?.label || '' : newValue;
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    // watch for clicks anywhere outside the control
    document.addEventListener('click', async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (hasFocus.value && target && (!target.closest || !target.closest('.fcb-typeahead'))) {
        // we were in it, but now we're not; treat as if we'd tabbed out
        await onKeyDown({key:'Tab'} as KeyboardEvent);
      }
    });

    // create our working list
    list.value = foundry.utils.deepClone(props.initialList) || [];
    currentValue.value = objectMode.value ? (props.initialList.find((item)=>(item as ListItem).id===props.initialValue) as ListItem)?.label || '' : props.initialValue;
  });

</script>

<style lang="scss">
  .fcb-typeahead {
    position: relative;
    overflow-y: visible;
    z-index: auto;

    .fcb-ta-dropdown {
      position: absolute;
      margin-top: 2px;
      padding: 0;
      display: flex;
      flex-direction: column;
      color: var(--color-text-primary);
      background-color: var(--fcb-list-background);
      box-shadow: 0 0 5px #555555;
      border-radius: 3px;
      width: calc(100% - 2px);
      z-index: 1;
      
      .typeahead-entry {
        padding: 1px 3px;
        font-size: 1rem;
        font-weight: normal;
        font-family: Signika, sans-serif;

        &.add i {
          margin-right: 4px;
          font-size: 0.8rem
        }

        &.highlighted,
        &:hover {
          background: var(--fcb-list-highlight); 
        }
      }
    }
  }
</style>