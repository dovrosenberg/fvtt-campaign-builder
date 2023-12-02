// represents a sheet that can be shown in the content window
// it can be for any topic (and handles the differences between topic types)

import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import { TopicTypes } from '@/types';

type TopicSheetData = {
}

export class TopicSheet extends HandlebarsPartial<TopicSheet.CallbackType> {
  private _entry: string | null;
  private _topicType: TopicTypes | null;

  static override _template = 'modules/world-builder/templates/TopicSheet.hbs';

  constructor(entryId?: string | null, options={}) {
    super();
  }

  // load a different entry
  public updateEntry(entry: JournalEntry) {

  }

  protected _createPartials(): void {
  }

  public async getData(): Promise<TopicSheetData> {
    let data;

    // log(false, data);
    return {};
  }

  public activateListeners(html: JQuery) {  
  }
}

export namespace TopicSheet {
  export enum CallbackType {
  }
}

