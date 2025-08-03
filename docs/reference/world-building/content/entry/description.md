---
title: Entry Description Tab
prev: 
  text: 'Entry overview'
  link: '/reference/world-building/content/entry'
next: 
  text: 'Generate Button'
  link: '/reference/world-building/content/entry/generate'
---
# Entry Description Tab
![Entry Window](/assets/images/entry-content.webp)

The description tab has four main components:
1. [Image](#image)
2. [Type](#type)
3. [Topic-specific fields](#topic-specific-fields)
4. [Description](#description)
5. [Role-playing notes](#role-playing-notes)

## Image {#image}
See [Image] documentation.

## Type {#type}
Type is where you categorize the type of the Entry.  For example, a Character might be a King, a Blacksmith, a Paladin, or a Hero, Villain, NPC, etc. A Location might be a City, Town, Dungeon, etc. An Organization might be a Faction, Guild, Cult, etc. It's completely up to you how to manage and organize your Entries within Types.  Type impacts these areas:
  - The Type field is searchable 
  - The [Setting Directory] can be set to group the tree by type - showing you all the entries of a certain type at once.
  - It influences AI-generated descriptions and images [[Advanced Feature]].  

For more complex type management, you can use [Tags].

## Topic-Specific Fields {#topic-specific-fields}
Each Topic has one or more extra fields - see the topic-specific documentation for details:
  - [Characters]
  - [Locations]
  - [Organizations]

## Description {#description}
This is where you enter the description of the Entry.  See [Editors] for more information on the functionality of editors throughout the application. 

## Role-playing notes {#role-playing-notes}
This is an optional field that can be disabled in the [Module Settings] and is used for quick notes to facilitate role-playing. While building out your world, they will show below the description, but when you are in [^Play mode], they will be shown above the description. 

## Managing Relationships {#managing-relationships}
Assuming you have the "Auto-suggest relationships" [Module Setting] turned on, whenever you save the description, it will check to see if you've added or removed any references to other [^Entries].  If you have, you will be prompted with the "Manage Related Entries" dialog:

![Manage related entries](/assets/images/manage-related-entries.webp)

This allows you to rapidly create and remove relationships without having to manually do each one in the [Relationship tabs](./relationships).  Simply turn off the checkboxes for the relationships you don't want to change and hit "Update".  You can hit "No to all" if you don't want to change anything.

Any extra relationship fields (ex. "Role" when connecting a character with a location) will not be populated - you'll need to move the specific tab to update those.
