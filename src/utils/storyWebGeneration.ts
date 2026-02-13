import { StoryWeb, Front, Entry, FCBJournalEntryPage, Campaign} from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';
import { Danger, RelatedEntryDetails, STORY_WEB_TO_CUSTOM_FIELD_MAP, StoryWebNodeSource, StoryWebNodeTypes, Topics } from '@/types';
import type { Edge, Node } from 'vis-network';
import SettingExportService from '@/utils/settingExport';
import { localize } from '@/utils/game';
import { nodeTypeToTopic } from '@/utils/misc';
import { replaceUUIDsInText } from '@/utils/sanitizeHtml';

/** Get styling for a node based on its color scheme, including nodeConfig[] */
const getNodeStyling = (storyWeb: StoryWeb, nodeId: string, nodeType: StoryWebNodeTypes): Partial<Node> => {
  if (!storyWeb.nodeStyles?.[nodeId]) {
    return nodeConfig[nodeType];
  }
  
  const colorSchemeId = storyWeb.nodeStyles[nodeId].colorSchemeId;
  const colorSchemes = ModuleSettings.get(SettingKey.storyWebCustomNodeColorSchemes);
  const colorScheme = colorSchemes.find(s => s.id === colorSchemeId);
  
  const colorSchemeObject = colorScheme ? {
    font: { color: colorScheme.foregroundColor },
    color: {
      border: colorScheme.foregroundColor,
      background: colorScheme.backgroundColor,
    },
  } : {};

  return {
    ...nodeConfig[nodeType],
    ...colorSchemeObject,
  };
};

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

const LINE_STYLES = {
  'solid': { name: 'Solid', pattern: false },
  'dashed': { name: 'Dashed', pattern: [6, 6] },
  'dotted': { name: 'Dotted', pattern: [1, 4] },
  'dash_dot': { name: 'Dash-Dot', pattern: [6, 4, 1, 4] },
  'long_dash': { name: 'Long Dash', pattern: [12, 6] },
  'dense_dot': { name: 'Dense Dot', pattern: [1, 2] },
};

const edgeConfig = {
}

// edges with labels are a bit longer 
const edgeWithLabelConfig = {
  ...edgeConfig,
  length: 150,
}

/** Some colors need to be different in dark mode but we can't use css variables in canvas.
 *   Instead we call then when we generate the graph to read the variables and set the right colors
 * 
 *  @param hasLabel - true if the edge has a label
 *  @param forceLightMode - true to force light mode colors (used for exports)
 */
