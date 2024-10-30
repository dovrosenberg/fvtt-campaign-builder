import moduleJson from '@module';

const fields = foundry.data.fields;
const SessionSchema = {
  description: new fields.SchemaField({
    long: new fields.HTMLField({required: false, blank: true}),
    short: new fields.HTMLField({required: false, blank: true})
  }),
  img: new fields.FilePathField({required: false, categories: ['IMAGE']}),
  // steps: new fields.ArrayField(new fields.StringField({blank: true}))
};
type SessionSchemaType = typeof SessionSchema;

export class SessionModel<Schema extends SessionSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): SessionSchemaType {
    return SessionSchema;
  }

  // prepareDerivedData() {
  //   this.nSteps = this.steps.length;
  // }
}

export class SessionSheet extends JournalTextPageSheet {
  get template() {
    return `modules/${moduleJson.id}/templates/inputDialog.hbs`;    //-${this.isEditable ? "edit" : "view"}.html`;
  }

  async getData(options={}) {
    const context = await super.getData(options);
    // context.description = {
    //   long: await TextEditor.enrichHTML(this.object.system.description.long, {
    //     async: true,
    //     secrets: this.object.isOwner,
    //     relativeTo: this.object
    //   }),
    //   short: await TextEditor.enrichHTML(this.object.system.description.short, {
    //     async: true,
    //     secrets: this.object.isOwner,
    //     relativeTo: this.object
    //   })
    // };
    return context;
  }
}
