<template>
  <RelatedItemDialog
    v-model="show"
    :title="dialogTitle"
    :main-button-label="actionButtonLabel"
    :create-button-label="createButtonLabel"
    :options="selectItems"
    :extra-fields="extraFields"
    :item-id="props.itemId"
    :item-name="props.itemName"
    :allow-create="props.allowCreate"
    @main-button-click="onMainButtonClick"
    @create-click="onCreateClick"
    @cancel-click="onCancelClick"
  />
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useRelationshipStore, useSessionStore, useFrontStore, useArcStore } from '@/applications/stores';
  import { FCBDialog } from '@/dialogs';
  import { localize } from '@/utils/game';
  import { mapEntryToOption } from '@/utils/misc';

  // library components
  
  // local components
  import Dialog from '@/components/dialogs/Dialog.vue';
  import RelatedItemDialog from '@/components/dialogs/RelatedItemDialog.vue';

  // types
  import { Topics, ValidTopic, RelatedEntryDialogModes, ValidTopicRecord, EntryBasicIndex } from '@/types';
  import { Entry, } from '@/classes';

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog

    topic: { // this is the type of the item that we're adding/editing
      type: Number as PropType<ValidTopic>, 
      required: false,
      default: Topics.Character,
    },
    mode: {
      type: String as PropType<RelatedEntryDialogModes>,
      default: RelatedEntryDialogModes.Add,
    },
    itemId: { 
      type: String as PropType<string>, 
      required: false,
      default: '',
    },
    itemName: { 
      type: String as PropType<string>, 
      required: false,
      default: '',
    },
    allowCreate: {
      type: Boolean,
      default: true,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits(['update:modelValue']);

  ////////////////////////////////
  // store
  const relationshipStore = useRelationshipStore();
  const mainStore = useMainStore();
  const sessionStore = useSessionStore();
  const frontStore = useFrontStore();
  const arcStore = useArcStore();
  const { currentEntry, currentSetting, currentFront, currentEntryTopic, currentSession, currentArc } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const selectItems = ref<{id: string; label: string}[]>([]);
  const extraFields = ref<{field:string; header:string}[]>([]);

  const topicDetails = {
    [Topics.Character]: {
      title: localize('dialogs.relatedEntries.character.title'),
      createButtonTitle: localize('dialogs.relatedEntries.character.createButtonTitle'),
      buttonTitle: localize('dialogs.relatedEntries.character.buttonTitle'),
    },
    [Topics.Location]: {
      title: localize('dialogs.relatedEntries.location.title'),
      createButtonTitle: localize('dialogs.relatedEntries.location.createButtonTitle'),
      buttonTitle: localize('dialogs.relatedEntries.location.buttonTitle'),
    },
    [Topics.Organization]: {
      title: localize('dialogs.relatedEntries.organization.title'),
      createButtonTitle: localize('dialogs.relatedEntries.organization.createButtonTitle'),
      buttonTitle: localize('dialogs.relatedEntries.organization.buttonTitle'),
    },
    [Topics.PC]: {
      title: localize('dialogs.relatedEntries.pc.title'),
      createButtonTitle: localize('dialogs.relatedEntries.pc.createButtonTitle'),
      buttonTitle: localize('dialogs.relatedEntries.pc.buttonTitle'),
    },
  } as ValidTopicRecord<{ 
    title: string; 
    buttonTitle: string; 
    createButtonTitle: string;
  }>;

  const locationDetails = {
    title: topicDetails[Topics.Location]?.title,
    buttonTitle: localize('dialogs.relatedEntries.entry.buttonTitle'),
  };

  const sessionDetails = {
    buttonTitle: localize('dialogs.relatedEntries.addToSession'),
  };

  ////////////////////////////////
  // computed data
  const dialogTitle = computed(() => {
    return (props.topic && topicDetails[props.topic]?.title) || '';
  });

  const actionButtonLabel = computed((): string => {
    switch (props.mode) {
      case RelatedEntryDialogModes.ArcLocation:
        return locationDetails.buttonTitle;
      case RelatedEntryDialogModes.Add:
        return topicDetails[props.topic]?.buttonTitle || '';
      case RelatedEntryDialogModes.Session:
        return sessionDetails.buttonTitle;
    }
    return '';
  });

  // add mode or session mode
  const createButtonLabel = computed(() => {
    return topicDetails[props.topic]?.createButtonTitle || '';
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    show.value = false;
    emit('update:modelValue', false);
  };

  ////////////////////////////////
  // event handlers
  const onMainButtonClick = async function(selectedItemId: string, extraFieldValues: Record<string, string>) {
    switch (props.mode) {
      case RelatedEntryDialogModes.Add:
        if (selectedItemId) {
          const fullEntry = await Entry.fromUuid(selectedItemId);

          if (fullEntry) {
            await relationshipStore.addRelationship(fullEntry, extraFieldValues);
          }
        };
        break;
      
      case RelatedEntryDialogModes.ArcLocation:
        if (selectedItemId) {
          const fullEntry = await Entry.fromUuid(selectedItemId);

          if (fullEntry) {
            await arcStore.addLocation(fullEntry.uuid, extraFieldValues.role || '');
          }
        };
        break;

      case RelatedEntryDialogModes.Session:
        if (selectedItemId) {
          const fullEntry = await Entry.fromUuid(selectedItemId);

          if (fullEntry) {
            // Handle session-specific relationships
            if (props.topic === Topics.Character) {
              await sessionStore.addNPC(selectedItemId);
            } else if (props.topic === Topics.Location) {
              await sessionStore.addLocation(selectedItemId);
            } else {
              throw new Error('Trying to add invalid topic to session in RelatedEntryDialog.onActionClick');
            }
          }
        };
        break;
    }

    resetDialog();
  };
  
  const onCreateClick = async function() {
    try {
      // the simplest way to do this is do the create box first and then just pretend like we added it
      const newEntry = await FCBDialog.createEntryDialog(props.topic, { generateMode: true } );

      if (newEntry) {
        await onMainButtonClick(newEntry.uuid, {});
      }
    } catch (error) {
      console.error('Error in create entry dialog:', error);
    } finally {
      // Always reset the dialog, even if there was an error or cancellation
      resetDialog();
    }
  }

  const onCancelClick = function() {
    resetDialog();
  };
  
  ////////////////////////////////
  // watchers
  // when the dialog changes state, alert parent (so v-model works)
  watch(() => show, async (newValue) => {
    emit('update:modelValue', newValue);
  });

  // when the prop changes state, update internal value
  watch(() => props.modelValue, async (newValue) => {
    show.value = newValue; 

    if (newValue) {
      if (!currentSetting.value)
        return;
      
      try {
        let entries = [] as {id: string; label: string}[];
        switch (props.mode) {
          case RelatedEntryDialogModes.ArcLocation:
            if (!currentArc.value)
              throw new Error('Trying to show RelatedEntryDialog in arc location mode without a current arc');
            
            // locations only
            entries = (currentSetting.value.topics[Topics.Location]?.entries || []).map(mapEntryToOption);
            break;
          default:
            if (!currentSession.value && !(currentEntry.value && currentEntryTopic.value))
              throw new Error('Trying to show RelatedEntryDialog without a current entry/session/front');

            entries = (currentSetting.value.topics[props.topic]?.entries || []).map(mapEntryToOption);
        }

        selectItems.value = entries;
        
        if (currentSession.value) {
          extraFields.value = currentSession.value ? [] : relationshipStore.extraFields[currentEntryTopic.value][props.topic];
        } else if (currentArc.value) {
          extraFields.value = [];
        } else {
          extraFields.value = relationshipStore.extraFields[currentEntryTopic.value][props.topic];
        }
      } catch (error) {
        console.error('Error initializing RelatedEntryDialog:', error);
        // Reset dialog state if there's an error
        resetDialog();
      }
    }
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
</style>