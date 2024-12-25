// handles flags set on the world root folder
// we store all the compendia status info here in the hopes that it's stored on the server, though that's unclear to me
// also, when the world is deleted, they'll all get cleaned up

import { CampaignDoc, CampaignFlagKey, CampaignFlagType, WorldDoc, WorldFlagKey, WorldFlagType } from '@/documents';
import { flagSettings as worldFlagSettings } from '@/documents/world';
import { flagSettings as campaignFlagSettings } from '@/documents/campaign';

import { moduleId } from '.';

/** 
 * The allowed types to use flags (our types)
 */
type ValidDocTypes = WorldDoc | CampaignDoc;

/** 
 * The subset of FK (which should be an enum of keys) that are Record<string, any> 
 **/
export type ProtectedKeys<FK extends string, FT extends { [K in FK]: any }> = {
  [K in FK]: FT extends { [K in FK]: infer KeyType }
    ? KeyType extends Record<string, any>
      ? 1
      : never
      : never
}[FK];

/**
 * Specify that settings have to be keyedByUUID if the're protected
 */
export type FlagSettings<FK extends string, FT extends { [K in FK]: any }> = {
  [K in FK]: FT extends { [K in FK]: infer KeyType }
  ? K extends ProtectedKeys<FK, FT>
    ?
    {
      flagId: K;
      default: KeyType;

      // is it a Record<uuid, ...>?  this will properly handle the '.'s
      keyedByUUID?: true;
    } :
    {
      flagId: K;
      default: KeyType;

      keyedByUUID?: false;
    }
  : never
}[FK];

/**
 * Map each ValidDocType to its configuration
 */
type FlagKey<T extends ValidDocTypes> = 
  T extends WorldDoc ? WorldFlagKey :
  T extends CampaignDoc ? CampaignFlagKey :
  never;
type FlagType<T extends ValidDocTypes, K extends FlagKey<T>> = 
  T extends WorldDoc ? (K extends WorldFlagKey ? WorldFlagType<K> : never) :
  T extends CampaignDoc ? (K extends CampaignFlagKey ? CampaignFlagType<K> : never) :
  never;

type DocFlagSettings<T extends ValidDocTypes> = 
  T extends WorldDoc ? typeof worldFlagSettings :
  T extends CampaignDoc ? typeof campaignFlagSettings :
  never;
  
  
  export function isWorldDoc(doc: ValidDocTypes): doc is WorldDoc {
  // @ts-ignore - not entirely sure why TS can't figure this out
  return doc.getFlag(moduleId, 'isWorld') === true;
}

export function isCampaignDoc(doc: ValidDocTypes): doc is CampaignDoc {
  // @ts-ignore - not entirely sure why TS can't figure this out
  return doc.getFlag(moduleId, 'isCampaign') === true;
}

const getFlagSettingsFromDoc = <DocType extends ValidDocTypes>(doc: DocType): DocFlagSettings<DocType> => {
  if (isWorldDoc(doc)) 
    return worldFlagSettings as DocFlagSettings<DocType>;

  if (isCampaignDoc(doc)) 
    return campaignFlagSettings as DocFlagSettings<DocType>;
  
  throw new Error('Invalid document type');
};

/**
 * protects the object from unexpected things that foundry saving does
 */
const protect = <T extends Record<string, any>>(flagValue: T): T => { 
  // replace all the keys
  const retval = {};

  for (const [key, value] of Object.entries(flagValue as Record<string, any>)) {
    // swap all the '.' for '#&#' in the keys
    retval[key.replaceAll('.', '#&#')] = value;    
  }

  return retval as T;
};

/**  
 * convert the array to an object
 */ 
const unprotect = <T extends Record<string, any>>(flagValue: T): T => { 
  const retval = {};
  
  for (const [key, value] of Object.entries(flagValue as Record<string, any>)) {
    // swap all the '#&#' for '.' in the keys
    retval[key.replaceAll('#&#', '.')] = value;
  }

  return retval as T;
};

export const getFlag = <
  DocType extends ValidDocTypes,
  FK extends FlagKey<DocType> = FlagKey<DocType>,
  FT extends FlagType<DocType, FK> = FlagType<DocType, FK>
> (doc: DocType, flag: FK): FT => {
  const config = getFlagSettingsFromDoc(doc).find((s)=>s.flagId===flag);

  if (!doc || !config)
    throw new Error('Bad document/flag in DocumentFlags.getFlag()');

  // @ts-ignore - not sure how to fix the typing
  const setting = (doc.getFlag(moduleId, flag) || foundry.utils.deepClone(config.default));

  if (config.keyedByUUID)
    return unprotect(setting as Record<string, any>) as FT;
  else
    return setting;
};

export const setFlag = async <
  DocType extends ValidDocTypes,
  FK extends FlagKey<DocType> = FlagKey<DocType>,
  FT extends FlagType<DocType, FK> = FlagType<DocType, FK>
> (doc: DocType, flag: FK, value: FT | null): Promise<void> => {
  const config = getFlagSettingsFromDoc(doc).find((s)=>s.flagId===flag);

  if (!doc || !config)
    throw new Error('Bad document/flag in DocumentFlags.setFlag()');

  if (config.keyedByUUID && value) {
    // @ts-ignore - not sure how to fix the typing
    await doc.setFlag(moduleId, flag, protect(value as Record<string, any>));
  } else {
    // @ts-ignore - not sure how to fix the typing
    await doc.setFlag(moduleId, flag, value);
  }
};

/** 
 * Remove a key from an object flag.  Generally most useful for things keyed by uuid.  For other fields, it will
 * attempt to unset `flag.key`, or if key is missing just unsets `flag`
 */
export const unsetFlag = async <
  DocType extends ValidDocTypes,
  FK extends FlagKey<DocType> = FlagKey<DocType>,
> (doc: DocType, flag: FK, key?: string): Promise<void> => {
  const config = getFlagSettingsFromDoc(doc).find((s)=>s.flagId===flag);

  if (!doc || !config)
    throw new Error('Bad document/flag in DocumentFlags.unsetFlag()');

  if (config.keyedByUUID && key) {
    const value = getFlag(doc, flag);
    if (value[key]) {
      delete value[key];

      await setFlag(doc, flag, value);
    }
  } else if (!config.keyedByUUID){
    await doc.unsetFlag(moduleId, `${flag}${key ? '.' + key : ''}`);
  } else {
    throw new Error('key missing in DocumentFlags.unsetFlag()');
  }
};

/**
 * Adds all the default flag values to the document
 * @param worldId 
 * @returns 
 */
export const setFlagDefaults = async <
  DocType extends ValidDocTypes,
> (doc: DocType): Promise<void> => {
  const flagSettings = getFlagSettingsFromDoc(doc);

  if (!doc || !flagSettings)
    throw new Error('Bad document/flag in DocumentFlags.setFlagDefaults()');
    
  for (let i=0; i < flagSettings.length; i++) {
    const flagId = flagSettings[i].flagId as FlagKey<DocType>;

    if (!getFlag(doc, flagId)) {
      const value = foundry.utils.deepClone(flagSettings[i].default);

      if (flagSettings[i].keyedByUUID && value) {
        await setFlag(doc, flagId, protect(value as Record<string, any>) as FlagType<DocType, typeof flagId>);
      } else {
        await setFlag(doc, flagId, value as FlagType<DocType, typeof flagId>);
      }        
    }
  }

  return;
};