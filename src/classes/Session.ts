import { toRaw } from 'vue';

import { DOCUMENT_TYPES, SessionDoc, SessionLocation, SessionItem, SessionNPC, SessionMonster, SessionVignette, SessionLore, TodoItem } from '@/documents';
import { searchService } from '@/utils/search';
import { FCBDialog } from '@/dialogs';
import { Campaign, WBWorld } from '@/classes';
import { localize } from '@/utils/game';
import { TagInfo } from '@/types';

// represents a topic entry (ex. a character, location, etc.)
export class Session {
  public parentCampaign: Campaign | null;  // the campaign the session is in (if we don't setup up front, we can load it later)

  private _sessionDoc: SessionDoc;
  private _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  /**
   * 
   * @param {SessionDoc} sessionDoc - The session Foundry document
   */
  constructor(sessionDoc: SessionDoc, parentCampaign?: Campaign) {
    // make sure it's the right kind of document
    if (sessionDoc.type !== DOCUMENT_TYPES.Session)
      throw new Error('Invalid document type in Session constructor');

    // clone it to avoid unexpected changes
    this._sessionDoc = foundry.utils.deepClone(sessionDoc);
    this._cumulativeUpdate = {};
    this.parentCampaign = parentCampaign || null;
  }

  static async fromUuid(sessionId: string, options?: Record<string, any>): Promise<Session | null> {
    const sessionDoc = await fromUuid<SessionDoc>(sessionId, options);

    if (!sessionDoc)
      return null;
    
    const session = new Session(sessionDoc);
    await session.loadCampaign();
    return session;
  }

  /**
   * Gets the Campaign associated with the session. If the campaign is already loaded, the promise resolves
   * to the existing campaign; otherwise, it loads the campaign and then resolves to it.
   * 
   * @returns {Promise<Campaign>} A promise to the world associated with the campaign.
   */
  public async loadCampaign(): Promise<Campaign> {
    if (this.parentCampaign)
      return this.parentCampaign;

    if (!this._sessionDoc.parent)
      throw new Error('call to Session.loadCampaign() without _sessionDoc');

    this.parentCampaign = await Campaign.fromUuid(this._sessionDoc.parent.uuid);

    if (!this.parentCampaign)
      throw new Error('Invalid session in Session.loadCampaign()');

    return this.parentCampaign;
  }
  
  /**
   * Gets the world associated with a session, loading into the campaign 
   * if needed.
   * 
   * @returns {Promise<WBWorld>} A promise to the world associated with the campaign.
   */
  public async getWorld(): Promise<WBWorld> {
    if (!this.parentCampaign)
      this.parentCampaign = await this.loadCampaign();

    if (!this.parentCampaign)
      throw new Error('Invalid campaign in Session.getWorld()');
    
    return this.parentCampaign.getWorld();
  }
  

  // creates a new session in the proper campaign journal in the given world
  static async create(campaign: Campaign): Promise<Session | null> 
  {
    let nameToUse = '' as string | null;
    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await FCBDialog.inputDialog(localize('dialogs.createSession.title'), `${localize('dialogs.createSession.sessionName')}:`); 
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    const world = await campaign.getWorld();

    let sessionDoc: SessionDoc[] = [];
    await world.executeUnlocked(async () => {
      sessionDoc = await JournalEntryPage.createDocuments([{
        type: DOCUMENT_TYPES.Session,
        name: nameToUse,
        system: {
          number: campaign.nextSessionNumber,
          description: '',
          img: '',
        }
      }],{
        parent: campaign.raw as JournalEntry,
      }) as unknown as SessionDoc[];
    });

    if (sessionDoc && sessionDoc.length > 0) {
      const session = new Session(sessionDoc[0], campaign);

      // Add to search index
      try {
        await searchService.addOrUpdateIndex(session, world, false);
      } catch (error) {
        console.error('Failed to add session to search index:', error);
      }

      return session;
    } else {
      return null;
    }
  }

  get uuid(): string {
    return this._sessionDoc.uuid;
  }

  get name(): string {
    return this._sessionDoc.name;
  }

