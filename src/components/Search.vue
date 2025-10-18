<template>
  <div class="fcb-search-container">
    <div class="fcb-search-input-container">
      <input
        v-model="searchQuery"
        type="text"
        class="fcb-search-input"
        data-testid="search-input"
        :placeholder="localize('placeholders.search')"
        @input="onSearchInput"
        @keydown.enter="onEnterPress"
        @keydown.escape="manuallyHiddenResults=true"
        @keydown.down="onArrowDown"
        @keydown.up="onArrowUp"
      >
      <i class="fas fa-search fcb-search-icon"></i>
    </div>
    
    <div v-if="showResults" class="fcb-search-results">
      <div v-if="isSearching" class="fcb-search-loading">
        <i class="fas fa-spinner fa-spin"></i>
        {{ localize('labels.searching') }}...
      </div>
      
      <div 
        v-else-if="searchResults.length === 0 && searchQuery.trim().length >= 3" 
        class="fcb-search-no-results"
      >
        {{ localize('labels.noResults') }}
      </div>
      
      <div 
        v-for="(result, index) in searchResults" 
        :key="result.uuid"
        :class="['fcb-search-result', { 'fcb-search-result-selected': index === selectedIndex }]"
        :data-testid="`search-result-${index}`"
        @click="selectResult($event, result)"
        @mouseenter="selectedIndex = index"
      >
        <div class="fcb-search-result-header">
          <!-- If there's a type use that, otherwise, use the topic -->
          <span class="fcb-search-result-name">
            {{ result.name }} ({{ result.resultType === 'entry' ? (result.type ? result.type : result.topic) : result.resultType === 'session' ? localize('labels.session.session') : localize('labels.pc.pc') }})
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { searchService, FCBSearchResult } from '@/utils/search';
  import { localize } from '@/utils/game';
  import { useMainStore, useNavigationStore } from '@/applications/stores';
  
  // types
  
  ////////////////////////////////
  // props
  const props = defineProps({
    maxResults: {
      type: Number,
      default: 5
    }
  });
  
  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'resultSelected', uuid: string): void;
  }>();
  
  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentSetting } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const searchQuery = ref('');
  const searchResults = ref<FCBSearchResult[]>([]);
  const isSearching = ref(false);
  const selectedIndex = ref(-1);
  const searchTimeout = ref<number | null>(null);

  /** did the user hit 'escape' to close the results */
  const manuallyHiddenResults = ref(false);

  ////////////////////////////////
  // computed data
  const showResults = computed(() => ( searchQuery.value.trim().length >= 3 && !manuallyHiddenResults.value));

  ////////////////////////////////
  // methods
  
  /**
   * Performs a search with the current query
   */
  const performSearch = async () => {
    const trimmedQuery = searchQuery.value.trim();
    
    // Don't search if query is empty or less than 3 characters
    if (!trimmedQuery || trimmedQuery.length < 3) {
      searchResults.value = [];
      isSearching.value = false;
      return;
    }
    
    isSearching.value = true;
    
    try {
      searchResults.value = await searchService.search(trimmedQuery, props.maxResults);
    } catch (error) {
      console.error('Search error:', error);
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  };
  
  /**
   * Handles input in the search box with debouncing
   */
  const onSearchInput = () => {
    // Clear any existing timeout
    if (searchTimeout.value !== null) {
      window.clearTimeout(searchTimeout.value);
    }

    // clear the manual disabling
    manuallyHiddenResults.value = false;
    
    // Set a new timeout to perform the search after a delay
    searchTimeout.value = window.setTimeout(() => {
      performSearch();
    }, 200); // 200ms debounce
    
    // Reset selected index when input changes
    selectedIndex.value = -1;
  };
  
  /**
   * Handles Enter key press to select the current result
   */
  const onEnterPress = () => {
    if (selectedIndex.value >= 0 && selectedIndex.value < searchResults.value.length) {
      selectResult(null, searchResults.value[selectedIndex.value]);
    } else if (searchResults.value.length > 0) {
      // Select the first result if none is selected
      selectResult(null, searchResults.value[0]);
    }
  };
  
  /**
   * Handles Down arrow key to navigate results
   */
  const onArrowDown = (event: KeyboardEvent) => {
    if (searchResults.value.length > 0) {
      event.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % searchResults.value.length;
    }
  };
  
  /**
   * Handles Up arrow key to navigate results
   */
  const onArrowUp = (event: KeyboardEvent) => {
    if (searchResults.value.length > 0) {
      event.preventDefault();
      selectedIndex.value = (selectedIndex.value - 1 + searchResults.value.length) % searchResults.value.length;
    }
  };
  
  /**
   * Selects a search result and opens it
   */
  const selectResult = (_event: MouseEvent | null,result: FCBSearchResult) => {
    // Close the results panel
    manuallyHiddenResults.value = true;
    
    // Clear the search input
    searchQuery.value = '';
    
    // Open the selected entry - always a new tab
    navigationStore.openEntry(result.uuid, { newTab: true, activate: true });
    
    // Emit the selected result
    emit('resultSelected', result.uuid);
  };
  
  /**
   * Initializes the search index when the component is mounted
   */
  const initializeSearch = async () => {
    if (currentSetting.value) {
      isSearching.value = true;
      await searchService.buildIndex(currentSetting.value);
      isSearching.value = false;
    }
  };
  
  /**
   * Closes the search results when clicking outside
   */
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const searchContainer = document.querySelector('.fcb-search-container');
    
    if (searchContainer && !searchContainer.contains(target)) {
      manuallyHiddenResults.value = true;
    }
  };
  
  ////////////////////////////////
  // watchers
  
  // Rebuild the search index when the current setting changes
  watch(() => currentSetting.value, async (newSetting) => {
    if (newSetting) {
      await initializeSearch();
    }
  });
  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // Initialize the search index
    await initializeSearch();
    
    // Add click outside listener
    document.addEventListener('click', handleClickOutside);
  });
  
  onUnmounted(() => {
    // Remove click outside listener
    document.removeEventListener('click', handleClickOutside);
    
    // Clear any pending timeout
    if (searchTimeout.value !== null) {
      window.clearTimeout(searchTimeout.value);
    }
  });
