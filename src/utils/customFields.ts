import { CustomFieldContentType, FieldType } from '@/types';
import { localize } from '@/utils/game';
import { ModuleSettings, SettingKey } from '@/settings';

export function toCustomFieldKey(text: string): string {
  const lowered = (text || '').toLowerCase();

  // keep only letters, numbers, and spaces
  const cleaned = lowered.replace(/[^a-z0-9 ]/g, '');

  const underscored = cleaned.trim().replace(/\s+/g, '_');
  if (!underscored) return '_';

  return underscored;
}

export function makeCustomFieldKeyUnique(baseKey: string, usedKeys: Set<string>): string {
  let key = baseKey;
  while (usedKeys.has(key)) {
    key = `${key}+`;
  }
  return key;
}

/** 
 * Set the default custom fields for the first time.  Can't be called until localization is available.
 */
export const resetDefaultCustomFields = async () => {
  const entryRoleplayingNotesLabel = localize('labels.fields.entryRolePlayingNotes');
  const entryRoleplayingNotesKey = toCustomFieldKey(entryRoleplayingNotesLabel);

  const otherPlotPointsLabel = localize('labels.fields.otherPlotPoints');
  const otherPlotPointsKey = toCustomFieldKey(otherPlotPointsLabel);

  const desiredMagicItemsLabel = localize('labels.fields.desiredMagicItems');
  const desiredMagicItemsKey = toCustomFieldKey(desiredMagicItemsLabel);

  const strongStartLabel = localize('labels.fields.strongStart');
  const strongStartKey = toCustomFieldKey(strongStartLabel);

  const houseRulesLabel = localize('labels.fields.houseRules');
  const houseRulesKey = toCustomFieldKey(houseRulesLabel);

  const defaultCustomFields = {
    [CustomFieldContentType.Setting]: [

    ],
    [CustomFieldContentType.Character]: [
      {
        name: entryRoleplayingNotesKey,
        label: entryRoleplayingNotesLabel,
        fieldType: FieldType.Editor,
        sortOrder: 0,
        editorHeight: 4,
      }
    ],
    [CustomFieldContentType.Location]: [
      {
        name: entryRoleplayingNotesKey,
        label: entryRoleplayingNotesLabel,
        fieldType: FieldType.Editor,
        sortOrder: 0,
        editorHeight: 4,
      }
    ],
    [CustomFieldContentType.Organization]: [
      {
        name: entryRoleplayingNotesKey,
        label: entryRoleplayingNotesLabel,
        fieldType: FieldType.Editor,
        sortOrder: 0,
        editorHeight: 4,
      }
    ],
    [CustomFieldContentType.PC]: [
      {
        name: entryRoleplayingNotesKey,
        label: entryRoleplayingNotesLabel,
        fieldType: FieldType.Editor,
        sortOrder: 0,
        editorHeight: 4,
      },{
        name: otherPlotPointsKey,
        label: otherPlotPointsLabel,
        fieldType: FieldType.Editor,
        sortOrder: 1,
        editorHeight: 4,
      },{
        name: desiredMagicItemsKey,
        label: desiredMagicItemsLabel,
        fieldType: FieldType.Editor,
        sortOrder: 2,
        editorHeight: 4,
      }
    ],
    [CustomFieldContentType.Front]: [

    ],
    [CustomFieldContentType.Campaign]: [
      {
        name: houseRulesKey,
        label: houseRulesLabel,
        fieldType: FieldType.Editor,
        sortOrder: 0,
        editorHeight: 4,
      }
    ],
    [CustomFieldContentType.Arc]: [

    ],
    [CustomFieldContentType.Session]: [
      {
        name: strongStartKey,
        label: strongStartLabel,
        fieldType: FieldType.Editor,
        sortOrder: 0,
        editorHeight: 4,
        helpText: localize('labels.fields.strongStartHelpText'),
      }
    ],
  };

  await ModuleSettings.set(SettingKey.customFields, defaultCustomFields);
}