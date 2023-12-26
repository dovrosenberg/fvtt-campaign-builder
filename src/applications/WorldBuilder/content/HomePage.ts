import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import './HomePage.scss';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
import { EntryHeader } from '@/types';

export type HomePageData = {
  recent: EntryHeader[],
}

export class HomePage extends HandlebarsPartial<HomePage.CallbackType, HomePage.CallbackFunctionType<any>>  {
  static override _template = 'modules/world-builder/templates/HomePage.hbs';

  private _worldId: string;

  constructor() {
    super();
  }

  public async getData(): Promise<HomePageData> {
    const data = {
      recent: UserFlags.get(UserFlagKey.recentlyViewed, this._worldId ) || [],
    };
  
    // log(false, data);
    return data;
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  public changeWorld(worldId: string): void {
    this._worldId = worldId;
  }

  public activateListeners(html: JQuery) {  
    html.find('.recent-link').on('click', async (event: JQuery.ClickEvent)=> {
      if (event.currentTarget.dataset.entryId)
        await this._makeCallback(HomePage.CallbackType.RecentClicked, event.currentTarget.dataset.entryId);
    });
  }
}


export namespace HomePage {
  export enum CallbackType {
    RecentClicked,
  }

  export type CallbackFunctionType<C extends CallbackType> = 
  C extends CallbackType.RecentClicked ? (uuid: string) => Promise<void> :
  never;  
}