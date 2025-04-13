export interface TagInfo {
  value: string;
  color?: string | undefined;
  style?: string | undefined;
};

// used for the module setting
export type TagList = Record<string,    // keyed by the text of the tag
{ 
  count: number, // how many times it is used
  color?: string | undefined;
  style?: string | undefined;
}>;
