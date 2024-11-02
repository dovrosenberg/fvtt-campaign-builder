<template>
  <!-- Used for editing the "extra fields" present on the relationships between two items (ex. the role for a character in an organization)-->
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">
          {{ `${itemTypeDetails[props.itemType].title}: ${props.itemName}` }}
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input v-for="field in extraFieldValues"
          :key="field.name"
          v-model="field.value"
          :label="field.label"
          outlined
        />
      </q-card-section>
      <q-card-actions align="right" class="text-primary">
        <q-btn 
          v-close-popup 
          flat 
          label="Cancel" 
          @click="onEditCancelClick"
        />
        <q-btn 
          v-close-popup 
          flat 
          :label="itemTypeDetails[props.itemType].buttonTitle" 
          @click="onEditClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch } from 'vue';
  import { Loading } from 'quasar';
  import { TypedDocumentNode } from '@urql/vue';
  import { storeToRefs } from 'pinia';
  import router from '@/router';
  import { cloneDeep } from 'lodash';

  // local imports
  import { useItemStore } from '@/stores/itemStore';
  import { urqlClient } from '@/database';
  import { GQL_UPDATE_CHARACTER_LOCATION_ROLE, GQL_UPDATE_CHARACTER_ORGANIZATION_ROLE } from '@/database/gql';

  // library components

  // local components

  // types
  import { FieldUsedIn, Id } from '@/types';
  type ValidFieldUsedIn = FieldUsedIn.Character | FieldUsedIn.Organization | FieldUsedIn.Location;
  type ItemTypeDetail = {
    title: string;
    buttonTitle: string;
    queryName: string;
    editMutation: TypedDocumentNode;
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    // the type of item we're editing (ex. organization if we're editing the role of a character in an organization from the character's page)
    // the type of the other side of the relationship comes from the page route
    itemType: { 
      type: String as PropType<ValidFieldUsedIn>, 
      required: true,
    },
    // the _id of that item (ex. the organization)
    // the id of the other side of the relationship comes from the page route
    itemId: { 
      type: String as PropType<Id>, 
      required: true,
    },
    // the name of that item (ex. the organization)
    itemName: { 
      type: String as PropType<Id>, 
      required: true,
    },
    // values of extra (text) fields that we want to edit on the item (keyed by field name)
    extraFieldValues: { 
      type: Array as PropType<{name: string, label: string, value: string}[]>, 
      required: false,
      default: () => ([]),
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits(['itemEdited', 'update:modelValue']);

  ////////////////////////////////
  // store
  const itemStore = useItemStore();
  const mainItem = storeToRefs(itemStore).item;

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const extraFieldValues = ref(cloneDeep(props.extraFieldValues));
  const itemTypeDetails = {
    [FieldUsedIn.Character]: {
      title: 'Edit character',
      buttonTitle: 'Save character',
      queryName: 'updateCharacterOrganizationRole',
      editMutation: GQL_UPDATE_CHARACTER_ORGANIZATION_ROLE,
    },
    [FieldUsedIn.Organization]: {
      title: 'Edit organization',
      buttonTitle: 'Save organization',
      queryName: 'updateCharacterOrganizationRole',
      editMutation: GQL_UPDATE_CHARACTER_ORGANIZATION_ROLE,
    },
    [FieldUsedIn.Location]: {
      title: 'Edit location',
      buttonTitle: 'Save location',
      queryName: 'updateCharacterLocationRole',
      editMutation: GQL_UPDATE_CHARACTER_LOCATION_ROLE,
    },
  } as Record<ValidFieldUsedIn, ItemTypeDetail>;

  ////////////////////////////////
  // computed data
  // find the type of the other side of the relationship from the route
  const masterItemType = computed((): FieldUsedIn => {
    return router.currentRoute.value.params.section as unknown as FieldUsedIn;
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    show.value = false;
    emit('update:modelValue', false);
  }

  const mutationData = function(): { mutation: TypedDocumentNode<any, any>, variables: Record<string, string>} {
    let mutation;
    let variables: Record<string, string>;

    // confirm we have an item
    if (!props.itemId || !mainItem.value?._id)
      throw new Error('EditRelatedItemDialog.mutationData: no item selected');

    // no matter which way the relationship exists, we can add both with the same call
    if (props.itemType == FieldUsedIn.Character && masterItemType.value == FieldUsedIn.Organization || 
          props.itemType == FieldUsedIn.Organization && masterItemType.value == FieldUsedIn.Character) {
      const role = extraFieldValues.value?.find((val) => (val.name==='role'))?.value;
      if (!role) {
        throw new Error('EditRelatedItemDialog.mutationData: no role selected');
      }

      mutation = GQL_UPDATE_CHARACTER_ORGANIZATION_ROLE;
      variables = { 
        worldId: itemStore.worldId, 
        characterId: props.itemType == FieldUsedIn.Character ? props.itemId : mainItem.value._id, 
        organizationId: props.itemType == FieldUsedIn.Organization ? props.itemId : mainItem.value._id, 
        role: role,
      };
    } else if (props.itemType == FieldUsedIn.Character && masterItemType.value == FieldUsedIn.Location || 
          props.itemType == FieldUsedIn.Location && masterItemType.value == FieldUsedIn.Character) {
      const role = extraFieldValues.value?.find((val) => (val.name==='role'))?.value;
      if (!role) {
        throw new Error('EditRelatedItemDialog.mutationData: no role selected');
      }

      mutation = GQL_UPDATE_CHARACTER_LOCATION_ROLE;
      variables = { 
        worldId: itemStore.worldId, 
        characterId: props.itemType == FieldUsedIn.Character ? props.itemId : mainItem.value._id, 
        locationId: props.itemType == FieldUsedIn.Location ? props.itemId : mainItem.value._id, 
        role: role,
      };
    } else {
      throw new Error('EditRelatedItemDialog.mutationData: unsupported relationship type: ' + props.itemType + ' ' + masterItemType.value);
    }

    return {
      mutation,
      variables,
    };
  };

  ////////////////////////////////
  // event handlers
  const onEditClick = async function() {
    Loading.show();

    // create the update object by combining all the field names and values
    const mutation = mutationData();
    const result = await urqlClient.mutation(mutation.mutation, mutation.variables).toPromise();
    if (result.error)
      throw result.error;

    resetDialog();

    if (result.data)
      emit('itemEdited');

    Loading.hide();
  }
  
  const onEditCancelClick = function() {
    resetDialog();
  }
  
  ////////////////////////////////
  // watchers
  // when the addDialog changes state, alert parent (so v-model works)
  watch(() => show,  async (newValue) => {
    emit('update:modelValue', newValue);
  });

  // when the prop changes state, update internal values
  watch(() => props.modelValue,  async (newValue) => {
    show.value = newValue;

    // if we're now visible, update the extra field values
    if (show.value)
      extraFieldValues.value = cloneDeep(props.extraFieldValues);
  });

  // make sure to update the 

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
</style>
