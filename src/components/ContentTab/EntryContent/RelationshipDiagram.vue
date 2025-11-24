<template>
  <div class="relationship-diagram-container">
    <div class="diagram-controls flexrow">
      <div class="diagram-info">
        <span v-if="loading">{{ localize('common.loading') }}...</span>
        <span v-else-if="nodeCount > 0">
          {{ localize('labels.relationshipDiagram.showingNodes', { count: nodeCount }) }}
        </span>
        <span v-else>{{ localize('labels.relationshipDiagram.noRelationships') }}</span>
      </div>
    </div>
    
    <div 
      v-if="nodeCount > 0" 
      ref="diagramRef" 
      class="cytoscape-diagram"
    ></div>
    
    <div v-else-if="!loading" class="no-relationships-message">
      <p>{{ localize('labels.relationshipDiagram.noRelationshipsMessage') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// library imports
import { ref, computed, watch, onMounted, onUnmounted, nextTick, toRaw } from 'vue';

// @ts-ignore - Cytoscape doesn't have perfect TypeScript definitions
const cytoscape = require('cytoscape');

// local imports
import { localize } from '@/utils/game';
import { useMainStore, useRelationshipStore } from '@/applications/stores';
import { Entry } from '@/classes';
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
const cy = ref<any | null>(null); // Use any to avoid complex type issues
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
      return 'hexagon'; // Hexagon for organizations
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

const renderCytoscapeDiagram = async () => {
  if (!diagramRef.value || nodes.value.length === 0) {
    return;
  }

  try {
    // Destroy existing instance if it exists
    if (cy.value) {
      cy.value.destroy();
      cy.value = null;
    }

    // Convert nodes and edges to plain JavaScript objects (avoid Vue reactivity)
    const rawNodes = toRaw(nodes.value);
    const rawEdges = toRaw(edges.value);

    const cytoscapeNodes = rawNodes.map(node => ({
      data: {
        id: node.id,
        name: node.name,
        topic: node.topic,
        type: node.type,
        color: getTopicColor(node.topic)
      }
    }));

    const cytoscapeEdges = rawEdges.map(edge => ({
      data: {
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        label: edge.label || ''
      }
    }));

    // Create cytoscape instance with plain objects
    cy.value = cytoscape({
      container: diagramRef.value,
      
      elements: [
        ...cytoscapeNodes,
        ...cytoscapeEdges
      ],

      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(name)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#ffffff',
            'text-outline-color': '#000000',
            'text-outline-width': 2,
            'font-size': '12px',
            'font-weight': 'bold',
            'width': '80px',
            'height': '80px',
            'shape': 'round-rectangle',
            'border-width': 2,
            'border-color': '#333333',
            'text-wrap': 'wrap',
            'text-max-width': '80px'
          }
        },
        {
          selector: 'node[topic = "organization"]',
          style: {
            'shape': 'hexagon'
          }
        },
        {
          selector: 'node[topic = "pc"]',
          style: {
            'shape': 'diamond'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#666666',
            'target-arrow-color': '#666666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'color': '#333333',
            'text-rotation': 'autorotate',
            'text-margin-y': -10
          }
        },
        {
          selector: 'edge[label = ""]',
          style: {
            'label': ''
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#FFD700'
          }
        }
      ],

      layout: {
        name: 'cose',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 50,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      }
    });

    // Add interaction handlers
    cy.value.on('tap', 'node', (evt: any) => {
      const node = evt.target;
      console.log('Tapped node:', node.data('name'));
    });

  } catch (error) {
    console.error('Error rendering cytoscape diagram:', error);
    // Fallback to simple error message
    if (diagramRef.value) {
      diagramRef.value.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Error loading diagram. Please check console for details.</div>';
    }
  }
};

const refreshDiagram = async () => {
  await extractRelationships();
  await renderCytoscapeDiagram();
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
  // Clean up cytoscape instance to prevent memory leaks
  if (cy.value) {
    cy.value.destroy();
    cy.value = null;
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

.cytoscape-diagram {
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
