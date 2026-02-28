---
title: Session Magic Items Tab
prev: 
  text: 'Session Monsters Tab'
  link: '/reference/campaign-mgt/content/session/monsters'
next: 
  text: 'Session PCs Tab'
  link: '/reference/campaign-mgt/content/session/pcs'
---
# Session Magic Items Tab
![Session Magic Items Tab](/assets/images/magic-item-tab.webp)

The Magic Items tab allows you to list the Magic Items that characters are likely to encounter during the Session.  A Magic Item is just a reference to an item in Foundry.

This tab provides:

## Adding Magic Items
Click "Add Magic Item" to create a new Magic Item entry.  You will be prompted to search for an existing Foundry item.

::: info 
When searching for an item, it currently only looks in the Foundry world - not in compendiums.  
:::

::: warning
Deleting from Foundry an item that is associated with a Session as a Magic Item will completely remove the Magic Item from the Session, even if it had previously been marked as delivered.
:::

## The Magic Item list
This list contains the individual Magic Items.  For each Magic Item, you can see its name and a notes field you can use to track things like how you intend to use them

Click the name of the Magic Item to open the (system-dependent) item description sheet for the actor.

Click on the notes field to edit it.  Press Enter to save or Escape to cancel. Shift-Enter within the text box to insert a new line.

### Moveable
You can reorder the magic item list by dragging the handle on the left side of each row to move rows up and down.

### Magic Item Actions
The actions column lets you take several actions with the Magic Item entries:
  - **Delete** - Delete the Magic Item.  This removes it from the Session list, but DOES NOT delete the Item from Foundry.
  - **Edit** - Opens the notes field for editing.  Press Enter to save or Escape to cancel. Shift-Enter within the text box to insert a new line.
  - **Mark as delivered** - Marks the Magic Item as having been delivered to the players. If you mark Magic Item as delivered while in [^Play Mode], this will add the Magic Item to the Campaign [To-Do List]. 
  - **Move to next session** - This moves the Magic Item to the next Session.  You would typically do this after a Session for Magic Items that you didn't deliver but think will likely come up next time.  If a next Session doesn't exist, it will create one.

### Related Entry Tracking
This table supports [Related Entry Tracking](/reference/navigation/editors#related-entry-tracking). When you add or remove references to Characters or Locations in magic item notes, you'll be prompted to update the Session's NPC and Location tables accordingly.
