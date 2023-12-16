import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import './HomePage.scss';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';

export type HomePageData = {
}

export class HomePage extends HandlebarsPartial<HomePage.CallbackType>  {
  static override _template = 'modules/world-builder/templates/HomePage.hbs';

  constructor() {
    super();
  }

  public async getData(): Promise<HomePageData> {
    const data = {
      recent: UserFlags.get(UserFlagKey.recentlyViewed),
    };
  
    // log(false, data);
    return data;
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  public activateListeners(html: JQuery) {  
    html.find('.recent-link').on('click', (event: JQuery.ClickEvent)=> {
      if (event.currentTarget.dataset.entryId)
        this._makeCallback(HomePage.CallbackType.RecentClicked, event.currentTarget.dataset.entryId);
    });
  }
}


export namespace HomePage {
  export enum CallbackType {
    RecentClicked,
  }
}