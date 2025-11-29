// this store handles activities specific to campaigns
//
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref, } from 'vue';
import type { Edge, Network, Node } from 'vis-network';

// local imports
import { useMainStore, } from '@/applications/stores';
import { nodeTypeToTopic, topicToNodeType } from '@/utils/misc';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';

// Global physics options for console debugging and tuning
// Initialize global physics options with current defaults
window.fcbStoryWebPhysics = {
  solver: 'repulsion',
  barnesHut: {
    avoidOverlap: 1,        // ensure nodes don't overlap
    springLength: 100,      // "rest" length of edges (shorter = tighter cluster)
    springConstant: .002,  //0.01,  // how strong springs pull (higher = neighbors move more)
    gravitationalConstant: -500,  //-3500, // -3500 // how strongly nodes repel (more negative = more push)
    centralGravity: .05, //1,  //0.3,    // pulls everything toward center (higher = more drift)
    damping: .1,  //0.09,          // friction (higher = motion dies out faster)
  },
  // repulsion: {
  //   nodeDistance: 100,
  //   springLength: 100,      // "rest" length of edges (shorter = tighter cluster)
  //   springConstant: 0.03,  // how strong springs pull (higher = neighbors move more)
  //   centralGravity: 0.05,    // pulls everything toward center (higher = more drift)
  //   damping: .3,            // friction (higher = motion dies out faster)
  // },
  stabilization: {
    enabled: true,
    onlyDynamicEdges: false,
    updateInterval: 1,
  },
  maxVelocity: 50,
  minVelocity: 1
};

// types
import { RelatedEntryDetails, StoryWebNodeSource, StoryWebNodeTypes, Topics } from '@/types';
import { Entry } from '@/classes';

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
      // these can be both narrower and wider than normal ones
      widthConstraint: {
        minimum: 70,
        maximum: 280,
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
              label: `${index.name}${index.type ? `\n(${index.type})` : ''}`,
              ...positionInfo,
              ...nodeConfig[node.type],
            });
          } else if (node.type === StoryWebNodeTypes.Danger) {
            // TODO
          }
        } else if (node.source === StoryWebNodeSource.Implicit) {
          // implicit nodes - render as ellipses
          const topic = nodeTypeToTopic(node.type);
          if (topic !== null) {
            const index = currentSetting.value?.topics[topic]?.entries.find(e => e.uuid === node.uuid);

            if (!index)
              continue;

            const positionInfo = currentStoryWeb.value?.positions?.[index.uuid] || {};
            
            nodes.push({
              ...implicitNodeFormat,
              id: index.uuid,
              label: `${index.name}${index.type ? `\n(${index.type})` : ''}`,
              ...positionInfo,
              ...nodeConfig[node.type],
            });
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
        // only create edges for entry nodes (not custom or danger nodes)
        if (nodeTypeToTopic(node.type) == null)
          continue;

        // it's an entry
        const entry = await Entry.fromUuid(node.uuid);
        if (!entry)
          continue;

        for (const topic of topics) {
          const relatedEntries = entry?.relationships?.[topic] as RelatedEntryDetails<any, any>[] | undefined;
          if (!relatedEntries)
            continue;

          for (const relatedEntry of Object.values(relatedEntries)) {
            // only add edge if the related node is also in the story web
            if (!nodes.some(n => n.id === relatedEntry.uuid))
              continue;

            // add the relationship edge
            // it's possible the edge is already there - specifically if we put two nodes on manually that
            //   relate to each other
            if (!edges.some(e => e.to === node.uuid && e.from === relatedEntry.uuid)) {
              edges.push({
                from: node.uuid,
                to: relatedEntry.uuid,
                label: relatedEntry.extraFields.rols || relatedEntry.extraFields.relationship || '',
                ...edgeConfig
              });
            }
          }
        }
      }
      
      const options = {
        configure: 'physics',  // change to 'physics' to get a physics config panel
        physics: window.fcbStoryWebPhysics,
        edges: {
          smooth: {
            enabled: true,
            type: 'continuous',   //type: 'dynamic',  // participates in physics
            roundness: 0.5
          }
        },
        nodes: {
          margin: 3,  // padding in px
          // keep all nodes the same size
          widthConstraint: {
            minimum: 140,
            maximum: 140,
          },
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
  /** @param position - position to place the node at - relative to DOM */
  /** @param withRelationships - whether to also add all related nodes implicitly */
  const addEntry = async (entryUuid: string, position: { x: number, y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    const convertedPosition = position ? currentNetwork.value.DOMtoCanvas(position) : null;
    await currentStoryWeb.value.addEntry(entryUuid, convertedPosition, withRelationships);

    // refresh the drawing
    await mainStore.refreshStoryWeb();
    currentNetwork.value?.stabilize(50);
  };

  /** add a manual node to the story web */
  const addCustomNode = async (text: string, x?: number, y?: number) => {
    if (!currentStoryWeb.value)
      return;

    await currentStoryWeb.value.addCustomNode(text, x, y);

    // refresh the drawing
    await mainStore.refreshStoryWeb();
  };

  /** remove a node from the story web */
  const removeNode = async (nodeId: string) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    // if it's explicit, remove any implicit nodes not connected to anything else
    if (currentStoryWeb.value.nodes.find(n => n.uuid === nodeId)?.source === StoryWebNodeSource.Explicit) {
      const connectedNodes = currentNetwork.value.getConnectedNodes(nodeId) as string[];
      
      for (const connection of connectedNodes) {
        // if it has no other connections and is implicit, delete it
        if (currentNetwork.value.getConnectedNodes(connection).length === 1) {
          const nodeDetails = currentStoryWeb.value.nodes.find(n => n.uuid === connection);
          if (!nodeDetails || nodeDetails.source === StoryWebNodeSource.Implicit) {
            currentStoryWeb.value.nodes = currentStoryWeb.value.nodes.filter(n => n.uuid !== connection);
          }
        }
      }      
    }

    currentStoryWeb.value.nodes = currentStoryWeb.value.nodes.filter(n => n.uuid !== nodeId);

    await currentStoryWeb.value.save(); 

    // refresh the drawing
    await mainStore.refreshStoryWeb();
  };

  /** remove an edge from the story web */
  const removeEdge = async (edgeId: string) => {
    if (!currentStoryWeb.value)
      return;

    currentStoryWeb.value.edges = currentStoryWeb.value.edges.filter(e => e.uuid !== nodeId);
    await currentStoryWeb.value.save(); 

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

  const onNetworkDoubleClick = async (eventInfo: { nodes: string[], edges: string[], pointer: { canvas: { x: number, y: number }} }) => {
    // nodes is a list of nodes clicked on
    // edges is either edges clicked on or could be edges connected to nodes clicked
    const { nodes, edges, pointer } = eventInfo;
    
    // see what we clicked on
    if (nodes.length > 0) {
      // make sure it's a manual one
      const node = currentStoryWeb.value?.nodes.find(n => n.uuid === nodes[0]);
      if (!node || node.source !== StoryWebNodeSource.Custom)
        return;

      const newText = await getText(localize('labels.storyWeb.editText'), localize('labels.storyWeb.enterText'), node.label || ''); 
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
    removeNode,
    removeEdge,
  };
});

