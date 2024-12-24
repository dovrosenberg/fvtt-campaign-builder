// handles flags set on the world root folder
// we store all the compendia status info here in the hopes that it's stored on the server, though that's unclear to me
// also, when the world is deleted, they'll all get cleaned up

import { moduleId } from '.';

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

type ValidDocuments = Folder | JournalEntry | JournalEntryPage;

export abstract class DocumentWithFlags<FK extends string, FT extends { [K in FK]: any }, DocType extends ValidDocuments> {
  protected abstract get _document(): DocType;  // every subitem needs a document
  protected abstract get _flagSettings(): FlagSettings<FK, FT>[];

  protected _getFlag(flag: FK): FT[FK] {
    const config = this._flagSettings.find((s)=>s.flagId===flag);

    if (!this._document || !config)
      throw new Error('Bad document/flag in DocumentFlags._getFlag()');

    const setting = (this._document.getFlag(moduleId, flag) || foundry.utils.deepClone(config.default)) as FT[FK];

    if (config.keyedByUUID)
      return unprotect(setting as Record<string, any>) as FT[FK];
    else
      return setting;
  }

  protected async _setFlag(flag: FK, value: FT[FK] | null): Promise<void> {
    const config = this._flagSettings.find((s)=>s.flagId===flag);

    if (!this._document || !config)
      throw new Error('Bad document/flag in DocumentFlags._setFlag()');

    if (config.keyedByUUID && value) {
      await this._document.setFlag(moduleId, flag, protect(value as Record<string, any>));
    } else {
      await this._document.setFlag(moduleId, flag, value);
    }

    
  }

  // remove a key from an object flag
  protected async _unsetFlag(flag: FK, key?: string): Promise<void> {
    const config = this._flagSettings.find((s)=>s.flagId===flag);

    if (!this._document || !config)
      throw new Error('Bad document/flag in DocumentFlags._unsetFlag()');
      
  
    if (config.keyedByUUID && key) {
      const value = this._getFlag(flag);
      if (value[key]) {
        delete value[key];

        await this._setFlag(flag, value);
      }
    } else if (!config.keyedByUUID){
      await this._document.unsetFlag(moduleId, `${flag}${key ? '.' + key : ''}`);
    } else {
      throw new Error('key missing in DocumentFlags.unset()');
    }
  }

  /**
   * Adds all the default flag values to the document
   * @param worldId 
   * @returns 
   */
  public async setDefaults(): Promise<void> {
    if (!this._document || !!this._flagSettings)
      throw new Error('Bad document/flag in DocumentFlags.setDefaults()');
      

    for (let i=0; i<this._flagSettings.length; i++) {
      if (!this._getFlag(moduleId, this._flagSettings[i].flagId)) {
        const value = foundry.utils.deepClone(this._flagSettings[i].default);

        if (this._flagSettings[i].keyedByUUID && value) {
          await this._setFlag(moduleId, this._flagSettings[i].flagId, protect(value as Record<string, any>));
        } else {
          await this._setFlag(moduleId, this._flagSettings[i].flagId, value);
        }        
      }
    }

    return;
  }
  
}

// protects the object from unexpected things that foundry saving does
const protect = <T extends Record<string, any>>(flagValue: T): T => { 
  // replace all the keys
  const retval = {};
  for (const [key, value] of Object.entries(flagValue as Record<string, any>)) {
    // swap all the '.' for '#&#' in the keys
    retval[key.replaceAll('.', '#&#')] = value;    
  }

  return retval as T;
};

// convert the array to an object
const unprotect = <T extends Record<string, any>>(flagValue: T): T => { 
  const retval = {};
  for (const [key, value] of Object.entries(flagValue as Record<string, any>)) {
    // swap all the '#&#' for '.' in the keys
    retval[key.replaceAll('#&#', '.')] = value;
  }

  return retval as T;
};
