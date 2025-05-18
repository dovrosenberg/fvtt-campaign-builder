<template>
  <div class="fcb-session-todo-container">
    <SessionTable
      :rows="mappedTodoRows"
      :columns="sessionStore.extraFields[SessionTableTypes.Todo]"
      :delete-item-label="localize('tooltips.deleteTodo')"
      :allow-edit="false"
      :show-add-button="false"
      :track-delivery="true"
      @mark-item-delivered="onMarkTodoCompleted"
      @unmark-item-delivered="onUnmarkTodoCompleted"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { SessionTableTypes, useMainStore, useSessionStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components
  import SessionTable from '@/components/Tables/SessionTable.vue';
  
  // store
  const mainStore = useMainStore();
  const sessionStore = useSessionStore();
  const { currentSession } = storeToRefs(mainStore);
  const { todoRows } = storeToRefs(sessionStore);

  // computed
  const mappedTodoRows = computed(() => {
    return todoRows.value.map(item => ({
      ...item,
      delivered: item.completed // Map completed to delivered for SessionTable compatibility
    }));
  });

  // methods
  const onMarkTodoCompleted = async (uuid: string) => {
    if (currentSession.value) {
      await currentSession.value.updateTodoItem(uuid, true);
    }
  };

  const onUnmarkTodoCompleted = async (uuid: string) => {
    if (currentSession.value) {
      await currentSession.value.updateTodoItem(uuid, false);
    }
  };
</script>

<style lang="scss">
  .fcb-session-todo {
    [data-application-part="app"], .fcb-session-todo-container {
      flex: 1 1 auto;
      display: flex;
    }
    .fcb-session-todo-container {
      margin: -15px;  // to override the padding from the app
    }
  }
</style> 