// this is the tag data stored on the entry/session
export interface TagInfo {
  value: string;
};

// used for the module setting
export type TagList = Record<string,    // keyed by the text of the tag
{ 
  count: number, // how many times it is used
  color?: string | undefined;
}>;
