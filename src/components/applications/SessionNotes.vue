<template>
  <div class="fcb-session-notes-container">
    <!-- enabledEntityLinking is false because when we save we don't want to convert ids into html tags -->
    <Editor 
      ref="editorRef"
      :edit-only-mode="true"
      :editable="true"
      :enable-entity-linking="false"
      @editor-saved="onNotesEditorSaved"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, onMounted, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, usePlayingStore } from '@/applications/stores';
  import Editor from '@/components/Editor.vue';
  import { Session } from '@/classes';

  // stores
  const mainStore = useMainStore();
  const playingStore = usePlayingStore();
  const { currentPlayedSession } = storeToRefs(playingStore);
  const { currentSession } = storeToRefs(mainStore);

  // data
  const editorRef = ref<typeof Editor | null>(null);
  const displayedSessionUuid = ref<string | null>(null);
  
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

  /** returns the current (unsaved) content of the editor */
  const getNotes = (): string => {
    return editorRef.value?.currentContent() || '';
  }

  /** saves the current (unsaved) content of the editor */
  const saveNotes = async () => {
    await onNotesEditorSaved(editorRef.value?.currentContent() || ''); 
  }

  /** changes the session; we do this menually to avoid a race condition with the playingStore watcher on session change */
  const setSession = (session: Session | null) => {
    editorRef.value?.setContent(session?.notes || '');
    displayedSessionUuid.value = session?.uuid || null;
  };

  ////////////////////////////////
  // exposed functions
  /** get the current (unsaved) content of the editor */
  defineExpose({ saveNotes, setSession, getNotes });

  ////////////////////////////////
  // watchers

  watch(() => currentPlayedSession.value?.notes, (newNotes) => {
    // only update if the session is the same; this prevents the race condition with playingStore watcher on session change
    // and allows external changes (like saves from the main session tab) to be reflected
    if (currentPlayedSession.value?.uuid === displayedSessionUuid.value) {
      editorRef.value?.setContent(newNotes || '');
    }
  }, { immediate: true });

  // lifecycle
  onMounted(() => {
    setSession(currentPlayedSession.value);
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