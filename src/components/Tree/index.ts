import './Tree.scss';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';

export type TreeData = {
  componentId: string,
}

export class Tree extends HandlebarsPartial<Tree.CallbackType, Tree.CallbackFunctionType<any>> {
  static override _template = 'modules/world-builder/templates/Tree.hbs';
  private _id: string;

  constructor() {
    super();

    // we create a random ID so we can use multiple instances
    this._id = 'fwb-ta-' + randomID();
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  // takes the current value
  public async getData(): Promise<TreeData> {
    const data = {
      componentId: this._id,
    };
  
    // log(false, data);
    return data;
  }

  public activateListeners(/*html: JQuery*/) {
    console.log('click handlers');
  }
}

export namespace Tree {
  export enum CallbackType {
    ItemClicked,
  }

  export type TreeNode = {
    text: string;   // the label
    children: TreeNode[];   // the children, if any
  }

  export type CallbackFunctionType<C extends CallbackType> = 
    C extends CallbackType.ItemClicked ? (itemId: string) => Promise<void> :
    never;  
}