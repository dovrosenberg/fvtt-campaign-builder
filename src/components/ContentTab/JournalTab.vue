<template>
  <div class="tab flexcol" data-group="primary" data-tab="journals" style="height: 100%;">
    <div class="tab-inner">
      <BaseTable
        :rows="tableRows"
        :columns="columns"
        :show-add-button="true"
        :add-button-label="localize('labels.session.addJournal')"
        :extra-add-text="localize('labels.session.addJournalDrag')"
        :filter-fields="filterFields"
        :actions="[{ icon: 'fa-trash', callback: (data) => onDeleteItemClick(data.uuid), tooltip: localize('tooltips.deleteRelationship') }]"

        @drop-new="onDropNew"
        @dragover="standardDragover"
        @add-item="showPicker = true"
        @reorder="onReorder"
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
  import { FCBDialog } from '@/dialogs';

  // library components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import RelatedDocumentsDialog from '@/components/tables/RelatedDocumentsDialog.vue';

  // local components

  // types
  import { BaseTableColumn, FoundryDragType, RelatedJournal, BaseTableGridRow } from '@/types';
  import { getValidatedData, standardDragover } from '@/utils/dragdrop';

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
  const columns = computed((): BaseTableColumn[] => {
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

  async function onDropNew(event: DragEvent) {
    event.preventDefault();
    
    // parse the data - we're just looking for raw Foundry data here
    let data = getValidatedData(event) as FoundryDragType;
    if (!data)
      return;

    if (!data.uuid || !['JournalEntry', 'JournalEntryPage'].includes(data.type)) {
      return;
    }
    
    await addJournal(data.uuid);
  }

  const onDeleteItemClick = async (id: string) => {
    // show the confirmation dialog 
    const confirmed = await FCBDialog.confirmDialog(
      localize('dialogs.confirmDeleteRelationship.title'),
      localize('dialogs.confirmDeleteRelationship.message')
    );
    
    if (confirmed) {
      emit('journals-updated', props.initialJournals.filter(j => j.uuid !== id));
    }
  }

  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    const reordered = reorderedRows
      .map((row) => props.initialJournals.find(j => j.uuid === row.uuid))
      .filter((j): j is RelatedJournal => !!j);

    emit('journals-updated', reordered);
  };

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
