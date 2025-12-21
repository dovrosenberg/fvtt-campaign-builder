// types used in event handlers for dialogs
export interface CharacterDetails {
  name: string;
  description: string;
  type: string;
  speciesId: string;
  generateImage: boolean;
};

export interface LocationDetails {
  name: string;
  description: string;
  type: string;
  parentId: string;
  generateImage: boolean;
};

export type OrganizationDetails = LocationDetails;
