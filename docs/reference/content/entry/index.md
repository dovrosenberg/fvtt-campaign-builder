---
title: Entry Details
prev: 
  text: 'Reference overview'
  link: '/reference'
next: 
  text: 'Locations'
  link: '/reference/content/location'
---
# Entry Details
![Entry Window](/assets/images/entry-content.webp)

Regardless of Topic, each Entry has a similar layout in the main window.  At the bottom of this description, we'll outline the things that are different.

## Entry header
The entry header has three main components:
1. Name - This is where you edit the Entry's name.
2. Generate Button (for Characters, Locations, and Organizations) [Advanced Feature] - This gives you the option to generate a description or image for the current entry.  See [Generate Window] for more details.
3. Tags - See [Tags] documentation.

## Description tab
The description tab has four main components:
1. Image
2. Type
3. Topic-Specific Fields
4. Description text area

### Image
See [Image] documentation.

### Type
Type is where you categorize the type of the Entry.  For example, a Character might be a King, a Blacksmith, a Paladin, or a Hero, Villain, NPC, etc.  A Location might be a City, Town, Dungeon, etc.  An Organization might be a Faction, Guild, Cult, etc.  It's completely up to you how to manage and organize your Entries within Types.  Type impacts these areas:
- The Type field is searchable 
- The [Setting Directory] can be set to group the tree by type - showing you all the entries of a certain type at once.
- It influences AI-generated descriptions and images [Advanced Feature].  

For more complex type management, you can use [Tags].

### Topic-Specific Fields
Each Topic has one or more extra fields - see the topic-specific documentation for details:
- [Characters]
- [Locations]
- [Organizations]

### Description Text Area
This is where you enter the description of the Entry.  Click the orange pencil to start editing, and the save button (or Control-S) to save.

## Entry Relationship Tabs
TODO: show this... also - move all these tabs to separate pages? Probably not... but campaign ones are... think about it
After the Description tab, every entry has four tabs that capture the relationship between this Entry and others.

## Foundry Document Tabs
After the Entry Relationship tabs, you'll find an [Actors tab](/reference/content/character#actors) for Characters and a [Scenes tab](/reference/content/location#scenes) for locations.  


## Session tabs
![Session tab](/assets/images/session-tab.webp)

At the end of the list, you'll find the Sessions tab.  This is where you can quickly find everywhere this Entry was referenced during your campaign.  You can see a list of each session where either:
* An [^NPC] associated with a Character was marked as delivered
* A [^Location] was marked as delivered
* Any Entry was referenced in the [description](/reference/content/session#description) of the Session.

This makes it extremely easy to see if you've ever mentioned an Entry during your game, and if so, in what context.  The session notes may offer even further detail, depending on your notetaking style.

Click the Session name to open it.