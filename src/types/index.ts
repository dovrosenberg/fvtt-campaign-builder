// contains typescript types used throughout the application

export type WindowTab = {
  id: string,   // unique id
  text: string,   // label on the 
  active: boolean,   // is this the currently active tab
  history: string[],    // array of the history of pageIds shown in this tab (for the forward/back arrows) 
  historyIdx: number,   // index of current history point
  entry: JournalEntry,  // reference to journal entry  -- leaving open possibility of expanding this type in the future
}

export type Bookmark = {
  id: string,   // id of the bookmark
  entityId: string,   // uuid of the entity shown
  text: string,  // text displayed on the bookmark
  icon: string,  // class of icon to display
}

export type ViewHistory = {
  entryId: string,   // uuid of the entry page
  name: string,   // name of page to show in history
}

// a class that handles rendering of a Handlebars partial
// getData() should be called in the parent getData() and passed to the partial as the only input
// activateListeners() should be called in the parent activateListeners() and passed in the JQuery element for the parent

// these classes also generally have other exposed properties that the parent might need and are passed
//    callbacks for various events the parent might need to know about
export interface HandlebarPartial {
  getData(): Promise<Record<string, any>>;
  activateListeners(html: JQuery<HTMLElement>): void ;
};
