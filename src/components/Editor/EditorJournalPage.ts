// class used for the editor box
export class EditorJournalPage extends JournalTextPageSheet {
  constructor(...args) { 
    super(...args);

    // whenever we have one of these, treat is as rendered
    //this._state = this.constructor.RENDER_STATES.RENDERED;
  }

  get isEditable() {
    return true;
  }

  public async getData(): Promise<any> {
    return await super.getData();
  }

  public activateListeners(html: JQuery) {
    super.activateListeners(html);
  }

  public async saveEditor(name: string, remove?: boolean): Promise<void> {
    debugger;

    super.saveEditor(name, remove);

    // probably raise an event up to parent to update???  or maybe just unlock the compendia, do the save with super() and relock
  }
}