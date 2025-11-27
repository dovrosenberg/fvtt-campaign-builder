// this store handles activities specific to campaigns
//
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref, } from 'vue';
import { Edge, Network, Node } from 'vis-network';

// local imports
import { useMainStore, } from '@/applications/stores';

// types
import { RelatedEntryDetails, StoryWebNode, StoryWebNodeSource, StoryWebNodeTypes, Topics } from '@/types';
import { Entry } from '@/classes';
import { topicToNodeType } from '@/utils/misc';

// the store definition
export const useStoryWebStore = defineStore('storyWeb', () => {
  ///////////////////////////////
  // the state

  // need to set this before using the network
  const currentContainer = ref<HTMLElement | null>(null);

  // the current vis-network network object
  const currentNetwork = ref<Network | null>(null);

  // formatting for the boxes
  const explicitNodeFormat = {
    shape: 'box'
  };
  const implicitNodeFormat = {
    shape: 'ellipse'
  }
  const manualNodeFormat = {
    shape: 'box'
  }
  const nodeConfig: Record<StoryWebNodeTypes, Partial<Node>> = {
    [StoryWebNodeTypes.Character]: {
      font: {
        color: 'white',
      },
      color: {
        background: '#2d93ad',
      },
    },
    [StoryWebNodeTypes.Location]: {
      font: {
        color: 'black',
      },
      color: {
        background: '#bcab79',
      },
    },
    [StoryWebNodeTypes.Organization]: {
      font: {
        color: 'white',
      },
      color: {
        background: '#7f5a83',
      },
    },
    [StoryWebNodeTypes.PC]: {
      font: {
        color: 'black',
      },
      color: {
        background: '#c9eddc',
      },
    },
    [StoryWebNodeTypes.Danger]: {
      font: {
        color: 'white',
      },
      color: {
        background: '#45050c',
      },
    },
    [StoryWebNodeTypes.Custom]: {
      font: {
        color: 'white',
      },
      color: {
        background: 'black',
      },
    },
  }

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentStoryWeb, currentSetting } = storeToRefs(mainStore);
  
  // internal state

  ///////////////////////////////
  // external state
  // const currentDangerIndex = computed(() => {
  //   if (!currentFront.value || currentContentTab.value == null)
  //     return null;

  //   const index = parseInt(currentContentTab.value);
  //   if (isNaN(index) || index < 0 || index >= currentFront.value.dangers.length)
  //     return null;

  //   return index;
  // });

  // const currentDanger = computed(() => {
  //   if (!currentFront.value || currentDangerIndex.value == null)
  //     return null;

  //   return currentFront.value.dangers[currentDangerIndex.value];
  // });

  ///////////////////////////////
  // actions
  // generate the new network from the current story web
  const generateNetwork = async () => {
    if (!currentContainer.value || !currentStoryWeb.value) {
      return;
    }
    
    // build out the graph using the selected ones and everything connected to them
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // we pull the list of nodes and edges from the storyWeb 
    // add the manual ones
    for (const node of currentStoryWeb.value?.nodes) {
      // these are entries the user added
      if (node.source === StoryWebNodeSource.Explicit) {
        const index = currentSetting.value?.topics[Topics.Character]?.entries.find(e => e.uuid === node.uuid);

        if (!index)
          continue;

        nodes.push({
          ...explicitNodeFormat,
          id: index.uuid,
          label: `${index.name} (${index.type})`,
          ...nodeConfig[node.type],
        });
      }
    }
  
    // add each of the connections
    const topics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC];
    for (const node of currentStoryWeb.value?.nodes) {
      if (node.source !== StoryWebNodeSource.Explicit)
        continue;
      
      const entry = await Entry.fromUuid(node.uuid);

      for (const topic of topics) {
        const relatedEntries = entry?.relationships?.[topic] as RelatedEntryDetails<any, any>[] | undefined;
        if (!relatedEntries)
          continue;

        for (const relatedEntry of Object.values(relatedEntries)) {
          // see if it's already been added
          if (!nodes.some(n => n.id === relatedEntry.uuid)) {
            nodes.push({
              ...implicitNodeFormat,
              id: relatedEntry.uuid,
              label: `${relatedEntry.name} (${relatedEntry.type ? relatedEntry.type : relatedEntry.topic})`,
              ...nodeConfig[topicToNodeType(relatedEntry.topic)],
            });
          }

          // add the relationship edge
          edges.push({
            from: node.uuid,
            to: relatedEntry.uuid,
            label: relatedEntry.extraFields.rols || relatedEntry.extraFields.relationship || ''
          });
        }
      }
    }

      const options = {
        physics: {
          barnesHut: {
              // Default is around 95, increase this for longer edges
              springLength: 200, 
              springConstant: 0.04 
          }
        // ... other physics options
        }
      };

      currentNetwork.value = new Network(currentContainer.value, { nodes, edges }, options);
    }

    /** add entry to the story web */
    const addEntry = async (entryUuid: string) => {
      if (!currentStoryWeb.value)
        return;

      currentStoryWeb.value.addEntry(entryUuid);

      // refresh the drawing
      await mainStore.refreshStoryWeb();
    };

  /** add participant to given danger */
  // const addParticipant = async (entryToAdd: Entry, extraFields: Record<string, string>): Promise<string | null> => {
  //   if (!currentDanger.value || currentDangerIndex.value == null)
  //     return null;

  //   // no duplicates
  //   if (currentDanger.value.participants.some(p => p.uuid === entryToAdd.uuid))
  //     return null;

  //   const uuid = entryToAdd.uuid;
  //   currentFront.value?.updateDanger(currentDangerIndex.value, {
  //     ...currentDanger.value,
  //     participants: [...currentDanger.value.participants, { uuid, role: extraFields.role || '' }],
  //   });
  //   await currentFront.value?.save();

  //   await _refreshParticipantRows();

  //   return uuid;
  // };

  // /** remove participant from given danger */
  // const deleteParticipant = async (uuid: string): Promise<void> => {
  //   if (!currentDanger.value || currentDangerIndex.value == null)
  //     return;
    
  //   currentFront.value?.updateDanger(currentDangerIndex.value, {
  //     ...currentDanger.value,
  //     participants: currentDanger.value.participants.filter(p => p.uuid !== uuid),
  //   });
  //   await currentFront.value?.save();

  //   await _refreshParticipantRows();
  // };

  // /** update participant in given danger */
  // const updateParticipant = async (uuid: string, role: string): Promise<void> => {
  //   if (!currentDanger.value || currentDangerIndex.value == null)
  //     return;

  //   currentFront.value?.updateDanger(currentDangerIndex.value, {
  //     ...currentDanger.value,
  //     participants: currentDanger.value.participants.map(p => p.uuid === uuid ? { uuid, role } : p),
  //   });
  //   await currentFront.value?.save();

  //   await _refreshParticipantRows();
  // };
  
  // /** add portent to given danger 
  //  * @returns the uuid of the new portent
  //  */
  // const addGrimPortent = async (description = ''): Promise<string | null> => {
  //   if (!currentDanger.value || currentDangerIndex.value == null)
  //     return null;
    
  //   const uuid = foundry.utils.randomID();
  //   currentFront.value?.updateDanger(currentDangerIndex.value, {
  //     ...currentDanger.value,
  //     grimPortents: [...currentDanger.value.grimPortents, { uuid, description, complete: false }],
  //   });
  //   await currentFront.value?.save();

  //   await _refreshPortentRows();

  //   return uuid;
  // };

  //   /** remove portent from given danger */
  // const deleteGrimPortent = async (uuid: string): Promise<void> => {
  //   if (!currentDanger.value || currentDangerIndex.value == null)
  //     return;
    
  //   currentFront.value?.updateDanger(currentDangerIndex.value, {
  //     ...currentDanger.value,
  //     grimPortents: currentDanger.value.grimPortents.filter(p => p.uuid !== uuid),
  //   });
  //   await currentFront.value?.save();

  //   await _refreshPortentRows();
  // };

  // /** update portent in given danger */
  // const updateGrimPortent = async (uuid: string, description: string, complete: boolean): Promise<void> => {
  //   if (!currentDanger.value || currentDangerIndex.value == null)
  //     return;
    
  //   currentFront.value?.updateDanger(currentDangerIndex.value, {
  //     ...currentDanger.value,
  //     grimPortents: currentDanger.value.grimPortents.map(p => p.uuid === uuid ? { uuid, description, complete } : p),
  //   });
  //   await currentFront.value?.save();

  //   await _refreshPortentRows();
  // };
  
  // const reorderGrimPortents = async (reorderedPortents: GrimPortent[]) => {
  //   if (!currentFront.value || currentDangerIndex.value == null || !currentDanger.value) 
  //     return;

  //   currentFront.value?.updateDanger(currentDangerIndex.value, {
  //     ...currentDanger.value,
  //     grimPortents: reorderedPortents,
  //   });
  //   await currentFront.value?.save();

  //   await _refreshPortentRows();
  // };

  // const reorderParticipants = async (reorderedParticipants: DangerParticipant[]) => {
  //   if (!currentFront.value || currentDangerIndex.value == null || !currentDanger.value) 
  //     return;

  //   currentFront.value?.updateDanger(currentDangerIndex.value, {
  //     ...currentDanger.value,
  //     participants: reorderedParticipants,
  //   });
  //   await currentFront.value?.save();

  //   await _refreshParticipantRows();
  // };

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  // force reactive update of current table rows
  // const _refreshParticipantRows = async (): Promise<void> => {
  //   participantRows.value = [];

  //   if (!currentDanger.value || !currentSetting.value)
  //     return;
    
  //   for (const p of currentDanger.value.participants) {
  //     // get it from the setting because we don't know topic
  //     const items = await currentSetting.value.filterEntries((e) => e.uuid===p.uuid);
      
  //     if (items.length === 0)
  //       throw new Error('Invalid uuid in frontStore._refreshParticipantRows');

  //     participantRows.value.push({
  //       uuid: p.uuid,
  //       name: items[0].name,
  //       type: items[0].type,
  //       role: p.role,
  //     });
  //   }
  // }

  // const _refreshPortentRows = (): void => {
  //   grimPortentRows.value = [];

  //   if (!currentDanger.value)
  //     return;
    
  //   grimPortentRows.value = [...currentDanger.value.grimPortents];
  // }

  // const _refreshDangerRows = async(): Promise<void> => {
  //   await _refreshParticipantRows();
  //   await _refreshPortentRows();
  // };


  ///////////////////////////////
  // watchers
  // when the source web or container changes, rebuild the network object
  watch([currentContainer, currentStoryWeb], async () => {
    if (!currentContainer.value || !currentStoryWeb.value) 
      return;

    await generateNetwork();
  });

  ///////////////////////////////
  // lifecycle events 

  ///////////////////////////////
  // return the public interface
  return {
    currentContainer,
    currentNetwork,
    
    addEntry,
  };
});

