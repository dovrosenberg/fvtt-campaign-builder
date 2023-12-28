import './Tree.scss';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';

export type TreeData = {
  componentId: string,
}

type TreeNode = Tree.TreeNode;

export class Tree extends HandlebarsPartial<Tree.CallbackType, Tree.CallbackFunctionType<any>> {
  static override _template = 'modules/world-builder/templates/Tree.hbs';
  private _id: string;
  private _topNodes: TreeNode[];

  constructor(topNodes: TreeNode[]) {
    super();

    // we create a random ID so we can use multiple instances
    this._id = 'fwb-ta-' + randomID();

    this._topNodes = topNodes;

    this._topNodes = [
      {
        text: 'First Item',
        children: [
          {
            text: 'First subitem',
            children: []
          },
          {
            text: 'Second subitem',
            children: [
              {
                text: 'First 3 subitem',
                children: [
                  {
                    text: 'First 4 item',
                    children: [],
                  },
                  {
                    text: 'Second 4 item',
                    children: [],
                  },
                  {
                    text: 'Third 4 item',
                    children: [],
                  },
                ]
              }
            ]
          },
          {
            text: 'Third subitem',
            children: []
          },
        ]
      },
      {
        text: 'Second Item',
        children: [
          {
            text: 'First Item',
            children: [
              {
                text: 'First subitem',
                children: []
              },
              {
                text: 'Second subitem',
                children: [
                  {
                    text: 'First 3 subitem',
                    children: [
                      {
                        text: 'First 4 item',
                        children: [],
                      },
                      {
                        text: 'Second 4 item',
                        children: [],
                      },
                      {
                        text: 'Third 4 item',
                        children: [],
                      },
                    ]
                  }
                ]
              },
              {
                text: 'Third subitem',
                children: []
              },
            ]
          },
          {
            text: 'Second Item',
            children: []
          },
          {
            text: 'Third item',
            children: []
          }
        ]
      },
      {
        text: 'Third item',
        children: []
      }
    ];
  }

  protected _createPartials(): void {
    // no subcomponents
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