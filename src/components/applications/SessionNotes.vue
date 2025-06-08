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
  import { ref, watch, onMounted, computed, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, usePlayingStore } from '@/applications/stores';
  import Editor from '@/components/Editor.vue';

  // stores
  const mainStore = useMainStore();
  const playingStore = usePlayingStore();
  const { currentPlayedSession } = storeToRefs(playingStore);
  const { currentSession } = storeToRefs(mainStore);

  // data
  const editorRef = ref<typeof Editor | null>(null);
  const sessionNotes = ref<string>('');

  // computed
  const isDirty = computed(() => {
    return editorRef.value?.isDirty();
  });

  // expose methods
  defineExpose({ isDirty });

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

  ////////////////////////////////
  // exposed functions

  ////////////////////////////////
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