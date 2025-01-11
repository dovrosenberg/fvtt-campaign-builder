<template>
  <div 
    :id="editorId" 
    ref="wrapperRef"
    class="fwb-editor flexcol"
  >
    <!-- this reproduces the Vue editor() Handlebars helper -->
    <!-- editorVisible used to reset the DOM by toggling-->
    <div 
      v-if="editorVisible"  
      ref="editorRef"
      :class="'editor ' + props.class"
      :style="(height ? height + 'px' : '')"
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
  import { computed, nextTick, onMounted, ref, toRaw, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { enrichFwbHTML } from './Editor/helpers';
  import { useMainStore } from '@/applications/stores';

  // library components

  // local components

  // types
  const ProseMirror = globalThis.foundry.prosemirror;

  // type EditorOptions = {
  //   document: Document<any>,
  //   target: HTMLElement,
  //   fieldName: string,
  //   height: number, 
  //   engine: string, 
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
    engine: {
      type: String,
      required: false,
      default: 'prosemirror',
    },
    height: {
      type: String,
      required: false,
      default: null,
    },
    target: {
      type: String,
      required: true,
    }  
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
  const editor = ref<globalThis.TextEditor | null>(null);
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
      engine: props.engine,
      collaborate: props.collaborate.toString(),
    } as Record<string, string>;

    if (props.editable) 
      dataset.edit = props.target;

    return dataset;
  });

  ////////////////////////////////
  // methods
  // shouldn't be called unless there's already a document
  // this creates the Editor class that converts the div into a 
  //    functional editor
  const activateEditor = async (): Promise<void> => {
    if (!coreEditorRef.value)
      return;

    const fitToSize = false;

    // if the window content is shorter, we want to handle that case (rare)
    const wc = coreEditorRef.value.closest('.window-content') as HTMLElement;

    if (!props.target || !buttonRef.value || !wrapperRef.value)
      throw new Error('Missing name or button in activateEditor()');

    // Determine the preferred editor height
    const heights = [wrapperRef.value.offsetHeight].concat(wc ? [wc.offsetHeight] : []);
    const height = Math.min(...heights.filter(h => Number.isFinite(h)));

    // Get initial content
    const options = {
      // document: props.document,
      target: coreEditorRef.value,
      fieldName: props.target,
      height, 
      engine: props.engine, 
      collaborate: props.collaborate,
      plugins: undefined as { menu: any; keyMaps: any } | undefined,
    };

    if (props.engine === 'prosemirror') 
      options.plugins = configureProseMirrorPlugins(/*{removed:hasButton}*/);

    if (!fitToSize && options.target.offsetHeight) 
      options.height = options.target.offsetHeight;
    
    buttonDisplay.value = 'none';
    
    editor.value = await globalThis.TextEditor.create(options, props.initialContent);
   
    options.target.closest('.editor')?.classList.add(props.engine);

    // /* @deprecated since v10 */
    // if ( props.engine !== 'prosemirror' ) {
    //   editor.value.focus();
    //   //editor.value.on("change", () => this._changed = true);
    // }
  };

  const configureProseMirrorPlugins = () => {
    return {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        destroyOnSave: true,  // note! this controls whether the save button or save & close button is shown,
        onSave: () => saveEditor()
      }),
      keyMaps: ProseMirror.ProseMirrorKeyMaps.build(ProseMirror.defaultSchema, {
        onSave: () => saveEditor()
      })
    };
  };

  const saveEditor = async ({remove}={remove:true}) => {
    if (!editor.value)
      return;

    // get the new content
    let content;
    if (props.engine === 'tinymce') {
      const mceContent = editor.value.getContent();
      //this.delete(editor.value.id); // Delete hidden MCE inputs
      content = mceContent;
    } else if (props.engine === 'prosemirror') {
      content = ProseMirror.dom.serializeString(toRaw(editor.value).view.state.doc.content);
    } else {
      throw new Error(`Unrecognized enginer in saveEditor(): ${props.engine}`);
    }

    // Remove the editor
    if (remove) {
      // this also blows up the DOM... don't think we actually need it
      toRaw(editor.value).destroy();  
      editor.value = null;

      buttonDisplay.value = '';   // brings the button back

      // bring back the deleted div by resetting 
      editorVisible.value = false;
      await nextTick();
      editorVisible.value = true;
    }
    
    emit('editorSaved', content);
  };

  
  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers
  watch(() => props.initialContent, async () =>{
    if (!currentWorld.value)
      return;
      
    enrichedInitialContent.value = await enrichFwbHTML(currentWorld.value.uuid, props.initialContent || '');
  });

  
  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    if (!currentWorld.value)
      return;

    // we create a random ID so we can use multiple instances
    editorId.value  = 'fwb-editor-' + globalThis.foundry.utils.randomID();

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
  .fwb-editor {
    flex: 1 !important;
  }
</style>