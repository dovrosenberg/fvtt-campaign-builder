<template>
  <div
    :id="editorId"
    ref="wrapperRef"
    class="fcb-editor-wrapper"
    :style="wrapperStyle"
  >
    <!-- activation button positioned outside the scrolling area -->
    <a
      v-if="!props.editOnlyMode && props.editable"
      ref="buttonRef"
      class="editor-edit"
      :style="`display: ${ buttonDisplay }`"
      @click="activateEditor"
    >
      <i class="fa-solid fa-edit"></i>
    </a>
    <div
      class="fcb-editor"
      @drop="onDrop"
      @dragover="onDragover"
    >
      <!-- this reproduces the Vue editor() Handlebars helper -->
      <!-- editorVisible used to reset the DOM by toggling-->
      <div
        v-if="editorVisible"
        ref="editorRef"
        :class="'editor ' + props.class"
        :style="innerStyle"
      >
        <div
          ref="coreEditorRef"
          class="editor-content"
          v-bind="datasetProperties"
          v-html="safeEnrichedContent"
        >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, nextTick, onMounted, ref, toRaw, watch, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { enrichFcbHTML } from './Editor/helpers';
  import { useMainStore } from '@/applications/stores';
  import { Campaign, Entry, Session, Setting } from '@/classes';
  import { getValidatedData } from '@/utils/dragdrop';
  import { notifyInfo } from '@/utils/notifications';
  import { localize } from '@/utils/game';
  import { sanitizeHTML } from '@/utils/sanitizeHtml';
  import { replaceEntityReferences } from '@/utils/entityLinking';
  import { extractUUIDs, compareUUIDs, } from '@/utils/uuidExtraction';


  // library components

  // local components

  // types
  const TextEditor = foundry.applications.ux.TextEditor;

  // type EditorOptions = {
  //   document: Document<any>,
  //   fieldName: string,
  //   height: number, 
  //   engine: 'tinymce' | 'prosemirror', 
  //   collaborate: boolean,
  //   plugins?: any,
  // };

  ////////////////////////////////
  // props
  const props = defineProps({
    editOnlyMode: {
      type: Boolean,
      required: false,
      default: false,
    },
    initialContent: {
      type: String,
      required: false,
      default: undefined,
    }, 
    class: {
      type: String,
      required: false,
      default: '',
    },
    editable: {
      type: Boolean,
      required: false,
      default: true,
    },
    collaborate: {
      type: Boolean,
      required: false,
      default: false,
    },
    height: {
      type: String,
      required: false,
      default: null,
    },
    fixedHeight: {
      type: String,
      required: false,
      default: null,
    },
    currentEntityUuid: {
      type: String,
      required: false,
      default: undefined,
    },
    enableEntityLinking: {
      type: Boolean,
      required: false,
      default: true,
    },
    enableRelatedEntriesTracking: {
      type: Boolean,
      required: false,
      default: false,
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'editorSaved', content: string): void;
    (e: 'editorLoaded', content: string): void;  // to catch any initial transforms of the data 
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentSetting } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const editorId = ref<string>();
  const enrichedInitialContent = ref<string>('');
  const editor = ref<TextEditor | null>(null);
  const buttonDisplay = ref<string>('');   // is button currently visible
  const editorVisible = ref<boolean>(true);
  const lastSavedContent = ref<string>('');   // the parsemirror serialized content last saved, to see if any changes were made
  const initialUUIDs = ref<string[]>([]);     // UUIDs present when editor was first loaded

  const coreEditorRef = ref<HTMLDivElement>();
  const editorRef = ref<HTMLDivElement>();
  const wrapperRef = ref<HTMLDivElement>();
  const buttonRef = ref<HTMLElement>();
  
  //
  ////////////////////////////////
  // computed data
  const datasetProperties = computed((): Record<string, string> => {
    const dataset = {
      engine: 'prosemirror',
      collaborate: props.collaborate.toString(),
    } as Record<string, string>;

    return dataset;
  });

  const safeEnrichedContent = computed((): string => (sanitizeHTML(enrichedInitialContent.value)));

  const wrapperStyle = computed((): string => (props.fixedHeight ? `height: ${props.fixedHeight + 'px'}` : ''));
  const innerStyle = computed((): string => (props.height ? `height: ${props.height + 'px'}` : ''));

  ////////////////////////////////
  // methods
  // shouldn't be called unless there's already a document
  // this creates the Editor class that converts the div into a functional editor
  const activateEditor = async (): Promise<void> => {
    if (!coreEditorRef.value)
      return;

    const fitToSize = false;

    // if the window content is shorter, we want to handle that case (rare)
    const wc = coreEditorRef.value.closest('.window-content') as HTMLElement;

    if (!wrapperRef.value)
      throw new Error('Missing name in activateEditor()');

    // Determine the preferred editor height
    const heights = [wrapperRef.value.offsetHeight].concat(wc ? [wc.offsetHeight] : []);
    const height = Math.min(...heights.filter(h => Number.isFinite(h)));

    // Get initial content
    const options = {
      // document: props.document,
      target: coreEditorRef.value,
      height, 
      engine: 'prosemirror', 
      collaborate: props.collaborate,
      plugins: undefined as { menu: any; keyMaps: any } | undefined,
    };

    options.plugins = configureProseMirrorPlugins();

    if (!fitToSize && options.target.offsetHeight) 
      options.height = options.target.offsetHeight;
    
    buttonDisplay.value = 'none';
    
    editor.value = await TextEditor.create(options, props.initialContent);

    // we have to do this whole thing with lastSavedContent and sessionStore.lastSavedNotes because Foundry cleans the html in a different
    //   way than prosemirror (see https://github.com/foundryvtt/foundryvtt/issues/11021)
    lastSavedContent.value = ProseMirror.dom.serializeString(toRaw(editor.value).view.state.doc.content);
    emit('editorLoaded', lastSavedContent.value);
   
    options.target.closest('.editor')?.classList.add('prosemirror');
  };

  const configureProseMirrorPlugins = () => {
    return {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        // In edit-only mode, we want to keep the editor open after saving
        destroyOnSave: !props.editOnlyMode,  // Controls whether the save button or save & close button is shown
        onSave: () => saveEditor({ remove: !props.editOnlyMode })
      }),
      keyMaps: ProseMirror.ProseMirrorKeyMaps.build(ProseMirror.defaultSchema, {
        onSave: () => saveEditor({ remove: !props.editOnlyMode })
      })
    };
  };

  const saveEditor = async ({remove}={remove:true}) => {
    if (!editor.value)
      return;

    // get the new content
    let content;
    // @ts-ignore 
    content = ProseMirror.dom.serializeString(toRaw(editor.value).view.state.doc.content);

    // see if dirty
    const dirty = isDirty();

    // Apply entity linking if enabled and content is dirty
    if (dirty && props.enableEntityLinking && currentSetting.value) {
      try {
        content = await replaceEntityReferences(content, currentSetting.value, {
          currentEntityUuid: props.currentEntityUuid
        });
      } catch (error) {
        console.error('Failed to apply entity linking:', error);
        // Continue with original content if entity linking fails
      }
    }

    // Check for UUID changes if related items tracking is enabled
    if (dirty && props.enableRelatedEntriesTracking) {
      const currentUUIDs = extractUUIDs(content);
      const { added, removed } = compareUUIDs(initialUUIDs.value, currentUUIDs);
      
      if (added.length > 0 || removed.length > 0) {
        // Emit the UUID changes for the parent component to handle
        emit('relatedEntriesChanged', added, removed);
      }
    }

    // For edit-only mode (like in SessionNotes), don't destroy the editor
    if (remove && !props.editOnlyMode) {
      // this also blows up the DOM... don't think we actually need it
      toRaw(editor.value)?.destroy();  
      editor.value = null;

      buttonDisplay.value = '';   // brings the button back

      // bring back the deleted div by resetting 
      editorVisible.value = false;
      await nextTick();
      editorVisible.value = true;
    } else if (dirty) {
      // if we're not removing it, then do a ui confirmation
      notifyInfo(localize('notifications.changesSaved'));
    }
    
    if (dirty) {
      lastSavedContent.value = content;
      
      if (props.enableRelatedEntriesTracking) {
        initialUUIDs.value = [];
      }
      
      emit('editorSaved', content);
    }
  };

  const isDirty = (): boolean => {
    if (!editor.value)
      return false;
    
    return lastSavedContent.value !== ProseMirror.dom.serializeString(toRaw(editor.value).view.state.doc.content);
  }

  // expose methods
  defineExpose({ isDirty });

  ////////////////////////////////
  // event handlers
  const onDragover = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // If the editor is not active, activate it first
    if (!editor.value && props.editable) {
      await activateEditor();
      // Give the editor time to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If editor is still not active or not editable, return
    if (!editor.value || !props.editable) return;

    // Parse the data using the utility function
    const data = getValidatedData(event);
    if (!data) return;

    let entryUuid: string | null = null;
    let entryName: string | null = null;

    // Handle different data structures from various drag sources
    if (data.entryNode) {
      // From SettingDirectoryNodeWithChildren or SettingDirectoryNode
      entryUuid = data.childId;
      entryName = data.name;
    } else if (data.campaignNode) {
      // From DirectoryCampaignNode
      entryUuid = data.campaignId;
      entryName = data.name;
    } else if (data.worldNode) {
      // From SettingDirectory world
      entryUuid = data.worldId;
      entryName = data.name;
    } else if (data.sessionNode) {
      // From SessionDirectoryNode
      entryUuid = data.sessionId;
      entryName = data.name;
    } else {
      return;  // nothing we can handle
    }

    // If we found a valid UUID, create and insert the link
    if (entryUuid) {
      // We should already have the name from the drag data, but if not, try to get it
      if (!entryName) {
        try {
          // Try to get the name based on the type of entity
          if (data.campaignNode) {
            // It's a campaign
            const campaign = await Campaign.fromUuid(entryUuid);
            if (campaign) {
              entryName = campaign.name;
            }
          } else if (data.sessionNode) {
            // It's a session
            const session = await Session.fromUuid(entryUuid);
            if (session) {
              entryName = session.name;
            }
          } else if (data.worldNode) {
            // It's a world
            const world = await Setting.fromUuid(entryUuid);
            if (world) {
              entryName = world.name;
            }
          } else {
            // Try as a regular entry
            const entry = await Entry.fromUuid(entryUuid);
            if (entry) {
              entryName = entry.name;
            }
          }
        } catch (e) {
          // If we can't get the name, use a generic one
          entryName = 'Link to ???';
        }
      }

      // Fallback if name is still not available
      if (!entryName) {
        entryName = 'Link to ???';
      }

      // Create a UUID link in the format @UUID[entryUuid]{entryName}
      const linkText = `@UUID[${entryUuid}]{${entryName}}`;

      // Insert the link at the current cursor position
      // For ProseMirror
      const view = toRaw(editor.value).view;
      const { state, dispatch } = view;
      const tr = state.tr.insertText(linkText);
      dispatch(tr);
    }
  };

  ////////////////////////////////
  // watchers
  watch(() => props.initialContent, async (newContent) =>{
    if (!currentSetting.value)
      return;

    const content = newContent || '';
      
    // Initialize UUIDs for tracking if enabled
    if (props.enableRelatedEntriesTracking) {
      initialUUIDs.value = extractUUIDs(content);
    }

    // if edit-only and no editor exists yet, activate it
    if (props.editOnlyMode && !editor.value) {
      await nextTick();
      await activateEditor();
    }
    // If editor is already active, update its content
    else if (editor.value) {
      await nextTick();

      // Update the editor content
      const view = toRaw(editor.value).view;
      const { state, dispatch } = view;
      
      // Do nothing if the content is already what we want it to be
      const currentContent = ProseMirror.dom.serializeString(state.doc.content);
      if (currentContent === content) 
        return;
      
      // Create a transaction that replaces the entire document content
      const schema = state.schema;
      const newDoc = ProseMirror.dom.parseString(content, schema);
      const tr = state.tr.replaceWith(0, state.doc.content.size, newDoc.content);
      
      // Apply the transaction
      dispatch(tr);
      lastSavedContent.value = content;
    } else {
      enrichedInitialContent.value = await enrichFcbHTML(currentSetting.value.uuid, content);
    }
  });

  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    if (!currentSetting.value)
      return;

    // we create a random ID so we can use multiple instances
    editorId.value  = 'fcb-editor-' + foundry.utils.randomID();

    // initialize the editor
    if (!coreEditorRef.value)
      return;

    editor.value = null;

    // show the pretty text - but only if we have a button... otherwise we're in permananent edit mode and shouldn't be enriching the text
    enrichedInitialContent.value = !props.editOnlyMode ? await enrichFcbHTML(currentSetting.value.uuid, props.initialContent || '') : props.initialContent || '';

    // Initialize UUIDs for tracking if enabled
    if (props.enableRelatedEntriesTracking) {
      initialUUIDs.value = extractUUIDs(props.initialContent || '');
    }

    if (props.editOnlyMode) {
      await nextTick();
      await activateEditor();
    }
  });

