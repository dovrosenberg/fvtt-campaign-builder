import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import './WBFooter.scss';

export const WBFOOTER_TEMPLATE = 'modules/world-builder/templates/WBFooter.hbs';

type WBFooterData = {
}

export class WBFooter extends HandlebarsPartial<WBFooter.CallbackType>  {
  constructor() {
    super();
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  public async getData(): Promise<WBFooterData> {
    const data = {
    };
  
    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {  
  }
}


export namespace WBFooter {
  export enum CallbackType {
  }
}