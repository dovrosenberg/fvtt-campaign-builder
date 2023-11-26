import '@/../styles/WBFooter.scss';
import { WorldBuilder } from './WorldBuilder';

type WBFooterData = {
}

export class WBFooter {
  private _parent: WorldBuilder;   // the parent object

  constructor(parent: WorldBuilder) {
    this._parent = parent;
  }

  public async render(): Promise<void> {
    // note: new object structure of parameter is OK, despite typescript error
    await loadTemplates({
      WBFooter: 'modules/world-builder/templates/WBFooter.hbs'
    });  
  }

  public getData(): WBFooterData {
    const data = {
    };
  
    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {  
  }
}