const getEdgeConfig = (hasLabel: boolean, forceLightMode: boolean = false): Partial<Edge> => {
  // get the base
  const config: Partial<Edge> = hasLabel ? edgeWithLabelConfig : edgeConfig;

  // use some computed variables to set the right style
  config.color = getComputedStyle(document.body).getPropertyValue('--fcb-primary');

  if (!forceLightMode && document.body.classList.contains('theme-dark')) {
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

  // Add hover highlighting
  config.hoverWidth = (config.width || 1) * 3;

  return config;
}

/** Generate tooltip text for an edge based on its color and style */
const getEdgeTooltip = (storyWeb: StoryWeb, edgeUuid: string): HTMLElement | undefined => {
  const edgeStyles = storyWeb.edgeStyles?.[edgeUuid];
  if (!edgeStyles)
    return undefined;

  const tooltipParts: string[] = [];

  // Add color information
  if (edgeStyles.colorId) {
    const colors = ModuleSettings.get(SettingKey.storyWebConnectionColors) as { id: string; name: string; value: string }[];
    const colorOption = colors.find(c => c.id === edgeStyles.colorId);
    if (colorOption) {
      tooltipParts.push(`<strong>Color:</strong> ${colorOption.name}`);
    }
  }

  // Add style information
  if (edgeStyles.styleId) {
    const styles = ModuleSettings.get(SettingKey.storyWebConnectionStyles) as { id: string; name: string; value: string }[];
    const styleOption = styles.find(s => s.id === edgeStyles.styleId);
    if (styleOption) {
      tooltipParts.push(`<strong>Style:</strong> ${styleOption.name}`);
    }
  }

  if (tooltipParts.length === 0)
    return undefined;

  return createHTMLTooltip(tooltipParts.join('<br>'));
};

/** Generate a consistent UUID for an edge
 *  @param fromNode - The id of the first node
 *  @param toNode - The id of the second node
 *  @returns A consistent UUID for the edge
 */
const getEdgeUuid = (fromNode: string, toNode: string, edgeType: 'manual' | 'relationship' | 'danger'): string => {
  const sorted = [fromNode, toNode].sort();
  return `${edgeType}:${sorted[0]}|${sorted[1]}`;
};

/** Generate tooltip text for a node based on its content type and selected fields */
const getNodeTooltip = async (nodeId: string, nodeType: StoryWebNodeTypes): Promise<HTMLElement | undefined> => {
  // Get the selected fields for this content type
  const nodeFields = ModuleSettings.get(SettingKey.storyWebNodeFields) as Record<StoryWebNodeTypes, string[]>;
  const selectedFields = nodeFields[nodeType] || [];
  
  if (selectedFields.length === 0) {
    return undefined;
  }

  // Get the entry data
  let entryData: FCBJournalEntryPage<any> | Danger | null = null;
  let isDanger = false;

  if (nodeType === StoryWebNodeTypes.Danger) {
    isDanger = true;

    // For dangers, we need to extract the data from the front
    const [frontId, dangerIndex] = nodeId.split('|');
    const front = await Front.fromUuid(frontId);
    if (front && front.dangers[Number.parseInt(dangerIndex)]) {
      entryData = front.dangers[Number.parseInt(dangerIndex)];
    }
  } else {
    // For entries, get the entry document
    const entry = await Entry.fromUuid(nodeId);
    if (entry) {
      entryData = entry;
    }
  }
  
  if (!entryData) {
    return undefined;
  }

  // Build the tooltip from selected fields
  const tooltipParts: string[] = [];
  
  for (const fieldKey of selectedFields) {
    let value = '';
    
    // Handle danger-specific fields
    switch (fieldKey) {
      case 'name':
      case 'description':
      case 'type':
      case 'impendingDoom':
      case 'motivation':
        value = entryData[fieldKey] || '';
        break;
      case 'species':
        // need to get the species
        const speciesId = (entryData as Entry).speciesId;
        const allSpecies = ModuleSettings.get(SettingKey.speciesList);
        const species = allSpecies.find(s => s.id === speciesId);
        value = species?.name || '';
        break;
      case 'parent':
        // need to get the parent
        const entry = await Entry.fromUuid(nodeId);
        const parentId = await entry?.getParentId();
        if (!parentId)
          value = '';
        else {
          const parent = await Entry.fromUuid(parentId);
          value = parent?.name || '';
        }
        break;
      default:
        // Check custom fields (note: no support for custom fields on dangers
        if (isDanger)
          break;

        if ((entryData as FCBJournalEntryPage<any>).customFields && (entryData as FCBJournalEntryPage<any>).getCustomField(fieldKey)) {
          const tempValue = (entryData as FCBJournalEntryPage<any>).getCustomField(fieldKey);

          // if it's a boolean, convert to yes/no
          if (typeof tempValue === 'boolean')
            value = localize(tempValue ? 'labels.yes' : 'labels.no');
          else
            value = tempValue || '';
        }
        break;
    }
    
    // Get the field name for display
    const allFields = getAllFieldsForContentType(nodeType);
    const field = allFields.find(f => f.key === fieldKey);
    const fieldName = field ? field.name : fieldKey;
    
    // Add to tooltip if value exists
    if (value && value.trim()) {
      // Replace UUIDs in the value with their names
      value = await replaceUUIDsInText(value);
      
      // Strip HTML tags from the value
      value = value.replace(/<[^>]*>/g, '');
      
      // Truncate long values
      const maxLength = 200;
      if (value.length > maxLength) {
        value = value.substring(0, maxLength) + '...';
      }
      tooltipParts.push(`<strong>${fieldName}:</strong> ${value}`);
    }
  }
  if (tooltipParts.length === 0)
    return undefined;
  
  // need to put into a tag
  return createHTMLTooltip(tooltipParts.join('<br>'));
};

const createHTMLTooltip = (text: string): HTMLElement => {
  const container = document.createElement('div');
  container.innerHTML = text;
  return container;
}

/** Apply edge styles from the story web to an edge configuration */
const getEdgeStyling = (storyWeb: StoryWeb, edgeUuid: string): Partial<Edge> => {
  let edgeStyles = storyWeb.edgeStyles?.[edgeUuid];

  // Backward compatibility: check for old unprefixed format if new format not found and this is a manual edge
  if (!edgeStyles && edgeUuid.startsWith('manual:')) {
    const oldEdgeUuid = edgeUuid.replace('manual:', '');
    edgeStyles = storyWeb.edgeStyles?.[oldEdgeUuid];
    
    // If found with old format, migrate it to new format
    if (edgeStyles && storyWeb.edgeStyles) {
      storyWeb.edgeStyles[edgeUuid] = edgeStyles;
      delete storyWeb.edgeStyles[oldEdgeUuid];
    }
  }

  if (!edgeStyles) {
    return {};
  }

  const styledEdge = {} as Partial<Edge>;

  // Apply color if specified
  if (edgeStyles.colorId) {
    const colors = ModuleSettings.get(SettingKey.storyWebConnectionColors) as { id: string; name: string; value: string }[];

    const colorOption = colors.find(c => c.id === edgeStyles.colorId);
    if (colorOption) {
      styledEdge.color = colorOption.value;
    }
  }

  // Apply style if specified
  if (edgeStyles.styleId) {
    const styles = ModuleSettings.get(SettingKey.storyWebConnectionStyles) as { id: string; name: string; value: string }[];
    const styleOption = styles.find(s => s.id === edgeStyles.styleId);
    if (styleOption) {
      styledEdge.dashes = LINE_STYLES[styleOption.value]?.pattern || false;
    }
  }

  return styledEdge;
};

/** Get all available fields for a content type (hardcoded + custom) */
const getAllFieldsForContentType = (contentType: StoryWebNodeTypes): { key: string; name: string }[] => {
  const fields = [] as { key: string; name: string }[];
  
  // Hard-coded fields for each content type
  const hardcodedFields: Partial<Record<StoryWebNodeTypes, { key: string; name: string }[]>> = {
    [StoryWebNodeTypes.Character]: [
      { key: 'name', name: 'Name' },
      { key: 'type', name: 'Type' },
      { key: 'description', name: 'Description' },
      { key: 'gmNotes', name: 'GM Notes' },
    ],
    [StoryWebNodeTypes.Location]: [
      { key: 'name', name: 'Name' },
      { key: 'type', name: 'Type' },
      { key: 'description', name: 'Description' },
      { key: 'gmNotes', name: 'GM Notes' },
    ],
    [StoryWebNodeTypes.Organization]: [
      { key: 'name', name: 'Name' },
      { key: 'type', name: 'Type' },
      { key: 'description', name: 'Description' },
      { key: 'gmNotes', name: 'GM Notes' },
    ],
    [StoryWebNodeTypes.PC]: [
      { key: 'name', name: 'Name' },
      { key: 'type', name: 'Type' },
      { key: 'description', name: 'Description' },
      { key: 'gmNotes', name: 'GM Notes' },
    ],
    [StoryWebNodeTypes.Danger]: [
      { key: 'name', name: 'Name' },
      { key: 'description', name: 'Description' },
      { key: 'type', name: 'Type' },
      { key: 'impulse', name: 'Impulse' },
      { key: 'cast', name: 'Cast' },
      { key: 'moves', name: 'Moves' },
    ],
    // Custom nodes don't have configurable fields
  };
  
  fields.push(...(hardcodedFields[contentType] || []));
  
  // Add custom fields if available
  const customFields = ModuleSettings.get(SettingKey.customFields) as Record<string, any[]>;
  const customContentType = STORY_WEB_TO_CUSTOM_FIELD_MAP[contentType];
  
  if (customContentType && customFields && customFields[customContentType]) {
    customFields[customContentType].forEach((field: any) => {
      if (!fields.find(f => f.key === field.name)) {
        fields.push({
          key: field.name,
          name: field.label || field.name,
        });
      }
    });
  }
  
  return fields;
};

/** 
 * Generate network data (nodes and edges) for vis-network
 * @param storyWeb - The story web to generate data for
 * @param forExport - true if this is being generated for export (i.e. PNG); impacts colors (default false)
 * 
 * @returns Object containing nodes and edges arrays
 */
const generateNetworkData = async (storyWeb: StoryWeb, forExport: boolean = false): Promise<{ nodes: Node[], edges: Edge[] }> => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const setting = await storyWeb.getSetting();

  // load all the fronts so we have them to reference
  let fronts: Front[] = [];
  for (const campaignIdx of setting.campaignIndex) {
    const campaign = await Campaign.fromUuid(campaignIdx.uuid);
    if (!campaign)
      continue;
    
    fronts = fronts.concat(await campaign.allFronts());
  }

  // add the explicit nodes
  for (const node of storyWeb.nodes) {
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

        const positionInfo = storyWeb.positions?.[node.uuid] || {};            
        const format = node.source === StoryWebNodeSource.Explicit ? explicitNodeFormat : implicitNodeFormat;
        const nodeTooltip = await getNodeTooltip(node.uuid, StoryWebNodeTypes.Danger);
        const nodeStyling = getNodeStyling(storyWeb, node.uuid, StoryWebNodeTypes.Danger);
        nodes.push({
          ...format,
          id: node.uuid,
          label: `${danger.name}\n(${front.name})`,
          title: nodeTooltip,
          ...positionInfo,
          ...nodeStyling,
        });
      } else {
        // if an entry, we need the topic
        const topic = nodeTypeToTopic(node.type);
        if (topic !== null) {
          const index = setting.topics[topic]?.entries.find(e => e.uuid === node.uuid);

          if (!index)
            continue;

          const positionInfo = storyWeb.positions?.[index.uuid] || {};
          
          const format = node.source === StoryWebNodeSource.Explicit ? explicitNodeFormat : implicitNodeFormat;
          const nodeTooltip = await getNodeTooltip(index.uuid, node.type);

          const nodeStyling = getNodeStyling(storyWeb, index.uuid, node.type);
          nodes.push({
            ...format,
            id: index.uuid,
            label: `${index.name}${index.type ? `\n(${index.type})` : ''}`,
            title: nodeTooltip,
            ...positionInfo,
            ...nodeStyling,
          });
        }
      }
    } else if (node.type === StoryWebNodeTypes.Custom) {
      const positionInfo = storyWeb.positions?.[node.uuid] || {};
      const nodeStyling = getNodeStyling(storyWeb, node.uuid, StoryWebNodeTypes.Custom);
      nodes.push({
        ...customNodeFormat,
        id: node.uuid,
        label: node.label || '',
        ...positionInfo,
        ...nodeStyling,
      });
    }
  }

  const edgeConfig = getEdgeConfig(false, forExport);
  const edgeWithLabelConfig = getEdgeConfig(true, forExport);

  // add each of the connections
  const topics = [Topics.Character, Topics.Location, Topics.Organization, Topics.PC];
  for (const node of storyWeb.nodes) {
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
          const edgeUuid = getEdgeUuid(node.uuid, participant.uuid, 'danger');
          const baseEdge = {
            from: node.uuid,
            to: participant.uuid,
            label,
            title: getEdgeTooltip(storyWeb, edgeUuid),
            ...(label ? edgeWithLabelConfig : edgeConfig),
            ...getEdgeStyling(storyWeb, edgeUuid)
          };
          edges.push(baseEdge);
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
            const label = relatedEntry.extraFields.relationship || '';
            const edgeUuid = getEdgeUuid(node.uuid, relatedEntry.uuid, 'relationship');
            const baseEdge = {
              from: node.uuid,
              to: relatedEntry.uuid,
              label,
              title: getEdgeTooltip(storyWeb, edgeUuid),
              ...(label ? edgeWithLabelConfig : edgeConfig),
              ...getEdgeStyling(storyWeb, edgeUuid)
            };
            edges.push(baseEdge);
          }
        }
      }
    }
  }

  // Add manual edges from storyWeb.edges array
  for (const edge of storyWeb.edges || []) {
    // Only add edge if both nodes exist in the graph
    if (nodes.some(n => n.id === edge.from) && nodes.some(n => n.id === edge.to)) {
      const label = edge.label || '';
      const edgeUuid = getEdgeUuid(edge.from, edge.to, 'manual');
      const baseEdge = {
        from: edge.from,
        to: edge.to,
        label,
        title: getEdgeTooltip(storyWeb, edgeUuid),
        ...(label ? edgeWithLabelConfig : edgeConfig),
        ...getEdgeStyling(storyWeb, edgeUuid)
      };
      edges.push(baseEdge);
    }
  }

  return { nodes, edges };
}

