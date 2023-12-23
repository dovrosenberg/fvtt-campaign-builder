// class used for the editor box
export class EditorJournalPage extends JournalTextPageSheet {
  constructor(...args) { 
    super(...args);
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
}