</script>

<style lang="scss">
.fcb-search-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  z-index: 10;  // try to bring the whole container forward
  font-family: var(--fcb-font-family);
  
  .fcb-search-input-container {
    position: relative;
    width: 100%;
    
    .fcb-search-input {
      width: 180px;
      height: 1.5rem;
      padding: 4px 24px 4px 8px;
      font-size: var(--font-size-12);
      border-radius: 3px;
      
      &:focus {
        outline: none;
        border-color: var(--fcb-control-border-focus);
        box-shadow: 0 0 0 1px var(--fcb-accent);
      }

      // in light mode, inputs are darker than background, so need to override
      .theme-light & {
        background: white;
      }
    }
    
    .fcb-search-icon {
      position: absolute;
      right: 6px;
      font-size: var(--font-size-12);
      top: 50%;
      transform: translateY(-50%);
      color: var(--fcb-text);
      pointer-events: none;
    }
  }
  
  // we intentionally use white background here regardless of light/dark scheme
  .fcb-search-results {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    max-height: 300px;
    overflow-y: auto;
    background-color: var(--fcb-list-background); 
    border: 1px solid var(--fcb-control-border);
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    margin-top: 0.25rem;
    font-size: var(--font-size-12);
    z-index: 10; // Higher z-index to appear above other elements
 
    .fcb-search-loading,
    .fcb-search-no-results {
      padding: 12px;
      text-align: center;
      color: var(--fcb-text);
    }
    
    .fcb-search-result {
      padding: 6px 8px;
      border-bottom: 1px solid var(--fcb-control-border);
      cursor: pointer;
      background-color: var(--fcb-list-background);
      
      &:last-child {
        border-bottom: none;
      }
      
      &:hover,
      &.fcb-search-result-selected {
        background-color: var(--fcb-list-highlight);
      }
      
      .fcb-search-result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.125rem;
        
        .fcb-search-result-name {
          font-size: var(--font-size-12);
          font-weight: 500;
          color: var(--fcb-text);
        }
        
        .fcb-search-result-topic-type {
          font-size: var(--font-size-12);
          color: var(--fcb-text-muted);
        }
      }
    }
  }
}
</style>