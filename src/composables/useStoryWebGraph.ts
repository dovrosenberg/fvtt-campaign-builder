import { ref, reactive } from 'vue';
import { Network, Edge, Node, Options } from 'vis-network';
import { StoryWeb, Entry } from '@/classes';
import { localize } from '@/utils/game';

interface GraphNode extends Node {
  id: string;
  label: string;
  type: 'character' | 'location' | 'organization' | 'pc' | 'front' | 'danger' | 'custom';
  entryUuid?: string;
  shape: 'box' | 'dot' | 'diamond' | 'custom';
  color: {
    background: string;
    border: string;
    highlight?: {
      background: string;
      border: string;
    };
    hover?: {
      background: string;
      border: string;
    };
  };
  font?: {
    color: string;
    size: number;
  };
  x?: number;
  y?: number;
}

interface GraphEdge extends Edge {
  id: string;
  from: string;
  to: string;
  label: string;
  custom: boolean;
  color?: {
    color: string;
    highlight: string;
    hover: string;
  };
  font?: {
    color: string;
    size: number;
    background: string;
  };
}

interface CustomNodeData {
  label: string;
  description?: string;
}

export function useStoryWebGraph() {
  // Reactive state
  const network = ref<Network | null>(null);
  const nodes = ref<GraphNode[]>([]);
  const edges = ref<GraphEdge[]>([]);
  const currentStoryWeb = ref<StoryWeb | null>(null);

  // Node type configurations
  const nodeTypeConfig = {
    character: { color: '#3498db', shape: 'box' },
    location: { color: '#2ecc71', shape: 'box' },
    organization: { color: '#9b59b6', shape: 'box' },
    pc: { color: '#e74c3c', shape: 'box' },
    front: { color: '#f39c12', shape: 'box' },
    danger: { color: '#e67e22', shape: 'box' },
    custom: { color: '#ff6b6b', shape: 'diamond' }
  };

  // Initialize the graph
  const initializeGraph = async (container: HTMLElement, storyWeb: StoryWeb) => {
    currentStoryWeb.value = storyWeb;

    // Load existing graph data
    await loadGraphData(storyWeb);

    // Network options
    const options: Options = {
      nodes: {
        shape: 'box',
        borderWidth: 2,
        borderWidthSelected: 3,
        font: {
          color: '#ffffff',
          size: 14,
          face: 'arial'
        }
      },
      edges: {
        width: 2,
        color: {
          color: '#848484',
          highlight: '#2a7fff',
          hover: '#2a7fff'
        },
        font: {
          color: '#343434',
          size: 12,
          background: '#ffffff',
          strokeWidth: 3,
          strokeColor: '#ffffff'
        },
        smooth: {
          type: 'dynamic'
        },
        shadow: true
      },
      physics: {
        stabilization: {
          enabled: true,
          iterations: 200
        },
        barnesHut: {
          gravitationalConstant: -8000,
          centralGravity: 0.3,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        dragNodes: true
      }
    };

    // Create network
    network.value = new Network(container, {
      nodes: nodes.value,
      edges: edges.value
    }, options);

    // Add event listeners
    setupEventListeners();

    // Return the network instance for external integration
    return network.value;
  };

  // Load existing graph data from story web
  const loadGraphData = async (storyWeb: StoryWeb) => {
    // Clear existing data
    nodes.value = [];
    edges.value = [];

    // Load nodes from story web config
    if (storyWeb.config.nodes) {
      const graphNodes: GraphNode[] = storyWeb.config.nodes.map(node => ({
        ...node,
        color: {
          background: nodeTypeConfig[node.type].color,
          border: darkenColor(nodeTypeConfig[node.type].color),
          highlight: {
            background: lightenColor(nodeTypeConfig[node.type].color),
            border: nodeTypeConfig[node.type].color
          },
          hover: {
            background: lightenColor(nodeTypeConfig[node.type].color),
            border: nodeTypeConfig[node.type].color
          }
        },
        font: {
          color: '#ffffff',
          size: 14
        }
      }));

      nodes.value.push(...graphNodes);
    }

    // Load edges from story web config
    if (storyWeb.config.edges) {
      const graphEdges: GraphEdge[] = storyWeb.config.edges.map(edge => ({
        ...edge,
        color: {
          color: edge.custom ? '#ff6b6b' : '#848484',
          highlight: edge.custom ? '#ff5252' : '#2a7fff',
          hover: edge.custom ? '#ff5252' : '#2a7fff'
        }
      }));

      edges.value.push(...graphEdges);
    }
  };

  // Add an entry to the graph
  const addEntryToGraph = async (entryUuid: string, entryType: string) => {
    if (!currentStoryWeb.value) return;

    try {
      // Load the entry to get its details
      const entry = await Entry.fromUuid(entryUuid);
      if (!entry) return;

      // Check if already in graph
      if (nodes.value.find(node => node.id === entryUuid)) {
        console.log('Entry already in graph');
        return;
      }

      // Create node
      const nodeId = entryUuid;
      const node: GraphNode = {
        id: nodeId,
        label: entry.name,
        type: entryType as any,
        entryUuid: entryUuid,
        shape: nodeTypeConfig[entryType as keyof typeof nodeTypeConfig]?.shape || 'box',
        source: 'manual', // Default source for entry-based nodes
        color: {
          background: nodeTypeConfig[entryType as keyof typeof nodeTypeConfig]?.color || '#808080',
          border: darkenColor(nodeTypeConfig[entryType as keyof typeof nodeTypeConfig]?.color || '#808080'),
          highlight: {
            background: lightenColor(nodeTypeConfig[entryType as keyof typeof nodeTypeConfig]?.color || '#808080'),
            border: nodeTypeConfig[entryType as keyof typeof nodeTypeConfig]?.color || '#808080'
          },
          hover: {
            background: lightenColor(nodeTypeConfig[entryType as keyof typeof nodeTypeConfig]?.color || '#808080'),
            border: nodeTypeConfig[entryType as keyof typeof nodeTypeConfig]?.color || '#808080'
          }
        },
        font: {
          color: '#ffffff',
          size: 14
        }
      };

      // Add to graph
      nodes.value.push(node);

      // Add to manually added items
      await currentStoryWeb.value.addManuallyAddedItem(nodeId);

      // Load and add first-degree relationships
      await addRelationshipsToGraph(entry);

    } catch (error) {
      console.error('Failed to add entry to graph:', error);
    }
  };

  // Add relationships for an entry
  const addRelationshipsToGraph = async (entry: Entry) => {
    if (!currentStoryWeb.value) return;

    try {
      // Get relationships from the entry
      const relationships = entry.relationships || [];

      for (const relationship of relationships) {
        const relatedEntryUuid = relationship.targetUuid;
        
        // Skip if related entry is not in graph and not manually added
        if (!nodes.value.find(node => node.id === relatedEntryUuid) && 
            !currentStoryWeb.value.manuallyAddedItems.includes(relatedEntryUuid)) {
          continue;
        }

        // Check if edge already exists
        const existingEdge = edges.value.find(edge => 
          (edge.from === entry.uuid && edge.to === relatedEntryUuid) ||
          (edge.from === relatedEntryUuid && edge.to === entry.uuid)
        );

        if (existingEdge) continue;

        // Create edge
        const edgeId = foundry.utils.randomID(16);
        const edge: GraphEdge = {
          id: edgeId,
          from: entry.uuid,
          to: relatedEntryUuid,
          label: relationship.relationship || '',
          custom: false,
          color: {
            color: '#848484',
            highlight: '#2a7fff',
            hover: '#2a7fff'
          }
        };

        edges.value.push(edge);

        // If related entry is not in graph but should be shown via relationship
        if (!nodes.value.find(node => node.id === relatedEntryUuid)) {
          const relatedEntry = await Entry.fromUuid(relatedEntryUuid);
          if (relatedEntry) {
            const relatedNode: GraphNode = {
              id: relatedEntryUuid,
              label: relatedEntry.name,
              type: relatedEntry.type as any,
              entryUuid: relatedEntryUuid,
              shape: 'dot', // Different shape for relationship nodes
              color: {
                background: lightenColor(nodeTypeConfig[relatedEntry.type as keyof typeof nodeTypeConfig]?.color || '#808080'),
                border: nodeTypeConfig[relatedEntry.type as keyof typeof nodeTypeConfig]?.color || '#808080',
                highlight: {
                  background: nodeTypeConfig[relatedEntry.type as keyof typeof nodeTypeConfig]?.color || '#808080',
                  border: darkenColor(nodeTypeConfig[relatedEntry.type as keyof typeof nodeTypeConfig]?.color || '#808080')
                },
                hover: {
                  background: nodeTypeConfig[relatedEntry.type as keyof typeof nodeTypeConfig]?.color || '#808080',
                  border: darkenColor(nodeTypeConfig[relatedEntry.type as keyof typeof nodeTypeConfig]?.color || '#808080')
                }
              },
              font: {
                color: '#ffffff',
                size: 12
              }
            };

            nodes.value.push(relatedNode);
          }
        }
      }
    } catch (error) {
      console.error('Failed to add relationships to graph:', error);
    }
  };

  // Add a custom node to the graph
  const addCustomNodeToGraph = async (nodeData: CustomNodeData): Promise<string> => {
    if (!currentStoryWeb.value) throw new Error('No story web loaded');

    const nodeId = foundry.utils.randomID(16);
    
    const node: GraphNode = {
      id: nodeId,
      label: nodeData.label,
      type: 'custom',
      shape: 'diamond',
      color: {
        background: nodeTypeConfig.custom.color,
        border: darkenColor(nodeTypeConfig.custom.color),
        highlight: {
          background: lightenColor(nodeTypeConfig.custom.color),
          border: nodeTypeConfig.custom.color
        },
        hover: {
          background: lightenColor(nodeTypeConfig.custom.color),
          border: nodeTypeConfig.custom.color
        }
      },
      font: {
        color: '#ffffff',
        size: 14
      }
    };

    // Add to graph
    nodes.value.push(node);

    // Add to story web custom nodes
    await currentStoryWeb.value.addCustomNode({
      id: nodeId,
      label: nodeData.label,
      description: nodeData.description,
      color: nodeTypeConfig.custom.color,
      x: 0,
      y: 0
    });

    return nodeId;
  };

  // Remove a node from the graph
  const removeNodeFromGraph = async (nodeId: string) => {
    if (!currentStoryWeb.value) return;

    // Remove from graph
    nodes.value = nodes.value.filter(node => node.id !== nodeId);
    
    // Remove connected edges
    const connectedEdges = edges.value.filter(edge => edge.from === nodeId || edge.to === nodeId);
    edges.value = edges.value.filter(edge => !connectedEdges.some(connected => connected.id === edge.id));

    // Remove from story web
    await currentStoryWeb.value.removeNode(nodeId);
  };

  // Update edge label
  const updateEdgeLabel = async (edgeId: string, newLabel: string) => {
    if (!currentStoryWeb.value) return;

    const edgeIndex = edges.value.findIndex(edge => edge.id === edgeId);
    if (edgeIndex === -1) return;

    // Update in graph
    edges.value[edgeIndex] = { ...edges.value[edgeIndex], label: newLabel };

    // Update edge in story web
    const updateEdge = async (edgeId: string, label: string) => {
      if (!currentStoryWeb.value) return;

      const storyWebEdge = currentStoryWeb.value.edges.find(edge => edge.id === edgeId);
      if (storyWebEdge) {
        storyWebEdge.label = label;
        await currentStoryWeb.value.save();
      }
    };

    await updateEdge(edgeId, newLabel);
  };

  // Get current graph data
  const getGraphData = () => {
    return {
      nodes: nodes.value,
      edges: edges.value
    };
  };

  // Setup event listeners
  const setupEventListeners = () => {
    if (!network.value) return;

    network.value.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        // Handle node click
        console.log('Node clicked:', nodeId);
      }
    });

    network.value.on('doubleClick', (params) => {
      if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        // Handle edge double-click for editing
        const newLabel = prompt('Enter relationship label:');
        if (newLabel !== null) {
          updateEdgeLabel(edgeId, newLabel);
        }
      }
    });

    network.value.on('oncontext', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        // Handle right-click for delete
        if (confirm('Remove this node and its connections?')) {
          removeNodeFromGraph(nodeId);
        }
      }
    });
  };

  // Helper functions for color manipulation
  const darkenColor = (color: string): string => {
    // Simple color darkening - in a real implementation, use a proper color library
    return color.replace('#', '#').replace(/([0-9a-fA-F]{2})/g, (match) => {
      const hex = parseInt(match, 16);
      const darkened = Math.floor(hex * 0.8);
      return darkened.toString(16).padStart(2, '0');
    });
  };

  const lightenColor = (color: string): string => {
    // Simple color lightening
    return color.replace('#', '#').replace(/([0-9a-fA-F]{2})/g, (match) => {
      const hex = parseInt(match, 16);
      const lightened = Math.floor(hex * 0.7 + 255 * 0.3);
      return lightened.toString(16).padStart(2, '0');
    });
  };

  return {
    network,
    nodes,
    edges,
    initializeGraph,
    addEntryToGraph,
    addCustomNodeToGraph,
    removeNodeFromGraph,
    updateEdgeLabel,
    getGraphData
  };
}