/** Record a new color for an edge and save the story web */
const setEdgeColor = async (storyWeb: StoryWeb, edgeId: string, colorId: string) => {
  if (!storyWeb.edgeStyles) {
    storyWeb.edgeStyles = {};
  }
  
  if (!storyWeb.edgeStyles[edgeId]) {
    storyWeb.edgeStyles[edgeId] = {
      colorId: colorId,
      styleId: ''
    };
  } else {
    storyWeb.edgeStyles[edgeId].colorId = colorId;
  }
  
  await storyWeb.save();
};

/** Record a new style for an edge and save the story web */
const setEdgeStyle = async (storyWeb: StoryWeb, edgeId: string, styleId: string) => {
  if (!storyWeb.edgeStyles) {
    storyWeb.edgeStyles = {};
  }
  
  if (!storyWeb.edgeStyles[edgeId]) {
    storyWeb.edgeStyles[edgeId] = {
      colorId: '',
      styleId: styleId
    };
  } else {
    storyWeb.edgeStyles[edgeId].styleId = styleId;
  }
  
  await storyWeb.save();
};

  /**
   * Export a story web as PNG image
   * 
   * @param storyWebId the UUID of the story web to export
   */
  const exportStoryWebAsPng = async (storyWebId: string): Promise<void> => {
  // Load the story web
  const storyWeb = await StoryWeb.fromUuid(storyWebId);
  if (!storyWeb) 
    throw new Error('Unable to load story web in campaignDirectoryStore.exportStoryWebAsPng()');

  // Load the campaign to get its name
  const campaign = await storyWeb.loadCampaign();
  const campaignName = campaign?.name || 'Unknown Campaign';

  // Use the shared PNG generation function
  const blob = await SettingExportService.generateStoryWebPng(storyWeb);

  // Download immediately using blob URL
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Sanitize filename with campaign name
  const filename = `${campaignName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${storyWeb.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};  

export {
  getEdgeUuid,
  LINE_STYLES,
  generateNetworkData,
  getAllFieldsForContentType,
  setEdgeColor,
  setEdgeStyle,
  exportStoryWebAsPng
}