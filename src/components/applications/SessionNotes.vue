<template>
  <div class="fcb-session-notes-container">
    <!-- enabledEntityLinking is false because when we save we don't want to convert ids into html tags -->
    <Editor 
      ref="editorRef"
      :initial-content="sessionNotes"
      :edit-only-mode="true"
      :editable="true"
      :enable-entity-linking="false"
      @editor-saved="onNotesEditorSaved"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, usePlayingStore } from '@/applications/stores';
  import Editor from '@/components/Editor.vue';
  import { Session } from '@/classes';

  // stores
  const mainStore = useMainStore();
  const playingStore = usePlayingStore();
  const { currentPlayedSessionId, currentPlayedSessionNotes } = storeToRefs(playingStore);
  const { currentSession } = storeToRefs(mainStore);

  // data
  const editorRef = ref<typeof Editor | null>(null);
  const sessionNotes = ref<string>('');

  // computed
  const isDirty = (): boolean => editorRef.value?.isDirty();

  // methods
  const onNotesEditorSaved = async (newContent: string) => {
    if (!currentPlayedSessionId.value)
      return;

    const session = await Session.fromUuid(currentPlayedSessionId.value);
    if (!session)
      return;

    session.description = newContent;
    await session.save();  // do this before the reactive update in case something reloads the session

    currentPlayedSessionNotes.value = newContent;

    // if we're showing the session, refresh it
    if (currentSession.value && currentSession.value.uuid===session.uuid) {
      await mainStore.refreshSession(true);
    }
  };

  ////////////////////////////////
  // exposed functions
  defineExpose({ getNotes: () => editorRef.value?.getContent() ?? null, isDirty });

  ////////////////////////////////
  // watchers
  /** Handle when the notes are saved by the main session screen */
  watch(() => currentPlayedSessionNotes.value, async (newNotes) => {
    // Only update if we have notes - this prevents race conditions on mount
    if (newNotes !== null) {
      sessionNotes.value = newNotes || '';
    }
  }, { immediate: true });
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