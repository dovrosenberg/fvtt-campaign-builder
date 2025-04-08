<template>
  <div class="fcb-search-container">
    <div class="fcb-search-input-container">
      <input
        v-model="searchQuery"
        type="text"
        class="fcb-search-input"
        :placeholder="localize('placeholders.search')"
        @input="onSearchInput"
        @keydown.enter="onEnterPress"
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
      
      <div v-else-if="searchResults.length === 0 && searchQuery.trim() !== ''" class="fcb-search-no-results">
        {{ localize('labels.noResults') }}
      </div>
      
      <div 
        v-for="(result, index) in searchResults" 
        :key="result.uuid"
        :class="['fcb-search-result', { 'fcb-search-result-selected': index === selectedIndex }]"
        @click="selectResult(result)"
        @mouseenter="selectedIndex = index"
      >
        <div class="fcb-search-result-header">
          <span class="fcb-search-result-name">{{ result.name }} {{ result.type ? `(${result.type})` : ''}}</span>
          <!-- <span class="fcb-search-result-topic-type">{{ result.topic }}</span> -->
        </div>
        
        <!-- <div class="fcb-search-result-description" v-if="result.description">
          {{ truncateText(result.description, 100) }}
        </div> -->
        
        <!-- <div class="fcb-search-result-snippets" v-if="result.snippets.length > 0">
          <div 
            v-for="(snippet, snippetIndex) in result.snippets.slice(0, 2)" 
            :key="snippetIndex"
            class="fcb-search-result-snippet"
          >
            {{ truncateText(snippet, 80) }}
          </div>
          <div v-if="result.snippets.length > 2" class="fcb-search-result-more">
            +{{ result.snippets.length - 2 }} more
          </div>
        </div> -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, onMounted, onUnmounted } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { searchService, FCBSearchResult } from '@/utils/search';
  import { localize } from '@/utils/game';
  import { useMainStore, useNavigationStore } from '@/applications/stores';
  
  // types
  import { Topics } from '@/types';
  
  ////////////////////////////////
  // props
  
  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'resultSelected', uuid: string): void;
  }>();
  
  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorld } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const searchQuery = ref('');
  const searchResults = ref<FCBSearchResult[]>([]);
  const isSearching = ref(false);
  const showResults = ref(false);
  const selectedIndex = ref(-1);
  const searchTimeout = ref<number | null>(null);
  
  ////////////////////////////////
  // computed data
  
  ////////////////////////////////
  // methods
  
  /**
   * Truncates text to a specified length and adds ellipsis if needed
   */
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  /**
   * Performs a search with the current query
   */
  const performSearch = async () => {
    if (!searchQuery.value.trim()) {
      searchResults.value = [];
      isSearching.value = false;
      return;
    }
    
    isSearching.value = true;
    
    try {
      searchResults.value = await searchService.search(searchQuery.value, 5);
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
    
    // Set a new timeout to perform the search after a delay
    searchTimeout.value = window.setTimeout(() => {
      performSearch();
    }, 300); // 300ms debounce
    
    // Show results panel when typing
    showResults.value = true;
    
    // Reset selected index when input changes
    selectedIndex.value = -1;
  };
  
  /**
   * Handles Enter key press to select the current result
   */
  const onEnterPress = () => {
    if (selectedIndex.value >= 0 && selectedIndex.value < searchResults.value.length) {
      selectResult(searchResults.value[selectedIndex.value]);
    } else if (searchResults.value.length > 0) {
      // Select the first result if none is selected
      selectResult(searchResults.value[0]);
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
  const selectResult = (result: FCBSearchResult) => {
    // Close the results panel
    showResults.value = false;
    
    // Clear the search input
    searchQuery.value = '';
    
    // Open the selected entry
    navigationStore.openEntry(result.uuid, { newTab: true, activate: true });
    
    // Emit the selected result
    emit('resultSelected', result.uuid);
  };
  
  /**
   * Initializes the search index when the component is mounted
   */
  const initializeSearch = async () => {
    if (currentWorld.value) {
      isSearching.value = true;
      await searchService.buildIndex(currentWorld.value);
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
      showResults.value = false;
    }
  };
  
  ////////////////////////////////
  // watchers
  
  // Rebuild the search index when the current world changes
  watch(() => currentWorld.value, async (newWorld) => {
    if (newWorld) {
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
  
  .fcb-search-input-container {
    position: relative;
    width: 100%;
    
    .fcb-search-input {
      width: 100%;
      padding: 8px 32px 8px 12px;
      border: 1px solid var(--color-border-light-primary);
      border-radius: 4px;
      background: var(--color-bg-field);
      color: var(--color-text-dark-primary);
      font-size: 14px;
      
      &:focus {
        outline: none;
        border-color: var(--color-border-highlight);
        box-shadow: 0 0 0 1px var(--color-border-highlight);
      }
    }
    
    .fcb-search-icon {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-dark-secondary);
      pointer-events: none;
    }
  }
  
  .fcb-search-results {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    max-height: 400px;
    overflow-y: auto;
    background-color: white; //var(--color-bg-app);
    border: 1px solid var(--color-border-light-primary);
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    margin-top: 4px;
    
    .fcb-search-loading,
    .fcb-search-no-results {
      padding: 12px;
      text-align: center;
      color: var(--color-text-dark-secondary);
    }
    
    .fcb-search-result {
      padding: 10px 12px;
      border-bottom: 1px solid var(--color-border-light-secondary);
      cursor: pointer;
      background-color: white;
      
      &:last-child {
        border-bottom: none;
      }
      
      &:hover,
      &.fcb-search-result-selected {
        background-color: var(--color-bg-highlight);
      }
      
      .fcb-search-result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        
        .fcb-search-result-name {
          font-weight: bold;
          color: var(--color-text-dark-primary);
        }
        
        .fcb-search-result-topic-type {
          font-size: 12px;
          color: var(--color-text-dark-secondary);
        }
      }
      
      .fcb-search-result-description {
        font-size: 13px;
        color: var(--color-text-dark-primary);
        margin-bottom: 6px;
      }
      
      .fcb-search-result-snippets {
        .fcb-search-result-snippet {
          font-size: 12px;
          color: var(--color-text-dark-secondary);
          margin-bottom: 2px;
        }
        
        .fcb-search-result-more {
          font-size: 11px;
          color: var(--color-text-dark-tertiary);
          font-style: italic;
        }
      }
    }
  }
}
</style>