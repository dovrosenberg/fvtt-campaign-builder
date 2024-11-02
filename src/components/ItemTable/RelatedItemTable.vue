<template>
  <div class="fwb-quasar">
    <q-layout>
      <q-page-container>
        <div class="row q-pa-xs"><div class="col-12">
          <ItemTable 
            :topic="topic"
            :global-mode="false"
            :rows="(relationshipStore.relatedItemRows[topic].rows as ItemRow[])"
            :pagination="(relationshipStore.relatedItemPagination[topic])"
            :filter="relationshipStore.relatedItemPagination[topic].filter"
            :extra-columns="extraColumns"
            @add-item-click="addDialogShow=true"
            @edit-item-click="onEditItemClick"
            @delete-item-click="onDeleteItemClick"
            @pagination-changed="onPaginationChanged"
          />

          <!-- <EditRelatedItemDialog 
            v-if="extraColumns.length>0"
            v-model="editDialogShow"
            :item-id="editItem.itemId"
            :item-name="editItem.itemName"
            :extra-field-values="editItem.extraFields"
            :topic="(topic as ValidTopic.Character | ValidTopic.Location | ValidTopic.Organization)"
            @item-edited="onItemEdited"
          />
          <AddRelatedItemDialog 
            v-model="addDialogShow"
            :topic="topic"
            @item-added="onItemAdded"
          /> -->
        </div></div>
      </q-page-container>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, onMounted } from 'vue';
  import { clone } from 'lodash';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useRelationshipStore } from '@/applications/stores/relationshipStore';
  import { useMainStore } from '@/applications/stores';

  // library components

  // local components
  import AddRelatedItemDialog from './AddRelatedItemDialog.vue';
  import EditRelatedItemDialog from './EditRelatedItemDialog.vue';
  import ItemTable from './ItemTable.vue';

  // types
  import { Topic, TablePagination, ValidTopic } from '@/types';
  
  type ItemRow = Record<string, any>;

  ////////////////////////////////
  // props
  const props = defineProps({
    topic: { 
      type:Number as PropType<ValidTopic>, 
      required: true,
    },
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();
  const mainStore = useMainStore();

  const { currentEntryTopic } = storeToRefs(mainStore);
  const { extraFields } = storeToRefs(relationshipStore);

  ////////////////////////////////
  // data
  const addDialogShow = ref(false);   // should we pop up the add dialog?
  const editDialogShow = ref(false);   // should we pop up the add dialog?
  const editItem = ref({
    topic: ValidTopic.Character,
    itemId: '',
    itemName: '',
    extraFields: [],
  } as { topic: ValidTopic; itemId: string; itemName: string; extraFields: {name: string; label: string; value: string}[] });
  

  ////////////////////////////////
  // computed data
  const extraColumns = computed(() => {
    return extraFields.value[currentEntryTopic.value][props.topic];
  });

  ////////////////////////////////
  // methods
  const refreshQuery = async function() {
    if (!props.topic) {
      return;
    }
    
    // load the query
    await relationshipStore.refreshRelatedItems(props.topic);
  };

  ////////////////////////////////
  // event handlers
  // show the edit dialog
  const onEditItemClick = function(_id: string, name: string, fieldsToAdd: {name: string; label: string; value: string}[]) {
    editItem.value = {
      topic: props.topic,
      itemId: _id,
      itemName: name,
      extraFields: clone(fieldsToAdd),
    };
    editDialogShow.value = true;
  };

  // call mutation to remove item  from relationship
  const onDeleteItemClick = async function(_id: string) {
    await relationshipStore.deleteRelationship(props.topic, _id); 

    // refresh the table
    await refreshQuery();
  };
  
  const onItemAdded = async function () { 
    await refreshQuery();
  };

  const onItemEdited = async function (_id: string) { 
    await refreshQuery();
  };

  const onPaginationChanged = async function (newPagination: TablePagination | { filter: string; pagination: TablePagination }) {
    // this gets called for filter changes and pagination changes, but with a different argument !?
    if (Object.keys(newPagination).includes('pagination')) {
      relationshipStore.relatedItemPagination[props.topic] = {
        ...(newPagination as {pagination: TablePagination}).pagination,
        filter: newPagination.filter,
      };
    } else {
      relationshipStore.relatedItemPagination[props.topic] = {
        ...(newPagination as TablePagination),
        filter: relationshipStore.relatedItemPagination[props.topic].filter,
      };
    }

    // refresh the table
    await refreshQuery();
  };

  ////////////////////////////////
  // watchers
  // reload when topic changes
  watch(() => [props.topic], async () => {
    await refreshQuery();
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    await refreshQuery();
  });


</script>

<style lang="scss" scoped>
  .action-icon {
    cursor: pointer;
  }
</style>