</script>

<style lang="scss">
  .fcb-editor-wrapper {
    height: 100%;
    display: flex;
    flex: 1;
    position: relative;

    .editor-edit {
      position: absolute;
      z-index: 1000;
      right: 12px;
      top: 3px;
      color: coral;
      font-family: var(--font-body);
      font-size: var(--font-size-14);
      font-weight: normal;

      &:hover {
        color: green;
        background: orange;
        box-shadow: 0 0 5px red;
      }
    }

    .fcb-editor {
      height: 100%;
      width: 100%;
      display: flex;
      flex: 1;
      border: 1px solid var(--fcb-button-border-color);
      overflow-y: auto !important;
      border-radius: 4px;
      font-family: var(--font-body);
      font-size: var(--font-size-14);
      font-weight: normal;
      padding: 0;
      background: var(--fcb-dark-overlay);
      color: var(--color-dark-2);

      .editor {
        overflow: visible;
        height: 100%;
        width: 100%;
        min-height: 100%;
        position: relative;

        .editor-content {
          overflow-y: visible;
          height: unset;
          min-height: calc(100% - 8px);
          padding: 2px;
        }
      }

      .theme-dark & {
        background: var(--fcb-light-overlay);
        color: var(--color-light-2);
      }

      &:focus-within {
        border: 2px solid var(--color-warm-2);
      }

      &:disabled {
        color: var(--color-dark-4);

        .theme-dark & {
           background: var(--color-light-4);
        }
      }

      .prosemirror {
        width: 100%;
        
        .editor-menu {
          padding: 4px 0 4px 8px;
        }
        .editor-container {
          margin: 0px;

          .editor-content {
            padding: 0 8px 0 3px;

            &:focus-visible {
              outline: none;  // override the default focus outline
            }
          }
        }
      }
    }
  }

</style>