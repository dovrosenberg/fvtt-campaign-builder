// this store handles character-specific functionality

// library imports
import { defineStore, } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'

// local imports

// types
import { WindowTab } from 'src/types';


// the store definition
export const useWorldBuilderStore = defineStore('worldBuilder', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
  const tabs = ref<WindowTab[]>([]);       // the main tabs of entries (top of WBHeader)

  ///////////////////////////////
  // actions
  // the ones with an underscore are intended to be called by itemStore

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    tabs,
  };
});