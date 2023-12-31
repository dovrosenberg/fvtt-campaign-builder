import './Editor.scss';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import Document from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';

export type EditorData = {
  componentId: string;
}

export class Editor extends HandlebarsPartial<Editor.CallbackType, Editor.CallbackFunctionType<any>> {
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

  constructor() {
    super();

    // we create a random ID so we can use multiple instances
    this._id = 'fwb-editor-' + randomID();
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

  public attachEditor(document: Document<any>, initialContent: string) {
    this._document = document;
    this._initialContent = initialContent;
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
    const wrap = div.parentElement?.parentElement;
    const wc = div.closest('.window-content') as HTMLElement;

    if (!name || !button || !wrap || !wc)
      throw new Error('Missing name or button in _activateEditor()');

    // Determine the preferred editor height
    const heights = [wrap.offsetHeight].concat(wc ? [wc.offsetHeight] : []);
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

    if (engine === 'prosemirror') 
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

  private _configureProseMirrorPlugins() {
    return {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        destroyOnSave: true,  // note! this controls whether the save button or save & close button is shown,
        onSave: () => this.saveEditor()
      }),
      keyMaps: ProseMirror.ProseMirrorKeyMaps.build(ProseMirror.defaultSchema, {
        onSave: () => this.saveEditor()
      })
    };
  }

  private async saveEditor({remove}={remove:true}) {
    if (!this._instance)
      return;

    // get the new content
    let content;
    if (this._options.engine === 'tinymce') {
      const mceContent = this._instance.getContent();
      this.delete(this._mce.id); // Delete hidden MCE inputs
      content = mceContent;
    } else if (this._options.engine === 'prosemirror') {
      content = ProseMirror.dom.serializeString(this._instance.view.state.doc.content);
    } else {
      throw new Error(`Unrecognized enginer in saveEditor(): ${this._options.engine}`);
    }

    // Remove the editor - note... this means that we have to rerender, because it blows up the dom
    // There doesn't appear to be a way to toggle the editor back to view mode, which would avoid this issue
    if (remove) {
      this._instance.destroy();  
      this._instance = this._mce = null;
      if (this._hasButton) 
        this._button.style.display = '';
    }
    
    await this._makeCallback(Editor.CallbackType.EditorSaved, content);
  }
}


export namespace Editor {
  export enum CallbackType {
    EditorClosed,
    EditorSaved,
  }

  export type CallbackFunctionType<C extends CallbackType> = 
    C extends CallbackType.EditorClosed ? () => Promise<void> :
    C extends CallbackType.EditorSaved ? (content: string) => Promise<void> :
    never;  
}