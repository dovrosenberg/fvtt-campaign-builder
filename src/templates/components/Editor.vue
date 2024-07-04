 <template>
  <div ref="wrapper"
    :id="editorId" 
    class="fwb-editor"
  >
    <!-- this will create the DOM for the editor, the various properties are then read by the code to create the TextEditor component -->
    <div v-html="editorHelper(props.content, {
        target: 'content', 
        editable: true, 
        button: true,
        collaborate: false,
        engine: 'prosemirror'
      })"
    ></div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { editor as editorHelper } from '@/libs/VueHelpers.mjs';
  import { PropType, onMounted, ref, watch } from 'vue';

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
    content: {
      type: String,
      required: true,
    },
    document: {
      type: Object as PropType<Document<any>>,
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
  const wrapper = ref(null);
  const editorId = ref<string>();
  const initialContent = ref<string>('');
  const options = ref<EditorOptions>();
  const editor = ref<TextEditor | null>(null);
  const button = ref<HTMLElement>();
  const hasButton = ref<boolean>();
  const mce = ref<any>();

  //
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
 const activateEditor = async (): Promise<void> => {
    const optionSet = {
      ...options.value,
    } as typeof options.value
    & {
      fitToSize?: boolean
    };

    if (!optionSet.fitToSize) 
    optionSet.height = optionSet.target.offsetHeight;
    if (hasButton.value) 
      (button.value as HTMLElement).style.display = 'none';
    
    editor.value = mce.value = await TextEditor.create(optionSet, initialContent.value);
    
    optionSet.target.closest('.editor')?.classList.add(optionSet.engine ?? 'tinymce');

    /* @deprecated since v10 */
    if ( optionSet.engine !== 'prosemirror' ) {
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
    if ((options.value as EditorOptions).engine === 'tinymce') {
      const mceContent = editor.value.getContent();
      //this.delete(mce.value.id); // Delete hidden MCE inputs
      content = mceContent;
    } else if ((options.value as EditorOptions).engine === 'prosemirror') {
      // TODO
      content = ProseMirror.dom.serializeString(editor.value.view.state.doc.content);
    } else {
      throw new Error(`Unrecognized enginer in saveEditor(): ${(options.value as EditorOptions).engine}`);
    }

    // Remove the editor - note... this means that we have to rerender, because it blows up the dom
    // There doesn't appear to be a way to toggle the editor back to view mode, which would avoid this issue
    if (remove) {
      editor.value.destroy();  
      editor.value = mce.value = null;
      if (hasButton.value) 
        (button.value as HTMLElement).style.display = '';
    }
    
    emit('editorSaved', content);
  }

  
  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers
  watch(()=> props.content, () =>{

  });
  watch(()=> props.document, () =>{

  });

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    // we create a random ID so we can use multiple instances
    editorId.value  = 'fwb-editor-' + randomID();
    initialContent.value = props.content;

    // initialize the editor
    if (!wrapper.value)
      throw new Error('Cannot find wrapper in Editor onMounted()');

    const div: HTMLElement = $(wrapper.value as HTMLElement).find('.editor-content[data-edit]')[0];

    // Get the editor content div
    const name = div.dataset.edit;
    const engine = div.dataset.engine || 'tinymce';
    const collaborate = div.dataset.collaborate === 'true';
    const wrap = div.parentElement?.parentElement;
    const wc = div.closest('.window-content') as HTMLElement;

    button.value = div.previousElementSibling as HTMLElement;
    hasButton.value = true;   //button && button.classList.contains('editor-edit');

    if (!name || !button.value || !wrap || !wc)
      throw new Error('Missing name or button in activateEditor()');

    // Determine the preferred editor height
    const heights = [wrap.offsetHeight].concat(wc ? [wc.offsetHeight] : []);
    const height = Math.min(...heights.filter(h => Number.isFinite(h)));

    // Get initial content
    const initialOptions = {
      document: props.document,
      target: div,
      fieldName: name,
      height, 
      engine, 
      collaborate,
    };

    if (engine === 'prosemirror') 
      initialOptions.plugins = configureProseMirrorPlugins(/*{removed:hasButton}*/);

    // Define the editor configuration
    options.value = initialOptions;

    mce.value = null;
    editor.value = null;

    // Activate the editor immediately, or upon button click
    const activate = async () => {
      activateEditor();
    };
    
    if (hasButton) {
      button.value.onclick = activate;
    } else {
      void activate();
    }
  });

</script>

<style lang="scss">
  // .fwb-editor {
  // }
</style>