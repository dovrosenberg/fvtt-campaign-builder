
<template>
  <label>
    {{ localize(props.labelText) }} 
    <i 
      v-if="props.helpText" 
      class="fas fa-info-circle tooltip-icon" 
      :data-tooltip="localize(props.helpText)">
    </i>
  </label>
</template>

<script setup lang="ts">
  // library imports

  // local imports
  import { localize } from '@/utils/game';

  // library components

  // local components

  // types

  ////////////////////////////////
  // props
  const props = defineProps({
    labelText: { 
      type: String,
      required: true
    },
    helpText: {
      type: String,
      required: false,
      default: ''
    }
  })

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="sass">
</style>
