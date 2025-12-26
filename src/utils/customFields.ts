import { CustomFieldContentType, FieldType, Topics, WindowTabType } from '@/types';
import { localize } from '@/utils/game';
import { ModuleSettings, SettingKey } from '@/settings';
import type { ImageConfiguration } from '@/settings';
import { Entry } from '@/classes';

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

  const boxedTextLabel = localize('labels.fields.boxedText');
  const boxedTextKey = toCustomFieldKey(boxedTextLabel);

  const gmNotesLabel = localize('labels.fields.gmNotes');
  const gmNotesKey = toCustomFieldKey(gmNotesLabel);

  const backgroundLabel = localize('labels.fields.background');
  const backgroundKey = toCustomFieldKey(backgroundLabel);

  const otherPlotPointsLabel = localize('labels.fields.otherPlotPoints');
  const otherPlotPointsKey = toCustomFieldKey(otherPlotPointsLabel);

  const desiredMagicItemsLabel = localize('labels.fields.desiredMagicItems');
  const desiredMagicItemsKey = toCustomFieldKey(desiredMagicItemsLabel);

  const strongStartLabel = localize('labels.fields.strongStart');
  const strongStartKey = toCustomFieldKey(strongStartLabel);

  const houseRulesLabel = localize('labels.fields.houseRules');
  const houseRulesKey = toCustomFieldKey(houseRulesLabel);

  const characterPrompt = `
    Generate a description of a location for GM use in a session.  Focus on immediate sensory impressions: Appearance (what they look like at first glance: clothing, posture, expression). Behavior / presence (mannerisms, how they carry themselves, the “vibe” they give off). Mood / emotional impression (how the characters make the PCs feel on meeting them).  Avoid backstory, stats, secret motives, or mechanical detail — keep it to what the PCs see, hear, and sense right now, before interacting with them. DO NOT describe anything about the location - just the character.
    It should have the following format: first line (don't include this header): a 1-sentence summary of who the NPC is and their general vibe.
    <br><b>Appearance:</b> a 1-2 sentence description of their appearance suitable for description to players in a game.
    <br><b>Voice:</b> generate a unique and easy-to-replicate voice style that does not rely on regional or ethnic accents. The voice should be suitable for tabletop roleplaying and easy for a Dungeon Master to repeat across sessions. Use the following elements to make it distinctive: 1) Pace: (e.g., slow, rapid, halting, smooth), 2) Tone: (e.g., gravelly, nasal, airy, booming, whispery), 3) Pitch: (e.g., high, low, medium), and 4) Rhythm or Quirk: (e.g., pauses often, speaks in rhyming phrases, repeats key words, ends sentences with a sigh or chuckle).  Combine those traits into a single sentence describes how the character sounds in a way that helps a DM perform the voice consistently. Avoid accents and instead focus on vocal characteristics and speech patterns.  For example: 
    <br><b>Voice:</b> Speaks in a smooth, low tone with deliberate pacing, often pausing to choose their words and ending sentences with a knowing hum.
    <br><b>Commonly used phrases:</b> several phrases they character might use repeatedly
    <br><b>Personality snapshot:</b> list of 3 key traits separated by commas.
    <br><b>Role-play hooks:</b> 2 tips on how to role-play them.
  `;
  const locationPrompt = `
    Generate a description of a location for GM use in a session. Focus on sensory details (sight, sound, smell, mood) without explaining history, mechanics, or secrets. Avoid backstory, stats, secret motives, or mechanical detail — keep it to what the PCs see, hear, and sense right now.',
    You do not need to include interactive elements like NPCs, traps, etc. unless provided in the brief description I give you.
    It should have the following format: first line (don't include this header): a 1-sentence summary of what the location is and its main vibe.
    <br><b>Notable features:</b> list of 3 key physical or cultural details, separated by commas.
    <br><b>Sights, sounds, smells:</b> 3 quick sensory cues for immersion, separated by commas.
    <br><b>Role-play hooks:</b> 2 ideas for how characters might interact with or feel about the location
  `;
  const organizationPrompt = `
    Generate a description of a location for GM use in a session. Focus on how the organization is perceived publicly, the “surface layer” the PCs would know or sense. Think of what might be said in a tavern or seen in a city square. Include: Symbols / colors / uniforms / insignia. Reputation / rumors (what the average person thinks of them). Public presence (guards in the streets, banners, ceremonies, recruiters, pamphlets, etc.). Mood / impression (fearsome, respected, charitable, shadowy). Avoid inner workings, true motives, or mechanics — it’s just what PCs would pick up without special investigation.
    It should have the following format: first line (don't include this header): a 1-sentence summary of who they are and what they want
    <br><b>Symbols, colors, or style:</b> a quick description of their visual identity
    <br><b>Core beliefs or goals:</b> list of 3 things that motivate them
    <br><b>Methods and behavior:</b> 3 bullet points on how they operate
    <br><b>Role-play hooks:</b> 2 ideas for how characters might interact with or feel about the organization
  `;

  const characterBoxedTextPrompt = `
    Write read-aloud boxed text describing the character for players.
    Focus on immediate sensory impressions only: appearance, posture, expression, mannerisms, and vibe.
    Avoid backstory, stats, secret motives, or mechanical detail — keep it to what the PCs can see/hear/sense right now.
  `;
  const characterGMNotesPrompt = `
    Write GM-only notes for running this character.
    Use concise bullet points. Include secrets, goals, leverage the players can use against the character, useful rumors, and 2 role-play cues.
    Avoid repeating the boxed text; focus on what the GM needs.
  `;

  const locationBoxedTextPrompt = `
    Write read-aloud boxed text describing the location for players.
    Focus on sensory details (sight, sound, smell, mood) and immediate, obvious features.
    Avoid backstory, mechanics, secret motives, or hidden details — keep it to what the PCs can perceive right now.
  `;
  
  const locationGMNotesPrompt = `
    Write GM-only notes for running this location.
    Use concise bullet points. Include hidden details, dangers, secrets, and 2 interaction hooks.
    Avoid repeating the boxed text; focus on what the GM needs.
  `;

  const rpgNotesConfig = (topicPrompt: string) => ({
    name: entryRoleplayingNotesKey,
    label: entryRoleplayingNotesLabel,
    fieldType: FieldType.Editor,
    sortOrder: 0,
    editorHeight: 10,
    deleted: false,
    indexed: true,
    aiEnabled: true,
    aiPromptTemplate: topicPrompt.replace(/^\s*/gm, ''),
    configuration: {
      minWords: 60,
      maxWords: 100,
      tone: 'evocative, table-ready',
      tense: 'present',
      pov: 'third',
      includeBullets: true,
      avoidListsLongerThan: 3,
    }
  });

  const boxedTextConfig = (topicPrompt: string) => ({
    name: boxedTextKey,
    label: boxedTextLabel,
    fieldType: FieldType.Editor,
    sortOrder: 0,
    editorHeight: 10,
    deleted: false,
    indexed: true,
    aiEnabled: true,
    aiPromptTemplate: topicPrompt.replace(/^\s*/gm, ''),
    configuration: {
      minWords: 60,
      maxWords: 120,
      tone: 'evocative, table-ready',
      tense: 'present',
      pov: 'third',
      includeBullets: false,
      avoidListsLongerThan: 0,
    }
  });

  const gmNotesConfig = (topicPrompt: string) => ({
    name: gmNotesKey,
    label: gmNotesLabel,
    fieldType: FieldType.Editor,
    sortOrder: 1,
    editorHeight: 12,
    deleted: false,
    indexed: true,
    aiEnabled: true,
    aiPromptTemplate: topicPrompt.replace(/^\s*/gm, ''),
    configuration: {
      minWords: 80,
      maxWords: 160,
      tone: 'practical, game-master facing',
      tense: 'present',
      pov: 'third',
      includeBullets: true,
      avoidListsLongerThan: 8,
    }
  });
    
  const defaultCustomFields = {
    [CustomFieldContentType.Setting]: [

    ],
    [CustomFieldContentType.Character]: [
      boxedTextConfig(characterBoxedTextPrompt),
      gmNotesConfig(characterGMNotesPrompt),
      { ...rpgNotesConfig(characterPrompt), sortOrder: 2 },
    ],
    [CustomFieldContentType.Location]: [
      boxedTextConfig(locationBoxedTextPrompt),
      gmNotesConfig(locationGMNotesPrompt),
      { ...rpgNotesConfig(locationPrompt), sortOrder: 2 },
    ],
    [CustomFieldContentType.Organization]: [rpgNotesConfig(organizationPrompt) ],
    [CustomFieldContentType.PC]: [
     {
        name: backgroundKey,
        label: backgroundLabel,
        fieldType: FieldType.Editor,
        sortOrder: 0,
        indexed: true,
        editorHeight: 15,
      },{
        name: otherPlotPointsKey,
        label: otherPlotPointsLabel,
        fieldType: FieldType.Editor,
        sortOrder: 1,
        indexed: true,
        editorHeight: 10,
      },{
        name: desiredMagicItemsKey,
        label: desiredMagicItemsLabel,
        fieldType: FieldType.Editor,
        sortOrder: 2,
        indexed: true,
        editorHeight: 10,
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
        editorHeight: 18,
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
        editorHeight: 10,
        indexed: true,
        helpText: localize('labels.fields.strongStartHelpText'),
        helpLink: 'https://slyflourish.com/starting_strong.html',
      }
    ],
  };

  await ModuleSettings.set(SettingKey.customFields, defaultCustomFields);
  
  // Also initialize default image configurations
  await initializeDefaultImageConfigurations(boxedTextKey);
}

