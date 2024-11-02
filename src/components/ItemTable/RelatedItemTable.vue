<template>
  <ItemTable 
    :item-type="topic"
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

  <EditRelatedItemDialog 
    v-if="extraColumns.length>0"
    v-model="editDialogShow"
    :item-id="editItem.itemId"
    :item-name="editItem.itemName"
    :extra-field-values="editItem.extraFields"
    :item-type="(topic as Topic.Character | Topic.Location | Topic.Organization)"
    @item-edited="onItemEdited"
  />
  <AddRelatedItemDialog 
    v-model="addDialogShow"
    :item-type="topic"
    @item-added="onItemAdded"
  />
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
      type:Number as PropType<Topic>, 
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

  ////////////////////////////////
  // data
  const addDialogShow = ref(false);   // should we pop up the add dialog?
  const editDialogShow = ref(false);   // should we pop up the add dialog?
  const editItem = ref({
    topic: Topic.Character,
    itemId: '',
    itemName: '',
    extraFields: [],
  } as { topic: Topic; itemId: Id; itemName: string; extraFields: {name: string; label: string; value: string}[] });
  
  // keyed by main entry topic, then the relationship topic
  const extraFields = {
    [ValidTopic.Character]: {
      [ValidTopic.Character]: [{name:'role', label:'Role'}],
      [ValidTopic.Event]: [],
      [ValidTopic.Location]: [{name:'role', label:'Role'}],
      [ValidTopic.Organization]: [],
    },
    [ValidTopic.Event]: {
      [ValidTopic.Character]: [],
      [ValidTopic.Event]: [],
      [ValidTopic.Location]: [],
      [ValidTopic.Organization]: [],
    },
    [ValidTopic.Location]: {
      [ValidTopic.Character]: [{name:'role', label:'Role'}],
      [ValidTopic.Event]: [],
      [ValidTopic.Location]: [],
      [ValidTopic.Organization]: [],
    },
    [ValidTopic.Organization]: {
      [ValidTopic.Character]: [{name:'role', label:'Role'}],
      [ValidTopic.Event]: [],
      [ValidTopic.Location]: [],
      [ValidTopic.Organization]: [],
    },    
  } as Record<ValidTopic, Record<ValidTopic, {name: string; label: string; }[]>>; 
  
  //const router = useRouter();

  ////////////////////////////////
  // computed data
  const extraColumns = computed(() => {
    return extraFields[currentEntryTopic.value][props.topic];
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
  const onEditItemClick = function(_id: string, name: string, extraFields: {name: string; label: string; value: string}[]) {
    editItem.value = {
      topic: props.topic,
      itemId: _id,
      itemName: name,
      extraFields: clone(extraFields),
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
  // reload when itemtype changes
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
