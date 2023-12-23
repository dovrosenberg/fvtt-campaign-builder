import './Editor.scss';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import { EditorJournalPage } from './EditorJournalPage';

export type EditorData = {
  componentId: string;
}

export class Editor extends HandlebarsPartial<Editor.CallbackType> {
  static override _template = 'modules/world-builder/templates/Editor.hbs';
  private _id: string;

  private _sheet: EditorJournalPage;
  private _content: string;
  private _page: JournalEntryPage | null;
  private _options: any;     //  = options;
  private _target: string;     // ???
  private _button: HTMLElement;        // reference to ???
  private _hasButton: boolean;     // does it have the button to open/close it
  private _mce: any;
  private _instance: Editor;   //the editor 
  private _active: boolean;   // ???
  private _changed: boolean;   // has it changed
  private _initial: string;   // initial text

  constructor(page: JournalEntryPage | null) {
    super();

    // we create a random ID so we can use multiple instances
    this._id = 'fwb-editor-' + randomID();
    this._page = page;
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  // takes the current value
  public async getData(): Promise<EditorData> {
    let data;
    if (this._page) {
      data = {
        componentId: this._id,
        content: this._content,
      };
    } else {
      data = {
        componentId: this._id,
        content: this._content,
      };
    }

    // log(false, data);
    return data;
  }

  public updateContent(content: string): void { 
    this._content = content;
  }

  public activateListeners(html: JQuery) {
    debugger;

    html.find('.editor-content[data-edit]').each((i, div) => this._activateEditor(div));
  }

  private _activateEditor(div: HTMLElement) {
    if (!this._page)
      return;

    // Get the editor content div
    const name = div.dataset.edit;
    const engine = div.dataset.engine || 'tinymce';
    const collaborate = div.dataset.collaborate === 'true';
    const button = div.previousElementSibling;
    const hasButton = true;   //button && button.classList.contains('editor-edit');
    const wrap = div.parentElement.parentElement;
    const wc = div.closest(".window-content");

    // Determine the preferred editor height
    const heights = [wrap.offsetHeight, wc ? wc.offsetHeight : null];
    if (div.offsetHeight > 0) 
      heights.push(div.offsetHeight);
    const height = Math.min(...heights.filter(h => Number.isFinite(h)));

    // Get initial content
    const options = {
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
    this._active = !hasButton;
    this._changed = false;
    this._initial = '';

    // Activate the editor immediately, or upon button click
    const activate = () => {
      debugger;
      this._initial = this._page.text?.content;
      this.activateEditor({}, this._initial);
    };
    if ( hasButton ) 
      button.onclick = activate;
    else 
      activate();
  }

  private async activateEditor(options={}, initialContent='') {
    options.document = this._page;
    if ( this._editor?.options.engine === "prosemirror" ) {
      options.plugins = foundry.utils.mergeObject({
        highlightDocumentMatches: ProseMirror.ProseMirrorHighlightMatchesPlugin.build(ProseMirror.defaultSchema)
      }, options.plugins);
    }

    options = foundry.utils.mergeObject(this._options, options);
    if ( !options.fitToSize ) 
      options.height = options.target.offsetHeight;
    if ( this._hasButton ) 
      this._button.style.display = 'none';
    
    const instance = this._instance = this._mce = await TextEditor.create(options, initialContent || this._initial);
    
    options.target.closest(".editor")?.classList.add(options.engine ?? "tinymce");
    this._changed = false;
    this._active = true;

    /* @deprecated since v10 */
    if ( options.engine !== "prosemirror" ) {
      instance.focus();
      instance.on("change", () => this._changed = true);
    }
    return instance;
  }

  private _configureProseMirrorPlugins(/*{remove=true}={}*/) {
    return {
      menu: ProseMirror.ProseMirrorMenu.build(ProseMirror.defaultSchema, {
        destroyOnSave: true,  //remove,
        onSave: () => this.saveEditor(/*{remove}*/)
      }),
      keyMaps: ProseMirror.ProseMirrorKeyMaps.build(ProseMirror.defaultSchema, {
        onSave: () => this.saveEditor(/*{remove}*/)
      })
    };
  }

  private async saveEditor() {
    debugger;
    // TODO: move all this logic to the parent, because that knows which field it is

    this._active = false;

    // save the data
    let content;
    if ( this._options.engine === "tinymce" ) {
      const mceContent = this._instance.getContent();
      this.delete(this._mce.id); // Delete hidden MCE inputs
      content = mceContent;
    } else if ( this._options.engine === "prosemirror" ) {
      content = ProseMirror.dom.serializeString(this._instance.view.state.doc.content);
    }

    await this._page?.update({
      'text.content': content,
    });

    // Remove the editor
    if ( remove ) {
      this._instance.destroy();
      this._instance = this._mce = null;
      if ( this._hasButton ) 
        this._button.style.display = 'block';
      
      // tell parent to rerender
      //this.render();
    }
    this._changed = false;
  }
}


export namespace Editor {
  export enum CallbackType {
  }
}