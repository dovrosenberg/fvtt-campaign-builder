 <template>
  <div 
    ref="wrapperRef"
    :id="editorId" 
    class="fwb-editor flexcol"
  >
    <!-- this reproduces the Vue editor() Handlebars helper -->
     <div 
      ref="editorRef"
      :class="'editor ' + props.class"
      :style="(height ? height + 'px' : '')"
     >
      <!-- activation button -->
      <a v-if="props.hasButton && props.editable"
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
        v-html="initialContent ?? ''"
      >
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
  // !!! TODO - use vue-safe-html instead of v-html!!!

  // library imports
  import { PropType, computed, onMounted, ref, toRaw, watch } from 'vue';

  // local imports

  // library components

  // local components

  // types
  import Document from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
  type EditorOptions = {
    document: Document<any>,
    target: HTMLElement,
    fieldName: string,
    height: number, 
    engine: string, 
    collaborate: boolean,
    plugins?: any,
  };

  ////////////////////////////////
  // props
  const props = defineProps({
    document: {
      type: Object as PropType<Document<any>>,
      required: true,
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
    (e: 'editorSaved', content: string): void,
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const editorId = ref<string>();
  const initialContent = ref<string>('');
  const editor = ref<TextEditor | null>(null);
  const buttonDisplay = ref<string>('');   // is button currently visible

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
  })

  ////////////////////////////////
  // methods
  // shouldn't be called unless there's already a document
  // this creates the Editor class that converts the div into a 
  //    functional editor
  const activateEditor = async (): Promise<void> => {
    if (!props.document || !coreEditorRef.value)
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
      document: props.document,
      target: coreEditorRef.value,
      fieldName: props.target,
      height, 
      engine: props.engine, 
      collaborate: props.collaborate,
      plugins: undefined as { menu: any, keyMaps: any } | undefined,
    };

    if (props.engine === 'prosemirror') 
      options.plugins = configureProseMirrorPlugins(/*{removed:hasButton}*/);

    if (!fitToSize && options.target.offsetHeight) 
      options.height = options.target.offsetHeight;
    
    buttonDisplay.value = 'none';
    
    editor.value = await TextEditor.create(options, initialContent.value);
    
    options.target.closest('.editor')?.classList.add(props.engine);

    /* @deprecated since v10 */
    if ( props.engine !== 'prosemirror' ) {
      editor.value.focus();
      //editor.value.on("change", () => this._changed = true);
    }
  }

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
  }

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

      // bring back the deleted div
      let restoredDiv = document.createElement('div');
      restoredDiv.className = 'editor-content';
      // attach the data props
      for (const [key, value] of Object.entries(datasetProperties.value)) {
        restoredDiv.dataset[key] = value;
      }
      restoredDiv.innerHTML = initialContent.value ?? '';

      coreEditorRef.value = restoredDiv;
      editorRef.value?.append(restoredDiv);
    }
    
    initialContent.value = content;
    emit('editorSaved', content);
  }

  
  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers
  watch(()=> props.document, () =>{
    initialContent.value = props.document.text.content;
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    // we create a random ID so we can use multiple instances
    editorId.value  = 'fwb-editor-' + foundry.utils.randomID();

    // initialize the editor
    if (!coreEditorRef.value)
      return;

    editor.value = null;

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