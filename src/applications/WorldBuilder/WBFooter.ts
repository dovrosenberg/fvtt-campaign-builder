import { HandlebarsPartial } from '@/applications/HandlebarsPartial';
import './WBFooter.scss';

type WBFooterData = Record<string, never>;

export class WBFooter extends HandlebarsPartial<WBFooter.CallbackType, WBFooter.CallbackFunctionType>  {
  static override _template = 'modules/world-builder/templates/WBFooter.hbs';

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

  public activateListeners(/*html: JQuery*/) { /* do nothing */ }
}


export namespace WBFooter {
  export enum CallbackType {
  }

  export type CallbackFunctionType/*<C extends CallbackType>*/ = 
    never;  
}