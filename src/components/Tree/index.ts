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
        value: '19',
        children: [
          {
            text: 'First subitem',
            value: '1',
            children: []
          },
          {
            text: 'Second subitem',
            value: '2',
            children: [
              {
                text: 'First 3 subitem',
                value: '3',
                children: [
                  {
                    text: 'First 4 item',
                    value: '4',
                    children: [],
                  },
                  {
                    text: 'Second 4 item',
                    value: '5',
                    children: [],
                  },
                  {
                    text: 'Third 4 item',
                    value: '6',
                    children: [],
                  },
                ]
              }
            ]
          },
          {
            text: 'Third subitem',
            value: '7',
            children: []
          },
        ]
      },
      {
        text: 'Second Item',
        value: '7',
        children: [
          {
            text: 'First Item',
            value: '18',
            children: [
              {
                text: 'First subitem',
                value: '8',
                children: []
              },
              {
                text: 'Second subitem',
                value: '9',
                children: [
                  {
                    text: 'First 3 subitem',
                    value: '10',
                    children: [
                      {
                        text: 'First 4 item',
                        value: '11',
                        children: [],
                      },
                      {
                        text: 'Second 4 item',
                        value: '12',
                        children: [],
                      },
                      {
                        text: 'Third 4 item',
                        value: '13',
                        children: [],
                      },
                    ]
                  }
                ]
              },
              {
                text: 'Third subitem',
                value: '14',
                children: []
              },
            ]
          },
          {
            text: 'Second Item',
            value: '15',
            children: []
          },
          {
            text: 'Third item',
            value: '16',
            children: []
          }
        ]
      },
      {
        text: 'Third item',
        value: '17',
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

  public activateListeners(html: JQuery) {
    html.find('.tree-item').on('click', async (event: JQuery.ClickEvent) => {
      event.preventDefault();  // stop from expanding
      const value = event.currentTarget.dataset.value;
      await this._makeCallback(Tree.CallbackType.ItemClicked, value);
    });
  }
}

export namespace Tree {
  export enum CallbackType {
    ItemClicked,
  }

  export type TreeNode = {
    text: string;   // the label
    value: string;   // a value to be passed up when clicked (ex. a uuid)
    children: TreeNode[];   // the children, if any
  }

  export type CallbackFunctionType<C extends CallbackType> = 
    C extends CallbackType.ItemClicked ? (value: string) => Promise<void> :
    never;  
}