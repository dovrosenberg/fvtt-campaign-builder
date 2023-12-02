import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import './HomePage.scss';

type HomePageData = {
}

export class HomePage extends HandlebarsPartial<HomePage.CallbackType>  {
  static override _template = 'modules/world-builder/templates/HomePage.hbs';

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