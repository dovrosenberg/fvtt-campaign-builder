// types used in event handlers for dialogs
export type GeneratedCharacterDetails = {
  name: string;
  description: string;
  type: string;
  speciesId: string;
};

export type GeneratedLocationDetails = {
  name: string;
  description: string;
  type: string;
  parentId: string;
};

export type GeneratedOrganizationDetails = GeneratedLocationDetails;
