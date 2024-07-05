<template>
  <div class="flexcol journal-subsheet blank blank-body">
      <div class="message">
          <div style="transform: translateY(50%);">{{localize(content)}}</div>
      </div>
      SHOW THE WORLD NAME UP HERE
      <section style="flex:2;">
          <div class="flexrow" style="margin-bottom: 20px;">
              <div class="new-link"><div><i class="fas fa-book-open"></i></div>Create New Entry</div>
          </div>

          <div class="recently-viewed">MAKE THIS A SEARCH BAR</div>

          <div class="flexrow">
            <div v-for="recentItem in recent"
              class="recent-link" 
              @click="onRecentClick($event, recentItem.uuid)"
            >
              <div><i :class="`fas ${recentItem.icon}`"></i></div>{{recentItem.name}}
            </div>
          </div>
      </section>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
  import { useWorldBuilderStore } from '@/applications/stores/worldBuilderStore';

  // library components

  // local components

  // types
  import { EntryHeader } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'recentClicked', entryId: string): void,
  }>();

  ////////////////////////////////
  // store
  const worldBuilderStore = useWorldBuilderStore();
  const { currentWorldId } = storeToRefs(worldBuilderStore);

  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data
  const recent = computed((): EntryHeader[] => (currentWorldId.value ? UserFlags.get(UserFlagKey.recentlyViewed, currentWorldId.value) || [] : []));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onRecentClick = (event: JQuery.ClickEvent, entryId: string) => {
    if (entryId)
      emit('recentClicked', entryId);
  }

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
</style>