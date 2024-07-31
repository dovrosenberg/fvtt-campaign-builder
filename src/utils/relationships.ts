// don't store topic because meant to be stored by topic
export type RelatedItem = {
  uuid: string;   // the other item
  type: string;   // the type of the item  (store here because it's not currently indexed, unlike name)
  role: string;   // optional role describing the relationship (ex. 'Mayor' or 'Sister' or 'Capital')
};

