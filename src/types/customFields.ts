export enum FieldType {
  Text,
  Select,
  Editor,
  Boolean
}

/** what it applies to */
export enum CustomFieldContentType {
  Setting,
  Character,
  Location,
  Organization,
  Arc,
  Front,
  PC,
  Session,
  Campaign,
}

// types and functions used to manage topic hierarchies
export interface CustomFieldDescription {
  name: string;  // lowercase version of label with spaces converted to _
  label: string;
  fieldType: FieldType;
  options?: string[];  // for select fields
  help?: string;  // displayed in a tooltip
  sortOrder: number;   // order of display on description tab
}

// this is the default custom field description for each type
// this will be populated after i18n initialized
export let defaultCustomFields: Record<CustomFieldContentType, CustomFieldDescription[]> = {
  [CustomFieldContentType.Setting]: [],
  [CustomFieldContentType.Character]: [],
  [CustomFieldContentType.Location]: [],
  [CustomFieldContentType.Organization]: [],
  [CustomFieldContentType.PC]: [],
  [CustomFieldContentType.Session]: [],
  [CustomFieldContentType.Campaign]: [],
  [CustomFieldContentType.Arc]: [],
  [CustomFieldContentType.Front]: [],
};