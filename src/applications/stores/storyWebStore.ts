// this store handles activities specific to campaigns
//
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref, toRaw, nextTick } from 'vue';
import type { Edge, Network, Node } from 'vis-network';

// local imports
import { useMainStore, useRelationshipStore, useNavigationStore } from '@/applications/stores';
import { nodeTypeToTopic, } from '@/utils/misc';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { ModuleSettings, SettingKey } from '@/settings';

// library componentns
import ContextMenu from '@imengyu/vue3-context-menu';

// Global physics options for console debugging and tuning
// Initialize global physics options with current defaults
// @ts-ignore
window.fcbStoryWebPhysics = {
  solver: 'barnesHut',
  barnesHut: {
    avoidOverlap: 0.5,        // ensure nodes don't overlap
    springLength: 100,      // "rest" length of edges (shorter = tighter cluster)
    springConstant: .002,  //0.01,  // how strong springs pull (higher = neighbors move more)
    gravitationalConstant: -1550,  //-500,  //-3500, // -3500 // how strongly nodes repel (more negative = more push)
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
import { Danger, RelatedEntryDetails, StoryWebNodeSource, StoryWebNodeTypes, Topics } from '@/types';
import { Campaign, Entry, Front } from '@/classes';
import { confirmDialog } from '@/dialogs/confirm';

interface NetworkClickEventInfo {
  nodes: string[],
  edges: string[],
  pointer: { 
    DOM: { x: number, y: number },
    canvas: { x: number, y: number }
  },
  event: MouseEvent
};


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
  }

  // edges with labels are a bit longer 
  const edgeWithLabelConfig = {
    ...edgeConfig,
    length: 150,
  }


  const mainStore = useMainStore();
  const relationshipStore = useRelationshipStore();
  const navigationStore = useNavigationStore();
  const { currentStoryWeb, currentSetting } = storeToRefs(mainStore);
  
  // connection mode state
  const isConnectionMode = ref<boolean>(false);
  const connectionStartNode = ref<string | null>(null);
  const tempEdge = ref<{ from: { x: number, y: number }, to: { x: number, y: number } } | null>(null);
  const highlightedNode = ref<string | null>(null);
  const isCreatingConnection = ref<boolean>(false);

  // Auto-panning state
  let autoPanAnimationId: number | null = null;

  ///////////////////////////////
  // external state
  const isWebLoading = ref<boolean>(false);
  
  ///////////////////////////////
  // actions
  // generate the new network from the current story web
  const generateNetwork = async () => {
    if (!currentContainer.value || !currentStoryWeb.value || !currentSetting.value) {
      return;
    }

    if (isWebLoading.value) 
      return;

    // Clean up connection mode if network is being regenerated
    if (isConnectionMode.value) {
      endConnectionMode();
    }

    isWebLoading.value = true;

    try {    
      // dynamically import vis-network
      const { Network, } = await import('vis-network');
      
      // build out the graph using the selected ones and everything connected to them
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      // load all the fronts so we have them to reference
      let fronts: Front[] = [];
      for (const campaignIdx of currentSetting.value.campaignIndex) {
        const campaign = await Campaign.fromUuid(campaignIdx.uuid);
        if (!campaign)
          continue;
        
        fronts = fronts.concat(await campaign.allFronts());
      }


      // we pull the list of nodes and edges from the storyWeb 
      // add the explicit ones
      for (const node of currentStoryWeb.value?.nodes) {
        // these are entries the user added
        if ([StoryWebNodeSource.Explicit, StoryWebNodeSource.Implicit].includes(node.source)) {
          if (node.type === StoryWebNodeTypes.Danger) {
            // getting the name is a bit tricky 
            const [frontId, dangerIndex] = node.uuid.split('|');
            const front = fronts.find(f => f.uuid === frontId);
            if (!front)
              continue;
            const danger = front.dangers[Number.parseInt(dangerIndex)];
            if (!danger)
              continue;

            const positionInfo = currentStoryWeb.value?.positions?.[node.uuid] || {};            
            const format = node.source === StoryWebNodeSource.Explicit ? explicitNodeFormat : implicitNodeFormat;
            nodes.push({
              ...format,
              id: node.uuid,
              label: `${danger.name}\n(${front.name})`,
              // title,
              ...positionInfo,
              ...nodeConfig[StoryWebNodeTypes.Danger],
            });
          } else {
            // if an entry, we need the topic
            const topic = nodeTypeToTopic(node.type);
            if (topic !== null) {
              const index = currentSetting.value?.topics[topic]?.entries.find(e => e.uuid === node.uuid);

              if (!index)
                continue;

              const positionInfo = currentStoryWeb.value?.positions?.[index.uuid] || {};
              
              const format = node.source === StoryWebNodeSource.Explicit ? explicitNodeFormat : implicitNodeFormat;

              // titles may require additional css... not working and maybe not worth bigger package size
              // const title = getTopicText(topic) + '\n' + 
              //   node.source === StoryWebNodeSource.Explicit ? 'added directly' : 'added via relationship'; 

              nodes.push({
                ...format,
                id: index.uuid,
                label: `${index.name}${index.type ? `\n(${index.type})` : ''}`,
                // title,
                ...positionInfo,
                ...nodeConfig[node.type],
              });
            }
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
    
      const edgeConfig = getEdgeConfig(false);
      const edgeWithLabelConfig = getEdgeConfig(true);

      // add each of the connections
      const topics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC];
      for (const node of currentStoryWeb.value?.nodes) {
        // only create edges for entry and danger nodes (not custom nodes)
        if (node.type === StoryWebNodeTypes.Custom)
          continue;

        if (node.type === StoryWebNodeTypes.Danger) {
          const [frontId, dangerId] = node.uuid.split('|');
          const front = fronts.find(f => f.uuid === frontId);
          if (!front)
            continue;
          const danger = front.dangers[Number.parseInt(dangerId)];
          if (!danger)
            continue;

          // do the participants
          for (const participant of danger.participants) {
            // only add edge if the related node is also in the story web
            if (!nodes.some(n => n.id === participant.uuid))
              continue;

            // add the relationship edge
            // it's possible the edge is already there - specifically if we put two nodes on manually that
            //   relate to each other
            if (!edges.some(e => e.to === node.uuid && e.from === participant.uuid)) {
              const label = participant.role || '';
              edges.push({
                from: node.uuid,
                to: participant.uuid,
                label,
                ...(label ? edgeWithLabelConfig : edgeConfig),
              });
            }
          }
        } else {
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
                const label = relatedEntry.extraFields.role || relatedEntry.extraFields.relationship || '';

                edges.push({
                  from: node.uuid,
                  to: relatedEntry.uuid,
                  label,
                  ...(label ? edgeWithLabelConfig : edgeConfig),
                });
              }
            }
          }
        }
      }

      // Add manual edges from storyWeb.edges array
      for (const edge of currentStoryWeb.value?.edges || []) {
        // Only add edge if both nodes exist in the graph
        if (nodes.some(n => n.id === edge.from) && nodes.some(n => n.id === edge.to)) {
          const label = edge.label || '';
          edges.push({
            from: edge.from,
            to: edge.to,
            label,
            ...(label ? edgeWithLabelConfig : edgeConfig),
          });
        }
      }
      
      const options = {
        configure: false,  // change to 'physics' to get a physics config panel
        // @ts-ignore
        physics: ModuleSettings.get(SettingKey.storyWebAutoArrange) ? window.fcbStoryWebPhysics : false,
        edges: {
          smooth: {
            enabled: true,
            type: 'discrete',   // 'continuous' //type: 'dynamic',  // participates in physics
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

      // @ts-ignore - options type is bad on visnetwork
      currentNetwork.value = new Network(currentContainer.value, { nodes, edges }, options);

      // attach the event handlers
      currentNetwork.value.on('doubleClick', onNetworkDoubleClick);
      currentNetwork.value.on('oncontext', onNetworkContentMenu);
      currentNetwork.value.on('stabilized', capturePositions);
      currentNetwork.value.on('dragStart', onDragStart);
      currentNetwork.value.on('dragging', onDragging);
      currentNetwork.value.on('dragEnd', onDragEnd);
    } catch (error) {
      isWebLoading.value = false;
      throw error;
    }

    isWebLoading.value = false;
  }

  /** add entry to the story web */
  /** @param position - position to place the node at - relative to canvas */
  /** @param withRelationships - whether to also add all related nodes implicitly */
  const addEntry = async (entryUuid: string, position: { x: number, y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    await currentStoryWeb.value.addEntry(entryUuid, position, withRelationships);

    // refresh the drawing
    await mainStore.refreshStoryWeb();
    toRaw(currentNetwork.value)?.stabilize(50);
  };

  /** add danger to the story web */
  /** @param position - position to place the node at - relative to canvas */
  /** @param withRelationships - whether to also add all related nodes implicitly */
  const addDanger = async (dangerId: string, position: { x: number, y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    await currentStoryWeb.value.addDanger(dangerId, position, withRelationships);

    // refresh the drawing
    await mainStore.refreshStoryWeb();
    toRaw(currentNetwork.value)?.stabilize(50);
  };

  /** add front to the story web - adds all dangers from the front */
  /** @param position - position to place the first danger at - relative to canvas */
  /** @param withRelationships - whether to also add all related nodes implicitly */
  const addFront = async (frontId: string, position: { x: number, y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    const front = await Front.fromUuid(frontId);
    if (!front)
      return;

    // Add all dangers from the front
    for (let i = 0; i < front.dangers.length; i++) {
      const dangerId = `${front.uuid}|${i}`;
      // Offset position for each danger to avoid overlap
      const dangerPosition = position ? {
        x: position.x + (i * 50),
        y: position.y + (i * 50)
      } : null;
      await currentStoryWeb.value.addDanger(dangerId, dangerPosition, withRelationships);
    }

    // refresh the drawing
    await mainStore.refreshStoryWeb();
    toRaw(currentNetwork.value)?.stabilize(50);
  };

  /** select an entry from dialog and insert at a location; will let user pick from all entries
   *    in the setting, but will exclude any that are already in the story web (explicitly)
   * @param position - position to place the node at - relative to canvas 
   * @param withRelationships - whether to also add all related nodes implicitly
   */
  const selectAndAddEntry = async (position: { x: number, y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentSetting.value)
      return;

    let options = Object.values(currentSetting.value.topics).reduce((acc, topic) => {
      acc.push(...topic.entries.map(e => ({ id: e.uuid, label: e.name })));
      return acc;
    }, [] as { id: string; label: string }[]); 

    // take out things already in the map explicitly
    options = options.filter(o => !currentStoryWeb.value?.nodes.some(n => n.uuid === o.id && n.source === StoryWebNodeSource.Explicit));

    // options = options.sort((a, b) => a.label.localeCompare(b.label));

    const entryUuid = await FCBDialog.relatedItemDialog(
      localize('contextMenus.storyWebGraph.addEntry'),
      localize('contextMenus.storyWebGraph.addEntry'),
      options, 
    );
    if (!entryUuid)
      return;

    await addEntry(entryUuid, position, withRelationships);
  };

  /** handle dropping an entry on top of an existing node to create a connection
   * @param entryUuid - UUID of the entry being dropped
   * @param targetNodeId - UUID of the node under the drop position
   * @param position - position to place the new node at - relative to canvas
   * @param withRelationships - whether to also add all related nodes implicitly
   */
  const handleDropOnNode = async (entryUuid: string, targetNodeId: string, position: { x: number, y: number }, withRelationships: boolean = false) => {
    if (!currentStoryWeb.value)
      return;

    // Check if the dropped entry is already in the graph
    const entryAlreadyInGraph = currentStoryWeb.value.nodes.some(
      node => node.uuid === entryUuid
    );
    
    // Add the entry if it's not already in the graph
    if (!entryAlreadyInGraph) {
      await addEntry(entryUuid, position, withRelationships);

      // add any edges needed
      await mainStore.refreshStoryWeb();
      await nextTick();
    }

    // Check if connection is valid before proceeding
    if (isValidConnection(targetNodeId, entryUuid)) {
      // ask if they want to create a connection
      const shouldConnect = await confirmDialog(
        localize('labels.storyWeb.createConnection'),
        localize('labels.storyWeb.createConnectionPrompt')
      );
      
      if (shouldConnect) {
        // Create the connection (target node to new/existing entry)
        await createConnection(targetNodeId, entryUuid);
      }
    } 
  };

  /** select an danger from dialog and insert at a location; will let user pick from fronts
   *    and then dangers, but will exclude any that are already in the story web (explicitly)
   * @param position - position to place the node at - relative to canvas 
   * @param withRelationships - whether to also add all related nodes implicitly
   */
  const selectAndAddDanger = async (position: { x: number, y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentSetting.value)
      return;

    // fronts aren't indexed so we have to load from each campaign
    let frontOptions = [] as { id:string, label: string }[];

    for (const campaignIdx of currentSetting.value.campaignIndex) {
      const campaign = await Campaign.fromUuid(campaignIdx.uuid);
      if (!campaign)
        continue;

      const fronts = await campaign.allFronts();
      frontOptions = frontOptions.concat(fronts.map(f => ({ id: f.uuid, label: f.name })));
    }

    // given the id of a selected front, give all the dangers as options
    const getDangerOptions = async (frontUuid: string) => {
      const front = await Front.fromUuid(frontUuid);
      if (!front)
        return [];

      // for dangers, we're going to use front|danger as the uuid to let us open
      //    it later
      let options = front.dangers.map((d: Danger, idx: number) => ({ id: `${frontUuid}|${idx}`, label: d.name }));

      // take out things already in the map explicitly
      options = options.filter(o => !currentStoryWeb.value?.nodes.some(n => n.uuid === o.id && n.source === StoryWebNodeSource.Explicit));

      return options;
    };

    // options = options.sort((a, b) => a.label.localeCompare(b.label));

    const dangerId = await FCBDialog.relatedItemDialog(
      localize('contextMenus.storyWebGraph.addDanger'),
      localize('contextMenus.storyWebGraph.addDanger'),
      frontOptions,
      true,
      getDangerOptions
    );
    if (!dangerId)
      return;

    await addDanger(dangerId, position, withRelationships);
  };

  /** add a manual node to the story web */
  const addCustomNode = async (canvasPosition: { x: number, y: number } | null = null) => {
    if (!currentStoryWeb.value)
      return;

    // get the initial text from a dialog
    const text = await FCBDialog.inputDialog(localize('contextMenus.storyWebGraph.addText'), localize('contextMenus.storyWebGraph.addTextPrompt'));
    if (!text)
      return;

    await currentStoryWeb.value.addCustomNode(text, canvasPosition);

    // refresh the drawing
    await mainStore.refreshStoryWeb();
  };

  /** remove a node from the story web */
  const removeNode = async (nodeId: string) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    // if it's explicit, remove any implicit nodes not connected to anything else
    if (currentStoryWeb.value.nodes.find(n => n.uuid === nodeId)?.source === StoryWebNodeSource.Explicit) {
      const connectedNodes = toRaw(currentNetwork.value).getConnectedNodes(nodeId) as string[];
      
      for (const connection of connectedNodes) {
        // if it has no other connections and is implicit, delete it
        if (toRaw(currentNetwork.value).getConnectedNodes(connection).length === 1) {
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

  /** remove an edge from the story web 
  */

  const removeEdge = async (edgeId: string) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    // confirm
    const nodes = toRaw(currentNetwork.value).getConnectedNodes(edgeId) as string[];

    // show confirmation if both are entries
    const node1 = currentStoryWeb.value?.nodes.find(n => n.uuid === nodes[0]);
    const node2 = currentStoryWeb.value?.nodes.find(n => n.uuid === nodes[1]);

    if (!node1 || !node2) 
      throw new Error('Missing node in storyWebStore.removeEdge()');

    if (node1?.source !== StoryWebNodeSource.Custom && node2?.source !== StoryWebNodeSource.Custom) {
      const result = await FCBDialog.confirmDialog(localize('labels.storyWeb.removeRelationship'), localize('labels.storyWeb.removeRelationshipConfirm'));
      if (!result)
        return;

      await relationshipStore.deleteArbitraryRelationship(node1.uuid, node2.uuid);
    } 

    // if either edge was implicit, remove that one too - unless it's attached to something else
    if (node1?.source === StoryWebNodeSource.Implicit) {
      // see if this node is attached to anything else
      if (toRaw(currentNetwork.value).getConnectedNodes(node1.uuid).length === 1) {
        await removeNode(node1.uuid);
      }
    }
    if (node2?.source === StoryWebNodeSource.Implicit) {
      if (toRaw(currentNetwork.value).getConnectedNodes(node2.uuid).length === 1) {
        await removeNode(node2.uuid);
      }
    }

    // remove from the web if it was a manual edge
    currentStoryWeb.value.edges = currentStoryWeb.value.edges.filter(e => e.uuid !== edgeId);
    await currentStoryWeb.value.save(); 
    
    // refresh the drawing
    await mainStore.refreshStoryWeb();
  };

  ///////////////////////////////
  // methods

  /** Some colors need to be different in dark mode but we can't use css variables in canvas.
   *   Instead we call then when we generate the graph to read the variables and set the right colors
   */
  const getEdgeConfig = (hasLabel: boolean) => {
    // get the base
    const config = hasLabel ? edgeWithLabelConfig : edgeConfig;

    // use some computed variables to set the right style
    config.color = getComputedStyle(document.body).getPropertyValue('--fcb-primary');

    if (document.body.classList.contains('theme-dark')) {
      config.font = {
        strokeWidth: 0,
        color: 'white'
      };
    } else {
      config.font = {
        strokeWidth: 0,
        color: 'black'
      };
    }

    return config;
  }

  /** @param required - whether the input must have a value (false means it can be blank) */
  const getText = async (title:string, prompt: string, initialText: string, required: boolean): Promise<string | null> => {
    let value: string | null = initialText;


    do {  // if hit ok, must have a value
      value = await FCBDialog.inputDialog(title, prompt, initialText); 

      if (!required)
        return value;
    } while (value==='');  
    
    return value;
  }

  const editCustomNode = async (nodeId: string) => {
    // make sure it's a manual one
    const node = currentStoryWeb.value?.nodes.find(n => n.uuid === nodeId);
    if (!node || node.source !== StoryWebNodeSource.Custom)
      return;

    const newText = await getText(localize('labels.storyWeb.editText'), localize('labels.storyWeb.enterText'), node.label || '', true); 
    if (!newText)
      return;

    node.label = newText;
    await currentStoryWeb.value?.save();
    await mainStore.refreshStoryWeb();
  }

  const editEdge = async (edgeId: string) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    // Get the connected nodes to determine what type of edge this is
    const connectedNodes = toRaw(currentNetwork.value).getConnectedNodes(edgeId) as string[];
    if (connectedNodes.length !== 2)
      return;

    const [fromNode, toNode] = connectedNodes;
    
    // Get current edge label
    const currentLabel = await getCurrentEdgeLabel(fromNode, toNode);
    
    // Get new label from user
    const newLabel = await getText(
      localize('labels.storyWeb.editRelationship'), 
      localize('labels.storyWeb.newConnectionLabel'), 
      currentLabel || '',
      false
    );
    
    if (newLabel === null) // User cancelled
      return;

    // Update the edge based on its type
    await updateEdgeLabel(fromNode, toNode, newLabel);
    
    await mainStore.refreshStoryWeb();
  }

  const getCurrentEdgeLabel = async (fromNode: string, toNode: string): Promise<string> => {
    // Check if it's a manual edge first
    const manualEdge = getManualEdge(fromNode, toNode);
    if (manualEdge) {
      return manualEdge.label || '';
    }

    // Check if it's a danger participant edge
    const fromNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === fromNode);
    const toNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === toNode);
    
    if (fromNodeData?.type === StoryWebNodeTypes.Danger || toNodeData?.type === StoryWebNodeTypes.Danger) {
      const dangerUuid = fromNodeData?.type === StoryWebNodeTypes.Danger ? fromNode : toNode;
      const entryUuid = fromNodeData?.type === StoryWebNodeTypes.Danger ? toNode : fromNode;
      
      // Parse danger UUID to get front and danger index
      const [frontId, dangerIndex] = dangerUuid.split('|');
      const front = await Front.fromUuid(frontId);
      if (!front)
        return '';

      const danger = front.dangers[Number.parseInt(dangerIndex)];
      if (!danger)
        return '';

      // Find the participant role for this entry
      const participant = danger.participants.find(p => p.uuid === entryUuid);
      return participant?.role || '';
    }

    // For entry-to-entry relationships, check the relationship store
    try {
      const fromEntry = await Entry.fromUuid(fromNode);
      if (!fromEntry?.relationships)
        return '';

      // Check all relationship topics for the target entry
      for (const topic of [Topics.Character, Topics.Location, Topics.Organization, Topics.PC]) {
        const relatedEntries = fromEntry.relationships[topic] as RelatedEntryDetails<any, any>[] | undefined;
        if (!relatedEntries)
          continue;

        const relatedEntry = relatedEntries[toNode];
        if (relatedEntry) {
          return relatedEntry.extraFields.role || relatedEntry.extraFields.relationship || '';
        }
      }
    } catch (error) {
      console.warn('Error fetching current edge label:', error);
    }

    return '';
  }

  const getManualEdge = (fromNode: string, toNode: string) => {
    const edgeUuid = [fromNode, toNode].sort().join('|');
    const manualEdge = currentStoryWeb.value?.edges.find(e => e.uuid === edgeUuid);
    return manualEdge;
  }

  const updateEdgeLabel = async (fromNode: string, toNode: string, newLabel: string) => {
    // Check if it's a manual edge first
    const manualEdge = getManualEdge(fromNode, toNode);
    if (manualEdge) {
      manualEdge.label = newLabel;
      await currentStoryWeb.value?.save();
      return;
    }

    // Check if it's a danger participant edge
    const fromNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === fromNode);
    const toNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === toNode);
    
    if (fromNodeData?.type === StoryWebNodeTypes.Danger || toNodeData?.type === StoryWebNodeTypes.Danger) {
      const dangerUuid = fromNodeData?.type === StoryWebNodeTypes.Danger ? fromNode : toNode;
      const entryUuid = fromNodeData?.type === StoryWebNodeTypes.Danger ? toNode : fromNode;
      
      // Parse danger UUID to get front and danger index
      const [frontId, dangerIndex] = dangerUuid.split('|');
      const front = await Front.fromUuid(frontId);
      if (!front)
        return;

      const danger = front.dangers[Number.parseInt(dangerIndex)];
      if (!danger)
        return;

      // Update the participant role
      const updatedParticipants = danger.participants.map(p => 
        p.uuid === entryUuid ? { ...p, role: newLabel } : p
      );
      
      front.updateDanger(Number.parseInt(dangerIndex), {
        ...danger,
        participants: updatedParticipants
      });
      await front.save();
      return;
    }

    // For entry-to-entry relationships, update the relationship fields directly on both entries
    const entry = await Entry.fromUuid(fromNode);
    const relatedEntry = await Entry.fromUuid(toNode);
    
    if (!entry || !relatedEntry)
      return;

    const entryTopic = entry.topic;
    const relatedEntryTopic = relatedEntry.topic;

    if (!entryTopic || !relatedEntryTopic)
      return;

    // Determine which field to update based on the topic pairing (same logic as addArbitraryRelationship)
    const extraFields = relationshipStore.extraFields;
    let updateField = '';
    
    if (extraFields[entryTopic]?.[relatedEntryTopic]?.length > 0) {
      updateField = extraFields[entryTopic][relatedEntryTopic][0].field;
    } else if (extraFields[relatedEntryTopic]?.[entryTopic]?.length > 0) {
      updateField = extraFields[relatedEntryTopic][entryTopic][0].field;
    }

    if (!updateField)
      return;

    // Clone the relationships to avoid mutation issues
    const entryRelationships = foundry.utils.deepClone(entry.relationships);
    const relatedEntryRelationships = foundry.utils.deepClone(relatedEntry.relationships);

    // Update the relationship on both entries
    if (entryRelationships[relatedEntryTopic]?.[relatedEntry.uuid]) {
      entryRelationships[relatedEntryTopic][relatedEntry.uuid].extraFields[updateField] = newLabel;
    }
    
    if (relatedEntryRelationships[entryTopic]?.[entry.uuid]) {
      relatedEntryRelationships[entryTopic][entry.uuid].extraFields[updateField] = newLabel;
    }

    // Save both entries
    entry.relationships = entryRelationships;
    relatedEntry.relationships = relatedEntryRelationships;
    
    await entry.save();
    await relatedEntry.save();
  }

  const onNetworkDoubleClick = async (eventInfo: NetworkClickEventInfo) => {
    // nodes is a list of nodes clicked on
    // edges is either edges clicked on or could be edges connected to nodes clicked
    const { nodes, edges, pointer } = eventInfo;
    
    // see what we clicked on
    if (nodes.length > 0) {
      await editCustomNode(nodes[0]);
    } else if (edges.length > 0) {
      await editEdge(edges[0]);
    } else {
      await addCustomNode(pointer.canvas);
      await mainStore.refreshStoryWeb();
    }
  }

  const onDragStart = (eventInfo: NetworkClickEventInfo) => {
    const network = toRaw(currentNetwork.value);
    if (!network)
      return;

    const { pointer } = eventInfo;

    const node = network.getNodeAt(pointer.DOM);
    const edge = network.getEdgeAt(pointer.DOM);

    if (!node && !edge) {
      network.unselectAll();
    }
  };

  /** The basic flow here is:
   *    1. When dragging, check if we brought a node to an edge of the canvas
   *    2. If so, start auto-panning mode - that starts a sequence of panning and location checks to see if we need to pan
   *    3. Auto-pan mode ends when either we 'drop' or the node moves out of the pan zone
   */
  // Track previous node position to detect user drag direction
  let previousNodePosition: { x: number, y: number } | null = null;

  const onDragging = () => {
    const network = toRaw(currentNetwork.value);
    if (!network) return;
    
    // Log selected node location and viewport coordinates
    const selectedNodes = network.getSelectedNodes();
    if (selectedNodes.length === 1) {
      const nodeId = selectedNodes[0];
      const nodePosition = network.getPositions([nodeId])[nodeId];
      const nodeBoundingBox = network.getBoundingBox(nodeId);
      const viewport = network.getViewPosition();
      
      // Convert to DOM units
      const domTopLeft = network.canvasToDOM({ x: nodeBoundingBox.left, y: nodeBoundingBox.top });
      const domBottomRight = network.canvasToDOM({ x: nodeBoundingBox.right, y: nodeBoundingBox.bottom });
      
      // Track movement direction
      if (previousNodePosition) {
        const deltaX = nodePosition.x - previousNodePosition.x;
        const deltaY = nodePosition.y - previousNodePosition.y;
      }
      previousNodePosition = { x: nodePosition.x, y: nodePosition.y };
    }
    
    // if we're not already panning, check if we need to start
    if (!autoPanAnimationId)
      startAutoPan();
  };

  const onDragEnd = async () => {
    stopAutoPan();
    
    // if we're not using physics, we need to save (otherwise we save when
    //   it stablizes)
    if (!ModuleSettings.get(SettingKey.storyWebAutoArrange))
      await capturePositions();
  };

  // returns null for no, or the direction to scroll 0/-1
  const inPanZone = (): { x: number, y: number } | null => {
    if (!currentNetwork.value || !currentContainer.value)
      return null;

    const network = toRaw(currentNetwork.value);
    const selectedNodes = network.getSelectedNodes() as string[];
    if (selectedNodes.length === 0)
      return null;

    // we're going to operate in DOM space because it's much simpler

    // Get viewport boundaries
    const canvas = currentContainer.value.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas)
      return null;

    const edgeThreshold = 55; // px from edge to trigger panning (increased from 50 to handle timing drift)
    const canvasDOMRect = canvas.getBoundingClientRect();

    // Check if node is near the edge
    let needsAutoPan = false;
    let newPanDirection = { x: 0, y: 0 };

    // Use different thresholds based on whether auto-pan is already active
    const startThreshold = edgeThreshold; // 55px to start
    const stopThreshold = edgeThreshold + 10; // 65px to stop
    const threshold = autoPanAnimationId ? stopThreshold : startThreshold;
    
    // get the bounding box for the selected nodes
    const nodePositions = selectedNodes.map(node => {
      const canvasBB = network.getBoundingBox(node);
      const topLeft = network.canvasToDOM({ x: canvasBB.left, y: canvasBB.top });
      const bottomRight = network.canvasToDOM({ x: canvasBB.right, y: canvasBB.bottom });
      return { 
        left: topLeft.x,
        top: topLeft.y,
        right: bottomRight.x,
        bottom: bottomRight.y
      }
    });

    const minX = Math.min(...nodePositions.map(pos => pos.left));
    const maxX = Math.max(...nodePositions.map(pos => pos.right));
    const minY = Math.min(...nodePositions.map(pos => pos.top));
    const maxY = Math.max(...nodePositions.map(pos => pos.bottom));
    
    // Check each edge using the bounding box with appropriate threshold
    if (minX <= threshold) {
      newPanDirection.x = -1; // Pan left
      needsAutoPan = true;
    } else if (maxX > canvasDOMRect.width - threshold) {
      newPanDirection.x = 1; // Pan right
      needsAutoPan = true;
    }
    
    if (minY <= threshold) {
      newPanDirection.y = -1; // Pan down
      needsAutoPan = true;
    } else if (maxY > canvasDOMRect.height - threshold) {
      newPanDirection.y = 1; // Pan up
      needsAutoPan = true;
    }
    
    return needsAutoPan ? newPanDirection : null;
  };

  const startAutoPan = () => {
    const network = toRaw(currentNetwork.value);
    if (!network) 
      return;

    const normalPanSpeed = 10; // pixels per frame

    const animate = () => {
      if (!network) {
        stopAutoPan();
        return;
      }

      // Continue checking edge detection even if dragging event stops firing
      const panDirection = inPanZone();
      
      if (!panDirection) {
        // Continue checking but don't pan 
        autoPanAnimationId = requestAnimationFrame(animate);
        return;
      }

      const viewPosition = network.getViewPosition();
      const scale = network.getScale();
      
      // Convert DOM pixel speed to canvas coordinates
      const panOffset = {
        x: (panDirection.x * normalPanSpeed) / scale,
        y: (panDirection.y * normalPanSpeed) / scale
      };

      // move all the selected nodes
      const nodes = network.getSelectedNodes();

      // shouldn't be empty (because the pan check should have stopped, but just in case
      if (nodes.length===0) {
        stopAutoPan();
        return;
      }

      const positions = network.getPositions(nodes);
      
      // Move nodes opposite to viewport pan to keep them stationary in DOM space
      for (const node in positions) {
        network.moveNode(node, positions[node].x + panOffset.x, positions[node].y + panOffset.y);
      }
      
      // Log before network.moveTo
      const viewportBefore = network.getViewPosition();
      
      // Pan the viewport to keep nodes in view
      network.moveTo({
        position: {
          x: viewPosition.x + panOffset.x * 1.0,
          y: viewPosition.y + panOffset.y* 1.0
        },
        animation: false
      });
      
      // Log after network.moveTo
      const viewportAfter = network.getViewPosition();

      // if we're still in pan mode, keep going
      if (autoPanAnimationId) {
        autoPanAnimationId = requestAnimationFrame(animate);
      }
    };

    // kick it off
    autoPanAnimationId = requestAnimationFrame(animate);
  };

  const stopAutoPan = () => {
    if (autoPanAnimationId) {
      cancelAnimationFrame(autoPanAnimationId);
      autoPanAnimationId = null;
    }
  };

  const onNetworkContentMenu = (eventInfo: NetworkClickEventInfo) => {
    // nodes is a list of nodes clicked on
    // edges is either edges clicked on or could be edges connected to nodes clicked
    const { pointer, event } = eventInfo;

    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    if (!currentNetwork.value || !currentContainer.value)
      return;
    
    // clear the selection
    toRaw(currentNetwork.value).unselectAll();

    // make sure there's a node or edge underneath us
    const node = toRaw(currentNetwork.value).getNodeAt(pointer.DOM);
    const edge = toRaw(currentNetwork.value).getEdgeAt(pointer.DOM);

    const rect = currentContainer.value.getBoundingClientRect();

    // nodes get priority
    if (node) {
      showNodeContextMenu(node as string, { x: pointer.DOM.x + rect.left, y: pointer.DOM.y + rect.top });
    } else if (edge) {
      showEdgeContextMenu(edge as string, { x: pointer.DOM.x + rect.left, y: pointer.DOM.y + rect.top });
    } else {
      showBlankContextMenu({ x: pointer.DOM.x + rect.left, y: pointer.DOM.y + rect.top }, pointer.canvas);
    }    
  };

  /** save all the node positions */
  const capturePositions = async () => {
    if (!currentNetwork.value || !currentStoryWeb.value)
      return;

    const positions = toRaw(currentNetwork.value).getPositions();
    
    currentStoryWeb.value.positions = positions;
    
    await currentStoryWeb.value.save();
  }

  const startConnectionMode = async (nodeId: string) => {
    if (!currentNetwork.value || !currentContainer.value)
      return;

    isConnectionMode.value = true;
    connectionStartNode.value = nodeId;

    // Initialize temporary edge from the start node position
    const nodePosition = toRaw(currentNetwork.value).getPositions([nodeId])[nodeId];
    tempEdge.value = {
      from: toRaw(currentNetwork.value).canvasToDOM(nodePosition),
      to: { x: 0, y: 0 } // Will be updated on mouse move
    };

    // Disable physics and node dragging during connection mode
    toRaw(currentNetwork.value).setOptions({
      physics: { enabled: false },
      interaction: { dragNodes: false }
    });

    // Get canvas element and add DOM event listeners
    const canvas = currentContainer.value.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('mousemove', onConnectionModeMouseMove);
      canvas.addEventListener('click', onConnectionModeClick);
    }

    toRaw(currentNetwork.value).on('beforeDrawing', onBeforeDrawing);

    // Add ESC key handler
    document.addEventListener('keydown', onConnectionModeKeydown);
  };

  const endConnectionMode = () => {
    isConnectionMode.value = false;
    connectionStartNode.value = null;
    tempEdge.value = null;
    highlightedNode.value = null;

    // Remove ESC key listener
    document.removeEventListener('keydown', onConnectionModeKeydown);

    if (!currentNetwork.value)
      return;

    // Re-enable physics and node dragging
    toRaw(currentNetwork.value).setOptions({
      physics: { enabled: ModuleSettings.get(SettingKey.storyWebAutoArrange) },
      interaction: { dragNodes: true }
    });

    // Remove DOM event listeners from canvas
    const canvas = currentContainer.value?.querySelector('canvas');
    if (canvas) {
      canvas.removeEventListener('mousemove', onConnectionModeMouseMove);
      canvas.removeEventListener('click', onConnectionModeClick);
    }

    toRaw(currentNetwork.value).off('beforeDrawing', onBeforeDrawing);

    // Redraw to clear temporary edge
    toRaw(currentNetwork.value).redraw();
  };

  // can the two nodes be connected?
  const isValidConnection = (fromNode: string, toNode: string): boolean => {
    if (fromNode === toNode || !currentNetwork.value)
      return false;

    // first make sure there isn't already a connecting edge
    if ((currentNetwork.value.getConnectedNodes(fromNode) as string[]).includes(toNode))
      return false;

    const fromNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === fromNode);
    const toNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === toNode);

    if (!fromNodeData || !toNodeData)
      return false;

    // Custom text can connect to anything
    if (fromNodeData.type === StoryWebNodeTypes.Custom || toNodeData.type === StoryWebNodeTypes.Custom)
      return true;

    // Entries can connect to custom text, other entries, and dangers (only characters/organizations)
    switch (fromNodeData.type) {
      case StoryWebNodeTypes.Character:
      case StoryWebNodeTypes.Organization:
        // these can connect to any entry or danger
        return true;  
      case StoryWebNodeTypes.Location:
      case StoryWebNodeTypes.PC:
        // these can connect to entries but not danger
        return toNodeData.type !== StoryWebNodeTypes.Danger;
      case StoryWebNodeTypes.Danger:
        // can connect to character/org
        return [StoryWebNodeTypes.Character, StoryWebNodeTypes.Organization].includes(toNodeData.type);
      default:
    }

    throw new Error('Bad type in storyWebStore.isValidConnection()');
  };

  
  const onBeforeDrawing = (ctx: CanvasRenderingContext2D) => {
    if (!tempEdge.value || !currentNetwork.value)
      return;

    // Save context state to prevent affecting other edges
    ctx.save();

    const fromCanvas = toRaw(currentNetwork.value).DOMtoCanvas(tempEdge.value.from);
    const toCanvas = toRaw(currentNetwork.value).DOMtoCanvas(tempEdge.value.to);

    ctx.strokeStyle = 'hsl(22, 100%, 55%)';  // our main accent color
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);  // 1st number is length, 2nd is gap
    ctx.beginPath();
    ctx.moveTo(fromCanvas.x, fromCanvas.y);
    ctx.lineTo(toCanvas.x, toCanvas.y);
    ctx.stroke();

    // Restore context state to prevent affecting other edges
    ctx.restore();
  };

  const createConnection = async (fromNode: string, toNode: string) => {
    if (!currentStoryWeb.value)
      return;

    // Hide temporary edge before starting
    tempEdge.value = null;
    if (currentNetwork.value) {
      toRaw(currentNetwork.value).redraw();
    }

    // Get node data for both nodes
    const fromNodeData = currentStoryWeb.value.nodes.find(n => n.uuid === fromNode);
    const toNodeData = currentStoryWeb.value.nodes.find(n => n.uuid === toNode);

    if (!fromNodeData || !toNodeData)
      throw new Error('Missing node data in storyWebStore.createConnection()');

    // reconfirm its legal
    if (!isValidConnection(fromNode, toNode))
      return;

    // Handle different connection types
    // custom connected to anything gets a custom edge
    if ([fromNodeData.type, toNodeData.type].includes(StoryWebNodeTypes.Custom)) {
      // Get label from user
      const label = await FCBDialog.inputDialog(
        localize('labels.storyWeb.addConnection'),
        localize('labels.storyWeb.newConnectionLabel'),
        ''
      );

      if (label === null) // User cancelled
        return;

      // Create the edge
      const edgeUuid = [fromNode, toNode].sort().join('|');
      currentStoryWeb.value.edges.push({
        uuid: edgeUuid,
        from: fromNode,
        to: toNode,
        label: label || ''
      });

      await currentStoryWeb.value.save();
      await mainStore.refreshStoryWeb();
      return;
    }

    // at this point, we know from/to are either both entries or an entry and danger
    if (fromNodeData.type === StoryWebNodeTypes.Danger || toNodeData.type === StoryWebNodeTypes.Danger) {
      // entry to danger connection
      const entryUuid = fromNodeData.type === StoryWebNodeTypes.Danger ? toNode : fromNode;
      const dangerUuid = fromNodeData.type === StoryWebNodeTypes.Danger ? fromNode : toNode;

      // Parse danger UUID to get front and danger index
      const [frontId, dangerIndex] = dangerUuid.split('|');
      const front = await Front.fromUuid(frontId);
      if (!front)
        throw new Error('Invalid front in storyWebStore.createConnection()');

      const danger = front.dangers[Number.parseInt(dangerIndex)];
      if (!danger)
        throw new Error('Invalid danger in storyWebStore.createConnection()');

      // note: if participant already existed there would have been a edge to the 
      //   danger so we would have already caught it

      // we're going to add with blank role because easy for user to add with another click
      // Add entry as participant to danger
      const entry = await Entry.fromUuid(entryUuid);
      if (!entry)
        throw new Error('Invalid entry in storyWebStore.createConnection()');

      // Update danger with new participant
      front.updateDanger(Number.parseInt(dangerIndex), {
        ...danger,
        participants: [...danger.participants, { uuid: entryUuid, role: '' }],
      });
      await front.save();

      await mainStore.refreshStoryWeb();
      return;
    } else {
      // entry to entry connection
      const fromEntry = await Entry.fromUuid(fromNode);
      const toEntry = await Entry.fromUuid(toNode);
      
      if (!fromEntry || !toEntry)
        throw new Error('Invalid entry in storyWebStore.createConnection()');
      
      // note: if relationship already existed there would have been a edge to the 
      //   there so we would have already caught it

      // we're going to create without a label, since it's easy for user to add a label in a second step
      // Use relationship store to connect them with proper field name
      await relationshipStore.addArbitraryRelationship(fromNode, toNode, {});
      await mainStore.refreshStoryWeb();
      return;
    }
  };

  ///////////////////////////////
  // private methods
  
  const onConnectionModeMouseMove = (event: MouseEvent) => {
    if (!tempEdge.value || !isConnectionMode.value || !currentNetwork.value || !currentContainer.value)
      return;

    const canvas = currentContainer.value.querySelector('canvas');
    if (!canvas)
      return;

    const rect = canvas.getBoundingClientRect();
    const domX = event.clientX - rect.left;
    const domY = event.clientY - rect.top;
    
    tempEdge.value.to = { x: domX, y: domY };

    // Check for node under cursor and highlight if valid target
    const nodeUnderCursor = toRaw(currentNetwork.value).getNodeAt({ x: domX, y: domY });
    
    if (nodeUnderCursor && connectionStartNode.value) {
      const isValid = isValidConnection(connectionStartNode.value, nodeUnderCursor as string);
      
      if (isValid && highlightedNode.value !== nodeUnderCursor) {
        // Clear previous highlight
        if (highlightedNode.value) {
          toRaw(currentNetwork.value).unselectAll();
        }
        // Highlight new valid node
        toRaw(currentNetwork.value).selectNodes([nodeUnderCursor as string]);
        highlightedNode.value = nodeUnderCursor as string;
      } else if (!isValid && highlightedNode.value) {
        // Clear highlight if hovering over invalid node or empty space
        toRaw(currentNetwork.value).unselectAll();
        highlightedNode.value = null;
      }
    } else if (highlightedNode.value) {
      // Clear highlight if hovering over empty space
      toRaw(currentNetwork.value).unselectAll();
      highlightedNode.value = null;
    }
    
    toRaw(currentNetwork.value).redraw();
  };

  const onConnectionModeClick = async (event: MouseEvent) => {
    if (!isConnectionMode.value || !connectionStartNode.value || !currentNetwork.value || !currentContainer.value || isCreatingConnection.value) {
      endConnectionMode();
      return;
    }

    const canvas = currentContainer.value.querySelector('canvas');
    if (!canvas)
      return;

    const rect = canvas.getBoundingClientRect();
    const domX = event.clientX - rect.left;
    const domY = event.clientY - rect.top;
    
    // Check if we clicked on a valid node
    const targetNodeId = toRaw(currentNetwork.value).getNodeAt({ x: domX, y: domY });
    
    if (targetNodeId && isValidConnection(connectionStartNode.value, targetNodeId as string)) {
      isCreatingConnection.value = true;
      await createConnection(connectionStartNode.value, targetNodeId as string);
      isCreatingConnection.value = false;
    }

    endConnectionMode();
  };

  const onConnectionModeKeydown = (event: KeyboardEvent) => {
    event.stopImmediatePropagation(); // make sure foundry doesn't handle it
    if (event.key === 'Escape') {
      endConnectionMode();
    }
  };

  const showNodeContextMenu = (nodeId: string, position: { x: number, y: number }) => {
    if (!currentContainer.value || !currentNetwork.value)
      return;

    // set selection to be the node so it's visually clear what's happening
    toRaw(currentNetwork.value).unselectAll();
    toRaw(currentNetwork.value).selectNodes([nodeId]);

    // Check if this is an entry node (not custom)
    const node = currentStoryWeb.value?.nodes.find(n => n.uuid === nodeId);
    const isDangerNode = node && node.type === StoryWebNodeTypes.Danger;
    const isEntryNode = node && [StoryWebNodeSource.Explicit, StoryWebNodeSource.Implicit].includes(node.source) && !isDangerNode;

    // Build menu items
    const menuItems = [
      {
        icon: 'fa-link',
        iconFontClass: 'fas',
        label: localize('contextMenus.storyWebGraph.addConnection'),
        onClick: async () => { await startConnectionMode(nodeId); }
      },
      {
        icon: 'fa-external-link-alt',
        iconFontClass: 'fas',
        label: localize('contextMenus.storyWebGraph.openEntryInNewTab'),
        onClick: async () => { await navigationStore.openEntry(nodeId, { newTab: true }); },
        hidden: !isEntryNode
      },
      {
        icon: 'fa-external-link-alt',
        iconFontClass: 'fas',
        label: localize('contextMenus.storyWebGraph.openDangerInNewTab'),
        onClick: async () => {
          const [frontId, dangerId] = nodeId.split('|'); 

          await navigationStore.openFront(frontId, { newTab: true, contentTabId: `danger${dangerId}`, forceTab: true }); 
        },
        hidden: !isDangerNode
      },
      {
        icon: 'fa-edit',
        iconFontClass: 'fas',
        label: localize('contextMenus.storyWebGraph.editText'),
        onClick: async () => { await editCustomNode(nodeId); },
        hidden: !node || node.source !== StoryWebNodeSource.Custom
      },
      {
        icon: 'fa-trash',
        iconFontClass: 'fas',
        label: isEntryNode ? localize('contextMenus.storyWebGraph.removeFromDiagram') : localize('contextMenus.storyWebGraph.delete'),
        onClick: async () => { await removeNode(nodeId); await mainStore.refreshStoryWeb(); }
      },
    ];

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: position.x,
      y: position.y,
      zIndex: 300,
      items: menuItems
    });
  }

  const showEdgeContextMenu = (edgeId: string, position: { x: number, y: number }) => {
    if (!currentContainer.value || !currentNetwork.value)
      return;

    // set selection to be the edge so it's visually clear what's happening
    toRaw(currentNetwork.value).unselectAll();
    toRaw(currentNetwork.value).selectEdges([edgeId]);

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: position.x,
      y: position.y,
      zIndex: 300,
      items: [
        {
          icon: 'fa-edit',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.editRelationship'),
          onClick: async () => { await editEdge(edgeId); await mainStore.refreshStoryWeb(); }
        },
        {
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.delete'),
          onClick: async () => { await removeEdge(edgeId); await mainStore.refreshStoryWeb(); }
        },
      ]
    });
  }

  /** shows the context menu for right click on empty space */
  /** @param position - position to place the node at - relative to canvas */
  const showBlankContextMenu = (menuPosition: { x: number, y: number }, canvasPosition: { x: number, y: number }) => {
    if (!currentContainer.value || !currentNetwork.value)
      return;

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: menuPosition.x,
      y: menuPosition.y,
      zIndex: 300,
      items: [
        {
          icon: 'fa-plus',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.addText'),
          onClick: async () => { await addCustomNode(canvasPosition); }
        },
        {
          icon: 'fa-diagram-project',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.addEntry'),
          onClick: async () => { await selectAndAddEntry(canvasPosition); }
        },
        {
          icon: 'fa-sitemap',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.addEntryWithRelationships'),
          onClick: async () => { await selectAndAddEntry(canvasPosition, true); }
        },
        {
          icon: 'fa-diagram-project',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.addDanger'),
          onClick: async () => { await selectAndAddDanger(canvasPosition, false); }
        },
        {
          icon: 'fa-sitemap',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.addDangerWithRelationships'),
          onClick: async () => { await selectAndAddDanger(canvasPosition, true); }
        },
      ]
    });
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
    addDanger,
    addFront,
    removeNode,
    removeEdge,
    handleDropOnNode,
  };
});

