---
title: Update Entry 
prev:
  text: 'World-Building Overview'
  link: './world-building'
next:
  text: ''
  link: ''
---

# Update Entry [[Advanced Feature]]
![Update dialog](/assets/images/generate-dialog.webp)

The Update Entry dialog is where you can update an existing [^Entry] using AI.  

> [!NOTE]
> To update an Entry manually, just edit it on the [Entry description tab](/reference/world-building/content/entry/description).

## Fields
There are several fields you can (optionally) fill in:
- **Name** - The name of the Entry.  This is required to complete the Entry, but you can leave it blank, and it will be generated for you along with the description.
- **Type** - The [^Type] of Entry. This text box works the same as the Type field on [Entries](/reference/world-building/content/entry/) with respect to autocomplete and adding new Types.
- **Parent** ([^Location], [^Organization] only) - The parent of the Entry.  This is optional.  Typing in the box will search for matching Locations/Organizations.
- **Description** - The description of the Entry.  This is optional, but highly recommended if you plan to generate an image or description ([Advanced Feature]).  The description can be a very brief description or just a list of characteristics.  Any information contained in the description will be included in the generated version (if it fits).

These will all populate from any existing information on the Entry.  Name, species, and description can all be generated if you leave them blank (or make them blank if they were pulled from the Entry).  Type won't be generated.

Once you fill the information in the fields, hit "Generate" and the AI will create a name, species, and description (depending on what you filled in).  You can hit "Generate" as many times as you want, if you don't like the results.  Note that if you want to regenerate the name or species, you'll have the clear those values before rerunning.

When you have what you want, hit "Use" and the resulting values will be updated on the Entry.

## Options {#options}
There are 2-3 options below the description field:

### What to generate {#description-styles}
You can generate a long description, roleplaying notes, or both.  

If you are using roleplaying notes (see [Module Settings]), you will have the choice to populate the description, the notes, or both. If you have that field turned off, you will instead have the option to do long vs. short description.  Note that a short description is the same text as the roleplaying notes would have been - it's just used in place of the other description.  The number of paragraphs generated for long descriptions, can be set in the [Module Settings].

For your full description, you can either get a more "narrative" or "story-like" description (in the number of paragraphs you set with the slider in [Module Settings]) or you can get a "RPG-Style" description by checking that box in [Modules Settings].

Sample roleplaying notes/short description:
![Example short description](/assets/images/generate-roleplaying-notes.webp)


Sample long description (this is a 1-paragraph one):
![Example long description](/assets/images/generate-long-description.webp)

Sample RPG-Style description:
![Example RPG-Style description](/assets/images/generate-rpg-style.webp)

### Generate image
When checked, after you finalize and hit "Use", the AI will [generate an image](/reference/world-building/image-generation) for the entry.

### Add to Current Session
This option is only available if you are in [^Play Mode], and only for Characters or Locations.  When checked, this Entry will be added to the [^Current Session] after you hit "Use".  Characters are added as [NPCs](/reference/campaign-mgt/content/session/npcs), while Locations are added as [Locations](/reference/campaign-mgt/content/session/locations).  The default value of this checkbox is controlled by the "Default 'Add to current session'" [Module Setting].


