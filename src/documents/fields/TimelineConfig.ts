import { CalendariaDateSchema } from './CalendariaDate';

const fields = foundry.data.fields;

export const TimelineConfigSchema = () => (
  new fields.SchemaField({
    /** filters */
    filters: new fields.SchemaField({
      categories: new fields.ArrayField(
        new fields.StringField({ required: true, nullable: false }), 
        { required: true, nullable: false, initial: [] as string[] }
      ),
      textSearch: new fields.StringField({ required: true, nullable: false, initial: '' }),
      excludeGMOnly: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      referenceEntity: new fields.BooleanField({ required: true, nullable: false, initial: true }),
      includeNestedUuids: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      visibleRange: new fields.SchemaField({
        start: CalendariaDateSchema(),
        end: CalendariaDateSchema(),
      }, { required: true, nullable: true, initial: null }),
    }, { required: true, nullable: false }),
  }, { required: true, nullable: false} )
);

