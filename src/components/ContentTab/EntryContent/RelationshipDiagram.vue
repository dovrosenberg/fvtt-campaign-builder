<template>
  <div class="relationship-diagram-container">
    <div class="diagram-controls flexrow">
      <div class="diagram-info">
        <span v-if="loading">{{ localize('common.loading') }}...</span>
        <span v-else-if="nodeCount > 0">
          <!-- {{ localize('labels.relationshipDiagram.showingNodes') }} -->
        </span>
        <span v-else>{{ localize('labels.relationshipDiagram.noRelationships') }}</span>
      </div>
    </div>
    
    <div 
      v-if="nodeCount > 0" 
      ref="diagramRef" 
      class="relationship-diagram"
    ></div>
    
    <div v-else-if="!loading" class="no-relationships-message">
      <p>{{ localize('labels.relationshipDiagram.noRelationshipsMessage') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// library imports
import { ref, computed, watch, onMounted, onUnmounted, nextTick, toRaw } from 'vue';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

// local imports
import { localize } from '@/utils/game';
import { useMainStore, useRelationshipStore } from '@/applications/stores';
import { Topics } from '@/types';

// types
interface RelationshipNode {
  id: string;
  name: string;
  topic: Topics;
  type: string;
}

interface RelationshipEdge {
  from: string;
  to: string;
  label: string;
}

///////////////////////////////
// props

///////////////////////////////
// emits

///////////////////////////////
// store
const mainStore = useMainStore();
const relationshipStore = useRelationshipStore();
const { currentEntry } = mainStore;

///////////////////////////////
// data
const diagramRef = ref<HTMLElement | null>(null);
const loading = ref<boolean>(false);
const network = ref<Network | null>(null);
const nodes = ref<RelationshipNode[]>([]);
const edges = ref<RelationshipEdge[]>([]);

///////////////////////////////
// computed data
const nodeCount = computed(() => nodes.value.length);

///////////////////////////////
// methods
const getTopicColor = (topic: Topics): string => {
  switch (topic) {
    case Topics.Character:
      return '#FF6B6B'; // Red for characters
    case Topics.Location:
      return '#4ECDC4'; // Teal for locations  
    case Topics.Organization:
      return '#45B7D1'; // Blue for organizations
    case Topics.PC:
      return '#96CEB4'; // Green for PCs
    default:
      return '#95A5A6'; // Gray for unknown
  }
};

const getTopicShape = (topic: Topics): string => {
  switch (topic) {
    case Topics.Character:
      return 'round-rectangle'; // Rounded rectangle for characters
    case Topics.Location:
      return 'round-rectangle'; // Stadium shape for locations
    case Topics.Organization:
      return 'round-rectangle'; // Hexagon for organizations
    case Topics.PC:
      return 'diamond'; // Diamond for PCs
    default:
      return 'rectangle'; // Rectangle for unknown
  }
};

const extractRelationships = async () => {
  if (!currentEntry) {
    nodes.value = [];
    edges.value = [];
    return;
  }

  loading.value = true;
  nodes.value = [];
  edges.value = [];

  try {
    // Add the current entry as the central node
    const centralNode: RelationshipNode = {
      id: currentEntry.uuid,
      name: currentEntry.name || 'Unknown',
      topic: currentEntry.topic,
      type: currentEntry.type || ''
    };
    nodes.value.push(centralNode);

    // Get all relationships for the current entry
    const relationshipTopics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC];
    
    for (const topic of relationshipTopics) {
      const relationships = await relationshipStore.getRelationships(topic);
      
      for (const relationship of relationships) {
        // Add the related entry as a node
        const relatedNode: RelationshipNode = {
          id: relationship.uuid,
          name: relationship.name || 'Unknown',
          topic: relationship.topic,
          type: relationship.type || ''
        };
        
        // Avoid duplicate nodes
        if (!nodes.value.find(n => n.id === relatedNode.id)) {
          nodes.value.push(relatedNode);
        }

        // Add the relationship edge
        let label = '';
        if (relationship.extraFields) {
          if (relationship.extraFields.relationship) {
            label = relationship.extraFields.relationship;
          } else if (relationship.extraFields.role) {
            label = relationship.extraFields.role;
          }
        }

        const edge: RelationshipEdge = {
          from: currentEntry.uuid,
          to: relationship.uuid,
          label: label
        };
        
        // Avoid duplicate edges
        const existingEdge = edges.value.find(e => 
          (e.from === edge.from && e.to === edge.to) || 
          (e.from === edge.to && e.to === edge.from)
        );
        
        if (!existingEdge) {
          edges.value.push(edge);
        }
      }
    }
  } catch (error) {
    console.error('Error extracting relationships:', error);
  } finally {
    loading.value = false;
  }
};

const renderDiagram = async () => {
  if (!diagramRef.value || nodes.value.length === 0) {
    return;
  }

  try {
    // Destroy existing network if it exists
    if (network.value) {
      network.value.destroy();
      network.value = null;
    }

    // Convert nodes and edges to plain JavaScript objects (avoid Vue reactivity)
    const rawNodes = toRaw(nodes.value);
    const rawEdges = toRaw(edges.value);

    // Create vis.js dataset for nodes
    const visNodes = new DataSet(rawNodes.map(node => ({
      id: node.id,
      label: node.name,
      color: {
        background: getTopicColor(node.topic),
        border: '#333333',
        highlight: {
          background: getTopicColor(node.topic),
          border: '#FFD700'
        }
      },
      shape: getTopicShape(node.topic),
      font: {
        color: '#ffffff',
        size: 12,
        face: 'arial',
        strokeWidth: 0,
        // strokeColor: '#000000'
      },
      borderWidth: 2,
      borderWidthSelected: 4,
      margin: 10
    })));

    // Create vis.js dataset for edges
    const visEdges = new DataSet(rawEdges.map(edge => ({
      id: `${edge.from}-${edge.to}`,
      from: edge.from,
      to: edge.to,
      label: edge.label || '',
      color: {
        color: '#666666',
        highlight: '#409EFF'
      },
      width: 2,
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.8
        }
      },
      font: {
        color: '#333333',
        size: 10,
        strokeWidth: 2,
        strokeColor: '#ffffff'
      },
      smooth: {
        enabled: true,
        type: 'curvedCW',
        roundness: 0.2
      }
    })));

    // Create vis.js network
    const data = {
      nodes: visNodes,
      edges: visEdges
    };

    const options = {
      layout: {
        hierarchical: {
          enabled: false
        },
        improvedLayout: true
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -8000,
          centralGravity: 0.3,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.1
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true
      },
      nodes: {
        shape: 'box',
        scaling: {
          min: 20,
          max: 30
        }
      },
      edges: {
        scaling: {
          min: 1,
          max: 3
        }
      }
    };

    network.value = new Network(diagramRef.value, data, options);

    // Add click handler
    network.value.on('click', (params: any) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = rawNodes.find(n => n.id === nodeId);
        if (node) {
          console.log('Clicked node:', node.name);
        }
      }
    });

  } catch (error) {
    console.error('Error rendering vis.js network:', error);
    // Fallback to simple error message
    if (diagramRef.value) {
      diagramRef.value.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Error loading diagram. Please check console for details.</div>';
    }
  }
};

const refreshDiagram = async () => {
  await extractRelationships();
  await renderDiagram();
};

///////////////////////////////
// watchers
watch(() => currentEntry?.uuid, async () => {
  await refreshDiagram();
});

///////////////////////////////
// lifecycle events
onMounted(async () => {
  await refreshDiagram();
});

onUnmounted(() => {
  // Clean up vis.js network instance to prevent memory leaks
  if (network.value) {
    network.value.destroy();
    network.value = null;
  }
});
</script>

<style lang="scss" scoped>
.relationship-diagram-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.diagram-controls {
  margin-bottom: 1rem;
  align-items: center;
  gap: 1rem;
  padding: 0 1rem;
}

.diagram-info {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.relationship-diagram {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  margin: 0 1rem 1rem 1rem;
  background: var(--color-background);
  width: calc(100% - 2rem);
  height: 500px;
  min-height: 400px;
}

.no-relationships-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-text-secondary);
  margin: 0 1rem 1rem 1rem;
  
  p {
    font-size: 1rem;
    margin: 0;
  }
}

.error {
  color: var(--color-error);
  text-align: center;
  padding: 1rem;
}
</style>