/** 
 * Set the default image configurations for the first time.
 */
export const initializeDefaultImageConfigurations = async (boxedTextKey: string) => {
  // Default image configuration for all content types
  const defaultConfig: ImageConfiguration = {
    artStyle: 'fantasy illustration, digital painting, professional TTRPG art style',
    medium: 'digital art, high resolution',
    modelStyle: 'cinematic, detailed, professional illustration',
    contentRating: 'PG-13',
    composition: 'dynamic composition, rule of thirds, professional layout',
    lighting: 'dramatic lighting, rich colors, full color illustration',
    colorPalette: 'rich vibrant colors, professional color grading, full color',
    camera: 'eye level, dramatic angle, professional composition',
    mood: 'epic, adventurous, immersive',
    negativePrompt: 'blurry, low quality, amateur, sketch, monochrome, black and white, simple, cartoon, anime, manga, photo, realistic',
    descriptionField: 'description',
    providerOptions: {},
  };
  
  // Default prompts for each content type
  const defaultPrompts: Record<CustomFieldContentType, string> = {
    [CustomFieldContentType.Setting]: 'Cover art for a TTRPG campaign setting book.',
    [CustomFieldContentType.Character]: 'Portrait of a character from a TTRPG campaign.',
    [CustomFieldContentType.Location]: 'Image of a location from a TTRPG campaign.',
    [CustomFieldContentType.Organization]: 'Image to be used alongside the description of an organization in a TTRPG campaign book.',
    [CustomFieldContentType.Arc]: 'Cover art for a chapter of a TTRPG campaign book.',
    [CustomFieldContentType.Front]: 'Art of a dramatic or threatening scene for a section of a TTRPG campaign book to to be used to describe the {name} front.',
    [CustomFieldContentType.PC]: '',
    [CustomFieldContentType.Session]: 'Art of the most exciting or dramatic moment for a section of a TTRPG campaign book to to be used to describe a particular section of an adventure.  Here is how it starts:\n{strong_start}',
    [CustomFieldContentType.Campaign]: 'Cover art for a TTRPG campaign book.'
  };
  
  const defaultDescriptions: Record<CustomFieldContentType, string> = {
    [CustomFieldContentType.Setting]: 'description',
    [CustomFieldContentType.Character]: boxedTextKey,
    [CustomFieldContentType.Location]: boxedTextKey,
    [CustomFieldContentType.Organization]: boxedTextKey,
    [CustomFieldContentType.PC]: '',
    [CustomFieldContentType.Arc]: 'description',
    [CustomFieldContentType.Front]: 'description',
    [CustomFieldContentType.Session]: 'description',
    [CustomFieldContentType.Campaign]: 'description'
  };

  // Create configurations for all content types
  const configurations: Record<CustomFieldContentType, ImageConfiguration> = {
    [CustomFieldContentType.Setting]: { 
      ...{...defaultConfig, descriptionField: defaultDescriptions[CustomFieldContentType.Setting]},
      composition: 'epic landscape composition, wide angle view, establishing shot, cover art layout',
      camera: 'wide angle shot, aerial view, cinematic establishing shot',
    },
    [CustomFieldContentType.Character]: { 
      ...{...defaultConfig, descriptionField: defaultDescriptions[CustomFieldContentType.Character]},
      composition: 'character portrait composition, centered subject, rule of thirds, dynamic pose',
      camera: 'medium shot, character view, slightly low angle to show heroism',
    },
    [CustomFieldContentType.Location]: { 
      ...{...defaultConfig, descriptionField: defaultDescriptions[CustomFieldContentType.Location]},
      composition: 'environmental composition, depth of field, leading lines, atmospheric perspective',
      camera: 'establishing shot, eye level, wide view to show scale',
    },
    [CustomFieldContentType.Organization]: { 
      ...{...defaultConfig, descriptionField: defaultDescriptions[CustomFieldContentType.Organization]},
      composition: 'symbolic composition, emblematic layout, centered focal point, heraldic design',
      camera: 'straight on view, symmetrical composition, professional presentation',
    },
    [CustomFieldContentType.Arc]: { 
      ...{...defaultConfig, descriptionField: defaultDescriptions[CustomFieldContentType.Arc]},
      composition: 'chapter cover composition, dramatic scene, narrative focus, action layout',
      camera: 'dynamic angle, action shot, cinematic composition',
    },
    [CustomFieldContentType.Front]: { 
      ...{...defaultConfig, descriptionField: defaultDescriptions[CustomFieldContentType.Front]},
      composition: 'tension-filled composition, dramatic lighting, foreboding atmosphere, action scene',
      camera: 'low angle shot to emphasize threat, dramatic perspective',
    },
    [CustomFieldContentType.PC]: { 
      ...defaultConfig,
      composition: 'character portrait composition, heroic pose, player character focus',
      camera: 'medium close shot, eye level, character-focused',
    },
    [CustomFieldContentType.Session]: { 
      ...{...defaultConfig, descriptionField: defaultDescriptions[CustomFieldContentType.Session]},
      composition: 'action scene composition, dynamic layout, multiple focal points, dramatic moment',
      camera: 'action shot, dynamic angle, in-the-moment perspective',
    },
    [CustomFieldContentType.Campaign]: { 
      ...{...defaultConfig, descriptionField: defaultDescriptions[CustomFieldContentType.Campaign]},
      composition: 'epic cover art composition, heroic scale, multiple elements, cinematic layout',
      camera: 'cinematic wide shot, epic perspective, cover art angle',
    },
  };
  
  await ModuleSettings.set(SettingKey.aiImagePrompts, defaultPrompts);
  await ModuleSettings.set(SettingKey.aiImageConfigurations, configurations);
};

export const windowTabToCustomContentType = (windowTabType: WindowTabType, entry?: any) => {
  switch (windowTabType) {
    case WindowTabType.Entry:
      switch ((entry as Entry).topic) {
        case Topics.Character:
          return CustomFieldContentType.Character;
        case Topics.Location:
          return CustomFieldContentType.Location;
        case Topics.Organization:
          return CustomFieldContentType.Organization;
        case Topics.PC:
          return CustomFieldContentType.PC;
        default:
          throw new Error(`Unsupported entry topic: ${entry.topic}`);
      }
      break;
    case WindowTabType.Campaign:
      return CustomFieldContentType.Campaign;
    case WindowTabType.Arc:
      return CustomFieldContentType.Arc;
    case WindowTabType.Session:
      return CustomFieldContentType.Session;
    case WindowTabType.Front:
      return CustomFieldContentType.Front;
    case WindowTabType.Setting:
      return CustomFieldContentType.Setting;
    default:
      throw new Error(`Unsupported window type: ${windowTabType}`);
  }
}
