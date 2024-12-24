import { moduleId } from '@/settings'; 
import { WorldDoc, } from '@/documents';

// represents a topic entry (ex. a character, location, etc.)
export class World {
  private _worldDoc: WorldDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {WorldDoc} worldDoc - The entry Foundry document
   */
  constructor(worldDoc: WorldDoc) {
    // make sure it's the right kind of document
    if (worldDoc.documentName !== 'Folder' || !worldDoc.getFlag(moduleId, 'isWorld'))
      throw new Error('Invalid document type in World constructor');

    // clone it to avoid unexpected changes, also drop the proxy
    this._worldDoc = foundry.utils.deepClone(worldDoc);
    this._cumulativeUpdate = {};
  }

  static async fromUuid(worldId: string, options?: Record<string, any>): Promise<World | null> {
    const worldDoc = await fromUuid(worldId, options) as WorldDoc;

    if (!worldDoc)
      return null;
    else
      return new World(worldDoc);
  }
 
}