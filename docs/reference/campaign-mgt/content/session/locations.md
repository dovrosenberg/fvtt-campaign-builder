---
title: Session Location Tab
prev: 
  text: 'Session Vignettes Tab'
  link: '/reference/campaign-mgt/content/session/vignettes'
next: 
  text: 'Session NPCs Tab'
  link: '/reference/campaign-mgt/content/session/npcs'
---
# Session Location Tab
![Session Location Tab](/assets/images/session-location-tab.webp)

The Locations tab allows you to list the Locations where action is likely to take place during the Session.  These [^Locations] must be created in the [^Setting], as the list is simply a link to existing Locations.

This tab provides:

## Adding Locations
Click "Add Location" to create a new Location entry.  You will be prompted to search for an existing Location.  Alternately, you can hit "Create location" to [create](/reference/world-building/create-entry) a new Location from the dialog.

## The Location list
This list contains the individual Locations.  For each Location, you can see its name, [^Type], its parent Location (if any), and a notes field you can use to track things like how you intend to use them.

Click the name of the Location or parent to open the [Location details](/reference/world-building/content/location/) page.  Hold Control to open in a new tab, Alt to open in a different [panel](/reference/navigation/panels).

Click on the notes field to edit it.  Press Enter to save or Escape to cancel. Shift-Enter within the text box to insert a new line.

### Moveable
You can reorder the location list by dragging the handle on the left side of each row to move rows up and down.

> [!TIP]
> When your players come to a Location, click on it to open up the details page, where you can get information for describing it.  From there, you can then use the [Scenes tab](/reference/world-building/content/location/#scenes) to immediately open a related scene in Foundry.
>
> You can also right-click on the Location's image to push it to chat for the players or to immediately create and use a new Foundry scene from the image (useful for Theater of the Mind scenes).

### Location Actions
The actions column lets you take several actions with the Location entries:
  - **Delete** - Delete the Location.  This removes it from the Session list, but DOES NOT delete the Location from the [^Setting].
  - **Edit** - Opens the notes field for editing.  Press Enter to save or Escape to cancel. Shift-Enter within the text box to insert a new line.
  - **Mark as delivered** - Marks the Location as having been delivered to the players. If you mark Location as delivered while in [^Play Mode], this will add the Location to the Campaign [To-Do List]. 
  - **Move to next session** - This moves the Location to the next Session.  You would typically do this after a Session for Locations that you didn't deliver but think will likely come up next time.  If a next Session doesn't exist, it will create one.

### Related Entry Tracking
This table supports [Related Entry Tracking](/reference/navigation/editors#related-entry-tracking). When you add or remove references to Characters in location notes, you'll be prompted to update the Session's NPC table.
