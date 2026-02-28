---
title: Arc Monsters Tab
prev: 
  text: 'Arc Participants Tab'
  link: '/reference/campaign-mgt/content/arc/participants'
next: 
  text: 'Arc Ideas Tab'
  link: '/reference/campaign-mgt/content/arc/ideas'
---

# Arc Monsters Tab
![Arc Monsters Tab](/assets/images/arc-monsters-tab.webp)

The Monsters tab allows you to list the Monsters that characters are likely to encounter during the Arc.  A Monster is just a reference to an actor in Foundry.

This tab provides:

## Adding Monsters
Click "Add Monster" to create a new Monster entry.  You will be prompted to search for an existing Actor.  

::: info
When searching for an actor, it currently only looks in the Foundry world - not in compendiums.  
:::

You can also drag/drop an actor from a the world, a compendium, or other modules like search tools that allow for drag and drop.

## The Monster list
This list contains the individual Monsters.  For each Monster, you can see its name, and can specify a number of this monster type that you're planning to use for encounters.

Click the name of the Monster to open the (system-dependent) stat/character sheet for the actor.

You can also add notes to each Monster to track how it will be used in the Arc.  Double click the notes field for a row or click the "Edit" icon to open the row editor.

### Moveable
You can reorder the monster list by dragging the handle on the left side of each row to move rows up and down.

### Monster actions
The actions column lets you take several actions with the Monster entries:
  - **Delete** - Delete the Monster.  This removes it from the Arc list, but DOES NOT delete the Actor from Foundry.
  - **Edit** - Opens the notes field for editing.  Press Enter to save or Escape to cancel. Shift-Enter within the notes text box to insert a new line.
  - **Copy to next session** - This makes a copy of the Monster on the next Session.  It doesn't remove it from the Arc in case you want to use it again later.

  ::: warning CAUTION
  Move/copy to next session buttons on the various Arc tabs push to the latest Session in the Campaign - *even if it's in a different arc*
  :::

### Related Entry Tracking
This table supports [Related Entry Tracking](/reference/navigation/editors#related-entry-tracking). When you add or remove references to Characters, Organizations, or Locations in monster notes, you'll be prompted to update the Arc's Participants and Locations tables accordingly.  