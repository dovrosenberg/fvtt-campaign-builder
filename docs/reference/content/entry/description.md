---
title: Entry Description Tab
prev: 
  text: 'Entry overview'
  link: '/reference/content/entry'
next: 
  text: 'Entry relationship tabs'
  link: '/reference/content/entry/relationships'
---
# Entry description tab
![Entry Window](/assets/images/entry-content.webp)

The description tab has four main components:
1. Image
2. Type
3. Topic-Specific Fields
4. Description text area

## Image
See [Image] documentation.

## Type
Type is where you categorize the type of the Entry.  For example, a Character might be a King, a Blacksmith, a Paladin, or a Hero, Villain, NPC, etc.  A Location might be a City, Town, Dungeon, etc.  An Organization might be a Faction, Guild, Cult, etc.  It's completely up to you how to manage and organize your Entries within Types.  Type impacts these areas:
  - The Type field is searchable 
  - The [Setting Directory] can be set to group the tree by type - showing you all the entries of a certain type at once.
  - It influences AI-generated descriptions and images [Advanced Feature].  

For more complex type management, you can use [Tags].

## Topic-Specific Fields
Each Topic has one or more extra fields - see the topic-specific documentation for details:
  - [Characters]
  - [Locations]
  - [Organizations]

## Description Text Area
This is where you enter the description of the Entry.  Click the orange pencil to start editing, and the save button (or Control-S) to save.

You can drag any Entry from the [Setting Directory] into the description editor and it will insert a UUID indicator that when you save will be displayed as a clickable link that will open that Entry (hold 'Control' while clicking to open it in a new tab).

[TODO: link to the section about how autocomplete works in navigation?]
It is highly suggested that you check out the "Autocomplete Mentions" module, which allows you to rapidly reference Foundry documents and Campaign Builder Entries/Sessions/etc. while typing in the editor.  

When you save the description, it will check to see if you've added or removed any references to other Entries.  If you have, you will be prompted with the "Manage Related Entries" dialog:

![Manage related entries](/assets/images/manage-related-entries.webp)

This allows you to rapidly create and remove relationships without having to manually do each one in the [Relationship tabs](./relationships).  Simply turn off the checkboxes for the relationships you don't want to change and hit "Update".  You can hit "No to all" if you don't want to change anything.

Any extra relationship fields (ex. "Role" when connecting a character with a location) will not be populated - you'll need to move the specific tab to update those.

You can disable this functionality by turning off the "Auto-suggest relationships" option in the [Module Settings].
