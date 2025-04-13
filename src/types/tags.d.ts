export interface TagInfo {
  value: string;
  color?: string;
  style?: string;
};

// used for the module setting
export type TagCounts = Record<string, number>; // keyed by the text of the tag, the # is how many times it is used
