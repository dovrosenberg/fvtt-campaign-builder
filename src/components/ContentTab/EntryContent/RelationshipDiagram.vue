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
      class="mermaid-diagram"
      v-html="diagramHtml"
    ></div>
    
    <div v-else-if="!loading" class="no-relationships-message">
      <p>{{ localize('labels.relationshipDiagram.noRelationshipsMessage') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// library imports
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import mermaid from 'mermaid';

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
const diagramHtml = ref<string>('');
const nodes = ref<RelationshipNode[]>([]);
const edges = ref<RelationshipEdge[]>([]);

///////////////////////////////
// computed data
const nodeCount = computed(() => nodes.value.length);

///////////////////////////////
// methods
const initializeMermaid = () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    themeVariables: {
      primaryColor: '#409EFF',
      primaryTextColor: '#303133',
      primaryBorderColor: '#409EFF',
      lineColor: '#909399',
      secondaryColor: '#E1F3D8',
      tertiaryColor: '#FCE4EC'
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis'
    }
  });
};

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
      return 'round'; // Rounded rectangle for characters
    case Topics.Location:
      return 'stadium'; // Stadium shape for locations
    case Topics.Organization:
      return 'hexagon'; // Hexagon for organizations
    case Topics.PC:
      return 'diamond'; // Diamond for PCs
    default:
      return 'rect'; // Rectangle for unknown
  }
};

const sanitizeName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
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

const generateMermaidDiagram = (): string => {
  if (nodes.value.length === 0) {
    return '';
  }

  let mermaidCode = 'flowchart TD; ';
  
  // Define node styles
  const topicColors = new Map<Topics, string>();
  nodes.value.forEach(node => {
    const color = getTopicColor(node.topic);
    topicColors.set(node.topic, color);
  });

  // Add nodes with styling
  nodes.value.forEach(node => {
    const shape = getTopicShape(node.topic);
    const color = getTopicColor(node.topic);
    const sanitizedName = sanitizeName(node.name);
    const topicLabel = node.type || Topics[node.topic];
    
    // Create styled node definition
    mermaidCode += `    ${node.id}["${node.name}<br/><small>${topicLabel}</small>"]:::${topicLabel};\n `;
  });

  // mermaidCode += '\n';

  // Add edges with labels
  edges.value.forEach(edge => {
    const label = edge.label ? `---|${edge.label}|` : '---';
    mermaidCode += `    ${edge.from} ${label} ${edge.to};\n `;
  });

  // mermaidCode += '\n';

  // Add style definitions
  topicColors.forEach((color, topic) => {
    const topicLabel = Topics[topic];
    mermaidCode += `    classDef ${topicLabel} fill:${color},stroke:#333,stroke-width:2px,color:#fff;\n`;
  });

  return mermaidCode;
};

const renderDiagram = async () => {
  if (nodes.value.length === 0) {
    diagramHtml.value = '';
    return;
  }

  try {
    const mermaidCode = generateMermaidDiagram();
    const { svg } = await mermaid.render('relationship-diagram-svg', mermaidCode);
    diagramHtml.value = svg;
  } catch (error) {
    console.error('Error rendering mermaid diagram:', error);
    diagramHtml.value = `<p class="error">${localize('errors.diagramRenderError')}</p>`;
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
  initializeMermaid();
  await refreshDiagram();
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

.mermaid-diagram {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1rem;
  margin: 0 1rem 1rem 1rem;
  background: var(--color-background);
  width: calc(100% - 2rem);
  
  :deep(svg) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }
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
