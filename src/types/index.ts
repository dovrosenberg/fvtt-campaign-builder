export type WindowTab = {
  id: string,   // unique id
  text: string,   // label on the 
  active: boolean,   // is this the currently active tab
  history: string[],    // array of the history of entryIds shown in this tab (for the forward/back arrows) 
  historyIdx: number,   // index of current history point
  entry: JournalEntry,  // reference to journal entry  -- leaving open possibility of expanding this type in the future
}

export type Bookmark = {
  id: string,   // id of the bookmark
  entryId: string,   // uuid of the entry shown
  text: string,  // text displayed on the bookmark
  icon: string,  // class of icon to display
}

export type RecentItem = {
  entryId: string,   // uuid of the entry page
  name: string,   // name of page to show 
}

export enum TopicTypes {
  Event,
  Character,
  Location,
  Organization,
  //Note - maybe the ability to just handle normal journal notes?
}

// flags that might apply to any topic
export enum TopicFlags {
  type = 'type',
}