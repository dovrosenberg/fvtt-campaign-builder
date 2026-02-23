<template>
  <div
    :id="editorId"
    ref="wrapperRef"
    class="fcb-editor-wrapper"
    :style="wrapperStyle"
    @copy="onCopy"
  >
    <!-- activation button positioned outside the scrolling area -->
    <a
      v-if="!props.editOnlyMode && props.editable"
      class="editor-edit"
      data-testid="editor-edit-button"
      :style="`display: ${ buttonDisplay }`"
      @click="activateEditor"
    >
      <i class="fa-solid fa-edit"></i>
    </a>
    <div
      class="fcb-editor"
    >
      <!-- this reproduces the Vue editor() Handlebars helper -->
      <!-- editorVisible used to reset the DOM by toggling-->
      <div
        v-if="editorVisible"
        :class="'editor ' + props.class"
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
    <!-- Resize handle - only shown when editable and not using fixed height -->
    <div
      v-if="props.editable && props.resizable && !props.editOnlyMode"
      class="resize-handle"
      @mousedown="onMouseDown"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, nextTick, onMounted, onUnmounted, ref, toRaw, watch, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { enrichFcbHTML } from './Editor/helpers';
  import { useMainStore } from '@/applications/stores';
  import { processUuidDrop } from '@/utils/uuidHandler';
  import DragDropService from '@/utils/dragDrop'; 
  import { notifyInfo } from '@/utils/notifications';
  import { localize } from '@/utils/game';
  import { sanitizeHTML } from '@/utils/sanitizeHtml';
  import { replaceEntityReferences } from '@/utils/entityLinking';
  import { extractUUIDs, compareUUIDs, } from '@/utils/uuidExtraction';
  import { registerEditor, unregisterEditor } from '@/utils/editorChangeDetection';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { handleCopyWithCleanUuids } from '@/utils/clipboardUuidCleaner';

  // library components

  // local components

  // types
  const TextEditor = foundry.applications.ux.TextEditor;
  const ProseMirror = foundry.prosemirror;

  // interface EditorOptions {
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
      type: Number,
      required: false,
      default: 0,
    },
    resizable: {
      type: Boolean,
      required: false,
      default: false,
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
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'editorSaved', content: string): void;
    (e: 'editorLoaded', content: string): void;  // to catch any initial transforms of the data 
    (e: 'relatedEntriesChanged', addedUUIDs: string[], removedUUIDs: string[]): void;
    (e: 'editorResized', height: number): void;
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
  const isResizing = ref<boolean>(false);
  const currentHeight = ref<number>(props.fixedHeight ? props.fixedHeight : 15); 
  const dragStartY = ref<number>(0);
  const dragStartHeight = ref<number>(0);

  const coreEditorRef = ref<HTMLDivElement>();
  const wrapperRef = ref<HTMLDivElement>();
  
  // min/max heights in rem
  const MIN_HEIGHT = 2.5;  // 40px
  const MAX_HEIGHT = 30;   // 480px
  const DEFAULT_HEIGHT = 15; // 240px minimum (15rem)

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

  const wrapperStyle = computed((): string => {
    if (props.fixedHeight && !props.resizable) {
      return `height: ${props.fixedHeight}rem; margin-bottom: 0.375rem`;
    } else if (props.resizable && currentHeight.value > 0) {
      return `height: ${currentHeight.value}rem; margin-bottom: 0.375rem`;
    }
    return '';
  });

  ////////////////////////////////
  // methods
  
  /**
   * Convert pixel values to rem units
   * @param px - The pixel value to convert
   * @returns The equivalent value in rem
   */
  const convertPxToRem = (px: number): number => {
    // Get the root font size from the document element
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return px / rootFontSize;
  };
  
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
    let height = DEFAULT_HEIGHT; // fallback to 240px minimum (15rem)
    
    // Use currentHeight if already set, otherwise calculate based on wrapper
    if (props.resizable) {
      height = Math.clamp(currentHeight.value, MIN_HEIGHT, MAX_HEIGHT);
    } else {
      const heightsInPx = [wrapperRef.value.offsetHeight].concat(wc ? [wc.offsetHeight] : []);
      
      const validHeightsInPx = heightsInPx.filter(h => Number.isFinite(h) && h > 0);
      
      const minHeightInPx = validHeightsInPx.length > 0 ? convertPxToRem(Math.min(...validHeightsInPx)) : DEFAULT_HEIGHT;
      
      height = Math.clamp(minHeightInPx, MIN_HEIGHT, MAX_HEIGHT);
      currentHeight.value = height;
    }

    // Get initial content
    const options = {
      // document: props.document,
      target: coreEditorRef.value,
      height, 
      engine: 'prosemirror' as const, 
      collaborate: props.collaborate,
      plugins: undefined as { menu: any; keyMaps: any } | undefined,
    };

    options.plugins = configureProseMirrorPlugins();

    if (!fitToSize && options.target.offsetHeight) 
      options.height = convertPxToRem(options.target.offsetHeight);
    
    buttonDisplay.value = 'none';
    
    editor.value = await TextEditor.create(options, props.initialContent);

    // Add custom drop handling to the ProseMirror editor
    const rawEditor = toRaw(editor.value) as ProseMirrorEditor;
    if (rawEditor?.view) {
      const proseMirrorView = rawEditor.view;
      const editorDom = proseMirrorView.dom;
      
      // Add our custom drop handler to the ProseMirror DOM element
      editorDom.addEventListener('dragover', onDragover);
      editorDom.addEventListener('drop', onDrop, true);  // capture=true makes it override prosemirror default handler
      editorDom.addEventListener('copy', onProseMirrorCopy, true);  // capture=true to intercept before ProseMirror
    }

    // we have to do this whole thing with lastSavedContent and sessionStore.lastSavedNotes because Foundry cleans the html in a different
    //   way than prosemirror (see https://github.com/foundryvtt/foundryvtt/issues/11021)
    lastSavedContent.value = ProseMirror.dom.serializeString(rawEditor.view.state.doc.content as any);
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
    const rawEditorForSave = toRaw(editor.value) as ProseMirrorEditor;
    content = ProseMirror.dom.serializeString(rawEditorForSave.view.state.doc.content as any);

    // see if dirty
    const dirty = isDirty();

    // Apply entity linking if enabled and content is dirty
    if (dirty && props.enableEntityLinking && currentSetting.value) {
      try {
        content = await replaceEntityReferences(content, props.currentEntityUuid || '');
      } catch (error) {
        console.error('Failed to apply entity linking:', error);
        // Continue with original content if entity linking fails
      }
    }

    // Check for UUID changes if related items tracking is enabled
    if (dirty && ModuleSettings.get(SettingKey.autoRelationships)) {
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
      (toRaw(editor.value) as ProseMirrorEditor)?.destroy();
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
      
      if (ModuleSettings.get(SettingKey.autoRelationships)) {
        initialUUIDs.value = [];
      }
      
      emit('editorSaved', content);
    }
  };

  // don't worry about saving, etc. - just clean up
  const closeEditor = async () => {
    if (!editor.value)
      return;

    // For edit-only mode (like in SessionNotes), don't destroy the editor
    if (!props.editOnlyMode) {
      // this also blows up the DOM... don't think we actually need it
      (toRaw(editor.value) as ProseMirrorEditor)?.destroy();  
      editor.value = null;

      buttonDisplay.value = '';   // brings the button back

      // bring back the deleted div by resetting 
      editorVisible.value = false;
      await nextTick();
      editorVisible.value = true;
    }    
  };

  const isDirty = (): boolean => {
    if (!editor.value)
      return false;
    
    return lastSavedContent.value !== getContent();
  }

  const getContent = (): string => {
    if (!editor.value)
      return '';
    
    const rawEditorForGetContent = toRaw(editor.value) as ProseMirrorEditor;
    return ProseMirror.dom.serializeString(rawEditorForGetContent.view.state.doc.content as any);
  }

  // expose methods
  defineExpose({ isDirty, getContent, saveEditor, closeEditor });

  ////////////////////////////////
  // event handlers
  const onDragover = (event: DragEvent) => {
    if (!props.editable) return;
      DragDropService.standardDragover(event);
  }

  const onCopy = (event: ClipboardEvent) => {
    // In edit mode, ProseMirror's own copy handler + onProseMirrorCopy handles it
    if (editor.value) return;
    // Read mode: clean UUID references from enriched HTML
    handleCopyWithCleanUuids(event);
  };

  const onProseMirrorCopy = (event: Event) => {
    const handled = handleCopyWithCleanUuids(event as ClipboardEvent);
    // Prevent ProseMirror's own copy handler from calling clearData() and overwriting our cleaned text
    if (handled) {
      event.stopImmediatePropagation();
    }
  };

  const onDrop = async (event: DragEvent) => {
    event.stopPropagation();

    // If the editor is not active, activate it first
    if (!editor.value && props.editable) {
      await activateEditor();
      // Give the editor time to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If editor is still not active or not editable, return
    if (!editor.value || !props.editable) return;

    // Process the UUID drop
    const result = await processUuidDrop(event);
    
    if (result.handled && result.linkText) {
      // Insert the link at the current cursor position
      const view = (toRaw(editor.value) as ProseMirrorEditor).view;
      const { state, dispatch } = view;
      const tr = state.tr.insertText(result.linkText);
      dispatch(tr);
    }
  };

  const onMouseDown = (event: MouseEvent) => {
    if (!props.editable || !props.resizable) return;
    
    isResizing.value = true;
    dragStartY.value = event.clientY;
    dragStartHeight.value = currentHeight.value || convertPxToRem(wrapperRef.value?.offsetHeight || DEFAULT_HEIGHT);
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    event.preventDefault();
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!isResizing.value) return;
    
    const deltaY = event.clientY - dragStartY.value;
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.value + convertPxToRem(deltaY))); 
    
    currentHeight.value = newHeight;
    
    // Update the ProseMirror editor height if active
    if (editor.value) {
      const editorElement = wrapperRef.value?.querySelector('.prosemirror .editor-content');
      if (editorElement) {
        // Adjust for menu bar
        const adjusted = Math.clamp(newHeight - convertPxToRem(50), MIN_HEIGHT, MAX_HEIGHT);
        (editorElement as HTMLElement).style.height = `${adjusted}rem`; 
      }
    }
  };

  const onMouseUp = () => {
    if (!isResizing.value) return;
    
    isResizing.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // Emit the new height
    if (currentHeight.value > 0) {
      emit('editorResized', currentHeight.value);
    }
  };

  ////////////////////////////////
  // watchers
  watch(() => props.fixedHeight, () => {
    currentHeight.value = props.fixedHeight ? props.fixedHeight : 15;
  });


  watch(() => props.initialContent, async (newContent) =>{
    if (!currentSetting.value)
      return;

    const content = newContent || '';
      
    // Initialize UUIDs for tracking if enabled
    if (ModuleSettings.get(SettingKey.autoRelationships)) {
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
      const view = (toRaw(editor.value) as ProseMirrorEditor).view;
      const { state, dispatch } = view;
      
      // Do nothing if the content is already what we want it to be
      const currentContent = ProseMirror.dom.serializeString(state.doc.content as any);
      if (currentContent === content) 
        return;
      
      // Create a transaction that replaces the entire document content
      const schema = state.schema;
      const newDoc = ProseMirror.dom.parseString(content, schema);
      const tr = state.tr.replaceWith(0, state.doc.content.size, newDoc.content);
      
      // Apply the transaction - this is throwing a Foundry ProseMirrorMenu plugin error, but it doesn't seem to matter as
      //    the update still happens
      try {
        dispatch(tr);
      } catch (error) {
        // just move on
      }
      
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

    // Register this editor instance for change tracking
    registerEditor(editorId.value, {
      isDirty,
      saveEditor,
      closeEditor,
    });

    // initialize the editor
    if (!coreEditorRef.value)
      return;

    editor.value = null;

    // show the pretty text - but only if we have a button... otherwise we're in permanent edit mode and shouldn't be enriching the text
    enrichedInitialContent.value = !props.editOnlyMode ? await enrichFcbHTML(currentSetting.value.uuid, props.initialContent || '') : props.initialContent || '';

    // Initialize UUIDs for tracking if enabled
    if (ModuleSettings.get(SettingKey.autoRelationships)) {
      initialUUIDs.value = extractUUIDs(props.initialContent || '');
    }

    if (props.editOnlyMode) {
      await nextTick();
      await activateEditor();
    }

    currentHeight.value = props.fixedHeight ? props.fixedHeight : 15;
  });

  onUnmounted(() => {
    // Unregister this editor instance when component is destroyed
    if (editorId.value) {
      unregisterEditor(editorId.value);
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
      z-index: 10;
      right: 12px;
      top: 3px;
      color: coral;
      font-family: var(--fcb-font-family);
      font-size: var(--fcb-font-size-large);
      font-weight: 400;

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
      border: 1px solid var(--fcb-button-border);
      overflow-y: auto !important;
      border-radius: 4px;
      font-family: var(--fcb-font-family);
      font-size: var(--fcb-font-size);
      font-weight: 400;
      padding: 0;
      background: var(--fcb-surface-2);
      color: var(--fcb-text);

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
      }

      &:focus-within {
        border: 2px solid var(--fcb-accent);
      }

      &:disabled {
        color: var(--fcb-text-muted);
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

  .resize-handle {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 20px;
    height: 20px;
    cursor: ns-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fcb-text-muted);
    background: var(--fcb-surface-2);
    border-radius: 3px;
    opacity: 0.5;
    transition: opacity 0.2s;
    z-index: 5;

    &:hover {
      opacity: 1;
      color: var(--fcb-text);
    }

     &::before {
      content: "";
      width: 12px;
      height: 12px;

      /* diagonal hatch */
      background: repeating-linear-gradient(
        135deg,
        currentColor 0px,
        currentColor 1px,
        transparent 1px,
        transparent 3px
      );

      /* clip to a bottom-right triangle */
      clip-path: polygon(100% 0%, 100% 100%, 0% 100%);

      opacity: 0.9;
     }
  }
</style>