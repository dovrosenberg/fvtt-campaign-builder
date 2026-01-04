---
title: Session Monsters Tab
prev: 
  text: 'Session NPCs Tab'
  link: '/reference/campaign-mgt/content/session/npcs'
next: 
  text: 'Session Magic Items Tab'
  link: '/reference/campaign-mgt/content/session/magic-items'
---
# Session Monsters Tab
![Session Monsters Tab](/assets/images/monster-tab.webp)

The Monsters tab allows you to list the Monsters that characters are likely to encounter during the Session.  A Monster is just a reference to an actor in Foundry.

This tab provides:

## Adding Monsters
Click "Add Monster" to create a new Monster entry.  You will be prompted to search for an existing Actor.  

> [!Note]
> When searching for an actor, it currently only looks in the Foundry world - not in compendiums.  

> [!WARNING]
> Deleting from Foundry an actor that is associated with a Session as a Monster will completely remove the Monster from the Session, even if it had previously been marked as delivered.

You can also drag/drop an actor from a the world, a compendium, or other modules like search tools that allow for drag and drop.

## The Monster list
This list contains the individual Monsters.  For each Monster, you can see its name, and can specify a number of this monster type that you're planning to use for encounters.  There's also a notes field you can use to track things like how you intend to use them.

Click the name of the Monster to open the (system-dependent) stat/character sheet for the actor.

Click on a value in the number column to edit it.  Press Enter to save.

Click on the notes field to edit it.  Press Enter to save or Escape to cancel. Shift-Enter within the text box to insert a new line.

### Monster Actions
The actions column lets you take several actions with the Monster entries:
  - **Delete** - Delete the Monster.  This removes it from the Session list, but DOES NOT delete the Actor from Foundry.
  - **Edit** - Opens the number and notes fields for editing.  Press Enter to save or Escape to cancel. Shift-Enter within the text box to insert a new line.
  - **Mark as delivered** - Marks the Monster as having been delivered to the players. If you mark Monster as delivered while in [^Play Mode], this will add the Monster to the Campaign [To-Do List]. 
  - **Move to next session** - This moves the Monster to the next Session.  You would typically do this after a Session for Monsters that you didn't deliver but think will likely come up next time.  If a next Session doesn't exist, it will create one.

### Related Entry Tracking
This table supports [Related Entry Tracking](/reference/navigation/editors#related-entry-tracking). When you add or remove references to Characters or Locations in monster notes, you'll be prompted to update the Session's NPC and Location tables accordingly.
