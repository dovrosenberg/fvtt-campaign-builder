import { HandlebarPartial } from '@/types';
import './WBFooter.scss';
import { WorldBuilder } from './WorldBuilder';

export const WBFOOTER_TEMPLATE = 'modules/world-builder/templates/WBFooter.hbs';

type WBFooterData = {
}

export class WBFooter implements HandlebarPartial  {
  private _parent: WorldBuilder;   // the parent object

  constructor(parent: WorldBuilder) {
    this._parent = parent;
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