  set name(value: string) {
    this._sessionDoc.name = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      name: value,
    };
  }

  get tags(): TagInfo[] {
    return this._sessionDoc.system.tags;
  }

  set tags(value: TagInfo[]) {
    this._sessionDoc.system.tags = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        ...this._cumulativeUpdate.system,
        tags: value,
      }
    };
  }

  get notes(): string {
    return this._sessionDoc.text?.content || '';
  }

  set notes(value: string) {
    this._sessionDoc.text.content = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      text: {
        content: value,
      }
    };
  }

  get number(): number {
    return this._sessionDoc.system.number;
  }

  set number(value: number) {
    this._sessionDoc.system.number = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        number: value,
      }
    };
  }

  get date(): Date | null {
    // system.date is a string, so need to convert
    if (!this._sessionDoc.system.date)
      return null;

    const dateValue = new Date(this._sessionDoc.system.date);

    return dateValue.isValid() ? dateValue : null;
  }

  set date(value: Date | null) {
    this._sessionDoc.system.date = value?.isValid() ? value.toISOString() : null;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        date: value,
      }
    };
  }

  get startingAction(): string {
    return this._sessionDoc.system.startingAction;
  }

  set startingAction(value: string) {
    this._sessionDoc.system.startingAction = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        startingAction: value,
      }
    };
  }

  get img(): string {
    return this._sessionDoc.system.img || '';
  }

  set img(value: string) {
    this._sessionDoc.system.img = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        img: value,
      }
    };
  }

  get locations(): readonly SessionLocation[] {
    return this._sessionDoc.system.locations || [];
  }

  async addLocation(uuid: string, delivered: boolean = false): Promise<void> {
    if (this._sessionDoc.system.locations.find(l=> l.uuid===uuid))
      return;

    this._sessionDoc.system.locations.push({
      uuid: uuid,
      delivered: delivered
    });

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        locations: this._sessionDoc.system.locations
      }
    };

    await this.save();
  }

  async deleteLocation(uuid: string): Promise<void> {
    this._sessionDoc.system.locations = this._sessionDoc.system.locations.filter(l=> l.uuid!==uuid);

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        locations: this._sessionDoc.system.locations
      }
    };

    await this.save();
  }

  async markLocationDelivered(uuid: string, delivered: boolean): Promise<void> {
    const location = this._sessionDoc.system.locations.find((l) => l.uuid===uuid);
    if (!location)
      return;
    
    location.delivered = delivered;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        locations: this._sessionDoc.system.locations
      }
    };

    await this.save();
  }

  get npcs(): readonly SessionNPC[] {
    return this._sessionDoc.system.npcs || [];
  }

  async addNPC(uuid: string, delivered: boolean = false): Promise<void> {
    if (this._sessionDoc.system.npcs.find(l=> l.uuid===uuid))
      return;

    this._sessionDoc.system.npcs.push({
      uuid: uuid,
      delivered: delivered
    });

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        npcs: this._sessionDoc.system.npcs
      }
    };

    await this.save();
  }

  async deleteNPC(uuid: string): Promise<void> {
    this._sessionDoc.system.npcs = this._sessionDoc.system.npcs.filter(l=> l.uuid!==uuid);

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        npcs: this._sessionDoc.system.npcs
      }
    };

    await this.save();
  }

  async markNPCDelivered(uuid: string, delivered: boolean): Promise<void> {
    const npc = this._sessionDoc.system.npcs.find((l) => l.uuid===uuid);
    if (!npc)
      return;
    
    npc.delivered = delivered;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        npcs: this._sessionDoc.system.npcs
      }
    };

    await this.save();
  }

  get vignettes(): readonly SessionVignette[] {
    return this._sessionDoc.system.vignettes || [];
  }

  async addVignette(description: string): Promise<string> {
    const uuid = foundry.utils.randomID();

    this._sessionDoc.system.vignettes.push({
      uuid: uuid,
      description: description,
      delivered: false
    });

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        vignettes: this._sessionDoc.system.vignettes
      }
    };

    await this.save();
    return uuid;
  }

  async updateVignetteDescription(uuid: string, description: string): Promise<void> {
    const vignette = this._sessionDoc.system.vignettes.find(s=> s.uuid===uuid);

    if (!vignette)
      return;

    vignette.description = description;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        vignettes: this._sessionDoc.system.vignettes
      }
    };

    await this.save();
  }


  async deleteVignette(uuid: string): Promise<void> {
    this._sessionDoc.system.vignettes = this._sessionDoc.system.vignettes.filter(l=> l.uuid!==uuid);

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        vignettes: this._sessionDoc.system.vignettes
      }
    };

    await this.save();
  }

  async markVignetteDelivered(uuid: string, delivered: boolean): Promise<void> {
    const vignette = this._sessionDoc.system.vignettes.find((s) => s.uuid===uuid);
    if (!vignette)
      return;
    
    vignette.delivered = delivered;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        vignettes: this._sessionDoc.system.vignettes
      }
    };

    await this.save();
  }

  get lore(): readonly SessionLore[] {
    return this._sessionDoc.system.lore || [];
  }

  async addLore(description: string): Promise<string> {
    const uuid = foundry.utils.randomID();

    this._sessionDoc.system.lore.push({
      uuid: uuid,
      description: description,
      delivered: false,
      journalEntryPageId: null,
    });

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        lore: this._sessionDoc.system.lore
      }
    };

    await this.save();
    return uuid;
  }

  async updateLoreDescription(uuid: string, description: string): Promise<void> {
    const lore = this._sessionDoc.system.lore.find(l=> l.uuid===uuid);

    if (!lore)
      return;

    lore.description = description;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        lore: this._sessionDoc.system.lore
      }
    };

    await this.save();
  }

  async updateLoreJournalEntry(loreUuid: string, journalEntryPageId: string | null): Promise<void> {
    const lore = this._sessionDoc.system.lore.find(l=> l.uuid===loreUuid);

    if (!lore)
      return;

    lore.journalEntryPageId = journalEntryPageId;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        lore: this._sessionDoc.system.lore
      }
    };

    await this.save();
  }


  async deleteLore(uuid: string): Promise<void> {
    this._sessionDoc.system.lore = this._sessionDoc.system.lore.filter(l=> l.uuid!==uuid);

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        lore: this._sessionDoc.system.lore
      }
    };

    await this.save();
  }

  async markLoreDelivered(uuid: string, delivered: boolean): Promise<void> {
    const lore = this._sessionDoc.system.lore.find((l) => l.uuid===uuid);
    if (!lore)
      return;
    
    lore.delivered = delivered;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        lore: this._sessionDoc.system.lore
      }
    };

    await this.save();
  }

  get monsters(): readonly SessionMonster[] {
    return this._sessionDoc.system.monsters || [];
  }

  async addMonster(uuid: string, number = 1): Promise<void> {
    if (this._sessionDoc.system.monsters.find(l=> l.uuid===uuid))
      return;

    this._sessionDoc.system.monsters.push({
      uuid: uuid,
      number: number,
      delivered: false
    });

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        monsters: this._sessionDoc.system.monsters
      }
    };

    await this.save();
  }

  async updateMonsterNumber(uuid: string, value: number): Promise<void> {
    const monster = this._sessionDoc.system.monsters.find(l=> l.uuid===uuid);

    if (!monster)
      return;

    monster.number = value;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        monsters: this._sessionDoc.system.monsters
      }
    };

    await this.save();
  }

  async deleteMonster(uuid: string): Promise<void> {
    this._sessionDoc.system.monsters = this._sessionDoc.system.monsters.filter(l=> l.uuid!==uuid);

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        monsters: this._sessionDoc.system.monsters
      }
    };

    await this.save();
  }

  async markMonsterDelivered(uuid: string, delivered: boolean): Promise<void> {
    const monster = this._sessionDoc.system.monsters.find((l) => l.uuid===uuid);
    if (!monster)
      return;
    
    monster.delivered = delivered;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        monsters: this._sessionDoc.system.monsters
      }
    };

    await this.save();
  }

  get items(): readonly SessionItem[] {
    return this._sessionDoc.system.items || [];
  }

  async addItem(uuid: string): Promise<void> {
    if (this._sessionDoc.system.items.find(i=> i.uuid===uuid))
      return;

    this._sessionDoc.system.items.push({
      uuid: uuid,
      delivered: false
    });

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        items: this._sessionDoc.system.items
      }
    };

    await this.save();
  }

  async deleteItem(uuid: string): Promise<void> {
    this._sessionDoc.system.items = this._sessionDoc.system.items.filter(i=> i.uuid!==uuid);

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        items: this._sessionDoc.system.items
      }
    };

    await this.save();
  }

  async markItemDelivered(uuid: string, delivered: boolean): Promise<void> {
    const item = this._sessionDoc.system.items.find((i) => i.uuid===uuid);
    if (!item)
      return;
    
    item.delivered = delivered;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        items: this._sessionDoc.system.items
      }
    };

    await this.save();
  }

  get campaignId(): string {
    if (!this._sessionDoc.parent)
      throw new Error('Call to Session.campaignId without _sessionDoc');

    return this._sessionDoc.parent.uuid;
  }

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): SessionDoc {
    return this._sessionDoc;
  }

  // used to set arbitrary properties on the entryDoc
  /**
   * Updates a session in the database
   * 
   * @returns {Promise<Session | null>} The updated session, or null if the update failed.
   */
  public async save(): Promise<Session | null> {
    const world = await this.getWorld();

    const updateData = this._cumulativeUpdate;

    let retval: SessionDoc | null = null;
    await world.executeUnlocked(async () => {
      retval = await toRaw(this._sessionDoc).update(updateData) || null;
      if (retval) {
        this._sessionDoc = retval;
      }

      this._cumulativeUpdate = {};
    });

     // Update the search index
     try {
      if (retval) {
        await searchService.addOrUpdateIndex(this, world, false);
      }
    } catch (error) {
      console.error('Failed to update search index:', error);
    }

    return retval ? this : null;
  }

  public async delete() {
    if (!this._sessionDoc)
      return;

    const id = this._sessionDoc.uuid;
    const world = await this.getWorld() as WBWorld;

    await world.executeUnlocked(async () => {
      await this._sessionDoc.delete();

      // remove from the expanded list
      await world.deleteSessionFromWorld(id);
    });
  }
  
  /**
   * Retrieves a list of all uuids that are linked to the current session.  For now, we don't
   * track them, so it's empty
   * 
   * @param campaignId - The topic for which to retrieve related items.
   * @returns An array of related uuids. Returns an empty array if there is no current entry.
   */
  public getAllRelatedSessions(_campaignId: string): string[] {
    return [];
  }
  
  get todoItems(): readonly TodoItem[] {
    if (!this._sessionDoc.system.todoItems) {
      this._sessionDoc.system.todoItems = [];
    }
    return this._sessionDoc.system.todoItems;
  }

  set todoItems(value: TodoItem[]) {
    this._sessionDoc.system.todoItems = value;
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        todoItems: value
      }
    };
  }

  addTodoItem(item: TodoItem): void {
    if (!this._sessionDoc.system.todoItems) {
      this._sessionDoc.system.todoItems = [];
    }

    // if it exists, just update delievered
    const existingItem = this._sessionDoc.system.todoItems.find(i => i.uuid === item.uuid);
    if (existingItem && existingItem.completed) {
      existingItem.completed = false;
    } else {
      this._sessionDoc.system.todoItems.push(item);
    }

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        todoItems: this._sessionDoc.system.todoItems
      }
    };
  }

  updateTodoItem(uuid: string, completed: boolean): void {
    if (!this._sessionDoc.system.todoItems) {
      this._sessionDoc.system.todoItems = [];
    }

    const item = this._sessionDoc.system.todoItems.find(i => i.uuid === uuid);
    if (!item)
      return;

    item.completed = completed;

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        todoItems: this._sessionDoc.system.todoItems
      }
    };
  }

  deleteTodoItem(uuid: string): void {
    if (!this._sessionDoc.system.todoItems) {
      this._sessionDoc.system.todoItems = [];
    }

    this._sessionDoc.system.todoItems = this._sessionDoc.system.todoItems.filter(i => i.uuid !== uuid);

    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      system: {
        todoItems: this._sessionDoc.system.todoItems
      }
    };
  }
}