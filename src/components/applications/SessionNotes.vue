<template>
  <div class="fcb-session-notes-container">
    <Editor 
      ref="editorRef"
      :initial-content="sessionNotes"
      :has-button="false"
      :editable="true"
      @editor-saved="onNotesEditorSaved"
      @editor-loaded="(notes) => { lastSavedNotes = notes; }"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, onMounted, computed } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useCampaignStore, useMainStore, useSessionStore } from '@/applications/stores';
  import Editor from '@/components/Editor.vue';

  // stores
  const mainStore = useMainStore();
  const campaignStore = useCampaignStore();
  const sessionStore = useSessionStore();
  const { currentPlayedSession } = storeToRefs(campaignStore);
  const { currentSession } = storeToRefs(mainStore);
  const { lastSavedNotes } = storeToRefs(sessionStore);

  // data
  const sessionNotes = ref<string>('');
  const editorRef = ref<typeof Editor | null>(null);

  // computed
  const dirty = computed((): boolean => (editorRef?.value?.dirty || false));

  defineExpose({ dirty });

  // methods
  const onNotesEditorSaved = async (newContent: string) => {
    if (!currentPlayedSession.value) return;

    currentPlayedSession.value.notes = newContent;
    lastSavedNotes.value = newContent;
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