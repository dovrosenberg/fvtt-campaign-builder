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
  private _editor: TextEditor | null;

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

  private _activateEditor(div) {
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
    this._editor = {
      options,
      target: name,
      button: button,
      hasButton: hasButton,
      mce: null,
      instance: null,
      active: !hasButton,
      changed: false,
      initial: foundry.utils.getProperty(this._page, name)
    };

    // Activate the editor immediately, or upon button click
    const activate = () => {
      debugger;
      this._editor.initial = this._page.text?.content;
      this.activateEditor({}, this._editor.initial);
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

    options = foundry.utils.mergeObject(this._editor.options, options);
    if ( !options.fitToSize ) 
      options.height = options.target.offsetHeight;
    if ( this._editor.hasButton ) 
      this._editor.button.style.display = 'none';
    
    const instance = this._editor.instance = this._editor.mce = await TextEditor.create(options, initialContent || this._editor.initial);
    
    options.target.closest(".editor")?.classList.add(options.engine ?? "tinymce");
    this._editor.changed = false;
    this._editor.active = true;

    /* @deprecated since v10 */
    if ( options.engine !== "prosemirror" ) {
      instance.focus();
      instance.on("change", () => this._editor.changed = true);
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

    this._editor.active = false;

    // save the data
    let content;
    if ( this._editor.options.engine === "tinymce" ) {
      const mceContent = this._editor.instance.getContent();
      this.delete(this._editor.mce.id); // Delete hidden MCE inputs
      content = mceContent;
    } else if ( this._editor.options.engine === "prosemirror" ) {
      content = ProseMirror.dom.serializeString(this._editor.instance.view.state.doc.content);
    }

    await this._page?.update({
      'text.content': content,
    });

    // Remove the editor
    if ( remove ) {
      this._editor.instance.destroy();
      this._editor.instance = this._editor.mce = null;
      if ( this._editor.hasButton ) 
        this._editor.button.style.display = 'block';
      
      // tell parent to rerender
      //this.render();
    }
    this._editor.changed = false;
  }
}


export namespace Editor {
  export enum CallbackType {
  }
}