<template>
  <Teleport to="body">
    <Dialog
      v-model="show"
      :title="dialogTitle"
      :buttons="dialogButtons"
      @cancel="onCancel"
    >
      <div class="add-related-items-content flexcol">
        <div v-if="selectItems.length > 0">
          <TypeAhead 
            ref="nameSelectRef"
            :initial-value="props.itemId || ''"
            :initial-list="selectItems" 
            :allow-new-items="false"
            @selection-made="onSelectionMade"
          />
          <div class="extra-fields-container" v-if="extraFields.length > 0">
            <h3 class="extra-fields-title">{{ localize('dialogs.relatedItems.additionalInformation') }}</h3>
            <div class="extra-fields-group">
              <div
                v-for="field in extraFields"
                :key="field.field"
                class="field-wrapper"
              >
                <div class='field-name'>
                  {{ field.header }}
                  <!-- <i class="fas fa-info-circle tooltip-icon" data-tooltip="If you create a new type, it will be added to the master list"></i> -->
                </div>
                <InputText
                  :id="field.field"
                  v-model="extraFieldValuesObj[field.field]"
                  type="text"
                  unstyled
                  class="field-input"
                  :pt="{ root: { style: { 'font-size': 'var(--fcb-font-size-large)' }}}"      
                />
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-items-message">
          <i class="fas fa-info-circle"></i>
          <span>{{ localize('dialogs.relatedItems.allItemsConnected') }}</span>
        </div>
      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, nextTick, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useRelationshipStore, useSessionStore, useFrontStore, useArcStore } from '@/applications/stores';
  import { FCBDialog } from '@/dialogs';
  import { localize } from '@/utils/game';

  // library components
  import InputText from 'primevue/inputtext';
  import TypeAhead from '@/components/TypeAhead.vue';
  
  // local components
  import Dialog from '@/components/Dialog.vue';

  // types
  import { Topics, ValidTopic, RelatedItemDialogModes, ValidTopicRecord, TopicBasicIndex, EntryBasicIndex } from '@/types';
  import { Entry, } from '@/classes';

  interface ButtonProp {
    label: string;
    close?: boolean;
    default?: boolean;
    icon?: string;
    disable?: boolean;
    hidden?: boolean;
    callback?: () => void;
  };

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
      type: String as PropType<RelatedItemDialogModes>,
      default: RelatedItemDialogModes.Add,
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
  const entryToAdd = ref<string | null>(null);  // the selected item from the dropdown (uuid)
  const extraFieldValuesObj = ref<Record<string, string>>({});
  const selectItems = ref<{id: string; label: string}[]>([]);
  const extraFields = ref<{field:string; header:string}[]>([]);
  const nameSelectRef = ref<typeof TypeAhead | null>(null);

  const topicDetails = {
    [Topics.Character]: {
      title: localize('dialogs.relatedItems.character.title'),
      createButtonTitle: localize('dialogs.relatedItems.character.createButtonTitle'),
      buttonTitle: localize('dialogs.relatedItems.character.buttonTitle'),
    },
    [Topics.Location]: {
      title: localize('dialogs.relatedItems.location.title'),
      createButtonTitle: localize('dialogs.relatedItems.location.createButtonTitle'),
      buttonTitle: localize('dialogs.relatedItems.location.buttonTitle'),
    },
    [Topics.Organization]: {
      title: localize('dialogs.relatedItems.organization.title'),
      createButtonTitle: localize('dialogs.relatedItems.organization.createButtonTitle'),
      buttonTitle: localize('dialogs.relatedItems.organization.buttonTitle'),
    },
    [Topics.PC]: {
      title: localize('dialogs.relatedItems.pc.title'),
      createButtonTitle: localize('dialogs.relatedItems.pc.createButtonTitle'),
      buttonTitle: localize('dialogs.relatedItems.pc.buttonTitle'),
    },
  } as ValidTopicRecord<{ 
    title: string; 
    buttonTitle: string; 
    createButtonTitle: string;
  }>;

  const dangerDetails = {
    title: localize('dialogs.relatedItems.entry.title'),
    buttonTitle: localize('dialogs.relatedItems.entry.buttonTitle'),
  };

  const participantDetails = dangerDetails;

  const locationDetails = {
    title: topicDetails[Topics.Location]?.title,
    buttonTitle: localize('dialogs.relatedItems.entry.buttonTitle'),
  };

  const sessionDetails = {
    buttonTitle: localize('dialogs.relatedItems.addToSession'),
  };

  ////////////////////////////////
  // computed data
  const dialogTitle = computed(() => {
    switch (props.mode) {
      case RelatedItemDialogModes.Danger:
        return dangerDetails.title;
      case RelatedItemDialogModes.ArcParticipant:
        return participantDetails.title;
      default:
        return (props.topic && topicDetails[props.topic]?.title) || '';
    }
  });

  const actionButtonLabel = computed(() => {
    switch (props.mode) {
      case RelatedItemDialogModes.Danger:
        return dangerDetails.buttonTitle;
      case RelatedItemDialogModes.ArcParticipant:
        return participantDetails.buttonTitle;
      case RelatedItemDialogModes.ArcLocation:
        return locationDetails.buttonTitle;
      case RelatedItemDialogModes.Add:
        return topicDetails[props.topic]?.buttonTitle;
      case RelatedItemDialogModes.Session:
        return sessionDetails.buttonTitle;
    }
    return '';
  });

  // add mode or session mode
  const createButtonLabel = computed(() => {
    if ([RelatedItemDialogModes.Danger, RelatedItemDialogModes.ArcParticipant].includes(props.mode)) 
      throw new Error('Trying to add create button to danger/participant RelatedItemDialog');

    return topicDetails[props.topic]?.createButtonTitle || '';
  });

  const isAddFormValid = computed((): boolean => {
    return !!entryToAdd.value;
  });

  const dialogButtons = computed((): ButtonProp[] => {
    const buttons = [] as ButtonProp[];

    buttons.push({
      label: localize('labels.cancel'),
      default: false,
      close: true,
      callback: () => { show.value=false;}
    });

    if (props.allowCreate) {
      buttons.push({
        label: createButtonLabel.value,
        default: false,
        close: true,
        callback: onCreateClick,
        icon: 'fa-plus'
      });
    }

    buttons.push({
      label: actionButtonLabel.value || '',
      disable: props.allowCreate && !isAddFormValid.value,
      default: true,
      close: true,
      callback: onActionClick,
      icon: 'fa-save'
    });

    return buttons;
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    entryToAdd.value = null;
    extraFieldValuesObj.value = {};
    show.value = false;
    emit('update:modelValue', false);
  };

  const mapEntryToOption = function(entry: EntryBasicIndex) {
    return {
      id: entry.uuid,
      label: entry.type ? `${entry.name} (${entry.type})` : entry.name,
    };
  };

  ////////////////////////////////
  // event handlers
  const onSelectionMade = function(uuid: string) {
    entryToAdd.value = uuid || null;
  };

  const onActionClick = async function() {
    // replace nulls with empty strings
    const extraFieldsToSend = extraFields.value.reduce((acc, field) => {
      acc[field.field] = extraFieldValuesObj.value[field.field] || '';
      return acc;
    }, {} as Record<string, string>);

    switch (props.mode) {
      case RelatedItemDialogModes.Add:
        if (entryToAdd.value) {
          const fullEntry = await Entry.fromUuid(entryToAdd.value);

          if (fullEntry) {
            await relationshipStore.addRelationship(fullEntry, extraFieldsToSend);
          }
        };
        break;
      
      case RelatedItemDialogModes.Danger:
        if (entryToAdd.value) {
          const fullEntry = await Entry.fromUuid(entryToAdd.value);

          if (fullEntry) {
            await frontStore.addParticipant(fullEntry, extraFieldsToSend);
          }
        };
        break;

      case RelatedItemDialogModes.ArcLocation:
        if (entryToAdd.value) {
          const fullEntry = await Entry.fromUuid(entryToAdd.value);

          if (fullEntry) {
            await arcStore.addLocation(fullEntry.uuid, extraFieldsToSend.role || '');
          }
        };
        break;

      case RelatedItemDialogModes.ArcParticipant:
        if (entryToAdd.value) {
          const fullEntry = await Entry.fromUuid(entryToAdd.value);

          if (fullEntry) {
            await arcStore.addParticipant(fullEntry.uuid, extraFieldsToSend.role || '');
          }
        };
        break;

      case RelatedItemDialogModes.Session:
        if (entryToAdd.value) {
          const fullEntry = await Entry.fromUuid(entryToAdd.value);

          if (fullEntry) {
            // Handle session-specific relationships
            if (props.topic === Topics.Character) {
              await sessionStore.addNPC(entryToAdd.value);
            } else if (props.topic === Topics.Location) {
              await sessionStore.addLocation(entryToAdd.value);
            } else {
              throw new Error('Trying to add invalid topic to session in RelatedItemDialog.onActionClick');
            }
          }
        };
        break;
    }

    resetDialog();
  };
  
  const onCreateClick = async function() {
    // the simplest way to do this is do the create box first and then just pretend like we added it
    const newEntry = await FCBDialog.createEntryDialog(props.topic, { generateMode: true } );

    if (newEntry) {
      entryToAdd.value = newEntry.uuid;
      await onActionClick();
    }

    resetDialog();
  }

  const onCancel = function() {
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
      
      let entries = [] as {id: string; label: string}[];
      switch (props.mode) {
        case RelatedItemDialogModes.Danger:
          if (!currentFront.value)
            throw new Error('Trying to show RelatedItemDialog in danger mode without a current front');

            // concat all the topics
          entries = [];
          for (const topic of [Topics.Character, Topics.Location, Topics.Organization]) {
            entries = entries.concat(
              (currentSetting.value.topics[topic]?.entries || []).map(mapEntryToOption)
            );
          }
          break;
        case RelatedItemDialogModes.ArcParticipant:
          if (!currentArc.value)
            throw new Error('Trying to show RelatedItemDialog in participant mode without a current arc');
          
          // characters and organizations only
          entries = [];
          for (const topic of [Topics.Character, Topics.Organization]) {
            entries = entries.concat(
              (currentSetting.value.topics[topic]?.entries || []).map(mapEntryToOption)
            );
          }
          break;
        case RelatedItemDialogModes.ArcLocation:
          if (!currentArc.value)
            throw new Error('Trying to show RelatedItemDialog in arc location mode without a current arc');
          
          // locations only
          entries = (currentSetting.value.topics[Topics.Location]?.entries || []).map(mapEntryToOption);
          break;
        default:
          if (!currentSession.value && !(currentEntry.value && currentEntryTopic.value))
            throw new Error('Trying to show RelatedItemDialog without a current entry/session/front');

          entries = (currentSetting.value.topics[props.topic]?.entries || []).map(mapEntryToOption);
      }

      selectItems.value = entries;
      
      if (currentSession.value) {
        extraFields.value = currentSession.value ? [] : relationshipStore.extraFields[currentEntryTopic.value][props.topic];
      } else if (currentFront.value) {
        extraFields.value = [{ field: 'role', header: 'Role' }];
      } else if (currentArc.value) {
        extraFields.value = [];
      } else {
        extraFields.value = relationshipStore.extraFields[currentEntryTopic.value][props.topic];
      }
      extraFieldValuesObj.value = {};
      if (props.itemId)
        entryToAdd.value = props.itemId;  // assign starting value, if any

      // focus on the input
      await nextTick();
      // @ts-ignore - not sure why $el isn't found
      nameSelectRef.value?.$el?.querySelector('input')?.focus();
    }
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
.add-related-items-content {
  gap: 1.5rem;
  width: 100%;
  padding: 0.5rem 0;

  .extra-fields-container {
    width: 100%;
    margin-top: 20px;

    .extra-fields-title {
      font-size: var(--fcb-font-size-header);
      font-weight: 600;
      color: var(--fcb-text);
      margin-bottom: 0.75rem;
      margin-top: 2rem;
      border-bottom: 3px solid var(--fcb-control-border);
      padding-bottom: 0.25rem;
      width: fit-content;
    }

    .field-wrapper {
      .field-name {
        font: 350 var(--fcb-font-size-large) var(--fcb-font-family);
        color: var(--fcb-text);
        margin-bottom: 2px;
        margin-top: 8px;
        display: flex;
        align-items: center;

        .tooltip-icon {
          margin-left: 5px;
          font-size: var(--font-size-12);
          color: var(--fcb-text);
          cursor: help;
        }
      }

      input {
        color: var(--fcb-text);
      }
    }
  }
}

.no-items-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  color: var(--fcb-text);
  font-style: italic;
  gap: 0.75rem;

  i {
    font-size: 1.25rem;
    color: var(--fcb-text);
  }
}
</style>