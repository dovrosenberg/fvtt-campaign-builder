import './Editor.scss';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import { EditorJournalPage } from './EditorJournalSheet';

export type EditorData = {
  componentId: string;
}

export class Editor extends HandlebarsPartial<Editor.CallbackType> {
  static override _template = 'modules/world-builder/templates/Editor.hbs';
  private _id: string;

  private _sheet: EditorJournalPage;
  private _content: string;
  private _page: JournalEntryPage | null;

  constructor(page: JournalEntryPage | null) {
    super();

    // we create a random ID so we can use multiple instances
    this._id = 'fwb-editor-' + randomID();
    this._page = page;
    if (page) {
      this._sheet = new EditorJournalPage(page);
    }
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  // takes the current value
  public async getData(): Promise<EditorData> {
    let data;
    if (this._page) {
      data = {
        ...await this._sheet.getData(),
        componentId: this._id,
        content: this._content,
      };
    } else {
      data = {
        componentId: this._id,
        content: this._content,
      } ;
    }

    // log(false, data);
    return data;
  }

  public updateContent(content: string): void { 
    this._content = content;
  }

  public activateListeners(html: JQuery) {
    // editor button click
    //html.on('click', '.editor-edit', () => { this._onEdit(html); });

    debugger;
    this._sheet.activateListeners(html);
  }

  private _activate() {
  //  if (this.editors[name] != undefined) {
      // options = foundry.utils.mergeObject(options, {
      //     contextmenu: 'link createlink',
      //     plugins: CONFIG.TinyMCE.plugins + ' createlink background dcconfig template anchor',
      //     toolbar: CONFIG.TinyMCE.toolbar + ' background dcconfig template anchor',
      //     templates: CONFIG.TinyMCE.templates
      //     //font_formats: "Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Oswald=oswald; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings,zapf dingbats;Anglo Text=anglo_textregular;Lovers Quarrel=lovers_quarrelregular;Play=Play-Regular"
      // });

      // if (this.object.type == 'text' || this.object.type == 'journalentry' || this.object.type == 'oldentry' || setting("show-menubar")) {
      //     options = foundry.utils.mergeObject(options, { menubar: true });
      // }
      const options = {};
      const initialContent = 'abc';
      //this._sheet.activateEditor('description', options, initialContent);

    // //need this because foundry doesn't allow access to the init of the editor
    //   if (this.object.type == 'text' || this.object.type == 'journalentry' || this.object.type == 'oldentry' || setting("show-menubar")) {
    //       let count = 0;
    //       let that = this;
    //       let data = this.object.getFlag('monks-enhanced-journal', 'style');
    //       //if (data) {
    //           let timer = window.setInterval(function () {
    //               count++;
    //               if (count > 20) {
    //                   window.clearInterval(timer);
    //               }
    //               let editor = that.editors[name];
    //               if (editor && editor.mce) {
    //                   editor.mce.enhancedsheet = that;
    //                   that.updateStyle(data, $(editor.mce.contentDocument));
    //                   window.clearInterval(timer);
    //               }
    //           }, 100);
    //       //}
    // }
    //}
  }
  private _onEdit(html: JQuery) {
    debugger;
    this._activate();
    debugger;
    // if (this._editor.active) {
    //   //close the editor
    //   this._editor.active = false;
    //   const mce = this._editor.mce;

    //   const submit = this._onSubmit(new Event("mcesave"));

    //   mce.remove();
    //   if (this._editor.hasButton) this._editor.button.style.display = "";

    //   return submit.then(() => {
    //     mce.destroy();
    //     this._editor.mce = null;
    //     //this.render(true, { action:'update', data: {content: editor.initial, _id: this.object.id}}); //need to send this so that the render looks to the subsheet instead
    //     this._editor.changed = false;
    //     $('.fwb-tab-body', this.element).removeClass('editing');
    //   });
    //   this.saveEditor(name);
    // } else {
    //   if ($('.editor', this.element).is(":visible"))
    //     $('.editor .editor-edit', this.element).click();
    //   //$('.fwb-tab-body', this.element).addClass('editing');
    // }
  }

}


export namespace Editor {
  export enum CallbackType {
  }
}