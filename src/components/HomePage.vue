<template>
  <div class="flexcol fwb-journal-subsheet blank blank-body">
    <div class="message">
      <div style="transform: translateY(50%);">{{ !message ? '' : localize(message) }}</div>
    </div>
    <h3>
      {{ currentWorldFolder?.name }}
    </h3>
    <br>
    <br>
    <section style="flex:2;">
      <div 
        class="flexrow" 
        style="margin-bottom: 20px;"
      >
        <div class="new-link">
          <div><i class="fas fa-book-open"></i></div>
          Create New Entry
        </div>
      </div>

      <div class="recently-viewed">
        MAKE THIS A SEARCH BAR
      </div>

      <div class="flexrow">
        <div 
          v-for="recentItem in recent"
          :key="recentItem.uuid"
          class="recent-link" 
          @click="onRecentClick(recentItem?.uuid)"
        >
          <div>
            <i :class="`fas ${recentItem.icon}`"></i>
          </div>
          {{ recentItem.name }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
  import { useMainStore, useNavigationStore } from '@/applications/stores';

  // library components

  // local components

  // types
  import { EntryHeader } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorldId, currentWorldFolder } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const message = ref<string>('');   // a message to display at the top

  ////////////////////////////////
  // computed data
  const recent = computed((): EntryHeader[] => (currentWorldId.value ? UserFlags.get(UserFlagKey.recentlyViewed, currentWorldId.value) || [] : []));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onRecentClick = async (entryId: string | null) => {
    if (entryId)
      await navigationStore.openEntry(entryId);
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
</style>