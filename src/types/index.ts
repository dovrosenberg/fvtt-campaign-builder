export type WindowTab = {
  id: string;   // unique id
  active: boolean;   // is this the currently active tab
  history: string[];    // array of the history of entryIds shown in this tab (for the forward/back arrows) 
  historyIdx: number;   // index of current history point
  entry: EntryHeader;  // reference to journal entry  -- leaving open possibility of expanding this type in the future
}

export type Bookmark = {
  id: string;   // id of the bookmark
  entry: EntryHeader;
}

export type EntryHeader = {
  uuid: string | null;   
  name: string;
  icon: string;  // class of icon to display
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
  topicType = 'topicType',
  type = 'type',  // note that this is the type field not the topic type
}