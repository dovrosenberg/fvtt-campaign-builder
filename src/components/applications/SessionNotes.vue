<template>
  <div class="fcb-session-notes-container">
    <Editor 
      :initial-content="sessionNotes"
      :has-button="false"
      :editable="true"
      @editor-saved="onNotesEditorSaved"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, watch, onMounted } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useCampaignStore, useMainStore, } from '@/applications/stores';
  import Editor from '@/components/Editor.vue';

  // stores
  const mainStore = useMainStore();
  const campaignStore = useCampaignStore();
  const { currentPlayedCampaign } = storeToRefs(campaignStore);
  const { currentSession } = storeToRefs(mainStore);

  // data
  const sessionNotes = ref<string>('');

  // computed
  const playedSession = computed(() => {
    return currentPlayedCampaign.value?.currentSession || null;
  });

  // methods
  const onNotesEditorSaved = async (newContent: string) => {
    if (!playedSession.value) return;

    playedSession.value.notes = newContent;
    await playedSession.value.save();

    // if we're showing the session, refresh it
    if (currentSession.value && currentSession.value.uuid===playedSession.value.uuid) {
      await mainStore.refreshEntry();
    }
  };

  // watchers
  watch(() => playedSession.value, async () => {
    sessionNotes.value = playedSession.value?.notes || '';
  }, { immediate: true });

  // lifecycle
  onMounted(() => {
    sessionNotes.value = playedSession.value?.notes || '';
  })
</script>

<style lang="scss">
  .fcb-session-notes-container {
    flex: 1;
    margin: -15px;  // to override the padding from the app
  }
</style>