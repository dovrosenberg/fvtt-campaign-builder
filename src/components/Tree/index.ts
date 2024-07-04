import './Tree.scss';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';

export type TreeData = {
  componentId: string,
}

export class Tree extends HandlebarsPartial<Tree.CallbackType, Tree.CallbackFunctionType<any>> {
  static override _template = 'modules/world-builder/templates/Tree.hbs';
  private _id: string;
  private _topNodes: TreeNode[];

  constructor(topNodes: TreeNode[]) {
    super();

    // we create a random ID so we can use multiple instances
    this._id = 'fwb-ta-' + foundry.utils.randomID();

    this._topNodes = topNodes;
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  public updateTree(topNodes: TreeNode[] ) {
    this._topNodes = topNodes;
  }

  // takes the current value
  public async getData(): Promise<TreeData> {
    const data = {
      componentId: this._id,
      topNodes: this._topNodes,
    };
  
    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {
    html.find('.tree-item').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();  // stop from expanding
      const value = event.currentTarget.dataset.value;
      await this._makeCallback(Tree.CallbackType.ItemClicked, value);
    });
  }
}

export type TreeNode = {
  text: string;   // the label
  value: string;   // a value to be passed up when clicked (ex. a uuid)
  children: TreeNode[];   // the children, if any
  expanded?: boolean;   // is it expanded
}

export namespace Tree {
  export enum CallbackType {
    ItemClicked,
  }

  export type CallbackFunctionType<C extends CallbackType> = 
    C extends CallbackType.ItemClicked ? (value: string) => Promise<void> :
    never;  
}