import { localize } from '@/utils/game';
import { defaultCustomFields, CustomFieldContentType, FieldType } from '@/types';
import { toCustomFieldKey } from '@/utils/customFields';

export function registerFori18nHook() {
  Hooks.once('i18nInit', i18nInit);
}

/** call this after localization is loaded */
const i18nInit = () => {
  // initialize defaultCustomFields, which relies on localization
  defaultCustomFields[CustomFieldContentType.Setting] = [];

  const entryRoleplayingNotesLabel = localize('labels.fields.entryRolePlayingNotes');
  const entryRoleplayingNotesKey = toCustomFieldKey(entryRoleplayingNotesLabel);

  defaultCustomFields[CustomFieldContentType.Character] = [{
      name: entryRoleplayingNotesKey,
      label: entryRoleplayingNotesLabel,
      fieldType: FieldType.Editor,
      sortOrder: 0,
    }
  ];
    
  defaultCustomFields[CustomFieldContentType.Location] = [{
      name: entryRoleplayingNotesKey,
      label: entryRoleplayingNotesLabel,
      fieldType: FieldType.Editor,
      sortOrder: 0,
    }
  ];
    
  defaultCustomFields[CustomFieldContentType.Organization] = [{
      name: entryRoleplayingNotesKey,
      label: entryRoleplayingNotesLabel,
      fieldType: FieldType.Editor,
      sortOrder: 0,
    }
  ];
  
  const backgroundLabel = localize('labels.fields.background');
  const backgroundKey = toCustomFieldKey(backgroundLabel);

  const otherPlotPointsLabel = localize('labels.fields.otherPlotPoints');
  const otherPlotPointsKey = toCustomFieldKey(otherPlotPointsLabel);

  const desiredMagicItemsLabel = localize('labels.fields.desiredMagicItems');
  const desiredMagicItemsKey = toCustomFieldKey(desiredMagicItemsLabel);

  defaultCustomFields[CustomFieldContentType.PC] = [
    {
      name: backgroundKey,
      label: backgroundLabel,
      fieldType: FieldType.Editor,
      sortOrder: 0,
    },{
      name: otherPlotPointsKey,
      label: otherPlotPointsLabel,
      fieldType: FieldType.Editor,
      sortOrder: 0,
    },{
      name: desiredMagicItemsKey,
      label: desiredMagicItemsLabel,
      fieldType: FieldType.Editor,
      sortOrder: 1,
    }
  ];

  const strongStartLabel = localize('labels.fields.strongStart');
  const strongStartKey = toCustomFieldKey(strongStartLabel);

  defaultCustomFields[CustomFieldContentType.Session] = [{
      name: strongStartKey,
      label: strongStartLabel,
      fieldType: FieldType.Editor,
      sortOrder: 0,
      helpText: localize('labels.fields.strongStartHelpText'),
    }
  ];

  defaultCustomFields[CustomFieldContentType.Front] = [];

  defaultCustomFields[CustomFieldContentType.Arc] = [];

  const houseRulesLabel = localize('labels.fields.houseRules');
  const houseRulesKey = toCustomFieldKey(houseRulesLabel);

  defaultCustomFields[CustomFieldContentType.Campaign] = [{
      name: houseRulesKey,
      label: houseRulesLabel,
      fieldType: FieldType.Editor,
      sortOrder: 0,
    }
  ];
}

