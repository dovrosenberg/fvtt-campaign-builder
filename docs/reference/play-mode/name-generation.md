---
title: Name Generators
prev: 
  text: 'Session Links'
  link: './session-links'
next: 
  text: 'Advanced Features & Backend'
  link: '/reference/backend'
---

# Name Generators

When in [^Play Mode], an extra row of buttons appears at the top of the Campaign Builder.  These buttons are used to instantly suggest names for various types of [^Entries].

![Name Generators](/assets/images/name-generators.webp)

## Using the name generators
Clicking any of the buttons will open a [^RollTable] with a list of names.  

![Name Generator dialog](/assets/images/name-generator-dialog.webp)

If you like one of those names, click it to select.  You can then:

* Click "Use Once" - Do this if you just wanted something to throw to your characters for some minor thing that you don't want to make any more details for right now.  This will:
  * Add the name to the [^To-do list] for the Current Session's campaign, so you can decide after the session if you want to flesh it out further
  * Copy the name to your clipboard so you can paste to session notes or chat, etc.
* Click "Add to Setting" - Do this if you want to add the name to the Setting.  This will open up the [Create](/reference/world-building/create-entry) dialog so you can add some additional details and/or use AI generation for a description and/or image.  You can also just hit "Use" to add it to the Setting (and the To-do list) to fill it out later.

Either of these will mark the name as "Used" in the RollTable, so it won't come up again.

## RollTable maintenance {#rolltables}
When you create a new [^Setting], a set of RollTables are created in a folder in Foundry.  You can manage these exactly as you would any other RollTable, including adding or removing names.

Using RollTables this ways both allows you do manually maintain them and also doesn't force you to wait for AI generation every time you just want a name.

If you are using [[Advanced Features]] then every time you open Campaign Builder, any missing or used names in these RollTables will be regenerated automatically.  Otherwise, you have to manage them manually.  AI-generated names will adhere to the [name style](/reference/world-building/content/setting/namestyles) settings for the Setting.

> [!INFO]
> When you first create a new Setting, it will populate the RollTables (if you have automatic generation enabled).  Because you haven't yet configured the name styles, though, the names will be a mix of every style.  If you want to refresh them to only contain the styles you want, you do this in the "Roll Table" dialog in [Module Settings] by clicking the "Refresh all tables" button.


