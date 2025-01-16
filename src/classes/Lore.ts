import { Campaign } from './Campaign';

export type RawLore = {
  id: string;
  text: string;
  revealed: boolean;
  sessionId: string | null;
};

// represents a PC - these are stored in flag inside campaigns so saving, etc. is handled by campaign
export class Lore {
  public id: string;   // a unique ID - used as key when stored in campaign
  public text: string;
  public revealed: boolean;
  public sessionId: string | null;   // uuid of the session it's tied to, or null for still at campaign level

  /**
   * 
   */
  constructor() {
    this.id = `fwb-lore-${foundry.utils.randomID()}`;
    this.text = '';
    this.revealed = false;
    this.sessionId = null;
  }

  static async fromId(campaign: Campaign, loreId: string): Promise<Lore | null> {
    if (!loreId)
      return null;
    else
      return await campaign.getLore(loreId);
  }

  static async fromRaw(rawLore: RawLore): Promise<Lore | null> {
    const lore = new Lore();
    lore.id = rawLore.id;
    lore.text = rawLore.text;
    lore.revealed = rawLore.revealed;
    lore.sessionId = rawLore.sessionId;

    return lore;
  }
  // get a version that can be serialized
  public getRaw(): RawLore {
    return {
      id: this.id,
      text: this.text,
      revealed: this.revealed,
      sessionId: this.sessionId,
    }
  }
}