import { Migration, MigrationResult, MigrationContext } from '../types';
import { ModuleSettings, SettingKey, moduleId } from '@/settings';
import { useMainStore } from '@/applications/stores';
import { DOCUMENT_TYPES } from '@/documents';

/**
 * Migration v1.9.1
 *
 * Moves tags from module settings to individual FCBSetting documents.
 * Each setting now stores its own tags, making tags setting-specific.
 */
export class MigrationV1_9_1 implements Migration {
  public readonly targetVersion = '1.9.1';
  public readonly description = 'Moves tags from module settings to individual settings';

  // private _context: MigrationContext;

  constructor(_context: MigrationContext) {
    // this._context = _context;
  }

  /**
   * Scans all documents with tags (entries, sessions, arcs, fronts) and builds
   * tag lists for each setting, then saves them to the setting document.
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
    };

    // Get the global tag list to preserve colors
    const globalTagList = ModuleSettings.get(SettingKey.contentTags) || {};
    
    const settings = await useMainStore().getAllSettings();
    
    // Document types that have tags
    const tagDocumentTypes = [
      DOCUMENT_TYPES.Entry,
      DOCUMENT_TYPES.Session,
      DOCUMENT_TYPES.Arc,
      DOCUMENT_TYPES.Front,
    ];

    for (const setting of settings) {
      const allDocumentsIndex = await setting.compendium.getIndex({
        fields: [
          'uuid',
          `flags.${moduleId}.campaignBuilderType`,
        ]
      });

      // Filter to only documents that have tags
      const tagDocs = allDocumentsIndex.filter((d: any) => 
        tagDocumentTypes.includes(d.flags?.[moduleId]?.campaignBuilderType)
      );

      for (const doc of tagDocs) {
        try {
          const journalEntry = await foundry.utils.fromUuid<JournalEntry>(doc.uuid);
          if (!journalEntry || !journalEntry.pages || journalEntry.pages.contents.length !== 1)
            continue;

          const page = journalEntry.pages.contents[0];
          // @ts-ignore
          const tags = (page.system as Record<string, unknown>)?.tags as string[] | undefined;
          
          if (!Array.isArray(tags))
            continue;

          for (const tag of tags) {
            const color = globalTagList[tag]?.color || null;
            setting.addTag(tag, color);
          }
          
          result.migratedCount++;
        } catch (error) {
          result.failedCount++;
          console.error(`Migration v1.9.1: failed to process document ${doc.uuid}:`, error);
        }
      }

      // Save the tag list to the setting
      await setting.save();
    }

    return result;
  }
}
