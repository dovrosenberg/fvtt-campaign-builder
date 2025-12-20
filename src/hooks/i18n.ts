import { localize } from '@/utils/game';
import { defaultCustomFields, CustomFieldContentType, FieldType } from '@/types';

export function registerFori18nHook() {
  Hooks.once('i18nInit', i18nInit);
}

/** call this after localization is loaded */
const i18nInit = () => {
  // initialize defaultCustomFields, which relies on localization
  defaultCustomFields[CustomFieldContentType.Setting] = [];

  defaultCustomFields[CustomFieldContentType.Character] = [{
      name: 'roleplaying_notes',
      label: localize('labels.fields.entryRolePlayingNotes'),
      fieldType: FieldType.Editor,
      sortOrder: 0,
    }
  ];
    
  defaultCustomFields[CustomFieldContentType.Location] = [{
      name: 'roleplaying_notes',
      label: localize('labels.fields.entryRolePlayingNotes'),
      fieldType: FieldType.Editor,
      sortOrder: 0,
    }
  ];
    
  defaultCustomFields[CustomFieldContentType.Organization] = [{
      name: 'roleplaying_notes',
      label: localize('labels.fields.entryRolePlayingNotes'),
      fieldType: FieldType.Editor,
      sortOrder: 0,
    }
  ];
  
  defaultCustomFields[CustomFieldContentType.PC] = [
    {
      name: 'background',
      label: localize('labels.fields.background'),
      fieldType: FieldType.Editor,
      sortOrder: 0,
    },{
      name: 'other_plot_points',
      label: localize('labels.fields.otherPlotPoints'),
      fieldType: FieldType.Editor,
      sortOrder: 0,
    },{
      name: 'desired_magic_items',
      label: localize('labels.fields.desiredMagicItems'),
      fieldType: FieldType.Editor,
      sortOrder: 1,
    }
  ];

  defaultCustomFields[CustomFieldContentType.Session] = [{
      name: 'strong_start',
      label: localize('labels.fields.strongStart'),
      fieldType: FieldType.Editor,
      sortOrder: 0,
    }
  ];

  defaultCustomFields[CustomFieldContentType.Front] = [];

  defaultCustomFields[CustomFieldContentType.Arc] = [];

  defaultCustomFields[CustomFieldContentType.Campaign] = [{
      name: 'house_rules',
      label: localize('labels.fields.houseRules'),
      fieldType: FieldType.Editor,
      sortOrder: 0,
    }
  ];
}

