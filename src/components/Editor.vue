<template>
  <div
    :id="editorId"
    ref="wrapperRef"
    class="fcb-editor"
    :style="wrapperStyle"
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
      <!-- activation button -->
      <a
        v-if="props.hasButton && props.editable"
        ref="buttonRef"
        class="editor-edit"
        :style="`display: ${ buttonDisplay }`"
        @click="activateEditor"
      >
        <i class="fa-solid fa-edit"></i>
      </a>
      <div
        ref="coreEditorRef"
        class="editor-content"
        v-bind="datasetProperties"
        v-html="enrichedInitialContent"
      >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // !!! TODO - use vue-safe-html instead of v-html!!!

  // library imports
  import { computed, nextTick, onMounted, PropType, ref, toRaw, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { enrichFwbHTML } from './Editor/helpers';
  import { useMainStore } from '@/applications/stores';
  import { Campaign, Entry, Session, WBWorld } from '@/classes';
  import { getValidatedData } from '@/utils/dragdrop';

  // library components

  // local components

  // types

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
    hasButton: {
      type: Boolean,
      required: false,
      default: false,
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
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'editorSaved', content: string): void;
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentWorld } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const editorId = ref<string>();
  const enrichedInitialContent = ref<string>('');
  const editor = ref<TextEditor | null>(null);
  const buttonDisplay = ref<string>('');   // is button currently visible
  const editorVisible = ref<boolean>(true);

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

  const wrapperStyle = computed((): string => (props.fixedHeight ? `height: ${props.fixedHeight + 'px'}` : ''));
  const innerStyle = computed((): string => (props.height ? `height: ${props.height + 'px'}` : ''));

  const editOnlyMode = computed((): boolean => {
    return props.editable && !props.hasButton
  });

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
   
    options.target.closest('.editor')?.classList.add('prosemirror');
  };

  const configureProseMirrorPlugins = () => {
    return {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        // In edit-only mode, we want to keep the editor open after saving
        destroyOnSave: !editOnlyMode.value,  // Controls whether the save button or save & close button is shown
        onSave: () => saveEditor({ remove: !editOnlyMode.value })
      }),
      keyMaps: ProseMirror.ProseMirrorKeyMaps.build(ProseMirror.defaultSchema, {
        onSave: () => saveEditor({ remove: !editOnlyMode.value })
      })
    };
  };

  const saveEditor = async ({remove}={remove:true}) => {
    if (!editor.value)
      return;

    // get the new content
    let content;
    // @ts-ignore - editor is a tinymce.Editor
    content = ProseMirror.dom.serializeString(toRaw(editor.value).view.state.doc.content);

    // For edit-only mode (like in SessionNotes), don't destroy the editor
    if (remove && !editOnlyMode.value) {
      // this also blows up the DOM... don't think we actually need it
      toRaw(editor.value).destroy();  
      editor.value = null;

      buttonDisplay.value = '';   // brings the button back

      // bring back the deleted div by resetting 
      editorVisible.value = false;
      await nextTick();
      editorVisible.value = true;
    } else {
      // if we're not removing it, then do a ui confirmation
      ui.notifications?.notify('Changes saved');
    }
    
    emit('editorSaved', content);
  };

  
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
      // From TopicDirectoryNodeWithChildren or TopicDirectoryNode
      entryUuid = data.childId;
      entryName = data.name;
    } else if (data.campaignNode) {
      // From DirectoryCampaignNode
      entryUuid = data.campaignId;
      entryName = data.name;
    } else if (data.worldNode) {
      // From TopicDirectory world
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
            const world = await WBWorld.fromUuid(entryUuid);
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
  watch(() => props.initialContent, async () =>{
    if (!currentWorld.value)
      return;
      
    enrichedInitialContent.value = await enrichFwbHTML(currentWorld.value.uuid, props.initialContent || '');

    // if edit-only and no editor exists yet, activate it
    if (editOnlyMode.value && !editor.value) {
      await activateEditor();
    }
    // If editor is already active, update its content
    else if (editor.value) {
      // Update the editor content
      const view = toRaw(editor.value).view;
      const { state, dispatch } = view;
      
      // Create a transaction that replaces the entire document content
      const schema = state.schema;
      const newDoc = ProseMirror.dom.parseString(enrichedInitialContent.value || '', schema);
      const tr = state.tr.replaceWith(0, state.doc.content.size, newDoc.content);
      
      // Apply the transaction
      dispatch(tr);
    }
  });

  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    if (!currentWorld.value)
      return;

    // we create a random ID so we can use multiple instances
    editorId.value  = 'fcb-editor-' + foundry.utils.randomID();

    // initialize the editor
    if (!coreEditorRef.value)
      return;

    editor.value = null;

    // show the pretty text
    enrichedInitialContent.value = await enrichFwbHTML(currentWorld.value.uuid, props.initialContent || '');

    if (!props.hasButton) {
      void activateEditor();
    }
  });

</script>

<style lang="scss">
  .fcb-editor {
    height: 100%;
    display: flex;
    flex: 1;
    border: 1px solid var(--fcb-button-border-color);
    overflow-y: auto !important;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.05);
    color: var(--color-dark-2);
    font-size: var(--font-size-14);
    font-weight: normal;
    font-family: var(--font-body);
    padding: 0;

    &:focus-within {
      border: 2px solid var(--color-warm-2);
    }

    &:disabled {
      color: var(--color-dark-4);
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
        }
      }
    }
  }

</style>