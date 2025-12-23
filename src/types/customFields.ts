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
  editorHeight?: number;  // for editor fields
  helpText?: string;  // displayed in a tooltip
  helpLink?: string; // optional link opened when clicking help icon
  aiEnabled?: boolean;
  aiPromptTemplate?: string;
  deleted?: boolean;
  indexed?: boolean;
  sortOrder: number;   // order of display on description tab
  configuration?: {
    minWords: number;
    maxWords: number;
    tone: string;
    tense: string;
    pov: string;
    includeBullets: boolean;
    avoidListsLongerThan: number;
  }
}

