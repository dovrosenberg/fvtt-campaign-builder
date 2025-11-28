// this store handles activities specific to campaigns
//
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref, } from 'vue';
import type { Edge, Network, Node } from 'vis-network';

// local imports
import { useMainStore, } from '@/applications/stores';

// Global physics options for console debugging and tuning
// Initialize global physics options with current defaults
window.fcbStoryWebPhysics = {
  solver: 'repulsion',
  // barnesHut: {
  //   avoidOverlap: 1,        // ensure nodes don't overlap
  //   springLength: 100,      // "rest" length of edges (shorter = tighter cluster)
  //   springConstant: 0.04,  // how strong springs pull (higher = neighbors move more)
  //   gravitationalConstant: -3500, // -3500 // how strongly nodes repel (more negative = more push)
  //   centralGravity: 1,  //0.3,    // pulls everything toward center (higher = more drift)
  //   damping: 4,  //0.09,          // friction (higher = motion dies out faster)
  // },
  repulsion: {
    nodeDistance: 100,
    springLength: 100,      // "rest" length of edges (shorter = tighter cluster)
    springConstant: 0.03,  // how strong springs pull (higher = neighbors move more)
    centralGravity: 0.05,    // pulls everything toward center (higher = more drift)
    damping: .3,            // friction (higher = motion dies out faster)
  },
  stabilization: {
    enabled: true,
    onlyDynamicEdges: true,
    updateInterval: 1,
  },
  maxVelocity: 50,
  minVelocity: 1
};

// types
import { RelatedEntryDetails, StoryWebNodeSource, StoryWebNodeTypes, Topics } from '@/types';
import { Entry } from '@/classes';
import { nodeTypeToTopic, topicToNodeType } from '@/utils/misc';
import { FCBDialog } from '@/dialogs';
import { localize } from 'src/utils/game';

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

            const positionInfo = currentStoryWeb.value?.positions?.[index.uuid] || {};
            
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
        physics: window.fcbStoryWebPhysics,
        edges: {
          smooth: {
            enabled: true,
            type: 'dynamic',  // participates in physics
          }
        },
        // we set a fixed seed so we get the same general layout every time
          layout: {
            // randomSeed: '0.9545178996348908:1764205380774'
          }
      };

      currentNetwork.value = new Network(currentContainer.value, { nodes, edges }, options);

      // attach the event handlers
      currentNetwork.value.on('doubleClick', onNetworkDoubleClick);
      currentNetwork.value.on('stabilized', capturePositions);
      // currentNetwork.value.on('dragEnd', (event) => {
      //   // this gets called if we drag the canvas, too
      //   if (event.nodes.length !== 0) {
      //     capturePositions();
      //     currentNetwork.value?.stabilize();
      //   }
      // });
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
  const addCustomNode = async (text: string, x?: number, y?: number) => {
    if (!currentStoryWeb.value)
      return;

    await currentStoryWeb.value.addCustomNode(text, x, y);

    // refresh the drawing
    await mainStore.refreshStoryWeb();
  };

  ///////////////////////////////
  // methods
  const getText = async (title:string, prompt: string, initialText: string): Promise<string | null> => {
    let value: string | null = initialText;


    do {  // if hit ok, must have a value
      value = await FCBDialog.inputDialog(title, prompt, initialText); 
    } while (value==='');  
    
    return value;
  }

  const onNetworkDoubleClick = async (eventInfo: { nodes: {id: string, label: string}[], edges: {id: string, label: string}[], pointer: { canvas: { x: number, y: number }} }) => {
    // nodes is a list of nodes clicked on
    // edges is either edges clicked on or could be edges connected to nodes clicked
    const { nodes, edges, pointer } = eventInfo;
    
    // see what we clicked on
    if (nodes.length > 0) {
      // make sure it's a manual one
      const node = currentStoryWeb.value?.nodes.find(n => n.uuid === nodes[0].id);
      if (!node || node.source !== StoryWebNodeSource.Custom)
        return;

      const newText = await getText(localize('labels.storyWeb.editText'), localize('labels.storyWeb.enterText'), nodes[0].label || ''); 
      if (!newText)
        return;

      node.label = newText;
      await currentStoryWeb.value?.save();
      await mainStore.refreshStoryWeb();
    } else if (edges.length > 0) {

    } else {
      // create a manual node at the location of the click
      const newText = await getText(localize('labels.storyWeb.addText'), localize('labels.storyWeb.enterText'), ''); 
      if (!newText)
        return;

      await addCustomNode(newText, pointer.canvas.x, pointer.canvas.y);
      await mainStore.refreshStoryWeb();
    }
  }

  /** save all the node positions */
  const capturePositions = async () => {
    if (!currentNetwork.value || !currentStoryWeb.value)
      return;

    const positions = currentNetwork.value.getPositions();
    
    currentStoryWeb.value.positions = positions;
    
    await currentStoryWeb.value.save();
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

