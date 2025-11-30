// this store handles activities specific to campaigns
//
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref, toRaw, } from 'vue';
import type { Edge, Network, Node } from 'vis-network';

// local imports
import { useMainStore, useRelationshipStore, useNavigationStore } from '@/applications/stores';
import { nodeTypeToTopic, } from '@/utils/misc';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';

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
import { Danger, FrontFilterIndex, RelatedEntryDetails, StoryWebNodeSource, StoryWebNodeTypes, Topics } from '@/types';
import { Campaign, Entry, Front } from '@/classes';

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
    color: 'hsl(164, 48%, 20%)',  // light mode fcb-primary
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
                  ...(label ? edgeWithLabelConfig : edgeConfig)
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
                  ...(label ? edgeWithLabelConfig : edgeConfig)
                });
              }
            }
          }
        }
      }
      
      const options = {
        configure: false,  // change to 'physics' to get a physics config panel
        // @ts-ignore
        physics: window.fcbStoryWebPhysics,
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
    if (!currentStoryWeb.value)
      return;

    // confirm
    const nodes = toRaw(currentNetwork.value)?.getConnectedNodes(edgeId) as string[];

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

    // if either edge was implicit, remove that one too
    if (node1?.source === StoryWebNodeSource.Implicit)
      await removeNode(node1.uuid);
    if (node2?.source === StoryWebNodeSource.Implicit)
      await removeNode(node2.uuid);
  
    // remove from the web if it was a manual edge
    currentStoryWeb.value.edges = currentStoryWeb.value.edges.filter(e => e.uuid !== edgeId);
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

  const editCustomNode = async (nodeId: string) => {
    // make sure it's a manual one
    const node = currentStoryWeb.value?.nodes.find(n => n.uuid === nodeId);
    if (!node || node.source !== StoryWebNodeSource.Custom)
      return;

    const newText = await getText(localize('labels.storyWeb.editText'), localize('labels.storyWeb.enterText'), node.label || ''); 
    if (!newText)
      return;

    node.label = newText;
    await currentStoryWeb.value?.save();
    await mainStore.refreshStoryWeb();
  }

  const onNetworkDoubleClick = async (eventInfo: NetworkClickEventInfo) => {
    // nodes is a list of nodes clicked on
    // edges is either edges clicked on or could be edges connected to nodes clicked
    const { nodes, edges, pointer } = eventInfo;
    
    // see what we clicked on
    if (nodes.length > 0) {
      await editCustomNode(nodes[0]);
    } else if (edges.length > 0) {

    } else {
      await addCustomNode(pointer.canvas);
      await mainStore.refreshStoryWeb();
    }
  }

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

          await navigationStore.openFront(frontId, { newTab: true, contentTabId: `danger${dangerId}` }); 
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
    removeNode,
    removeEdge,
  };
});

