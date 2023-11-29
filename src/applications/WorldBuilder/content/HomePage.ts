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
      // NEED TO PASS DOWN THE RECENT LIST FROM THE PARENT???

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