<template>
  <div class="tab-inner">
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
  import { computed, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { SessionTableTypes, useMainStore, useSessionStore, } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components
  import SessionTable from '@/components/Tables/SessionTable.vue';
  
  // store
  const mainStore = useMainStore();
  const sessionStore = useSessionStore();
  const { currentSession, } = storeToRefs(mainStore);
  const { todoRows, relatedLocationRows, relatedNPCRows, relatedLoreRows, relatedVignetteRows, relatedMonsterRows, relatedItemRows } = storeToRefs(sessionStore);

  // computed
  const mappedTodoRows = computed(() => {
    return todoRows.value.map(item => ({
      ...item,
      delivered: item.completed // Map completed to delivered for SessionTable compatibility
    }));
  });

  // computed

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

  // Watch for new NPCs
  watch(() => relatedNPCRows.value, (newNPCs) => {
    newNPCs.forEach(npc => {
      if (!npc.delivered)
        return;

      if (!todoRows.value.some(item => item.uuid === npc.uuid)) {
        todoRows.value.push({
          uuid: npc.uuid,
          name: npc.name,
          type: 'entry',
          completed: false
        });
      }
    });
  });

  // Watch for new locations
  watch(() => relatedLocationRows.value, (newLocations) => {
    newLocations.forEach(location => {
      if (!location.delivered)
        return;

      if (!todoRows.value.some(item => item.uuid === location.uuid)) {
        todoRows.value.push({
          uuid: location.uuid,
          name: location.name,
          type: 'entry',
          completed: false
        });
      }
    });
  });

  // Watch for new lore
  watch(() => relatedLoreRows.value, (newLore) => {
    newLore.forEach(lore => {
      if (!lore.delivered)
        return;

      if (!todoRows.value.some(item => item.uuid === lore.uuid)) {
        todoRows.value.push({
          uuid: lore.uuid,
          name: lore.description,
          type: 'lore',
          completed: false
        });
      }
    });
  });

  // Watch for new vignettes
  watch(() => relatedVignetteRows.value, (newVignettes) => {
    newVignettes.forEach(vignette => {
      if (!vignette.delivered)
        return;

      if (!todoRows.value.some(item => item.uuid === vignette.uuid)) {
        todoRows.value.push({
          uuid: vignette.uuid,
          name: vignette.description,
          type: 'vignette',
          completed: false
        });
      }
    });
  });

  // Watch for new monsters
  watch(() => relatedMonsterRows.value, (newMonsters) => {
    newMonsters.forEach(monster => {
      if (!monster.delivered)
        return;

      if (!todoRows.value.some(item => item.uuid === monster.uuid)) {
        todoRows.value.push({
          uuid: monster.uuid,
          name: monster.name,
          type: 'monster',
          completed: false
        });
      }
    });
  });

  // Watch for new magic items
  watch(() => relatedItemRows.value, (newItems) => {
    newItems.forEach(item => {
      if (!item.delivered)
        return;

      if (!todoRows.value.some(todoItem => todoItem.uuid === item.uuid)) {
        todoRows.value.push({
          uuid: item.uuid,
          name: item.name,
          type: 'item',
          completed: false
        });
      }
    });
  });
</script>

<style lang="scss" scoped>
  .tab-inner {
    padding: 0.5em;
  }

  a {
    color: inherit;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
</style> 