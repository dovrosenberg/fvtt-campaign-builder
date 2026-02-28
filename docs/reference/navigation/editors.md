---
title: Editors
prev: 
  text: 'Directory Sidebar'
  link: './sidebar'
next: 
  text: 'Main Content Display'
  link: './main-display'
---

# Editors

Click the orange pencil to start editing, and the save button (or Control-S) to save.

Every Editor in Campaign Builder has the same basic functionality, which includes the normal formatting options as other Foundry editors, as well as some additional capabilities.

::: info TIP
The features describe here work with both the larged editor boxes like
description and custom fields, but also for inline table editors (ex. notes fields).
:::

## Autocomplete Mentions {#autocomplete-mentions}
There is a separate module - [Autocomplete Mentions](https://github.com/dovrosenberg/fvtt-autocomplete-mentions) that is not needed but can be highly useful for campaign and world building.  It enables you to type '@' and easily search for the characters, locations, and organizations in your campaign and then insert them as a link in any editor field.  

This can be doubly helpful in Campaign Builder because of the [auto-suggest capabilities](#auto-suggest) of the Campaign Builder editors.

## Drag and Drop

You can drag any [^Entry], [^Campaign], or [^Session], from the [Setting Directory] into the description editor, and it will insert a UUID indicator that when you save will be displayed as a clickable link that will open that Entry *(hold 'Control' while clicking to open it in a new tab)*.  Similarly, you can drag any Foundry document (ex. Actors, Journal Entries, etc.) into the description (or other) editor for a link to that document (the same way you can in other Foundry editors).

## Resizing
You can adjust the size of all custom field editors using the grabber in the lower-right corner.  This size can be set differently for each piece of content and each field (i.e. you can make the "boxed text" field on NPC1 and NPC2 different heights).  If you want to change the default size for a particular field, you can do that in the [Custom Fields Menu](/reference/configuration/custom-fields) in [Module Settings].

## Automatic references

When you save an editor, if you have exactly (but case insensitive) used the name of any [^Entry] or [^Session] (other than the current one), it will automatically turn it into a reference link.  

::: info TIP
If you have more than one Entry or Session with the same name, it will not create a link, so that it's not linking to the wrong one.  Instead, use Drag & Drop or Autocomplete Mentions to insert a reference to the one you want.  This is likely to be a very rare situation, though.
:::

## Auto-suggest relationships

If you insert a reference to an [^Entry] into the description of another, you will [automatically be asked](/reference/world-building/content/entry/description#managing-relationships) if you'd like to create a relationship.  This allows you to connect two entries or to mention an entry in a session note (which will then also add it to the campaign [To-do list](/reference/campaign-mgt/content/campaign/todos)) with just a couple keystrokes.

::: info
It will not suggest connections to the parent of the current Entry. This is deliberate to avoid cluttering the relationship list and unnecessarily prompting about automatically creating the relationship.  The Entry's parent is easily available from the directory tree, so it didn't seem to add much value to link it in the editor. 
:::

### Related Entry Tracking {#related-entry-tracking}

When editing text in [^Entry], [^Arc], and [^Session] content, Campaign Builder can automatically detect references to Entries and offer to add or remove them from the appropriate lists.  References are detected in two ways:
* You enter a UUID link (ex. by dragging from the directory bar, or by using the Autocomplete Mentions module (highly recommended))
* You type the name of an Entry in (spelling must match, but case insensitive) - this will convert it to a link automatically and then recognize the reference.

For example:
- If you add a reference to a Character in a Session Vignette, you'll be prompted to add that Character to the Session's NPC list.
- If you remove a Location reference from an Arc description, you'll be prompted to remove it from the Arc's Locations table.

This feature can be enabled or disabled via the "Auto-suggest relationships" setting in [Module Settings].
