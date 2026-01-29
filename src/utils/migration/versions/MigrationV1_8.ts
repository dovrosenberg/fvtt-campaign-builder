import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { useMainStore } from '@/applications/stores';
import { moduleId, ModuleSettings, SettingKey } from '@/settings';
import { DOCUMENT_TYPES } from '@/documents/types';
import { CustomFieldContentType, CustomFieldDescription, FieldType, TagList, } from '@/types';
import { localize } from '@/utils/game';
import CustomFieldsService from '@/utils/customFields';
import { Campaign, Entry, Session } from '@/classes';
import { generateIdFromName } from '@/utils/idGeneration';

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
      // we have to temporarily register these settings because we need to know the old value
      // @ts-ignore
      game.settings.register(moduleId, 'showRolePlayingNotes', {
        default: true,
        type: Boolean,
        scope: 'world',
        config: false,
      });
      // @ts-ignore
      game.settings.register(moduleId, 'rpgStyle', {
        default: true,
        type: Boolean,
        scope: 'world',
        config: false,
      });
      // @ts-ignore
      game.settings.register(moduleId, 'longDescriptionParagraphs', {
        default: 2,
        type: Number,
        scope: 'world',
        config: false,
      });
      // @ts-ignore
      game.settings.register(moduleId, 'entryTags', {
        default: {},
        type: Object,
        scope: 'world',
        config: false,
      });
      // @ts-ignore
      game.settings.register(moduleId, 'sessionTags', {
        default: {},
        type: Object,
        scope: 'world',
        config: false,
      });
      // @ts-ignore
      game.settings.register(moduleId, 'frontTags', {
        default: {},
        type: Object,
        scope: 'world',
        config: false,
      });
      // @ts-ignore
      game.settings.register(moduleId, 'arcTags', {
        default: {},
        type: Object,
        scope: 'world',
        config: false,
      });
       

      // consolidate all the tags into a single setting
      const contentTags = ModuleSettings.get(SettingKey.contentTags);

      // @ts-ignore
      const entryTags = game.settings.get(moduleId, 'entryTags') as TagList;
      // @ts-ignore
      const sessionTags = game.settings.get(moduleId, 'sessionTags') as TagList;
      // @ts-ignore
      const frontTags = game.settings.get(moduleId, 'frontTags') as TagList;
      // @ts-ignore
      const arcTags = game.settings.get(moduleId, 'arcTags') as TagList;

      for (const [key, value] of Object.entries(entryTags)) {
        // whichever color we find first, we'll keep
        if (contentTags[key]) {
          contentTags[key].count += value.count;
        } else {
          contentTags[key] = value;
        }
      }
      for (const [key, value] of Object.entries(sessionTags)) {
        // whichever color we find first, we'll keep
        if (contentTags[key]) {
          contentTags[key].count += value.count;
        } else {
          contentTags[key] = value;
        }
      }
      for (const [key, value] of Object.entries(frontTags)) {
        // whichever color we find first, we'll keep
        if (contentTags[key]) {
          contentTags[key].count += value.count;
        } else {
          contentTags[key] = value;
        }
      }
      for (const [key, value] of Object.entries(arcTags)) {
        // whichever color we find first, we'll keep
        if (contentTags[key]) {
          contentTags[key].count += value.count;
        } else {
          contentTags[key] = value;
        }
      }

      await ModuleSettings.set(SettingKey.contentTags, contentTags);

      const settings = await useMainStore().getAllSettings();

      // some values were housed in system.customFields already and we don't want to 
      //    lose whatever values are in them. We preserve them by migrating stored customFields
      //    keys on existing documents from legacy keys -> localized keys.
      const KEY_HOUSE_RULES_OLD = 'house_rules';
      const KEY_OTHER_PLOT_POINTS_OLD = 'other_plot_points';
      const KEY_DESIRED_MAGIC_ITEMS_OLD = 'desired_magic_items';
      const KEY_ROLEPLAYING_NOTES_OLD = 'roleplaying_notes';
      const KEY_HOUSE_RULES_NEW = generateIdFromName(localize('labels.fields.houseRules'));
      const KEY_OTHER_PLOT_POINTS_NEW = generateIdFromName(localize('labels.fields.otherPlotPoints'));
      const KEY_DESIRED_MAGIC_ITEMS_NEW = generateIdFromName(localize('labels.fields.desiredMagicItems'));
      const KEY_ROLEPLAYING_NOTES_NEW = generateIdFromName(localize('labels.fields.entryRolePlayingNotes'));

      const LABEL_AI_DESCRIPTION = localize('labels.fields.aiDescription');
      const KEY_AI_DESCRIPTION = generateIdFromName(LABEL_AI_DESCRIPTION);
      const KEY_BOXED_TEXT = generateIdFromName(localize('labels.fields.boxedText'));
      const KEY_GM_NOTES = generateIdFromName(localize('labels.fields.gmNotes'));

      await CustomFieldsService.resetDefaultCustomFields();
      const customFields = ModuleSettings.get(SettingKey.customFields);

      // if we were using AI, add an AI-generated description field to the entries
      if (ModuleSettings.get(SettingKey.APIURL) && ModuleSettings.get(SettingKey.APIToken)) {
        let AIDescriptionFieldDescription: CustomFieldDescription;

        const characterPreamble = 'I need you to suggest a description for a character. ';
        const locationPreamble = 'I need you to suggest a description for a location. ';
        const organizationPreamble = 'I need you to suggest a description for an organization. ';

        // if rpgstyle was off, it was a long description; if it was on, it was boxed text
        // @ts-ignore
        if (!game.settings.get(moduleId, 'rpgStyle')) {
          // @ts-ignore
          const longDescriptionParagraphs = game.settings.get(moduleId, 'longDescriptionParagraphs') as Number || 2;
          AIDescriptionFieldDescription = {
            name: KEY_AI_DESCRIPTION,
            label: LABEL_AI_DESCRIPTION,
            fieldType: FieldType.Editor,
            editorHeight: 15,
            aiEnabled: true,
            aiPromptTemplate: `  
              The description should be ${longDescriptionParagraphs} paragraph${longDescriptionParagraphs === 1 ? '' : 's'} long
              A paragraph should be no more than 6 sentences long.
            `,
            deleted: false,
            indexed: true,
            sortOrder: 0,
            configuration: {
              minWords: 150,
              maxWords: 220,
              tone: 'neutral',
              tense: 'present',
              pov: 'third',
              includeBullets: false,
              avoidListsLongerThan: 0,
            }
          }

          // add the field to all the entries (at the top)
          customFields[CustomFieldContentType.Location].unshift({...AIDescriptionFieldDescription, aiPromptTemplate: locationPreamble + AIDescriptionFieldDescription.aiPromptTemplate });
          customFields[CustomFieldContentType.Organization].unshift({...AIDescriptionFieldDescription, aiPromptTemplate: organizationPreamble + AIDescriptionFieldDescription.aiPromptTemplate});
          customFields[CustomFieldContentType.Character].unshift({...AIDescriptionFieldDescription, aiPromptTemplate: characterPreamble + AIDescriptionFieldDescription.aiPromptTemplate});

          // remove the default boxed text and gm notes fields
          customFields[CustomFieldContentType.Location] = customFields[CustomFieldContentType.Location].filter((f: any) => f.name !== KEY_BOXED_TEXT && f.name !== KEY_GM_NOTES);
          customFields[CustomFieldContentType.Organization] = customFields[CustomFieldContentType.Organization].filter((f: any) => f.name !== KEY_BOXED_TEXT && f.name !== KEY_GM_NOTES);
          customFields[CustomFieldContentType.Character] = customFields[CustomFieldContentType.Character].filter((f: any) => f.name !== KEY_BOXED_TEXT && f.name !== KEY_GM_NOTES);

          // need to change the default AI image fields for these content types because they refer to boxed text
          const aiImageConfig = ModuleSettings.get(SettingKey.aiImageConfigurations);
          aiImageConfig[CustomFieldContentType.Location].descriptionField = KEY_AI_DESCRIPTION;
          aiImageConfig[CustomFieldContentType.Organization].descriptionField = KEY_AI_DESCRIPTION;
          aiImageConfig[CustomFieldContentType.Character].descriptionField = KEY_AI_DESCRIPTION;
          await ModuleSettings.set(SettingKey.aiImageConfigurations, aiImageConfig);

        } else {
          // the default custom fields include boxed text replacements
        }
      }

      // if we weren't using roleplaynotes, remove that field from the default
      // @ts-ignore
      if (!game.settings.get(moduleId, 'showRolePlayingNotes')) {
        customFields[CustomFieldContentType.Character] = customFields[CustomFieldContentType.Character].filter((f: any) => f.name !== KEY_ROLEPLAYING_NOTES_NEW);
        customFields[CustomFieldContentType.Location] = customFields[CustomFieldContentType.Location].filter((f: any) => f.name !== KEY_ROLEPLAYING_NOTES_NEW);
        customFields[CustomFieldContentType.Organization] = customFields[CustomFieldContentType.Organization].filter((f: any) => f.name !== KEY_ROLEPLAYING_NOTES_NEW);
      }

      normalizeSortOrders(customFields);
      
      await ModuleSettings.set(SettingKey.customFields, customFields);

      // session.strong_start and pc.background are being moved from a hardcoded field into a custom field
      const KEY_STRONG_START = generateIdFromName(localize('labels.fields.strongStart'));
      const KEY_BACKGROUND = generateIdFromName(localize('labels.fields.background'));

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

                migrateStoredCustomFieldKey(campaign, KEY_HOUSE_RULES_OLD, KEY_HOUSE_RULES_NEW);

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

                migrateStoredCustomFieldKey(entry, KEY_ROLEPLAYING_NOTES_OLD, KEY_ROLEPLAYING_NOTES_NEW);
                migrateStoredCustomFieldKey(entry, KEY_OTHER_PLOT_POINTS_OLD, KEY_OTHER_PLOT_POINTS_NEW);
                migrateStoredCustomFieldKey(entry, KEY_DESIRED_MAGIC_ITEMS_OLD, KEY_DESIRED_MAGIC_ITEMS_NEW);

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
          updateProgress(localize('dialogs.migrationProgress.status.migratedDocumentsProgress', { migrated: processed.toString(), total: totalEntries.toString() }));
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

function migrateStoredCustomFieldKey(content: Campaign | Entry, oldKey: string, newKey: string): void {
  if (oldKey === newKey)
    return;

  const customFields = (content as any)?._clone?.system?.customFields as Record<string, unknown> | undefined;
  if (!customFields || typeof customFields !== 'object')
    return;

  if (!Object.keys(customFields).includes(oldKey))
    return;

  customFields[newKey] = customFields[oldKey];
  delete customFields[oldKey];
}

function normalizeSortOrders(customFields: Record<CustomFieldContentType, CustomFieldDescription[]>) {
  for (const fields of Object.values(customFields)) {
    if (!Array.isArray(fields))
      continue;

    fields.forEach((field, index) => {
      field.sortOrder = index;
    });
  }
}

