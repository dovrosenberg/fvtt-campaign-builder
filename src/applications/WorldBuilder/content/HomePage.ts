import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import './HomePage.scss';

export const HOMEPAGE_TEMPLATE = 'modules/world-builder/templates/HomePage.hbs';

type HomePageData = {
}

export class HomePage extends HandlebarsPartial<HomePage.CallbackType>  {
  constructor() {
    super();
  }

  public async getData(): Promise<HomePageData> {
    const data = {
    };
  
    // log(false, data);
    return data;
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  public activateListeners(html: JQuery) {  
  }
}


export namespace HomePage {
  export enum CallbackType {
  }
}