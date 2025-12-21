import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { useMainStore } from '@/applications/stores';
import { moduleId, ModuleSettings, SettingKey } from '@/settings';
import { DOCUMENT_TYPES } from '@/documents/types';
import { CustomFieldContentType, } from '@/types';
import { localize } from '@/utils/game';
import { resetDefaultCustomFields, toCustomFieldKey } from '@/utils/customFields';

let processed = 0;
let totalEntries= 0;
const updateProgress = (status: string) => {
  const event = new CustomEvent('migration-progress', {
    detail: { current: processed, total: totalEntries, status }
  });
  document.dispatchEvent(event);
};

export class MigrationV1_8 implements Migration {
  public readonly targetVersion = '1.8.0';
  public readonly description = 'Moves campaign description from system.description to text.content';

  private _context: MigrationContext;

  constructor(_context: MigrationContext) {
    this._context = _context;
  }

  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      warnings: []
    };

    // we don't support dry run because we do the settings update and then rely on the
    //    result later
    if (this._context.dryRun)
      throw new Error('Dry run not supported in 1.8');

    try {
      const settings = await useMainStore().getAllSettings();

      // some values were housed in system.customFields already and we don't want to 
      //    lose whatever values are in them.  so for those fields we are going to 
      //    use the old keys instead of the new, localized ones.  This applies to campaign.house_rules,
      //    PC.other_plot_points, PC.desired_magic_items, and entry.roleplaying_notes.
      const KEY_HOUSE_RULES = 'house_rules';
      const KEY_OTHER_PLOT_POINTS = 'other_plot_points';
      const KEY_DESIRED_MAGIC_ITEMS = 'desired_magic_items';
      const KEY_ROLEPLAYING_NOTES = 'roleplaying_notes';

      await resetDefaultCustomFields();
      const customFields = ModuleSettings.get(SettingKey.customFields);
      customFields[CustomFieldContentType.Campaign][0].name = KEY_HOUSE_RULES;
      customFields[CustomFieldContentType.PC][0].name = KEY_ROLEPLAYING_NOTES;
      customFields[CustomFieldContentType.PC][1].name = KEY_OTHER_PLOT_POINTS;
      customFields[CustomFieldContentType.PC][2].name = KEY_DESIRED_MAGIC_ITEMS;
      customFields[CustomFieldContentType.Character][0].name = KEY_ROLEPLAYING_NOTES;
      customFields[CustomFieldContentType.Location][0].name = KEY_ROLEPLAYING_NOTES;
      customFields[CustomFieldContentType.Organization][0].name = KEY_ROLEPLAYING_NOTES;

      await ModuleSettings.set(SettingKey.customFields, customFields);

      // session.strong_start is being moved from a hardcoded field into a custom field
      const KEY_STRONG_START = toCustomFieldKey(localize('labels.fields.strongStart'));

      for (const setting of settings) {
        const allDocumentsIndex = await setting.compendium.getIndex({
          fields: [
            'name',
            // @ts-ignore
            'uuid',
            // @ts-ignore
            `flags.${moduleId}.campaignBuilderType`,
          ]
        });

        totalEntries += allDocumentsIndex.filter((d: any) => (
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Campaign ||
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Session
        )).length;
      }

      for (const setting of settings) {
        const allDocumentsIndex = await setting.compendium.getIndex({
          fields: [
            // @ts-ignore
            'uuid',
            // @ts-ignore
            `flags.${moduleId}.campaignBuilderType`,
            // @ts-ignore
            'pages.system',
            // @ts-ignore
            'pages.text',
          ]
        });

        const relevantDocs = allDocumentsIndex.filter((d: any) => (
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Campaign ||
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Session 
        ));

        for (const doc of relevantDocs) {
          try {
            const journalEntry = await fromUuid<JournalEntry>(doc.uuid);
            if (!journalEntry || !journalEntry.pages || journalEntry.pages.contents.length !== 1) {
              continue;
            }

            const page = journalEntry.pages.contents[0];

            if (page.type === DOCUMENT_TYPES.Campaign) {
              // description is being moved from system.description to text.content
              const oldSystemDescription = (page.system as any)?.description as string | undefined;

              const oldHasValue = !!oldSystemDescription && oldSystemDescription.trim() !== '';

              if (oldHasValue) {
                const newText = {
                  ...(page.text || {}),
                  content: oldSystemDescription
                };

                const newSystem = {
                  ...(page.system as any),
                  description: ''
                };

                await page.update({ text: newText, system: newSystem }, { recursive: false, render: false });
              }

              result.migratedCount++;
            }

            if (page.type === DOCUMENT_TYPES.Session) {
              // strong start is being moved from system.strongStart to a customfield
              // remove old from system
              const { strongStart, ...restSystem } = page.system;

              const newSystem = {
                ...restSystem,
                customFields: {
                  [KEY_STRONG_START]: strongStart || '',
                },
              };

              await page.update({ system: newSystem }, { recursive: false, render: false });

              result.migratedCount++;
            }

          } catch (inner) {
            result.failedCount++;
            result.errors?.push(`Failed to migrate document for ${doc.uuid}: ${inner}`);
          }

          processed++;
          updateProgress(`Migrated documents (${processed}/${totalEntries})`);
        }
      }
    } catch (outer) {
      result.success = false;
      result.errors?.push(`MigrationV1_8 failed: ${outer}`);
      // eslint-disable-next-line no-console
      notifyError(`MigrationV1_8 failed: ${outer}`);
      console.error('MigrationV1_8 fatal error:', outer);
    }

    return result;
  }
}
