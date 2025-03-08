import { TabHeader, WindowTabType, WindowTabHistory } from '@/types';

export class WindowTab {

  /**
   * Id of the tab
   *
   * @type {string}
   * @memberof WindowTab
   */
  public id: string;   

  /**
   * Is this the currently active tab
   *
   * @type {boolean}
   * @memberof WindowTab
   */
  public active: boolean;   

  /**
   * Array of the history of ids/types shown in this tab (for the forward/back arrows) 
   *
   * @type {WindowTabHistory[]}
   * @memberof WindowTab
   */
  public history: WindowTabHistory[];     
  
  /**
   * Index of current history point
   *
   * @type {number}
   * @memberof WindowTab
   */
  public historyIdx: number;   

  /**
   * Reference to journal entry  -- leaving open possibility of expanding this type in the future
   *
   * @type {TabHeader}
   * @memberof WindowTab
   */
  public header: TabHeader;  

  constructor(active: boolean, header: TabHeader, contentId?: string | null, tabType?: WindowTabType | null, id: string | null = null, history: WindowTabHistory[] =[], historyIdx: number = -1) {
    if (id===null) {
      this.id = foundry.utils.randomID();
    } else {
      this.id = id;
    }

    this.active = active;
    this.header = header;

    if (!history || historyIdx<0) {
      this.history = [
        {
          contentId: contentId || null,
          tabType: tabType ?? WindowTabType.NewTab
        }
      ];
      this.historyIdx = 0;
    } else {
      this.history = history;
      this.historyIdx = historyIdx;
    }
  }

  /**
   * Gets the type of the currently active history point.
   *
   * @returns The type.
   */
  public get tabType(): WindowTabType {
    return this.history[this.historyIdx].tabType;
  }

  /**
   * Sets the type of the currently active history point.
   *
   * @remarks Does not change the current history index.
   * @param val - The type to set.
   */
  public set tabType(val : WindowTabType) {
    this.history[this.historyIdx].tabType = val;
  }


  /**
   * Retrieves the current content ID from the history at the current index.
   *
   * @returns The content ID of the currently active history point.
   */
  public get contentId(): string | null {
    return this.history[this.historyIdx].contentId;
  }

  /**
   * Sets the content ID of the currently active history point.
   *
   * @param val The new content ID.
   */
  public set contentId(val : string | null) {
    this.history[this.historyIdx].contentId = val;
  }

  /**
   * Adds a new history entry immediately after the current item and clears all forward history. 
   * Also updates the current history index to point to the new entry.
   *
   * @param contentId - The content ID of the new entry.
   * @param tabType - The type of the new entry.
   */
  public addToHistory(contentId: string, tabType: WindowTabType) {
    // if the history is empty other than a 'new tab', clear that out first
    if (this.history.length===1 && this.history[0].tabType===WindowTabType.NewTab) {
      this.history = [];
      this.historyIdx = -1;
    }
    
    // delete all history after the current entry
    this.history = this.history.slice(0, this.historyIdx+1);

    this.history.push({
      contentId: contentId,
      tabType: tabType
    });
    this.historyIdx = this.history.length-1;
  }
}
