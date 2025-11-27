// this store handles activities specific to campaigns
//
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref, } from 'vue';
import type { Edge, Network, Node } from 'vis-network';

// local imports
import { useMainStore, } from '@/applications/stores';

// types
import { RelatedEntryDetails, StoryWebNodeSource, StoryWebNodeTypes, Topics } from '@/types';
import { Entry } from '@/classes';
import { nodeTypeToTopic, topicToNodeType } from '@/utils/misc';

// the store definition
export const useStoryWebStore = defineStore('storyWeb', () => {
  ///////////////////////////////
  // internal state

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
  const customNodeFormat = {
    shape: 'box'
  }

  const nodeConfig: Record<StoryWebNodeTypes, Partial<Node>> = {
    [StoryWebNodeTypes.Character]: {
      font: { color: 'white' },
      color: {
        border: '#2d93ad',
        background: '#2d93ad',
      },
    },
    [StoryWebNodeTypes.Location]: {
      font: { color: 'black' },
      color: {
        border: '#dfd687',
        background: '#dfd687',
      },
    },
    [StoryWebNodeTypes.Organization]: {
      font: { color: 'white' },
      color: {
        border: '#746d75',
        background: '#746d75',
      },
    },
    [StoryWebNodeTypes.PC]: {
      font: { color: 'black' },
      color: {
        border: '#c9eddc',
        background: '#c9eddc',
      },
    },
    [StoryWebNodeTypes.Danger]: {
      font: { color: 'white' },
      color: {
        border: '#45050c',
        background: '#45050c',
      },
    },
    [StoryWebNodeTypes.Custom]: {
      font: { color: 'hsl(164, 48%, 20%)' },
      color: {
        border: 'hsl(164, 48%, 20%)',  // light mode fcb-primary
        background: 'white',
      },
    },
  }

  const edgeConfig = {
    color: 'hsl(164, 48%, 20%)',  // light mode fcb-primary
  }

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentStoryWeb, currentSetting } = storeToRefs(mainStore);
  

  ///////////////////////////////
  // external state
  const isWebLoading = ref<boolean>(false);


  ///////////////////////////////
  // actions
  // generate the new network from the current story web
  const generateNetwork = async () => {
    if (!currentContainer.value || !currentStoryWeb.value) {
      return;
    }

    if (isWebLoading.value) 
      return;

    isWebLoading.value = true;

    try {    
      // dynamically import vis-network
      const { Network, } = await import('vis-network');
      
      // build out the graph using the selected ones and everything connected to them
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      // we pull the list of nodes and edges from the storyWeb 
      // add the explicit ones
      for (const node of currentStoryWeb.value?.nodes) {
        // these are entries the user added
        if (node.source === StoryWebNodeSource.Explicit) {
          // if an entry, we need the topic
          const topic = nodeTypeToTopic(node.type);
          if (topic !== null) {
            const index = currentSetting.value?.topics[topic]?.entries.find(e => e.uuid === node.uuid);

            if (!index)
              continue;

            const targetUuid = 'Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.lKXlWShR8C4wXARs';
            const positionInfo = currentStoryWeb.value?.positions?.[index.uuid] || {};
            
            if (index.uuid === targetUuid) {
              console.log(`🔍 DEBUG: LOADING target node ${index.name} with position:`, positionInfo);
            }

            nodes.push({
              ...explicitNodeFormat,
              id: index.uuid,
              label: `${index.name} (${index.type})`,
              ...positionInfo,
              ...nodeConfig[node.type],
            });
          } else if (node.type === StoryWebNodeTypes.Danger) {
            // TODO
          }
        } else if (node.type === StoryWebNodeTypes.Custom) {
          const positionInfo = currentStoryWeb.value?.positions?.[node.uuid] || {};
          nodes.push({
            ...customNodeFormat,
            id: node.uuid,
            label: node.label || '',
            ...positionInfo,
            ...nodeConfig[node.type],
          });
        }
      }
    
      // add each of the connections
      const topics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC];
      for (const node of currentStoryWeb.value?.nodes) {
        if (node.source !== StoryWebNodeSource.Explicit)
          continue;


        if (nodeTypeToTopic(node.type) != null) {
          // it's an entry
          const entry = await Entry.fromUuid(node.uuid);

          for (const topic of topics) {
            const relatedEntries = entry?.relationships?.[topic] as RelatedEntryDetails<any, any>[] | undefined;
            if (!relatedEntries)
              continue;

            for (const relatedEntry of Object.values(relatedEntries)) {
              // see if it's already been added
              if (!nodes.some(n => n.id === relatedEntry.uuid)) {
                const positionInfo = currentStoryWeb.value?.positions?.[relatedEntry.uuid] || {};
                nodes.push({
                  ...implicitNodeFormat,
                  id: relatedEntry.uuid,
                  label: `${relatedEntry.name} (${relatedEntry.type ? relatedEntry.type : relatedEntry.topic})`,
                  ...positionInfo,
                  ...nodeConfig[topicToNodeType(relatedEntry.topic)],
                });
              }

              // add the relationship edge
              // it's possible the edge is already there - specifically if we put two nodes on manually that
              //   relate to each other
              if (!edges.some(e => e.to === node.uuid && e.from === relatedEntry.uuid))
                edges.push({
                  from: node.uuid,
                  to: relatedEntry.uuid,
                  label: relatedEntry.extraFields.rols || relatedEntry.extraFields.relationship || '',
                  ...edgeConfig
                });
            }
          }
        } else if (node.type === StoryWebNodeTypes.Danger) {

        } else {
        // custom ones don't have relationships
          continue;
        }

      }
      
      const options = {
        physics: {
          barnesHut: {
              // Default is around 95, increase this for longer edges
              springLength: 200, 
              springConstant: 0.04 
          }
        },
        // we set a fixed seed so we get the same general layout every time
        layout: {
          randomSeed: '0.9545178996348908:1764205380774'
        }
      };

      console.log('🔍 DEBUG: Final nodes being passed to vis-network (target node):', nodes.find(n => n.id === 'Compendium.world.zS2AygHmUfQTWDTh.JournalEntry.lKXlWShR8C4wXARs'));
      currentNetwork.value = new Network(currentContainer.value, { nodes, edges }, options);

      // attach the event handlers
      currentNetwork.value.on('doubleClick', onNetworkDoubleClick);
      currentNetwork.value.on('dragEnd', () => {
        console.log('🔍 DEBUG: dragEnd event fired');
        capturePositions();
      });
    } catch (error) {
      isWebLoading.value = false;
      throw error;
    }

    isWebLoading.value = false;
  }

  /** add entry to the story web */
  const addEntry = async (entryUuid: string) => {
    if (!currentStoryWeb.value)
      return;

    await currentStoryWeb.value.addEntry(entryUuid);

    // refresh the drawing
    await mainStore.refreshStoryWeb();
  };

  /** add a manual node to the story web */
  const addCustomNode = async (text: string) => {
    if (!currentStoryWeb.value)
      return;

    await currentStoryWeb.value.addCustomNode(text);

    // refresh the drawing
    await mainStore.refreshStoryWeb();
  };

  ///////////////////////////////
  // methods
  const onNetworkDoubleClick = async (eventInfo: { nodes: {}[], edges: {}[], pointer: { canvas: { x: number, y: number }} }) => {
    // nodes is a list of nodes clicked on
    // edges is either edges clicked on or could be edges connected to nodes clicked
    const { nodes, edges } = eventInfo;
    
    // for now, we only care about double clicking in open space
    if (nodes.length !== 0 || edges.length !== 0) 
      return;

    // create a manual node at the location of the click
    await addCustomNode('abcdef');    
  }

  /** save all the node positions */
  const capturePositions = async () => {
    if (!currentNetwork.value || !currentStoryWeb.value)
      return;

    const positions = currentNetwork.value.getPositions();
    console.log('🔍 DEBUG: capturePositions called, saving positions to centralized structure');
    
    currentStoryWeb.value.positions = positions;
    await currentStoryWeb.value.save();
    console.log('🔍 DEBUG: positions saved to storyWeb:', positions);
  }


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
    isWebLoading,
    
    addEntry,
  };
});

