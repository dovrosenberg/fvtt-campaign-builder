// Per-panel composable that holds all vis-network state and methods for a story web.
// Each panel that renders a story web creates its own instance via useStoryWebGraphState(),
// so multiple story webs can be displayed side-by-side with independent graph state.

// library imports
import { ref, watch, toRaw, nextTick, h, inject, onScopeDispose, type Ref, type InjectionKey } from 'vue';
import type { Network } from 'vis-network';

// local imports
import { useRelationshipStore, useNavigationStore, useStoryWebStore } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game';
import { ModuleSettings, SettingKey } from '@/settings';
import { confirmDialog } from '@/dialogs/confirm';
import { setEdgeColor, setEdgeStyle, getEdgeUuid } from '@/utils/storyWebGeneration';
import { useContentState } from '@/composables/useContentState';
import { TAB_PANEL_STATE_KEY } from '@/composables/useTabPanelState';

// library components
import ContextMenu from '@imengyu/vue3-context-menu';

// types
import { Danger, RelatedEntryDetails, StoryWebNodeSource, StoryWebNodeTypes, Topics } from '@/types';
import { Campaign, Entry, Front } from '@/classes';

interface NetworkClickEventInfo {
  nodes: string[];
  edges: string[];
  pointer: {
    DOM: { x: number; y: number };
    canvas: { x: number; y: number };
  };
  event: MouseEvent;
}

export interface StoryWebGraphState {
  // reactive state
  currentContainer: Ref<HTMLElement | null>;
  currentNetwork: Ref<Network | null>;
  isWebLoading: Ref<boolean>;
  isConnectionMode: Ref<boolean>;

  // action methods
  addEntry(uuid: string, position?: { x: number; y: number } | null, withRelationships?: boolean): Promise<void>;
  addFront(frontId: string, position?: { x: number; y: number } | null, withRelationships?: boolean): Promise<void>;
  addDanger(dangerId: string, position?: { x: number; y: number } | null, withRelationships?: boolean): Promise<void>;
  removeNode(nodeId: string): Promise<void>;
  removeEdge(edgeId: string): Promise<void>;
  handleDropOnNode(entryUuid: string, targetNodeId: string, position: { x: number; y: number }, withRelationships?: boolean): Promise<void>;
  addCustomNode(position?: { x: number; y: number } | null): Promise<void>;
  editCustomNode(nodeId: string): Promise<void>;
  setCustomNodeColorScheme(nodeId: string, colorSchemeId: string): Promise<void>;
  regenerate(contentUuid?: string): Promise<void>;
}

export const STORY_WEB_GRAPH_STATE_KEY: InjectionKey<StoryWebGraphState> = Symbol('storyWebGraphState');

/**
 * Creates panel-scoped story web graph state and methods.
 * Must be called inside a component that is a descendant of a TabPanel.
 * Registers itself with the Pinia store so external callers (directory context menus)
 * can delegate to the focused panel's instance.
 *
 * @returns A StoryWebGraphState with per-panel vis-network state and all graph manipulation methods.
 */
