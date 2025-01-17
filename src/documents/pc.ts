const fields = foundry.data.fields;
const pcSchema = {
  playerName: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  actorId: new fields.DocumentIdField({ required: false, nullable: true, }),
  background: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  plotPoints: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  magicItems: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
};

type PCSchemaType = typeof pcSchema;

export class PCDataModel<Schema extends PCSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): PCSchemaType {
    return pcSchema;
  }

  /** @override */
  // prepareBaseData(): void {
  // }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface PCDoc extends JournalEntryPage {
  __type: 'PCDoc';

  system: {
    playerName: string;
    actorId: string;   // uuid of the entry
    background: string;
    plotPoints: string;
    magicItems: string; 
  };
}
