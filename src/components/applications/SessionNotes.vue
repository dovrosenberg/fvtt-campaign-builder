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
  const { currentPlayedSession } = storeToRefs(campaignStore);
  const { currentSession } = storeToRefs(mainStore);

  // data
  const sessionNotes = ref<string>('');

  // computed

  // methods
  const onNotesEditorSaved = async (newContent: string) => {
    if (!currentPlayedSession.value) return;

    currentPlayedSession.value.notes = newContent;
    await currentPlayedSession.value.save();

    // if we're showing the session, refresh it
    if (currentSession.value && currentSession.value.uuid===currentPlayedSession.value.uuid) {
      await mainStore.refreshSession();
    }
  };

  // watchers
  // changes to the played session 
  watch(() => currentPlayedSession.value, async () => {
    sessionNotes.value = currentPlayedSession.value?.notes || '';
  }, { immediate: true });

  watch(() => currentPlayedSession.value?.notes, async () => {
    sessionNotes.value = currentPlayedSession.value?.notes || '';
  }, { immediate: true });

  // lifecycle
  onMounted(() => {
    sessionNotes.value = currentPlayedSession.value?.notes || '';
  })
</script>

<style lang="scss">
  .fcb-session-notes {
    [data-application-part="app"], .fcb-session-notes-container {
      flex: 1 1 auto;
      display: flex;
    }
    .fcb-session-notes-container {
      margin: -15px;  // to override the padding from the app
    }
  }
</style>