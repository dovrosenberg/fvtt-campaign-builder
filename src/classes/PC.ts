import { toRaw } from 'vue';
import { moduleId } from '@/settings'; 
import { PCDoc } from '@/documents';

// represents a topic entry (ex. a character, location, etc.)
export class PC {
  static worldCompendium: CompendiumCollection<any> | undefined;
  static worldId: string = '';

  private _pcDoc: PCDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {PCDoc} PCDoc - The Foundry Actor document
   */
  constructor(pcDoc: PCDoc) {
    // make sure it's the right kind of document
    if (pcDoc.documentName !== 'Actor')
      throw new Error('Invalid document type in PC constructor');
    if (pcDoc.pack)
      throw new Error('Cannot create a PC from an actor in a compendium.');

    // clone it to avoid unexpected changes, also drop the proxy
    this._pcDoc = foundry.utils.deepClone(pcDoc);
    this._cumulativeUpdate = {};
  }


  static async fromUuid(entryId: string, options?: Record<string, any>): Promise<PC | null> {
    const pcDoc = await fromUuid(entryId, options) as PCDoc;

    if (!pcDoc)
      return null;
    else
      return new PC(pcDoc);
  }

  get uuid(): string {
    return this._pcDoc.uuid;
  }

  get name(): string {
    return this._pcDoc.name;
  }

  set name(value: string) {
    this._pcDoc.name = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      name: value,
    };
  }

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): PCDoc {
    return this._pcDoc;
  }

  /**
   * Updates a PC in the database 
   * 
   * @returns {Promise<PC | null>} The updated entry, or null if the update failed.
   */
  public async save(): Promise<PC | null> {
    if (!PC.worldCompendium)
      return null;

    const updateData = this._cumulativeUpdate;

    // note: we don't allow PCs to be in compendiums, so we don't have to worry about unlocking
    let success = false;
    if (Object.keys(updateData).length !== 0) {
      const retval = await toRaw(this._pcDoc).update(updateData) || null;
      if (retval) {
        this._pcDoc = retval;
        this._cumulativeUpdate = {};

        success = true;
      }
    }

    return success ? this : null;
  }

}