export function useStoryWebGraphState(): StoryWebGraphState {
  const panelState = inject(TAB_PANEL_STATE_KEY)!;
  const { currentStoryWeb, currentSetting } = useContentState();
  const relationshipStore = useRelationshipStore();
  const navigationStore = useNavigationStore();
  const storyWebStore = useStoryWebStore();

  ///////////////////////////////
  // per-panel state
  const currentContainer = ref<HTMLElement | null>(null);
  const currentNetwork = ref<Network | null>(null);
  const isWebLoading = ref<boolean>(false);

  // connection mode state
  const isConnectionMode = ref<boolean>(false);
  const connectionStartNode = ref<string | null>(null);
  const tempEdge = ref<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);
  const highlightedNode = ref<string | null>(null);
  const isCreatingConnection = ref<boolean>(false);

  // auto-panning state
  let autoPanAnimationId: number | null = null;

  // track previous story web to detect switches
  let previousStoryWebId: string | null = null;

  ///////////////////////////////
  // actions

  /** Generate the new network from the current story web.
   * @param reset - If true, the viewport position and scale will be reset to default
   */
  const generateNetwork = async (reset: boolean = false) => {
    if (!currentContainer.value || !currentStoryWeb.value || !currentSetting.value)
      return;

    if (isWebLoading.value)
      return;

    // clean up connection mode if network is being regenerated
    if (isConnectionMode.value)
      endConnectionMode();

    // store viewport state before regeneration (unless resetting)
    let storedViewportState: { position: { x: number; y: number }; scale: number } | null = null;
    if (currentNetwork.value && !reset) {
      const network = toRaw(currentNetwork.value);
      storedViewportState = {
        position: network.getViewPosition(),
        scale: network.getScale()
      };
    }

    // destroy the old network to prevent memory leaks
    if (currentNetwork.value) {
      toRaw(currentNetwork.value).destroy();
      currentNetwork.value = null;
    }

    isWebLoading.value = true;

    try {
      // dynamically import vis-network
      const { Network } = await import('vis-network');

      // generate network data using the storyWeb method
      const { nodes, edges } = await currentStoryWeb.value.generateNetworkData(false);

      const options = {
        configure: false,
        // @ts-ignore
        physics: ModuleSettings.get(SettingKey.storyWebAutoArrange) ? window.fcbStoryWebPhysics : false,
        interaction: {
          hover: true,
          hoverConnectedEdges: false,
          selectConnectedEdges: false,
          tooltipDelay: 50,
        },
        edges: {
          smooth: {
            enabled: true,
            type: 'discrete',
            roundness: 0.5
          }
        },
        nodes: {
          margin: { top: 3, right: 3, bottom: 3, left: 3 },
          widthConstraint: {
            minimum: 140,
            maximum: 140,
          },
        }
      };

      currentNetwork.value = new Network(currentContainer.value, { nodes, edges }, options);

      // restore viewport state if we had stored it
      if (storedViewportState) {
        await nextTick();
        currentNetwork.value?.moveTo({
          position: storedViewportState.position,
          scale: storedViewportState.scale,
          animation: false
        });
      }

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
  };

  /** Record a new color scheme for a custom node */
  const setCustomNodeColorScheme = async (nodeId: string, colorSchemeId: string) => {
    if (!currentStoryWeb.value) return;

    if (!currentStoryWeb.value.nodeStyles[nodeId]) {
      currentStoryWeb.value.nodeStyles[nodeId] = {
        colorSchemeId: colorSchemeId,
      };
    } else {
      currentStoryWeb.value.nodeStyles[nodeId].colorSchemeId = colorSchemeId;
    }

    await currentStoryWeb.value.save();

    // refresh the graph to apply the new color
    await refreshAndRegenerate();
  };

  /** Add entry to the story web.
   * @param entryUuid - UUID of the entry to add
   * @param position - Position to place the node at (canvas coordinates)
   * @param withRelationships - Whether to also add all related nodes implicitly
   */
  const addEntry = async (entryUuid: string, position: { x: number; y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    await currentStoryWeb.value.addEntry(entryUuid, position, withRelationships);

    // refresh the drawing
    await refreshAndRegenerate();
    toRaw(currentNetwork.value)?.stabilize(50);
  };

  /** Add danger to the story web.
   * @param dangerId - ID of the danger to add
   * @param position - Position to place the node at (canvas coordinates)
   * @param withRelationships - Whether to also add all related nodes implicitly
   */
  const addDanger = async (dangerId: string, position: { x: number; y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    await currentStoryWeb.value.addDanger(dangerId, position, withRelationships);

    // refresh the drawing
    await refreshAndRegenerate();
    toRaw(currentNetwork.value)?.stabilize(50);
  };

  /** Add front to the story web - adds all dangers from the front.
   * @param frontId - UUID of the front to add
   * @param position - Position to place the first danger at (canvas coordinates)
   * @param withRelationships - Whether to also add all related nodes implicitly
   */
  const addFront = async (frontId: string, position: { x: number; y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    const front = await Front.fromUuid(frontId);
    if (!front)
      return;

    // add all dangers from the front
    for (let i = 0; i < front.dangers.length; i++) {
      const dangerId = `${front.uuid}|${i}`;
      // offset position for each danger to avoid overlap
      const dangerPosition = position ? {
        x: position.x + (i * 50),
        y: position.y + (i * 50)
      } : null;
      await currentStoryWeb.value.addDanger(dangerId, dangerPosition, withRelationships);
    }

    // refresh the drawing
    await refreshAndRegenerate();
    toRaw(currentNetwork.value)?.stabilize(50);
  };

  /** Select an entry from dialog and insert at a location.
   * @param position - Position to place the node at (canvas coordinates)
   * @param withRelationships - Whether to also add all related nodes implicitly
   */
  const selectAndAddEntry = async (position: { x: number; y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentSetting.value)
      return;

    let options = Object.values(currentSetting.value.topics).reduce((acc, topicIndex) => {
      acc.push(...topicIndex.entries.map(e => ({ id: e.uuid, label: e.name })));
      return acc;
    }, [] as { id: string; label: string }[]);

    // take out things already in the map explicitly
    options = options.filter(o => !currentStoryWeb.value?.nodes.some(n => n.uuid === o.id && n.source === StoryWebNodeSource.Explicit));

    const entryUuid = await FCBDialog.relatedItemDialog(
      localize('contextMenus.storyWebGraph.addEntry'),
      localize('contextMenus.storyWebGraph.addEntry'),
      options,
    );
    if (!entryUuid)
      return;

    await addEntry(entryUuid, position, withRelationships);
  };

  /** Handle dropping an entry on top of an existing node to create a connection.
   * @param entryUuid - UUID of the entry being dropped
   * @param targetNodeId - UUID of the node under the drop position
   * @param position - Position to place the new node at (canvas coordinates)
   * @param withRelationships - Whether to also add all related nodes implicitly
   */
  const handleDropOnNode = async (entryUuid: string, targetNodeId: string, position: { x: number; y: number }, withRelationships: boolean = false) => {
    if (!currentStoryWeb.value)
      return;

    // check if the dropped entry is already in the graph
    const entryAlreadyInGraph = currentStoryWeb.value.nodes.some(
      node => node.uuid === entryUuid
    );

    // add the entry if it's not already in the graph
    if (!entryAlreadyInGraph) {
      await addEntry(entryUuid, position, withRelationships);

      // add any edges needed
      await refreshAndRegenerate();
      await nextTick();
    }

    // check if connection is valid before proceeding
    if (isValidConnection(targetNodeId, entryUuid)) {
      // ask if they want to create a connection
      const shouldConnect = await confirmDialog(
        localize('labels.storyWeb.createConnection'),
        localize('labels.storyWeb.createConnectionPrompt')
      );

      if (shouldConnect) {
        await createConnection(targetNodeId, entryUuid);
      }
    }
  };

  /** Select a danger from dialog and insert at a location.
   * @param position - Position to place the node at (canvas coordinates)
   * @param withRelationships - Whether to also add all related nodes implicitly
   */
  const selectAndAddDanger = async (position: { x: number; y: number } | null = null, withRelationships: boolean = false) => {
    if (!currentSetting.value)
      return;

    // fronts aren't indexed so we have to load from each campaign
    let frontOptions = [] as { id: string; label: string }[];

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

      // for dangers, we're going to use front|danger as the uuid to let us open it later
      let options = front.dangers.map((d: Danger, idx: number) => ({ id: `${frontUuid}|${idx}`, label: d.name }));

      // take out things already in the map explicitly
      options = options.filter(o => !currentStoryWeb.value?.nodes.some(n => n.uuid === o.id && n.source === StoryWebNodeSource.Explicit));

      return options;
    };

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

  /** Add a manual node to the story web.
   * @param canvasPosition - Position to place the node at (canvas coordinates)
   */
  const addCustomNode = async (canvasPosition: { x: number; y: number } | null = null) => {
    if (!currentStoryWeb.value)
      return;

    // get the initial text from a dialog
    const text = await FCBDialog.inputDialog(localize('contextMenus.storyWebGraph.addText'), localize('contextMenus.storyWebGraph.addTextPrompt'));
    if (!text)
      return;

    await currentStoryWeb.value.addCustomNode(text, canvasPosition);

    // refresh the drawing
    await refreshAndRegenerate();
  };

  /** Edit a custom node's text.
   * @param nodeId - UUID of the node to edit
   */
  const editCustomNode = async (nodeId: string) => {
    if (!currentStoryWeb.value)
      return;

    const node = currentStoryWeb.value.nodes.find(n => n.uuid === nodeId);
    if (!node || node.type !== StoryWebNodeTypes.Custom)
      return;

    // get the updated text from a dialog
    const newText = await FCBDialog.inputDialog(
      localize('contextMenus.storyWebGraph.editText'),
      localize('contextMenus.storyWebGraph.addTextPrompt'),
      node.label || ''
    );
    if (newText === null) // user cancelled
      return;

    // update the node label
    node.label = newText;
    await currentStoryWeb.value.save();

    // refresh the drawing
    await refreshAndRegenerate();
  };

  /** Remove a node from the story web.
   * @param nodeId - UUID of the node to remove
   */
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
    await refreshAndRegenerate();
  };

  /** Remove an edge from the story web.
   * @param edgeId - ID of the edge to remove
   */
  const removeEdge = async (edgeId: string) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    const nodes = toRaw(currentNetwork.value).getConnectedNodes(edgeId) as string[];
    const node1 = currentStoryWeb.value?.nodes.find(n => n.uuid === nodes[0]);
    const node2 = currentStoryWeb.value?.nodes.find(n => n.uuid === nodes[1]);

    if (!node1 || !node2)
      throw new Error('Missing node in useStoryWebGraphState.removeEdge()');

    // first handle non-custom cases
    if (node1?.source !== StoryWebNodeSource.Custom && node2?.source !== StoryWebNodeSource.Custom) {
      // show confirmation
      const result = await FCBDialog.confirmDialog(localize('labels.storyWeb.removeRelationship'), localize('labels.storyWeb.removeRelationshipConfirm'));
      if (!result)
        return;

      const node1Danger = node1.type === StoryWebNodeTypes.Danger;
      const node2Danger = node2.type === StoryWebNodeTypes.Danger;

      // handle danger-entry connections (note: there are no danger-danger connections)
      if (node1Danger || node2Danger) {
        // remove the entry from the danger's participants
        await removeDangerParticipant(
          node1Danger ? node1.uuid : node2.uuid,
          node1Danger ? node2.uuid : node1.uuid
        );
      } else {
        // regular entry-entry relationship
        await relationshipStore.deleteArbitraryRelationship(node1.uuid, node2.uuid);
      }
    }

    // if either edge was implicit, remove that one too - unless it's attached to something else
    if (node1?.source === StoryWebNodeSource.Implicit) {
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
    const edgeUuid = getEdgeUuid(node1.uuid, node2.uuid, 'manual');
    currentStoryWeb.value.edges = currentStoryWeb.value.edges.filter(e => e.uuid !== edgeUuid);
    await currentStoryWeb.value.save();

    // refresh the drawing
    await refreshAndRegenerate();
  };

  /** Remove a participant from a danger.
   * @param dangerId - The danger ID in format "frontUuid|dangerIndex"
   * @param participantUuid - UUID of the participant to remove
   */
  const removeDangerParticipant = async (dangerId: string, participantUuid: string): Promise<void> => {
    const [frontId, dangerIndex] = dangerId.split('|');
    const front = await Front.fromUuid(frontId);
    if (!front)
      throw new Error(`Front not found for danger ${dangerId}`);

    const dangerNum = Number.parseInt(dangerIndex);
    if (dangerNum < 0 || dangerNum >= front.dangers.length)
      throw new Error(`Invalid danger index ${dangerIndex} for front ${frontId}`);

    const danger = front.dangers[dangerNum];
    if (!danger)
      throw new Error(`Danger not found in useStoryWebGraphState.removeDangerParticipant() for danger ${dangerId}`);

    // filter out the participant
    danger.participants = danger.participants.filter(p => p.uuid !== participantUuid);

    // update the danger
    front.updateDanger(dangerNum, danger);
    await front.save();
  };

  ///////////////////////////////
  // methods

  const editEdge = async (edgeId: string) => {
    if (!currentStoryWeb.value || !currentNetwork.value)
      return;

    // get the connected nodes to determine what type of edge this is
    const connectedNodes = toRaw(currentNetwork.value).getConnectedNodes(edgeId) as string[];
    if (connectedNodes.length !== 2)
      return;

    const [fromNode, toNode] = connectedNodes;

    // get current edge label
    const currentLabel = await getCurrentEdgeLabel(fromNode, toNode);

    // get new label from user
    const newLabel = await getText(
      localize('labels.storyWeb.editRelationship'),
      localize('labels.storyWeb.newConnectionLabel'),
      currentLabel || '',
      false
    );

    if (newLabel === null) // user cancelled
      return;

    // update the edge based on its type
    await updateEdgeLabel(fromNode, toNode, newLabel);

    await refreshAndRegenerate();
  };

  /** @param required - Whether the input must have a value (false means it can be blank) */
  const getText = async (title: string, prompt: string, initialText: string, required: boolean): Promise<string | null> => {
    let value: string | null = initialText;
    do { // if hit ok, must have a value
      value = await FCBDialog.inputDialog(title, prompt, initialText);
      if (!required)
        return value;
    } while (value === '');

    return value;
  };

  const getCurrentEdgeLabel = async (fromNode: string, toNode: string): Promise<string> => {
    // check if it's a manual edge first
    const manualEdge = getManualEdge(fromNode, toNode);
    if (manualEdge) {
      return manualEdge.label || '';
    }

    // check if it's a danger participant edge
    const fromNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === fromNode);
    const toNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === toNode);

    if (fromNodeData?.type === StoryWebNodeTypes.Danger || toNodeData?.type === StoryWebNodeTypes.Danger) {
      const dangerUuid = fromNodeData?.type === StoryWebNodeTypes.Danger ? fromNode : toNode;
      const entryUuid = fromNodeData?.type === StoryWebNodeTypes.Danger ? toNode : fromNode;

      // parse danger UUID to get front and danger index
      const [frontId, dangerIndex] = dangerUuid.split('|');
      const front = await Front.fromUuid(frontId);
      if (!front)
        return '';

      const danger = front.dangers[Number.parseInt(dangerIndex)];
      if (!danger)
        return '';

      // find the participant role for this entry
      const participant = danger.participants.find(p => p.uuid === entryUuid);
      return participant?.role || '';
    }

    // for entry-to-entry relationships, check the relationship store
    try {
      const fromEntry = await Entry.fromUuid(fromNode);
      if (!fromEntry?.relationships)
        return '';

      // check all relationship topics for the target entry
      for (const topic of [Topics.Character, Topics.Location, Topics.Organization, Topics.PC]) {
        const relatedEntries = fromEntry.relationships[topic] as RelatedEntryDetails<any, any>[] | undefined;
        if (!relatedEntries)
          continue;

        const relatedEntry = relatedEntries[toNode];
        if (relatedEntry) {
          return relatedEntry.extraFields.relationship || '';
        }
      }
    } catch (error) {
      console.warn('Error fetching current edge label:', error);
    }

    return '';
  };

  const getManualEdge = (fromNode: string, toNode: string) => {
    const edgeUuid = getEdgeUuid(fromNode, toNode, 'manual');
    let manualEdge = currentStoryWeb.value?.edges.find(e => e.uuid === edgeUuid);

    // backward compatibility: check for old unprefixed format if new format not found
    if (!manualEdge) {
      const oldEdgeUuid = [fromNode, toNode].sort().join('|');
      manualEdge = currentStoryWeb.value?.edges.find(e => e.uuid === oldEdgeUuid);

      // if found with old format, update it to new format
      if (manualEdge) {
        manualEdge.uuid = edgeUuid;
      }
    }

    return manualEdge;
  };

  const updateEdgeLabel = async (fromNode: string, toNode: string, newLabel: string) => {
    // check if it's a manual edge first
    const manualEdge = getManualEdge(fromNode, toNode);
    if (manualEdge) {
      manualEdge.label = newLabel;
      await currentStoryWeb.value?.save();
      return;
    }

    // check if it's a danger participant edge
    const fromNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === fromNode);
    const toNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === toNode);

    if (fromNodeData?.type === StoryWebNodeTypes.Danger || toNodeData?.type === StoryWebNodeTypes.Danger) {
      const dangerUuid = fromNodeData?.type === StoryWebNodeTypes.Danger ? fromNode : toNode;
      const entryUuid = fromNodeData?.type === StoryWebNodeTypes.Danger ? toNode : fromNode;

      // parse danger UUID to get front and danger index
      const [frontId, dangerIndex] = dangerUuid.split('|');
      const front = await Front.fromUuid(frontId);
      if (!front)
        return;

      const danger = front.dangers[Number.parseInt(dangerIndex)];
      if (!danger)
        return;

      // update the participant role
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

    // for entry-to-entry relationships, update the relationship fields directly on both entries
    const entry = await Entry.fromUuid(fromNode);
    const relatedEntry = await Entry.fromUuid(toNode);

    if (!entry || !relatedEntry)
      return;

    const entryTopic = entry.topic;
    const relatedEntryTopic = relatedEntry.topic;

    if (!entryTopic || !relatedEntryTopic)
      return;

    // determine which field to update based on the topic pairing
    const extraFields = relationshipStore.extraFields;
    let updateField = '';

    if (extraFields[entryTopic]?.[relatedEntryTopic]?.length > 0) {
      updateField = extraFields[entryTopic][relatedEntryTopic][0].field;
    } else if (extraFields[relatedEntryTopic]?.[entryTopic]?.length > 0) {
      updateField = extraFields[relatedEntryTopic][entryTopic][0].field;
    }

    if (!updateField)
      return;

    // clone the relationships to avoid mutation issues
    const entryRelationships = foundry.utils.deepClone(entry.relationships);
    const relatedEntryRelationships = foundry.utils.deepClone(relatedEntry.relationships);

    // update the relationship on both entries
    if (entryRelationships[relatedEntryTopic]?.[relatedEntry.uuid]) {
      entryRelationships[relatedEntryTopic][relatedEntry.uuid].extraFields[updateField] = newLabel;
    }

    if (relatedEntryRelationships[entryTopic]?.[entry.uuid]) {
      relatedEntryRelationships[entryTopic][entry.uuid].extraFields[updateField] = newLabel;
    }

    // save both entries
    entry.relationships = entryRelationships;
    relatedEntry.relationships = relatedEntryRelationships;

    await entry.save();
    await relatedEntry.save();
  };

  const onNetworkDoubleClick = async (eventInfo: NetworkClickEventInfo) => {
    if (isConnectionMode.value)
      return;

    const { nodes, edges, pointer } = eventInfo;

    // see what we clicked on
    if (nodes.length > 0) {
      await editCustomNode(nodes[0]);
    } else if (edges.length > 0) {
      await editEdge(edges[0]);
    } else {
      await addCustomNode(pointer.canvas);
    }
  };

  const onDragStart = (eventInfo: NetworkClickEventInfo) => {
    if (isConnectionMode.value)
      return;

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

  const onDragging = () => {
    const network = toRaw(currentNetwork.value);
    if (!network) return;

    // if we're not already panning, check if we need to start
    if (!autoPanAnimationId)
      startAutoPan();
  };

  const onDragEnd = async () => {
    stopAutoPan();

    // if we're not using physics, we need to save (otherwise we save when it stabilizes)
    if (!ModuleSettings.get(SettingKey.storyWebAutoArrange))
      await capturePositions();
  };

  /** Check if a node is in the auto-pan zone near the edge of the canvas.
   * @returns Pan direction vector or null if not in pan zone
   */
  const inPanZone = (): { x: number; y: number } | null => {
    if (!currentNetwork.value || !currentContainer.value)
      return null;

    const network = toRaw(currentNetwork.value);
    const selectedNodes = network.getSelectedNodes() as string[];
    if (selectedNodes.length === 0)
      return null;

    // operate in DOM space because it's much simpler
    const canvas = currentContainer.value.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas)
      return null;

    const edgeThreshold = 55;
    const canvasDOMRect = canvas.getBoundingClientRect();

    let needsAutoPan = false;
    let newPanDirection = { x: 0, y: 0 };

    // use different thresholds based on whether auto-pan is already active
    const startThreshold = edgeThreshold;
    const stopThreshold = edgeThreshold + 10;
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
      };
    });

    const minX = Math.min(...nodePositions.map(pos => pos.left));
    const maxX = Math.max(...nodePositions.map(pos => pos.right));
    const minY = Math.min(...nodePositions.map(pos => pos.top));
    const maxY = Math.max(...nodePositions.map(pos => pos.bottom));

    // check each edge using the bounding box with appropriate threshold
    if (minX <= threshold) {
      newPanDirection.x = -1;
      needsAutoPan = true;
    } else if (maxX > canvasDOMRect.width - threshold) {
      newPanDirection.x = 1;
      needsAutoPan = true;
    }

    if (minY <= threshold) {
      newPanDirection.y = -1;
      needsAutoPan = true;
    } else if (maxY > canvasDOMRect.height - threshold) {
      newPanDirection.y = 1;
      needsAutoPan = true;
    }

    return needsAutoPan ? newPanDirection : null;
  };

  const startAutoPan = () => {
    const network = toRaw(currentNetwork.value);
    if (!network)
      return;

    const normalPanSpeed = 10;

    const animate = () => {
      if (!network) {
        stopAutoPan();
        return;
      }

      // continue checking edge detection even if dragging event stops firing
      const panDirection = inPanZone();

      if (!panDirection) {
        // continue checking but don't pan
        autoPanAnimationId = requestAnimationFrame(animate);
        return;
      }

      const viewPosition = network.getViewPosition();
      const scale = network.getScale();

      // convert DOM pixel speed to canvas coordinates
      const panOffset = {
        x: (panDirection.x * normalPanSpeed) / scale,
        y: (panDirection.y * normalPanSpeed) / scale
      };

      // move all the selected nodes
      const nodes = network.getSelectedNodes();

      if (nodes.length === 0) {
        stopAutoPan();
        return;
      }

      const positions = network.getPositions(nodes);

      // move nodes opposite to viewport pan to keep them stationary in DOM space
      for (const node in positions) {
        network.moveNode(node, positions[node].x + panOffset.x, positions[node].y + panOffset.y);
      }

      // pan the viewport to keep nodes in view
      network.moveTo({
        position: {
          x: viewPosition.x + panOffset.x * 1.0,
          y: viewPosition.y + panOffset.y * 1.0
        },
        animation: false
      });

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
    if (isConnectionMode.value)
      return;

    const { pointer, event } = eventInfo;

    // prevent the browser's default menu
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

  /** Save all the node positions. */
  const capturePositions = async () => {
    if (!currentNetwork.value || !currentStoryWeb.value)
      return;

    const positions = toRaw(currentNetwork.value).getPositions();

    currentStoryWeb.value.positions = positions;

    await currentStoryWeb.value.save();
  };

  /** Refresh the StoryWeb data object and regenerate the network visualization. */
  const refreshAndRegenerate = async () => {
    await panelState.refreshStoryWeb();
    await generateNetwork();
  };

  const startConnectionMode = async (nodeId: string) => {
    if (!currentNetwork.value || !currentContainer.value)
      return;

    isConnectionMode.value = true;
    connectionStartNode.value = nodeId;

    // initialize temporary edge from the start node position
    const nodePosition = toRaw(currentNetwork.value).getPositions([nodeId])[nodeId];
    tempEdge.value = {
      from: toRaw(currentNetwork.value).canvasToDOM(nodePosition),
      to: { x: 0, y: 0 }
    };

    // disable physics and node dragging during connection mode
    toRaw(currentNetwork.value).setOptions({
      physics: { enabled: false },
      interaction: {
        dragNodes: false,
        hover: false
      }
    });

    // get canvas element and add DOM event listeners
    const canvas = currentContainer.value.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('mousemove', onConnectionModeMouseMove);
      canvas.addEventListener('click', onConnectionModeClick);
    }

    toRaw(currentNetwork.value).on('beforeDrawing', onBeforeDrawing);

    // add ESC key handler
    document.addEventListener('keydown', onConnectionModeKeydown);
  };

  const endConnectionMode = () => {
    isConnectionMode.value = false;
    connectionStartNode.value = null;
    tempEdge.value = null;
    highlightedNode.value = null;

    // remove ESC key listener
    document.removeEventListener('keydown', onConnectionModeKeydown);

    if (!currentNetwork.value)
      return;

    // re-enable physics and node dragging
    toRaw(currentNetwork.value).setOptions({
      // @ts-ignore
      physics: ModuleSettings.get(SettingKey.storyWebAutoArrange) ? window.fcbStoryWebPhysics : false,
      interaction: {
        dragNodes: true,
        hover: true
      }
    });

    // remove DOM event listeners from canvas
    const canvas = currentContainer.value?.querySelector('canvas');
    if (canvas) {
      canvas.removeEventListener('mousemove', onConnectionModeMouseMove);
      canvas.removeEventListener('click', onConnectionModeClick);
    }

    toRaw(currentNetwork.value).off('beforeDrawing', onBeforeDrawing);

    // redraw to clear temporary edge
    toRaw(currentNetwork.value).redraw();
  };

  /** Check if two nodes can be connected. */
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

    // custom text can connect to anything
    if (fromNodeData.type === StoryWebNodeTypes.Custom || toNodeData.type === StoryWebNodeTypes.Custom)
      return true;

    // entries can connect to custom text, other entries, and dangers (only characters/organizations)
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

    throw new Error('Bad type in useStoryWebGraphState.isValidConnection()');
  };

  const onBeforeDrawing = (ctx: CanvasRenderingContext2D) => {
    if (!tempEdge.value || !currentNetwork.value)
      return;

    // save context state to prevent affecting other edges
    ctx.save();

    const fromCanvas = toRaw(currentNetwork.value).DOMtoCanvas(tempEdge.value.from);
    const toCanvas = toRaw(currentNetwork.value).DOMtoCanvas(tempEdge.value.to);

    ctx.strokeStyle = 'hsl(22, 100%, 55%)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(fromCanvas.x, fromCanvas.y);
    ctx.lineTo(toCanvas.x, toCanvas.y);
    ctx.stroke();

    // restore context state
    ctx.restore();
  };

  const createConnection = async (fromNode: string, toNode: string) => {
    if (!currentStoryWeb.value)
      return;

    // hide temporary edge before starting
    tempEdge.value = null;
    if (currentNetwork.value) {
      toRaw(currentNetwork.value).redraw();
    }

    // get node data for both nodes
    const fromNodeData = currentStoryWeb.value.nodes.find(n => n.uuid === fromNode);
    const toNodeData = currentStoryWeb.value.nodes.find(n => n.uuid === toNode);

    if (!fromNodeData || !toNodeData)
      throw new Error('Missing node data in useStoryWebGraphState.createConnection()');

    // reconfirm its legal
    if (!isValidConnection(fromNode, toNode))
      return;

    // handle different connection types
    // custom connected to anything gets a custom edge
    if ([fromNodeData.type, toNodeData.type].includes(StoryWebNodeTypes.Custom)) {
      // get label from user
      const label = await FCBDialog.inputDialog(
        localize('labels.storyWeb.addConnection'),
        localize('labels.storyWeb.newConnectionLabel'),
        ''
      );

      if (label === null) // user cancelled
        return;

      // create the edge
      const edgeUuid = getEdgeUuid(fromNode, toNode, 'manual');
      currentStoryWeb.value.edges.push({
        uuid: edgeUuid,
        from: fromNode,
        to: toNode,
        label: label || ''
      });

      await currentStoryWeb.value.save();
      await refreshAndRegenerate();
      return;
    }

    // at this point, we know from/to are either both entries or an entry and danger
    if (fromNodeData.type === StoryWebNodeTypes.Danger || toNodeData.type === StoryWebNodeTypes.Danger) {
      // entry to danger connection
      const entryUuid = fromNodeData.type === StoryWebNodeTypes.Danger ? toNode : fromNode;
      const dangerUuid = fromNodeData.type === StoryWebNodeTypes.Danger ? fromNode : toNode;

      // parse danger UUID to get front and danger index
      const [frontId, dangerIndex] = dangerUuid.split('|');
      const front = await Front.fromUuid(frontId);
      if (!front)
        throw new Error('Invalid front in useStoryWebGraphState.createConnection()');

      const danger = front.dangers[Number.parseInt(dangerIndex)];
      if (!danger)
        throw new Error('Invalid danger in useStoryWebGraphState.createConnection()');

      // add entry as participant to danger
      const entry = await Entry.fromUuid(entryUuid);
      if (!entry)
        throw new Error('Invalid entry in useStoryWebGraphState.createConnection()');

      // update danger with new participant
      front.updateDanger(Number.parseInt(dangerIndex), {
        ...danger,
        participants: [...danger.participants, { uuid: entryUuid, role: '' }],
      });
      await front.save();

      await refreshAndRegenerate();
      return;
    } else {
      // entry to entry connection
      const fromEntry = await Entry.fromUuid(fromNode);
      const toEntry = await Entry.fromUuid(toNode);

      if (!fromEntry || !toEntry)
        throw new Error('Invalid entry in useStoryWebGraphState.createConnection()');

      // prompt for relationship label
      const label = await FCBDialog.inputDialog(
        localize('labels.storyWeb.addConnection'),
        localize('labels.storyWeb.newConnectionLabel'),
        ''
      );

      if (label === null) // user cancelled
        return;

      // use relationship store to connect them with proper field name
      await relationshipStore.addArbitraryRelationship(fromNode, toNode, { relationship: label });
      await refreshAndRegenerate();
      return;
    }
  };

  ///////////////////////////////
  // private methods

  /** Record a new color scheme for a node */
  const setNodeColorScheme = async (nodeId: string, colorSchemeId: string) => {
    if (!currentStoryWeb.value) return;
    
    if (!currentStoryWeb.value.nodeStyles[nodeId]) {
      currentStoryWeb.value.nodeStyles[nodeId] = {
        colorSchemeId: colorSchemeId,
      };
    } else {
      currentStoryWeb.value.nodeStyles[nodeId].colorSchemeId = colorSchemeId;
    }
    
    await currentStoryWeb.value.save();

    // Refresh the graph to apply the new color
    await refreshAndRegenerate();
  };
  
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

    // check for node under cursor and highlight if valid target
    const nodeUnderCursor = toRaw(currentNetwork.value).getNodeAt({ x: domX, y: domY });

    if (nodeUnderCursor && connectionStartNode.value) {
      const isValid = isValidConnection(connectionStartNode.value, nodeUnderCursor as string);
      if (!isValid) {
        toRaw(currentNetwork.value).unselectAll();
        highlightedNode.value = null;
      } else if (highlightedNode.value !== nodeUnderCursor) {
        // clear previous highlight
        if (highlightedNode.value) {
          toRaw(currentNetwork.value).unselectAll();
        }
        // highlight new valid node
        toRaw(currentNetwork.value).selectNodes([nodeUnderCursor as string]);
        highlightedNode.value = nodeUnderCursor as string;
      }
    } else {
      // clear highlight if hovering over empty space or there's no start node
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

    // check if we clicked on a valid node
    const targetNodeId = toRaw(currentNetwork.value).getNodeAt({ x: domX, y: domY });

    if (targetNodeId && isValidConnection(connectionStartNode.value, targetNodeId as string)) {
      isCreatingConnection.value = true;
      await createConnection(connectionStartNode.value, targetNodeId as string);
      isCreatingConnection.value = false;
    }

    endConnectionMode();
  };

  const onConnectionModeKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation(); // make sure foundry doesn't handle it
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

    // create the color submenu - available for all node types
    let colorSubmenu: any[]= [];

    // Get predefined color schemes from settings
    const colorSchemes = ModuleSettings.get(SettingKey.storyWebCustomNodeColorSchemes);

    colorSubmenu = colorSchemes.map(scheme => ({
        label: scheme.name,
        icon: () => h('svg', { viewBox: '0 0 20 20', style: 'width: 16px; height: 16px;' }, [
          h('rect', { x: 2, y: 2, width: 16, height: 16, rx: 3, ry: 3, fill: scheme.backgroundColor }),
          h('text', { x: 10, y: 14, 'text-anchor': 'middle', 'font-size': '10px', fill: scheme.foregroundColor }, 'A')
        ]),
        onClick: async () => { await setNodeColorScheme(nodeId, scheme.id); }
      }));

    // Add reset to default option at the beginning
    colorSubmenu.unshift({
      label: localize('contextMenus.storyWebGraph.resetToDefault'),
      icon: 'fa-undo',
      iconFontClass: 'fas',
      onClick: async () => { 
        if (currentStoryWeb.value?.nodeStyles[nodeId]) {
          delete currentStoryWeb.value.nodeStyles[nodeId];
          await currentStoryWeb.value.save();
          await refreshAndRegenerate();
        }
      }
    });

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
        icon: 'fa-palette',
        iconFontClass: 'fas',
        label: localize('contextMenus.storyWebGraph.setColor'),
        hidden: !node,
        children: colorSubmenu
      },
      {
        icon: 'fa-trash',
        iconFontClass: 'fas',
        label: isEntryNode ? localize('contextMenus.storyWebGraph.removeFromDiagram') : localize('contextMenus.storyWebGraph.delete'),
        onClick: async () => { await removeNode(nodeId); }
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

    // Get the connected nodes to determine edge type
    const connectedNodes = toRaw(currentNetwork.value).getConnectedNodes(edgeId) as string[];
    const [fromNode, toNode] = connectedNodes;
    const edgeUuid = getEdgeUuid(fromNode, toNode, getEdgeType(fromNode, toNode));

    // Get predefined colors and styles from settings
    const colors = ModuleSettings.get(SettingKey.storyWebConnectionColors);
    const styles = ModuleSettings.get(SettingKey.storyWebConnectionStyles);

    // Build color submenu items
    const colorSubmenu = colors.map(color => ({
      label: color.name,
      icon: () => h('svg', { viewBox: '0 0 20 20', style: 'width: 16px; height: 16px;' }, [
        h('rect', { x: 2, y: 2, width: 16, height: 16, rx: 3, ry: 3, fill: color.value })
      ]),
      onClick: async () => { 
        if (!currentStoryWeb.value)
          return;

        await setEdgeColor(currentStoryWeb.value, edgeUuid, color.id); 
        await refreshAndRegenerate(); 
      }
    }));

    // Build style submenu items
    const styleSubmenu = styles.map(style => {
      // Create SVG icon based on line style pattern
      let iconContent;
      
      // Use multiple lines to create visible patterns
      switch (style.value) {
        case 'dashed':
          iconContent = [
            h('line', { x1: 2, y1: 10, x2: 6, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 9, y1: 10, x2: 13, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 16, y1: 10, x2: 18, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' })
          ];
          break;
        case 'dotted':
          iconContent = [
            h('line', { x1: 2, y1: 10, x2: 3, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 6, y1: 10, x2: 7, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 10, y1: 10, x2: 11, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 14, y1: 10, x2: 15, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 17, y1: 10, x2: 18, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' })
          ];
          break;
        case 'dash_dot':
          iconContent = [
            h('line', { x1: 2, y1: 10, x2: 6, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 8, y1: 10, x2: 9, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 12, y1: 10, x2: 13, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 16, y1: 10, x2: 18, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' })
          ];
          break;
        case 'long_dash':
          iconContent = [
            h('line', { x1: 2, y1: 10, x2: 9, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 13, y1: 10, x2: 18, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' })
          ];
          break;
        case 'dense_dot':
          iconContent = [
            h('line', { x1: 2, y1: 10, x2: 3, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 5, y1: 10, x2: 6, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 8, y1: 10, x2: 9, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 11, y1: 10, x2: 12, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 14, y1: 10, x2: 15, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' }),
            h('line', { x1: 17, y1: 10, x2: 18, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' })
          ];
          break;
        default:
          iconContent = [
            h('line', { x1: 2, y1: 10, x2: 18, y2: 10, stroke: '#000', strokeWidth: 1.5, strokeLinecap: 'round' })
          ];
      }
      
      return {
        label: style.name,
        icon: () => h('svg', { viewBox: '0 0 20 20', style: 'width: 16px; height: 16px;' }, iconContent),
        onClick: async () => { 
          if (!currentStoryWeb.value)
            return;
          
          await setEdgeStyle(currentStoryWeb.value, edgeUuid, style.id); 
          await refreshAndRegenerate(); 
        }
      };
    });

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: position.x,
      y: position.y,
      zIndex: 300,
      items: [
        {
          icon: 'fa-palette',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.setColor'),
          children: colorSubmenu
        },
        {
          icon: 'fa-pen',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.setStyle'),
          children: styleSubmenu,
          divided: 'down',
        },
        {
          icon: 'fa-edit',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.editRelationship'),
          onClick: async () => { await editEdge(edgeId); }
        },
        {
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.storyWebGraph.delete'),
          onClick: async () => { await removeEdge(edgeId); }
        },
      ]
    });
  }

  /** Determine the type of an edge based on its nodes. */
  const getEdgeType = (fromNode: string, toNode: string): 'manual' | 'relationship' | 'danger' => {
    // check if it's a manual edge FIRST - all custom node connections need to say manual
    const manualEdge = getManualEdge(fromNode, toNode);
    if (manualEdge) {
      return 'manual';
    }

    const fromNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === fromNode);
    const toNodeData = currentStoryWeb.value?.nodes.find(n => n.uuid === toNode);

    // check if it's a danger participant edge
    if (fromNodeData?.type === StoryWebNodeTypes.Danger || toNodeData?.type === StoryWebNodeTypes.Danger) {
      return 'danger';
    }

    // default to relationship
    return 'relationship';
  };

  /** Shows the context menu for right click on empty space.
   * @param menuPosition - Position for the context menu (screen coordinates)
   * @param canvasPosition - Position to place a new node at (canvas coordinates)
   */
  const showBlankContextMenu = (menuPosition: { x: number; y: number }, canvasPosition: { x: number; y: number }) => {
    if (!currentContainer.value || !currentNetwork.value)
      return;

    // show our menu
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
  };

  ///////////////////////////////
  // watchers
  // when the source web or container changes, rebuild the network object
  watch([currentContainer, currentStoryWeb], async () => {
    if (!currentContainer.value || !currentStoryWeb.value) {
      // if container is cleared, reset the previous story web ID so it will regenerate when switching back
      if (!currentContainer.value) {
        previousStoryWebId = null;
      }
      return;
    }

    // check if this is a different story web or the first load
    const currentStoryWebId = currentStoryWeb.value.uuid;
    const isDifferentStoryWeb = !!previousStoryWebId && previousStoryWebId !== currentStoryWebId;
    const isFirstLoad = !currentNetwork.value || !previousStoryWebId;

    // update the tracking
    previousStoryWebId = currentStoryWebId;

    // only regenerate on first load or story web switch; skip same-UUID object
    // replacements triggered by the updateJournalEntryPage hook to prevent infinite loops
    if (isFirstLoad || isDifferentStoryWeb)
      await generateNetwork(true);
  });

  /** Check whether this story web references the given content UUID (entry or front).
   * @param contentUuid - The UUID to check for
   */
  const storyWebUsesContent = (contentUuid: string): boolean => {
    if (!currentStoryWeb.value)
      return false;

    // Direct match for entry nodes, or prefix match for danger nodes (frontUuid|dangerIndex)
    return currentStoryWeb.value.nodes.some(node =>
      node.uuid === contentUuid || node.uuid.startsWith(contentUuid + '|')
    );
  };

  /** Regenerate the network from refreshed data (e.g., after an entry name changes).
   * Preserves viewport position. Called by the store facade when external documents change.
   * @param contentUuid - If provided, only regenerate if this web uses that content
   */
  const regenerate = async (contentUuid?: string) => {
    if (!currentNetwork.value || !currentStoryWeb.value)
      return;

    // Skip regeneration if the changed content isn't in this web
    if (contentUuid && !storyWebUsesContent(contentUuid))
      return;

    await refreshAndRegenerate();
  };

  ///////////////////////////////
  // registration with store facade
  const graphState: StoryWebGraphState = {
    currentContainer,
    currentNetwork,
    isWebLoading,
    isConnectionMode,
    addEntry,
    addFront,
    addDanger,
    removeNode,
    removeEdge,
    handleDropOnNode,
    addCustomNode,
    editCustomNode,
    setCustomNodeColorScheme,
    regenerate,
  };

  storyWebStore.registerGraphState(panelState.panelIndex.value, graphState);

  // Re-register under the new key when the panel is re-indexed after a panel removal
  watch(panelState.panelIndex, (newIndex, oldIndex) => {
    storyWebStore.unregisterGraphState(oldIndex);
    storyWebStore.registerGraphState(newIndex, graphState);
  });

  onScopeDispose(() => storyWebStore.unregisterGraphState(panelState.panelIndex.value));

  return graphState;
}
