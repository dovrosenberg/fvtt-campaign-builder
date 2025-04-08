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
  import { useCampaignStore, } from '@/applications/stores';
  import Editor from '@/components/Editor.vue';

  // stores
  const campaignStore = useCampaignStore();
  const { currentPlayedCampaign } = storeToRefs(campaignStore);

  // data
  const sessionNotes = ref<string>('');

  // computed
  const currentSession = computed(() => {
    return currentPlayedCampaign.value?.currentSession || null;
  });

  // methods
  const onNotesEditorSaved = async (newContent: string) => {
    if (!currentSession.value) return;

    currentSession.value.notes = newContent;
    await currentSession.value.save();
  };

  // watchers
  watch(() => currentSession.value, async () => {
    sessionNotes.value = currentSession.value?.notes || '';
  }, { immediate: true });

  // lifecycle
  onMounted(() => {
    sessionNotes.value = currentSession.value?.notes || '';
  })
</script>

<style lang="scss">
  .fcb-session-notes-container {
    flex: 1;
    margin: -15px;  // to override the padding from the app
  }
</style>