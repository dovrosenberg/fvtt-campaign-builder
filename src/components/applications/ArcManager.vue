<template>
  <Teleport to="body">
    <Dialog 
      v-model="show"
      :title="localize('dialogs.arcManager.title')"
      :width="900"
      :buttons="[
        {
          label: localize('labels.cancel'),
          default: false,
          close: true,
          callback: () => { show=false; }
        },
        {
          label: localize('labels.reset'),
          default: false,
          close: false,
          callback: onResetClick,
        },
        {
          label: localize('labels.saveChanges'),
          default: true,
          close: true,
          disable: editingMode,
          callback: onSubmitClick,
        },
      ]"
    >
      <div class="standard-form scrollable">
        <BaseTable
          :rows="rows"
          :columns="columns"
          :show-add-button="true"
          :add-button-label="localize('dialogs.arcManager.labels.addArc')"
          :show-filter="false"
          :can-reorder="true"
          :actions="actions"
          @cell-edit-init="onCellEditInit"
          @row-edit-complete="onRowEditComplete"
          @add-item="onAddItem"
          @reorder="onRowReorder"
        />
      </div>
    </Dialog>
  </Teleport>
</template> 

<script setup lang="ts">
  // library imports
  import { computed, ref, shallowRef, watch, onBeforeUnmount, } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { localize } from '@/utils/game';
  import { Arc, Campaign, } from '@/classes';
  import { ActionButtonDefinition, ArcBasicIndex } from '@/types';
  import { useMainStore, useNavigationStore, useCampaignDirectoryStore } from '@/applications/stores';

  // library components

  // local components
  import BaseTable from '@/components/tables/BaseTable.vue';
  import Dialog from '@/components/dialogs/Dialog.vue';

  // types
  import { BaseTableColumn, RowEditCompleteEvent } from '@/types';
  import { notifyWarn } from '@/utils/notifications';
  
  ////////////////////////////////
  // props
  interface Props {
    campaignId: string;
  }

  const props = defineProps<Props>();

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { isArcManagerOpen } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const campaign = shallowRef<Campaign | null>(null);
  const arcs = ref<ArcBasicIndex[]>([]);
  const show = ref<boolean>(true);
  const editingMode = ref<boolean>(false);

  watch(show, (isVisible) => {
    isArcManagerOpen.value = isVisible;
  }, { immediate: true });

  onBeforeUnmount(() => {
    isArcManagerOpen.value = false;
  });

  ////////////////////////////////
  // computed data
  const rows = computed((): any[] => (
    arcs.value.map((arc, index) => ({
      uuid: arc.uuid,
      name: arc.name,
      startSessionNumber: arc.startSessionNumber === -1 ? '' : arc.startSessionNumber,
      endSessionNumber: arc.endSessionNumber === -1 ? '' : arc.endSessionNumber,
      startSessionName: getSessionName(arc.startSessionNumber),
      endSessionName: getSessionName(arc.endSessionNumber),
      sortOrder: index,
    })
  )));

  const columns = computed((): BaseTableColumn[] => {
    const actionColumn = { field: 'actions', style: 'text-align: left; width: 75px;', header: 'Actions' };
    const nameColumn = { field: 'name', style: 'text-align: left; width: 25%;', header: 'Arc Name', sortable: false, editable: true, smallEditBox: true }; 
    const startSessionColumn = { field: 'startSessionNumber', style: 'text-align: left; width: 10%;', header: 'Start #', sortable: false, editable: true, smallEditBox: true };
    const startSessionNameColumn = { field: 'startSessionName', style: 'text-align: left; width: 20%;', header: 'Start Session', sortable: false, editable: false };
    const endSessionColumn = { field: 'endSessionNumber', style: 'text-align: left; width: 10%;', header: 'End #', sortable: false, editable: true, smallEditBox: true };
    const endSessionNameColumn = { field: 'endSessionName', style: 'text-align: left; width: 20%;', header: 'End Session', sortable: false, editable: false };

    return [actionColumn, nameColumn, startSessionColumn, startSessionNameColumn, endSessionColumn, endSessionNameColumn];
  });

  const lowestSession = computed((): number | null=> {
    if (!campaign.value?.currentSessionNumber)
      return null;

    const retval = campaign.value?.sessionIndex.reduce((minNumber, currentSession) => {
      return Math.min(minNumber, currentSession.number);
    }, Number.MAX_SAFE_INTEGER);

    return retval === Number.MAX_SAFE_INTEGER ? null : retval;
  });

  const highestSession = computed((): number | null => {
    if (!campaign.value?.currentSessionNumber)
      return null;

    const retval = campaign.value?.sessionIndex.reduce((maxNumber, currentSession) => {
      return Math.max(maxNumber, currentSession.number);
    }, Number.MIN_SAFE_INTEGER);

    return retval === Number.MIN_SAFE_INTEGER ? null : retval;
  });

  const actions = computed((): ActionButtonDefinition[] => {
    const retval = [] as ActionButtonDefinition[];

    // don't allow delete if only one left
    if (arcs.value.length > 1) {
      retval.push(
        { 
          icon: 'fa-trash', 
          callback: (data) => onDeleteItem(data.uuid), 
          tooltip: localize('dialogs.arcManager.labels.delete') 
        }
      );
    }

    retval.push(
      { 
        icon: 'fa-edit', 
        callback: () => {}, 
        tooltip: localize('dialogs.arcManager.labels.edit'),
        isEdit: true
      }
    );

    return retval;
  });

  ////////////////////////////////
  // methods

  /**
   * Get the session name based on session number
   */
  const getSessionName = (sessionNumber: number): string => {
    if (!campaign.value || sessionNumber < 0) return '';
    
    const sessionIndex = campaign.value.sessionIndex.find(s => s.number === sessionNumber);
    return sessionIndex ? sessionIndex.name : `(${localize('dialogs.arcManager.missingSession')})`;
  };

  /** 
   * Forces reactive refresh
   */
  const refreshData = () => {
    editingMode.value = false;
    arcs.value = [...arcs.value];
  };

  /**
   * Load campaign and arcs data from original
   */
  const loadData = () => {
    editingMode.value = false;
    if (!campaign.value)
      return;
    
    arcs.value = foundry.utils.deepClone(campaign.value.arcIndex);
  };

  ////////////////////////////////
  // event handlers
  const onDeleteItem = async (uuid: string): Promise<void> => {
    // Remove the arc from our list
    const arcIndex = arcs.value.findIndex(a => a.uuid === uuid);
    if (arcIndex !== -1) {
      arcs.value.splice(arcIndex, 1);
    }

    cleanArcs(foundry.utils.deepClone(arcs.value));
  };

  // when you start editing, we want to disable the save button
  const onCellEditInit = () => {
    editingMode.value = true;
  };

  // if we want to allow this, we can't create the actual arcs here
  // we need to create just in the index then create when we save
  // const onAddItem = async (): Promise<void> => {
  //   if (!campaign.value) return;

  //   // Create a new arc properly
  //   const newArc = await Arc.create(campaign.value, 'New Arc');
  //   if (newArc) {
  //     arcs.value.push(newArc);
  //   }
  // };

  interface RowType {
    uuid: string;
    name: string;
    startSessionNumber: number | string;
    endSessionNumber: number | string;
    startSessionName: string;
    endSessionName: string;
    sortOrder: number;
  };
  
  const onRowEditComplete = async (event: RowEditCompleteEvent<RowType>): Promise<void> => {
    const { data, newData } = event;

    // Find the arc in our list and update the specific field
    const arcIndex = arcs.value.findIndex(a => a.uuid === data.uuid);
    const arc = arcs.value[arcIndex];

    // get the arc before and after the current one
    let prevArc: ArcBasicIndex | null = null;
    let nextArc: ArcBasicIndex | null = null;

    if (arcIndex > 0) {
      // ignore empty ones
      for (let i=arcIndex - 1; i>=0; i--) {
        if (arcs.value[i].startSessionNumber !== -1) {
          prevArc = arcs.value[i];
          break;
        }
      }
    }
 
    if (arcIndex < arcs.value.length - 1) {
      // ignore empty ones
      for (let i=arcIndex + 1; i<arcs.value.length; i++) {
        if (arcs.value[i].startSessionNumber !== -1) {
          nextArc = arcs.value[i];
          break;
        }
      }
    }
 
    // standardize the sessions as strings
    newData.startSessionNumber = newData.startSessionNumber.toString().trim();
    newData.endSessionNumber = newData.endSessionNumber.toString().trim();
    
    // convert blanks to -1
    newData.startSessionNumber = newData.startSessionNumber.length === 0 ? '-1' : newData.startSessionNumber;
    newData.endSessionNumber = newData.endSessionNumber.length === 0 ? '-1' : newData.endSessionNumber;

    // if the session numbers are bad, reset everything
    let newStartSession = Number.parseInt(newData.startSessionNumber);
    let newEndSession = Number.parseInt(newData.endSessionNumber);

    // make sure the session numbers were blank or a number
    if (isNaN(newStartSession) || isNaN(newEndSession) ||
        newStartSession < -1 || newEndSession < -1) {
      notifyWarn(localize('dialogs.arcManager.warning.invalidSessionNumber'));
      refreshData();
      return;
    } 

    // make sure the start session is less than the end session
    if (newStartSession > newEndSession) {
      notifyWarn(localize('dialogs.arcManager.warning.startTooHigh'));
      refreshData();
      return;
    }
    // the session numbers must either be both blank or both not blank
    if (newStartSession * newEndSession < 0) {
      notifyWarn(localize('dialogs.arcManager.warning.bothBlank'));
      refreshData();
      return;
    }

    const blankSession = (newStartSession === -1);

    // if there are no current sessions, arc must be empty
    if (lowestSession.value == null || highestSession.value == null) {
      if (!blankSession) {
        notifyWarn(localize('dialogs.arcManager.warning.mustBeBlank'));
      }

      arc.startSessionNumber = -1;
      arc.endSessionNumber = -1;
      arc.name = newData.name;
      refreshData();
      return;
    }

    // handle blank ones differently
    if (blankSession) {
      // if everything else is blank, the first arc needs to be set to cover everything (with
      //    a warning message to explain)
      if (!prevArc && !nextArc) {
        notifyWarn(localize('dialogs.arcManager.warning.allSessionsCovered'));
        arcs.value[0].startSessionNumber = lowestSession.value;
        arcs.value[0].endSessionNumber = highestSession.value;
      } else if (prevArc) {
        // if there's a prior arc, extend it to the beginning of the next arc or
        //    the end of the campaign
        if (nextArc) {
          prevArc.endSessionNumber = nextArc.startSessionNumber-1;
        } else {
          prevArc.endSessionNumber = campaign.value?.currentSessionNumber!;
        }
      } else if (nextArc) {
        // there's a next arc but no prior one; so extend its start back to beginning
        nextArc.startSessionNumber = lowestSession.value;
      }
    } else {
      // constrain within the session bounds
      newStartSession = Math.max(lowestSession.value, Math.min(newStartSession, highestSession.value));
      newEndSession = Math.max(lowestSession.value, Math.min(newEndSession, highestSession.value));

      // if the starting session changed, adjust any prior arcs that overlap this range
      if (data.startSessionNumber !== newData.startSessionNumber) {
        // update all prior arcs that have sessions assigned
        for (let i = 0; i < arcIndex; i++) {
          const priorArc = arcs.value[i];

          // skip blank arcs
          if (priorArc.startSessionNumber === -1)
            continue;

          const priorStart = priorArc.startSessionNumber;
          const priorEnd = priorArc.endSessionNumber;

          // if we made it the lowest session, all prior arcs must be empty
          if (newStartSession === lowestSession.value) {
            priorArc.startSessionNumber = -1;
            priorArc.endSessionNumber = -1;
            continue;
          }

          // if this prior arc is completely within the new arc range, blank it
          if (priorStart >= newStartSession && priorEnd <= newEndSession) {
            priorArc.startSessionNumber = -1;
            priorArc.endSessionNumber = -1;
            continue;
          }

          // if it overlaps the beginning of the new range, cut off its tail
          if (priorStart < newStartSession && priorEnd >= newStartSession) {
            priorArc.endSessionNumber = newStartSession - 1;
          }
        }

        // if there were no prior arcs with sessions, ensure this arc extends to the lowest session
        const hasPriorWithSessions = arcs.value
          .slice(0, arcIndex)
          .some(a => a.startSessionNumber !== -1);

        if (!hasPriorWithSessions) {
          newStartSession = lowestSession.value;
        }
      }

      // if the ending session changed, need to adjust the next session(s)
      if (data.endSessionNumber !== newData.endSessionNumber) {
        // look for any later arcs that currently have sessions assigned
        const laterArcs = arcs.value.slice(arcIndex + 1);
        const hasLaterWithSessions = laterArcs.some(a => a.startSessionNumber !== -1);

        if (!hasLaterWithSessions) {
          // no later arcs with sessions; clamp to highest session
          newEndSession = highestSession.value!;
        } else if (newEndSession >= highestSession.value!) {
          // if we made it >= highest session number, all later arcs must be empty
          for (let i = arcIndex + 1; i < arcs.value.length; i++) {
            arcs.value[i].endSessionNumber = -1;
            arcs.value[i].startSessionNumber = -1;
          }
        } else {
          // adjust all later arcs that overlap or are fully contained within this arc's range
          for (let i = arcIndex + 1; i < arcs.value.length; i++) {
            const laterArc = arcs.value[i];

            // skip blank arcs
            if (laterArc.startSessionNumber === -1)
              continue;

            const laterStart = laterArc.startSessionNumber;
            const laterEnd = laterArc.endSessionNumber;

            // if this later arc is completely within the new arc range, blank it
            if (laterStart >= newStartSession && laterEnd <= newEndSession) {
              laterArc.startSessionNumber = -1;
              laterArc.endSessionNumber = -1;
              continue;
            }

            // if it overlaps the end of the new arc, push its start to just after the new end
            if (laterStart <= newEndSession && laterEnd > newEndSession) {
              laterArc.startSessionNumber = newEndSession + 1;
            }
          }
        }
      }
    }

    arc.name = newData.name;
    arc.startSessionNumber = newStartSession;
    arc.endSessionNumber = newEndSession;

    // clean arcs to fill any gaps created by the edit
    cleanArcs(arcs.value);
    
    // force refresh
    refreshData();
  };

  /** 
   *  Handles adding a new arc
   */
  const onAddItem = () => {
    // just create an empty one at the end
    arcs.value.push({
      uuid: foundry.utils.randomID(),  // temp id until we save
      name: localize('placeholders.arcName'),
      startSessionNumber: -1,
      endSessionNumber: -1,
      sortOrder: arcs.value.length
    });
    
    refreshData();
  };

  /** 
   * Handles a row moving in the table
   */
  const onRowReorder = (reorderedRows: any[], _dragIndex: number, dropIndex:number) => {
    // replace blanks with -1
    reorderedRows = reorderedRows.map((row) => {
      if (row.startSessionNumber === '')
        row.startSessionNumber = -1;
      if (row.endSessionNumber === '')
        row.endSessionNumber = -1;
      return row;
    });

    // the one that moved should have all sessions removed UNLESS there are no other
    //    rows with sessions on them - in that case, we should leave it the way it was
    if (reorderedRows.some((row, index) => index !== dropIndex && row.startSessionNumber !== -1)) {
      reorderedRows[dropIndex].startSessionNumber = -1;
      reorderedRows[dropIndex].endSessionNumber = -1;
    }
    
    cleanArcs(reorderedRows);
  };

  /* Starting with passed in rows, adjusts everything to properly cover all the sessions.
   *   Can be used to handle a set or just reordered rows or if a row was just deleted.
   * 
   */
  const cleanArcs = (rowsToClean: ArcBasicIndex[]) => {
    // if there are no arcs, do nothing
    if (rowsToClean.length === 0)
      return;
    
    // if there aren't any sessions, everything should be empty
    if (lowestSession.value === null || highestSession.value === null) {
      for (let i=0; i<rowsToClean.length; i++) {
        rowsToClean[i].startSessionNumber = -1;
        rowsToClean[i].endSessionNumber = -1;
        rowsToClean[i].sortOrder = i;
        arcs.value[i] = rowsToClean[i];
      }
      return;
    }
    
    // clean 
    // find the first and last ones with a session in them
    let firstWithSessions = -1;
    let lastWithSessions = -1;

    for (let i=0; i<rowsToClean.length; i++) {
      if (rowsToClean[i].startSessionNumber !== -1) {
        if (firstWithSessions === -1)
          firstWithSessions = i;
        lastWithSessions = i;
      }
    }
    
    // if there aren't any with sessions, the first row has to get them all (with a warning)
    if (firstWithSessions === -1) {
      notifyWarn(localize('dialogs.arcManager.warning.allSessionsCovered'));
      rowsToClean[0].startSessionNumber = lowestSession.value!;
      rowsToClean[0].endSessionNumber = highestSession.value!;
      return;
    }
    
    // extend 1st to lowest and last to highest
    rowsToClean[firstWithSessions].startSessionNumber = lowestSession.value!;
    rowsToClean[lastWithSessions].endSessionNumber = highestSession.value!;
    
    // then close any gaps
    for (let i=0; i<rowsToClean.length; i++) {
      // skip blank ones
      if (rowsToClean[i].startSessionNumber === -1) 
        continue;
      
      // when we get to the last one, quit
      if (lastWithSessions === i) {
        rowsToClean[i].endSessionNumber = highestSession.value!;
        break;
      }

      // function to find the next starting number after this row
      const getNextStart = () => {
        for (let j=i+1; j<rowsToClean.length; j++) {
          if (rowsToClean[j].startSessionNumber !== -1) {
            return rowsToClean[j].startSessionNumber;
          }
        }
        return -1;  // should never happen 
      }      

      rowsToClean[i].endSessionNumber = getNextStart() - 1;
    }
    
    // Update the sortOrder for all arcs based on the new order
    for (let i=0; i<rowsToClean.length; i++) {
      arcs.value[i] = rowsToClean[i];
      arcs.value[i].sortOrder = i;
    }
  };

  const onSubmitClick = async () => {
    if (!campaign.value) return;

    // do a pass at cleaning the arcs in case they were left in a bad spot somehow
    cleanArcs(arcs.value);

    // update the arcs and the indexes will get updated
    // first delete any arcs that we removed
    // let needToSave = false;
    for (const existingArc of foundry.utils.deepClone(campaign.value.arcIndex)) {
      if (!arcs.value.find(a => a.uuid === existingArc.uuid)) {
        const arc = await Arc.fromUuid(existingArc.uuid);
        if (arc) {
          await arc.delete();
        } else {
          // Arc doesn't exist, but we still need to clean up the index (just in case something broken)
          campaign.value.arcIndex = campaign.value.arcIndex.filter(a => a.uuid !== existingArc.uuid);
          await campaign.value.save();
        }

        // needToSave = true;

        // update tabs/bookmarks
        await navigationStore.cleanupDeletedEntry(existingArc.uuid);
      }
    }

    // if (needToSave)
    //   await campaign.value.save();
    
    // // need to refresh the campaign to get the latest index after deletions
    // campaign.value = await Campaign.fromUuid(campaign.value!.uuid);

    for (const arcIndex of arcs.value) {
      let arc = await Arc.fromUuid(arcIndex.uuid);

      if (!arc) {
        // create a new one
        arc = await Arc.create(campaign.value!, arcIndex.name);

        if (!arc)
          throw new Error('Failed to create arc in ArcManager.onSubmitClick()');

        arcIndex.uuid = arc.uuid;

        // need to refresh the campaign to get the latest index
        campaign.value = await Campaign.fromUuid(campaign.value!.uuid);
      }

      const nameChange = arc.name !== arcIndex.name;

      arc.name = arcIndex.name;
      arc.startSessionNumber = arcIndex.startSessionNumber;
      arc.endSessionNumber = arcIndex.endSessionNumber;
      arc.sortOrder = arcIndex.sortOrder;
      await arc.save();

      // need to refresh the campaign to get the latest index
      campaign.value = await Campaign.fromUuid(campaign.value!.uuid);


      // if name changed, need to propagate the change
      if (nameChange) {
        await navigationStore.propagateNameChange(arc.uuid, arcIndex.name);

        if (mainStore.currentArc?.uuid === arc.uuid) {
          await mainStore.refreshCurrentContent();
        }
      }
    }

    // force reload of all the arcs
    const ids = arcs.value.map(a => a.uuid);
    await campaignDirectoryStore.refreshCampaignDirectoryTree(ids);
  };

  const onResetClick = async () => {
    loadData();
  };

  ////////////////////////////////
  // watchers
  watch(() => props.campaignId, async () => {
    // load the index
    if (!props.campaignId) {
      throw new Error('No campaign ID provided in ArcManager.loadData()');
    }
    
    campaign.value = await Campaign.fromUuid(props.campaignId);
    if (!campaign.value) {
      throw new Error('Failed to load campaign data in ArcManager.loadData()');
    }

    loadData();
  }, { immediate: true });
  
  ////////////////////////////////
  // lifecycle events
  // onMounted(async () => {
  //   await loadData();
  // });
  

</script>

<style lang="scss">
  .application.fcb-arc-manager {
    // hide the wrapper window
    display: none;
  }
</style>
