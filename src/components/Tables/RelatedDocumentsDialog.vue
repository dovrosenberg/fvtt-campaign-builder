<template>
  <Teleport to="body">
    <Dialog
      v-model="show"
      :title="dialogTitle"
      :buttons="[
        {
          label: localize('labels.cancel'),
          default: false,
          close: true,
          callback: () => { show=false;}
        },
        {
          label: actionButtonLabel,
          disable: !isAddFormValid,
          default: true,
          close: true,
          callback: onActionClick,
          icon: 'fa-plus'
        }
      ]"
      @cancel="onCancel"
    >
      <div class="related-documents-content flexcol">
        <div class="search-container">
          <h6>Select {{ documentTypeName }}</h6>
          <TypeAhead 
            :initial-value="selectedDocumentId"
            :initial-list="documentOptions"
            :allow-new-items="false"
            @selection-made="onSelectionMade"
          />
        </div>
      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, PropType, watch, onMounted } from 'vue';

  // local imports
  import { localize } from '@/utils/game';

  // local components
  import Dialog from '@/components/Dialog.vue';
  import TypeAhead from '@/components/TypeAhead.vue';

  // types
  type DocumentType = 'actor' | 'item' | 'scene';
  type DocumentOption = {
    id: string;  // uuid
    label: string; // name with type
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    documentType: {
      type: String as PropType<DocumentType>,
      required: true,
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', newValue: boolean): void;
    (e: 'added', documentUuid: string): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const documentOptions = ref<DocumentOption[]>([]);
  const selectedDocumentId = ref('');

  ////////////////////////////////
  // computed data
  const documentTypeName = computed(() => {
    return props.documentType === 'actor' ? localize('dialogs.relatedDocuments.selectActors') : localize('dialogs.relatedDocuments.selectItems');
  });

  const dialogTitle = computed(() => {
    return props.documentType === 'actor' ? localize('dialogs.relatedDocuments.addActor') : localize('dialogs.relatedDocuments.addItem');
  });

  const actionButtonLabel = computed(() => {
    return props.documentType === 'actor' ? localize('dialogs.relatedDocuments.addActor') : localize('dialogs.relatedDocuments.addItem');
  });

  const isAddFormValid = computed((): boolean => {
    return !!selectedDocumentId.value;
  });

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    selectedDocumentId.value = '';
    show.value = false;
    emit('update:modelValue', false);
  };

  /**
   * Loads all available documents from Foundry
   */
  const loadDocuments = () => {
    try {
      // Get collection based on document type
      let collection;
      switch (props.documentType) {
        case 'actor':
          collection = game.actors;
          break;
        case 'item':
          collection = game.items;
          break;
        case 'scene':
          collection = game.scenes;
          break;
        default:
          throw new Error(`Invalid document type: ${props.documentType}`);
      }
      
      // Map to document options format
      documentOptions.value = collection.map(doc => ({
        id: doc.uuid,
        label: doc.type ? `${doc.name} (${doc.type})` : doc.name
      }));
    } catch (error) {
      console.error('Error loading documents:', error);
      documentOptions.value = [];
    }
  };

  /**
   * Handles selection from the TypeAhead component
   */
  const onSelectionMade = (uuid: string) => {
    selectedDocumentId.value = uuid;
  };

  /**
   * Handles the action button click
   */
  const onActionClick = async function() {
    if (!selectedDocumentId.value) return;

    emit('added', selectedDocumentId.value);

    resetDialog();
  };
  
  /**
   * Handles the cancel button click
   */
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
      // Load documents when dialog is opened
      loadDocuments();
    }
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    // Load documents initially
    loadDocuments();
  });

</script>

<style lang="scss" scoped>
.related-documents-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  padding: 0.5rem 0;

  h6 {
    margin-bottom: 8px;
    margin-top: 8px;
    display: flex;
    align-items: center;
  }

  .search-container {
    position: relative;
    width: 100%;
  }
}
</style>