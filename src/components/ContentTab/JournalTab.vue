<template>
  <div class="tab flexcol" data-group="primary" data-tab="journals" style="height: 100%;">
    <div class="tab-inner">
      <BaseTable
        :rows="tableRows"
        :columns="columns"
        :show-add-button="true"
        :add-button-label="localize('labels.journals.addJournal')"
        :extra-add-text="localize('labels.journals.dropToAdd')"
        :filter-fields="filterFields"
        :can-reorder="false"
        :allow-delete="true"
        :delete-item-label="localize('tooltips.deleteRelationship')"

        @delete-item="onDeleteItemClick"
        @cell-click="onCellClick"
        @drop-new="onDropNew"
        @dragover="onDragover"
        @add-item="showPicker = true"
      />
      <RelatedDocumentsDialog
        v-model="showPicker"
        document-type="journal"
        @added="onDocumentAddedClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, onMounted, watch, computed } from 'vue';

  // local imports
  import { localize } from '@/utils/game';

  // library components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/tables/RelatedDocumentsDialog.vue';

  // local components

  // types
  import { RelatedJournal } from '@/types';
  import { getValidatedData } from '@/utils/dragdrop';

  ////////////////////////////////
  // props
  const props = defineProps<{
    initialJournals: readonly RelatedJournal[];
  }>();

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'journals-updated', value: RelatedJournal[]): void;
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const tableRows = ref<any[]>([]);
  const showPicker = ref<boolean>(false);

  ////////////////////////////////
  // computed data
  const columns = computed(() => {
    const actionColumn = { field: 'actions', header: '', style: 'width: 40px' };
    const journalNameColumn = { field: 'journalName', header: localize('labels.tableHeaders.journalName'), sortable: true, onClick: onJournalClick };
    const pageNameColumn = { field: 'pageName', header: localize('labels.tableHeaders.pageName'), sortable: true, onClick: onPageClick };
    const locationColumn = { field: 'location', style: 'text-align: left', header: localize('labels.tableHeaders.location'), sortable: true }; 

    return [actionColumn, journalNameColumn, pageNameColumn, locationColumn];
  });

  const filterFields = computed(() => ['journalName', 'pageName']);

  ////////////////////////////////
  // methods
  async function updateTableRows() {
    tableRows.value = await Promise.all(props.initialJournals.map(async (journal) => {
      const journalDoc = await fromUuid<JournalEntry>(journal.journalUuid);
      const pageDoc = journal.pageUuid ? await fromUuid<JournalEntryPage>(journal.pageUuid) : null;
      const pageType = pageDoc?.type ? game.i18n.localize(CONFIG.JournalEntryPage.typeLabels[pageDoc.type]) : '';
      return {
        uuid: journal.uuid,
        journalName: journalDoc?.name || '?',
        pageName: (pageDoc?.name || '') + (pageType ? ` (${pageType})` : ''),
        journalUuid: journal.journalUuid,
        pageUuid: journal.pageUuid,
        location: journal.packId ? `${localize('labels.locations.compendium')}: ${journal.packName}` : localize('labels.locations.world'),
      };
    }));
  }

  /** adds a journal or page (determined by uuid) to the array and emits the change*/
  const addJournal = async (documentUuid: string) => {
    const doc = await fromUuid<JournalEntry | JournalEntryPage>(documentUuid);
    if (!doc) return;
    
    if (!['JournalEntry', 'JournalEntryPage'].includes(doc.documentName)) {
      return;
    }
    
    let journal: JournalEntry;
    let page: JournalEntryPage | null = null;

    if (doc.documentName === 'JournalEntry') {
      journal = doc as JournalEntry;
    } else if (doc.documentName === 'JournalEntryPage') {
      page = doc as JournalEntryPage;
      journal = doc.parent as JournalEntry;
    } else {
      throw new Error('Invalid document type in JournalTab.onDropNew');
    }

    const compositeUuid = `${journal!.uuid}|${page?.uuid || ''}`;

    // prevent duplicates
    if (props.initialJournals.some(j => j.uuid === compositeUuid)) return;

    const newJournalLink: RelatedJournal = {
      uuid: compositeUuid,
      journalUuid: journal!.uuid,
      pageUuid: page?.uuid || null,
      packId: journal.pack,
      packName: journal.pack ? game.packs?.get(journal.pack)?.title ?? null : null,
    };

    emit('journals-updated', [...props.initialJournals, newJournalLink]);
  };
  ////////////////////////////////
  // event handlers
  const onDocumentAddedClick = async (documentUuid: string) => {
    await addJournal(documentUuid);
  };

  const onJournalClick = async (_event: MouseEvent, uuid: string) => {
    // uuid id the ROW uuid
    const row = tableRows.value.find(r => r.uuid === uuid);
    if (!row) return;

    const journal = await fromUuid<JournalEntry>(row.journalUuid);
    await journal?.sheet?.render(true);
  };

  const onPageClick = async (_event: MouseEvent, uuid: string) => {
    // uuid id the ROW uuid
    const row = tableRows.value.find(r => r.uuid === uuid);
    if (!row) return;
    
    const page = await fromUuid<JournalEntryPage>(row.pageUuid);
    await page?.sheet?.render(true);
  };

  function onDragover(event: DragEvent) {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  async function onDropNew(event: DragEvent) {
    event.preventDefault();
    
    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    if (!data.uuid || (data.type !== 'JournalEntry' && data.type !== 'JournalEntryPage')) {
      return;
    }
    
    await addJournal(data.uuid);
  }

  const onDeleteItemClick = async (id: string) => {
    // show the confirmation dialog 
    await Dialog.confirm({
      title: localize('dialogs.confirmDeleteRelationship.title'),
      content: localize('dialogs.confirmDeleteRelationship.message'),
      yes: () => { 
        emit('journals-updated', props.initialJournals.filter(j => j.uuid !== id));
      },
      no: () => {},
    });
  }

  async function onCellClick(data: any, field: string) {
    if (field === 'journalName' && data.journalUuid) {
      const doc = await foundry.utils.fromUuid(data.journalUuid) as JournalEntry;
      doc?.sheet?.render(true);
    } else if (field === 'pageName' && data.pageUuid) {
      const doc = await foundry.utils.fromUuid(data.pageUuid) as JournalEntryPage;
      doc?.sheet?.render(true);
    }
  }

  ////////////////////////////////
  // watchers
  watch(() => props.initialJournals, async () => {
    await updateTableRows();
  }, { deep: true });

  ////////////////////////////////
  // lifecycle hooks
  onMounted(async () => {
    await updateTableRows();
  });

</script>
