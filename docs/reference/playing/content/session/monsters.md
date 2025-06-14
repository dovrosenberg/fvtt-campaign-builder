---
title: Session Monsters Tab
prev: 
  text: 'Session NPCs Tab'
  link: '/reference/playing/content/session/npcs'
next: 
  text: 'Session Magic Items Tab'
  link: '/reference/playing/content/session/magic-items'
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

## The Monster list
This list contains the individual Monsters.  For each Monster, you can see its name, and can specify a number of this monster type that you're planning to use for encounters.

Click the name of the Monster to open the (system-dependent) stat/character sheet for the actor.

Click on a value in the number column to edit it.  Press Enter to save.

### Monster Actions
The actions column lets you take several actions with the Monster entries:
  - **Delete** - Delete the Monster.  This removes it from the Session list, but DOES NOT delete the Actor from Foundry.
  - **Edit** - Opens the number field for editing.  Press Enter to save.
  - **Mark as delivered** - Marks the Monster as having been delivered to the players. If you mark Monster as delivered while in [^Play Mode], this will add the Monster to the Campaign [To-Do List]. 
  - **Move to next session** - This moves the Monster to the next Session.  You would typically do this after a Session for Monsters that you didn't deliver but think will likely come up next time.  If a next Session doesn't exist, it will create one.
