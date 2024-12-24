// handles flags set on the world root folder
// we store all the compendia status info here in the hopes that it's stored on the server, though that's unclear to me
// also, when the world is deleted, they'll all get cleaned up

import { Topic, Hierarchy } from '@/types';
import { moduleId } from '.';

/** 
 * The subset of FK (which should be an enum of keys) that are Record<string, any> 
 **/
export type ProtectedKeys<FK extends string, FT extends { [K in FK]: unknown }> = {
  [K in FK]: FT extends { [K in FK]: infer KeyType }
    ? KeyType extends Record<string, any>
      ? 1
      : never
      : never
}[FK];

/**
 * Specify that settings have to be keyedByUUID if the're protected
 */
type FlagSettings<FK extends string, FT extends { [K in FK]: unknown }> = {
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

export abstract class DocumentWithFlags<FK extends string, FT extends { [K in FK]: unknown }> {
  abstract protected _document: Document;  // every subitem needs a document
  abstract protected _flagSettings: FlagSettings<FK, FT>;

  // protects the object from unexpected things that foundry saving does
  private _protect<K extends ProtectedKeys<FK, FT>>(flagValue: FT[K]): FT[K] { 
    // replace all the keys
    const retval = {};
    for (const [key, value] of Object.entries(flagValue as Record<string, any>)) {
      // swap all the '.' for '#&#' in the keys
      retval[key.replaceAll('.', '#&#')] = value;    
    }

    return retval as FT[K];
  }

  // convert the array to an object
  private _unprotect<K extends ProtectedKeys<FK, FT>>(flagValue: FT[K]): FT[K] { 
    const retval = {};
    for (const [key, value] of Object.entries(flagValue as Record<string, any>)) {
      // swap all the '#&#' for '.' in the keys
      retval[key.replaceAll('#&#', '.')] = value;
    }

    return retval as FT[K];
  }

  protected _getFlag(flag: FK): FT[FK] {
    const config = this._flagSettings.find((s)=>s.flagId===flag);

    if (!_document || !config)
      throw new Error('Bad document/flag in DocumentFlags._getFlag()');

    const setting = (this._document.getFlag(moduleId, flag) || foundry.utils.deepClone(config.default)) as FT[FK];

    if (config.keyedByUUID)
      return unprotect(setting);
    else
      return setting;
  }

  protected async _setFlag(flag: FK, value: FT[FK] | null): Promise<void> {
    const config = this._flagSettings.find((s)=>s.flagId===flag);

    if (!this._document || !config)
      throw new Error('Bad document/flag in DocumentFlags._setFlag()');

    let newValue: FT[FK];
    if (config.keyedByUUID && value) {
      newValue = protect(value as WorldFlagType<Extract<K, ProtectedKeys>>);
    } else {
      newValue = value;
    }

    await this._document.setFlag(moduleId, flag, newValue);
  }

  // remove a key from an object flag
  protected async _unsetFlag(worldId: string, flag: FK, key?: string): Promise<void> {
    const config = flagSetup.find((s)=>s.flagId===flag);

    if (!this._document || !config)
      throw new Error('Bad document/flag in DocumentFlags._unsetFlag()');
      
  
    if (config.keyedByUUID && key) {
      const value = WorldFlags.get(worldId, flag);
      if (value[key]) {
        delete value[key];

        await WorldFlags.set(worldId, flag, value);
      }
    } else if (!config.keyedByUUID){
      await f.unsetFlag(moduleId, `${flag}${key ? '.' + key : ''}`);
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
    if (!_document)
      return;

    for (let i=0; i<this._flagSettings.length; i++) {
      if (!this._document.getFlag(moduleId, this._flagSettings[i].flagId)) {
        const value = foundry.utils.deepClone(this._flagSettings[i].default);

        if (_flagSettings[i].keyedByUUID && value) {
          await this._document.setFlag(moduleId, this._flagSettings[i].flagId, protect(value as Record<string, any>));
        } else {
          await this._document.setFlag(moduleId, this._flagSettings[i].flagId, value);
        }        
      }
    }

    return;
  }
  
}

TODO - need to figure out if World extends DocumentWithFlags - that should work, right?
but _campaignDoc, etc. need to be renamed to just _documenet


export class WorldFlags {
  // special case because of nesting and index
  /**
   * Set the hierarchy 
   *
   * @static
   * @param {string} entryId
   * @param {Hierarchy} hierarchy
   * @return {*}  {Promise<void>}
   */
  public static async setHierarchy(worldId: string, entryId: string, hierarchy: Hierarchy): Promise<void> {
    // pull the full structure
    const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);
    hierarchies[entryId] = hierarchy;

    await WorldFlags.set(worldId, WorldFlagKey.hierarchies, hierarchies);
  }

  /**
   * Get the hierarchy.  Could just use get() but here for consistency with setHierarchy()
   *
   * @static
   * @param {string} entryId
   * @return {*}  {Promise<void>}
   */
  public static getHierarchy(worldId: string, entryId: string): Hierarchy | null {
    // pull the full structure
    const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);

    return hierarchies[entryId] || null;
  }

  /**
   * Remove an entry from hierarchy
   *
   * @static
   * @param {string} entryId
   * @param {Hierarchy} hierarchy
   * @return {*}  {Promise<void>}
   */
  public static async unsetHierarchy(worldId: string, entryId: string): Promise<void> {
    // pull the full structure
    const hierarchies = WorldFlags.get(worldId, WorldFlagKey.hierarchies);
    delete hierarchies[entryId];

    await WorldFlags.set(worldId, WorldFlagKey.hierarchies, hierarchies);
  }

  // special cases because of indexes
  public static getTopicFlag<K extends RequiresTopic>(worldId: string, flag: K, topic: Topic): WorldFlagType<K>[keyof WorldFlagType<K>] {
    const f = game.folders?.find((f)=>f.uuid===worldId);
    
    const config = flagSetup.find((s)=>s.flagId===flag);

    if (!f)
      return config?.default[topic];

    const fullFlag = WorldFlags.get(worldId, flag);

    return fullFlag[topic] as WorldFlagType<K>[keyof WorldFlagType<K>];
  }

  public static async setTopicFlag<T extends RequiresTopic>(worldId: string, flag: T, topic: Topic, value: WorldFlagType<T>[keyof WorldFlagType<T>]): Promise<void> {
    const f = game.folders?.find((f)=>f.uuid===worldId);
    if (!f)
      return;

    const config = flagSetup.find((s)=>s.flagId===flag);
    if (!config)
      throw new Error('Bad flag in WorldFlags.set()');

    // get the current value
    const currentValue = WorldFlags.get(worldId, flag) as WorldFlagType<T>;
    currentValue[topic] = value;

    await WorldFlags.set(worldId, flag, currentValue);
  }
}
