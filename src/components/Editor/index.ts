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
      };
    }

    // log(false, data);
    return data;
  }

  public updateContent(content: string): void { 
    this._content = content;
  }

  public activateListeners(html: JQuery) {
    this._sheet.activateListeners(html);
  }
}


export namespace Editor {
  export enum CallbackType {
  }
}