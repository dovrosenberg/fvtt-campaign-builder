// @todo 
// NEEDS TO BE IN A JOURNALENTRYPAGE! MAYBE ONE JOURNAL ENTRY FOR EACH TOPIC?  THOSE COULD GET REALLY BIG BUT IT WOULD MAKE SEARCHING BY TOPIC EASIER
// BUT THINK ABOUT A FULL TEXT SEARCH - YOU'D HAVE TO DO ACROSS ALL THE TOPICS?


const fields = foundry.data.fields;
const entrySchema = {
  // @todo localize label
  topic: new fields.NumberField({ required: true, nullable: false, label: 'Topic', validate: (value: number) => { return value >= 0 && value <= Topic.organization; }, textSearch: true, }),

  // @todo localize label
  type: new fields.StringField({ required: true, nullable: false, label: 'Type', textSearch: true, }),

  // @todo localize label
  // @todo - should it be JSON?
  relationships: new fields.ObjectField({ required: true, nullable: false, label: 'Relationships', }),

  // description: new fields.SchemaField({
  //   short: new fields.HTMLField({required: false, blank: true})
  // }),
  // img: new fields.FilePathField({required: false, categories: ['IMAGE']}),
  // steps: new fields.ArrayField(new fields.StringField({blank: true}))
};
type EntrySchemaType = typeof entrySchema;

export class EntryModel<Schema extends EntrySchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): EntrySchemaType {
    return entrySchema;
  }

  // prepareDerivedData() {}
}

// export class SessionSheet extends DocumentSheetV2<JournalEntry> {
//   get template() {
//     return `modules/${moduleJson.id}/templates/inputDialog.hbs`;    //-${this.isEditable ? "edit" : "view"}.html`;
//   }

//   async getData(options={}) {
//     const context = await super.getData(options);
//     // context.description = {
//     //   long: await TextEditor.enrichHTML(this.object.system.description.long, {
//     //     async: true,
//     //     secrets: this.object.isOwner,
//     //     relativeTo: this.object
//     //   }),
//     //   short: await TextEditor.enrichHTML(this.object.system.description.short, {
//     //     async: true,
//     //     secrets: this.object.isOwner,
//     //     relativeTo: this.object
//     //   })
//     // };
//     return context;
//   }
// }

// export class SessionSheet extends VueApplicationMixin(DocumentSheetV2<JournalEntryPage>) {
//   static DEFAULT_OPTIONS = {
//     id: `app-${moduleJson.id}-Session`,
//     classes: ['fwb-main-window'], 
//     // viewPermission: foundry.CONST.USER_ROLES.GAMEMASTER,
//     // editPermission: foundry.CONST.USER_ROLES.GAMEMASTER,
//     form: {
//       // closeOnSubmit: false,
//       submitOnChange: true,
//       // submitOnClose: false,
//     },
//     actions: {
//       configureSheet: () => { alert('configureSheet is not yet implemented'); }
//     }
//   };

//   static DEBUG = false;

//   static SHADOWROOT = false;

//   static PARTS = {
//     app: {
//       id: 'fwb-session',
//       component: App,
//       props: {
//         document: {}
//       },
//       use: {
//         // pinia: {
//         //   plugin: pinia,
//         //   options: {}
//         // },
//         // vuetify: { plugin: vuetify }
//         quasar: { plugin: Quasar }
//       }
//     }
//   };

//   async _renderHTML(context, options) {
//     options.props = {
//       document: options.renderData,
//     };

//     return super._renderHTML(context, options);
//   }
// }