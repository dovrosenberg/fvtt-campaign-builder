import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { useMainStore } from '@/applications/stores';
import { moduleId, ModuleSettings, SettingKey } from '@/settings';
import { DOCUMENT_TYPES } from '@/documents/types';
import { CustomFieldContentType, } from '@/types';
import { localize } from '@/utils/game';
import { resetDefaultCustomFields, toCustomFieldKey } from '@/utils/customFields';
import { Campaign, Entry, Session } from '@/classes';

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
      // we have to temporarily register this setting because we need to know the old value
      // @ts-ignore
      game.settings.register(moduleId, 'showRolePlayingNotes', {
        default: true,
        type: Boolean,
        scope: 'client',
        config: false,
      });
       
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
      customFields[CustomFieldContentType.PC][1].name = KEY_OTHER_PLOT_POINTS;
      customFields[CustomFieldContentType.PC][2].name = KEY_DESIRED_MAGIC_ITEMS;
      customFields[CustomFieldContentType.Character][0].name = KEY_ROLEPLAYING_NOTES;
      customFields[CustomFieldContentType.Location][0].name = KEY_ROLEPLAYING_NOTES;
      customFields[CustomFieldContentType.Organization][0].name = KEY_ROLEPLAYING_NOTES;

      // if we weren't using roleplaynotes, remove that field from the default
      // @ts-ignore
      if (!game.settings.get(moduleId, 'showRolePlayingNotes')) {
        customFields[CustomFieldContentType.Character] = customFields[CustomFieldContentType.Character].filter((f: any) => f.name !== KEY_ROLEPLAYING_NOTES);
        customFields[CustomFieldContentType.Location] = customFields[CustomFieldContentType.Location].filter((f: any) => f.name !== KEY_ROLEPLAYING_NOTES);
        customFields[CustomFieldContentType.Organization] = customFields[CustomFieldContentType.Organization].filter((f: any) => f.name !== KEY_ROLEPLAYING_NOTES);
      }
      
      await ModuleSettings.set(SettingKey.customFields, customFields);

      // session.strong_start and pc.background are being moved from a hardcoded field into a custom field
      const KEY_STRONG_START = toCustomFieldKey(localize('labels.fields.strongStart'));
      const KEY_BACKGROUND = toCustomFieldKey(localize('labels.fields.background'));

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
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Session ||
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Entry
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
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Session ||
          d.flags?.[moduleId]?.campaignBuilderType === DOCUMENT_TYPES.Entry
        ));

        for (const doc of relevantDocs) {
          try {
            const journalEntry = await fromUuid<JournalEntry>(doc.uuid);
            if (!journalEntry || !journalEntry.pages || journalEntry.pages.contents.length !== 1) {
              continue;
            }

            switch (doc.flags?.[moduleId]?.campaignBuilderType) {
              case DOCUMENT_TYPES.Campaign:
                const campaign = new Campaign(journalEntry);

                // description is being moved from system.description to text.content
                campaign.description = campaign.raw.system?.description || '';
                await campaign.save();

                result.migratedCount++;
                break;

              case DOCUMENT_TYPES.Session:
                const session = new Session(journalEntry);

                // strong start is being moved from system.strongStart to a customfield
                session.setCustomField(KEY_STRONG_START, session.raw.system?.strongStart || '');
                await session.save();

                result.migratedCount++;
                break;

              case DOCUMENT_TYPES.Entry: 
                const entry = new Entry(journalEntry);

                // background is being moved from system.background to a customfield
                entry.setCustomField(KEY_BACKGROUND, entry.raw.system?.background || '');
                await entry.save();

                result.migratedCount++;
                break;
              
              default:
                break;
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
