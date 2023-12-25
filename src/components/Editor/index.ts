import { updateDocument } from '@/compendia';
import './Editor.scss';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import Document from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';

export type EditorData = {
  componentId: string;
}

export class Editor extends HandlebarsPartial<Editor.CallbackType> {
  static override _template = 'modules/world-builder/templates/Editor.hbs';
  private _id: string;

  private _document: Document<any> | null;
  private _options: any;     //  = options;
  private _target: string;     // ???
  private _button: HTMLElement;        // reference to ???
  private _hasButton: boolean;     // does it have the button to open/close it
  private _mce: any;
  private _instance: TextEditor | null;   //the editor 
  private _initialContent: string;   // initial text

  constructor(document: Document<any>, fieldName: string, initialContent: string) {
    super();

    // we create a random ID so we can use multiple instances
    this._id = 'fwb-editor-' + randomID();
    this._document = document;
    this._initialContent = initialContent;
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  // takes the current value
  public async getData(): Promise<EditorData> {
    const data = {
      componentId: this._id,
      content: this._initialContent,  
    };

    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {
    html.find('.editor-content[data-edit]').each((i, div) => this._activateEditor(div));
  }

  private _activateEditor(div: HTMLElement) {
    // Get the editor content div
    const name = div.dataset.edit;
    const engine = div.dataset.engine || 'tinymce';
    const collaborate = div.dataset.collaborate === 'true';
    const button = div.previousElementSibling as HTMLElement;
    const hasButton = true;   //button && button.classList.contains('editor-edit');
    const wrap = div.parentElement.parentElement;
    const wc = div.closest(".window-content");

    if (!name || !button)
      throw new Error('Missing name or button in _activateEditor()');

    // Determine the preferred editor height
    const heights = [wrap.offsetHeight, wc ? wc.offsetHeight : null];
    if (div.offsetHeight > 0) 
      heights.push(div.offsetHeight);
    const height = Math.min(...heights.filter(h => Number.isFinite(h)));

    // Get initial content
    const options = {
      document: this._document,
      target: div,
      fieldName: name,
      height, 
      engine, 
      collaborate
    };

    if ( engine === "prosemirror" ) 
      options.plugins = this._configureProseMirrorPlugins(/*{removed:hasButton}*/);

    // Define the editor configuration
    this._options = options;
    this._target = name;
    this._button = button;
    this._hasButton = hasButton;
    this._mce = null;
    this._instance = null;

    // Activate the editor immediately, or upon button click
    const activate = async () => {
      void this.activateEditor();
    };
    if ( hasButton ) 
      button.onclick = activate;
    else 
      void activate();
  }

  private async activateEditor(): Promise<void> {
    const options = {
      ...this._options,
    };

    if ( this._editor?.options.engine === "prosemirror" ) {
      options.plugins = {
        ...options.plugins,
        //highlightDocumentMatches: ProseMirror.ProseMirrorHighlightMatchesPlugin.build(ProseMirror.defaultSchema)
      };
    }

    if (!options.fitToSize) 
      options.height = options.target.offsetHeight;
    if (this._hasButton) 
      this._button.style.display = 'none';
    
    this._instance = this._mce = await TextEditor.create(options, this._initialContent);
    
    options.target.closest('.editor')?.classList.add(options.engine ?? 'tinymce');

    /* @deprecated since v10 */
    if ( options.engine !== 'prosemirror' ) {
      this._instance.focus();
      //this._instance.on("change", () => this._changed = true);
    }
  }

  private _configureProseMirrorPlugins({remove}={remove:true}) {
    return {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        destroyOnSave: true,  //remove,
        onSave: () => this.saveEditor({remove})
      }),
      keyMaps: ProseMirror.ProseMirrorKeyMaps.build(ProseMirror.defaultSchema, {
        onSave: () => this.saveEditor({remove})
      })
    };
  }

  private async saveEditor({remove}: {remove:boolean}  ) {
    // TODO: move all this logic to the parent, because that knows which field it is (and we might
    //    actually be editing a flag, not a data field)

    // save the data
    let content;
    if ( this._options.engine === 'tinymce' ) {
      const mceContent = this._instance.getContent();
      this.delete(this._mce.id); // Delete hidden MCE inputs
      content = mceContent;
    } else if ( this._options.engine === 'prosemirror' ) {
      content = ProseMirror.dom.serializeString(this._instance.view.state.doc.content);
    } else {
      throw new Error(`Unrecognized enginer in saveEditor(): ${this._options.engine}`);
    }

    await updateDocument(this._document, {
      'text.content': content,
    });

    // Remove the editor
    if ( remove ) {
      this._instance.destroy();  // don't  it because that blows up the DOM so you can't recreate it without a render
      this._instance = this._mce = null;
      if ( this._hasButton ) 
        this._button.style.display = '';
      
      // tell parent to rerender
      //this.render();  
    }
  }
}


export namespace Editor {
  export enum CallbackType {
    EditorClosed,
    EditorSaved,
  }
}