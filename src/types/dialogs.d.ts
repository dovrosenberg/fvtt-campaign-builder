// types used in event handlers for dialogs
export type CharacterDetails = {
  name: string;
  description: string;
  type: string;
  speciesId: string;
  generateImage: boolean;
};

export type LocationDetails = {
  name: string;
  description: string;
  type: string;
  parentId: string;
  generateImage: boolean;
};

export type OrganizationDetails = LocationDetails;
