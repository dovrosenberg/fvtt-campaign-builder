<template>
  <div :id="componentId" class="fwb-tree">
    <ul class="top-node">
      <TreeNode v-for="node in props.topNodes"
        :node="node"
        @itemClicked="onSubItemClick"
      />
    </ul>
  </div>
</template>

<script setup lang="ts">
  // library imports

  // local imports

  // library components

  // local components
  import TreeNode from './TreeNode.vue';

  // types
  import { TreeNode } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    topNodes: { 
      type: Array as PropType<TreeNode[]>,
      required: true,
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'itemClicked', value: string): void,
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data
  const componentId = computed(() => ('fwb-ta-' + foundry.utils.randomID()));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onTreeItemClick = (event: JQuery.ClickEvent, value: string) => {
    event.preventDefault();  // stop from expanding
    emit('itemClicked', value);
  }

  const onSubItemClick = (event: JQuery.ClickEvent, value: string) => {
    event.preventDefault();  // stop from expanding
    emit('itemClicked', value);
  }


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">
  // https://www.youtube.com/watch?v=rvKCsHS590o&t=1755s has a nice overview of how this is assembled

  .fwb-tree {
    // very first node
    ul.top-node > li {
      &::before, &::after {
        display:none;   // hide bar on the main level
      }
    }

    ul {
      list-style: none;
      line-height: 2em;   // this makes the horizontal lines centered (when combined with the height on the li::before

      li {
        position: relative;
        padding: 0;
        margin: -0.5em 0 0 0;

        font-family: 'Signika', sans-serif;
        font-size: var(--font-size-14);
        font-weight: normal;

        // this draws the top-half ot the vertical plus the horizontal tree connector lines
        &::before {
          top: 0px;
          border-bottom: 2px solid gray;
          height: 1em;   // controls vertical position of horizontal lines
        }

        // extends the vertical lines down
        &::after {
          bottom: 0px;
          height: 100%;
        }

        &::before, &::after {
          position: absolute;
          left: -10px;   // pushes them left of the text
          border-left: 2px solid gray;
          content: "";
          width: 10px;   // controls the length of the horizontal lines
        }

        &:last-child::after {
          display: none;   // avoid a little tail at the bottom of the vertical lines
        }
      }

      // add the little open markers
      summary::before {
        position: absolute;
        content: "+";
        text-align: center;
        line-height: 0.80em;
        color: black;
        background: #999;
        display: block;
        width: 15px;
        height: 15px;
        border-radius: 50em;
        left: -0.85em;
        top: 0.63em;
        z-index: 999;
      }

      details[open] summary::before {
        content: "-";
      }
    }

    // move the text away from the end of the horizontal lines
    li {
      padding-left: 3px;
    }

    // the top level
    & > ul {
      summary {
        cursor: pointer;
        list-style: none; 

        &::marker, &::-webkit-details-marker {
          display: none !important;
        }
      }

    }
  }

</style>