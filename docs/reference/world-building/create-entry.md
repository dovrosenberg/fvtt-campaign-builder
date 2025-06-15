---
title: Create Entry
prev:
  text: 'World-Building Overview'
  link: './world-building'
next:
  text: ''
  link: ''
---
# Create Entry
![Create Entry dialog](/assets/images/create-entry.webp)

The Create Entry dialog is where you can create a new [^Entry].  

## Fields
There are several fields you can (optionally) fill in:
- **Name** - The name of the Entry.  This is required to complete the Entry, but if you are using 'Generate' [[Advanced Feature]], you can leave it blank, and it will be generated for you along with the description.
- **Type** - The [^Type] of Entry. This text box works the same as the Type field on [Entries](/reference/world-building/content/entry) with respect to autocomplete and adding new Types.
- **Parent** ([^Location], [^Organization] only) - The parent of the Entry.  This is optional.  Typing in the box will search for matching Locations/Organizations.
- **Description** - The description of the Entry.  This is optional, but highly recommended if you plan to generate an image or description ([Advanced Feature]).  When you first open the dialog, the background of the description is yellow.  This indicates that if you hit "Use" to create the Entry, this field's value will become the description of the new Entry.  Once you hit "Generate", the yellow background will move to the generated description, indicating that is what will now be used instead.

## Options
There are 2-3 options below the description field:
* **Generate long descriptions** - If checked, when you hit "Use", the AI will generate a long description (several paragraphs)for the entry.  When not checked, it will instead generate a brief, bullet-point description suitable for being helpful roleplaying types.  The default value of this checkbox, and the number of paragraphs generated for long descriptions, can be set in the [Module Settings].
* **Generate image** [[Advanced Feature]] - If checked, when you hit "Use", the AI will generate an image for the entry.  See the [Generate dialog](/reference/world-building/content/entry/generate#image) for more details.
* **Add to current session** - This option is only available if you are in [^Play Mode], and only for Characters or Locations.  When checked, this Entry will be added to the [^Current Session] after you hit "Use".  Characters are added as [NPCs](/reference/playing/content/session/npcs), while Locations are added as [Locations](/reference/playing/content/session/locations).  The default value of this checkbox is controlled by the "Default 'Add to current session'" [Module Setting].

## Generated description [[Advanced Feature]]
Pressing "Generate" will generate a description for the Entry.  And of the fields you left blank will be populated, but the ones you filled will be used as is.  Once generation is complete, you can hit "Use" to create the Entry, or hit "Generate" again to try a new description.  If you do retry, make sure to clear any fields that you don't want to keep for the next run.





