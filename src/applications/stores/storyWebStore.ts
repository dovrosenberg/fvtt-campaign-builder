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
import { nodeTypeToTopic, topicToNodeType } from '@/utils/misc';

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
        border: '#2d93ad',
        background: '#2d93ad',
      },
    },
    [StoryWebNodeTypes.Location]: {
      font: {
        color: 'black',
      },
      color: {
        border: '#bcab79',
        background: '#bcab79',
      },
    },
    [StoryWebNodeTypes.Organization]: {
      font: {
        color: 'white',
      },
      color: {
        border: '#7f5a83',
        background: '#7f5a83',
      },
    },
    [StoryWebNodeTypes.PC]: {
      font: {
        color: 'black',
      },
      color: {
        border: '#c9eddc',
        background: '#c9eddc',
      },
    },
    [StoryWebNodeTypes.Danger]: {
      font: {
        color: 'white',
      },
      color: {
        border: '#45050c',
        background: '#45050c',
      },
    },
    [StoryWebNodeTypes.Custom]: {
      font: {
        color: 'white',
      },
      color: {
        border: 'black',
        background: 'black',
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
        // if an entry, we need the topic
        const topic = nodeTypeToTopic(node.type);
        if (topic !== null) {
          const index = currentSetting.value?.topics[topic]?.entries.find(e => e.uuid === node.uuid);

          if (!index)
            continue;

          nodes.push({
            ...explicitNodeFormat,
            id: index.uuid,
            label: `${index.name} (${index.type})`,
            ...nodeConfig[node.type],
          });
        } else if (node.type === StoryWebNodeTypes.Danger) {
          // TODO
        } else if (node.type === StoryWebNodeTypes.Custom) {
          // TODO
        }
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
              nodes.push({
                ...implicitNodeFormat,
                id: relatedEntry.uuid,
                label: `${relatedEntry.name} (${relatedEntry.type ? relatedEntry.type : relatedEntry.topic})`,
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

    currentNetwork.value = new Network(currentContainer.value, { nodes, edges }, options);
  }

  /** add entry to the story web */
  const addEntry = async (entryUuid: string) => {
    if (!currentStoryWeb.value)
      return;

    await currentStoryWeb.value.addEntry(entryUuid);

    // refresh the drawing
    await mainStore.refreshStoryWeb();
  };



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

