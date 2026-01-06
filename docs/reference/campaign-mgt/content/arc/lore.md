---
title: Arc Lore Tab
prev: 
  text: 'Arc Description Tab'
  link: '/reference/campaign-mgt/content/arc/description'
next: 
  text: 'Arc Vignettes Tab'
  link: '/reference/campaign-mgt/content/arc/vignettes'
---

# Arc Lore Tab
![Arc Lore Tab](/assets/images/arc-lore-tab.webp)

The Lore tab (equivalent to "secrets and clues" in the [Lazy DM] method) allows you to manage pieces of Lore that you might want to deliver to players during the Arc.

It sits between [Campaign Lore](/reference/campaign-mgt/content/campaign/lore) and [Session Lore](/reference/campaign-mgt/content/session/lore) and can help to track lore that will be coming up in the next few sessions without making the Campaign lore list too long.  

This tab provides:

## Adding Lore
Click "Add Lore" to create a new Lore entry.  Enter the text of the Lore and hit "Enter" to save.

You can drag and drop Journal Entry Pages (or Journal Entries) from Foundry VTT onto the box at the top to create a linked Lore item or onto an existing Lore item to link it to the journal entry page.  
  
You cannot currently remove a linked entry (i.e. remove the link to the journal entry page) - I recommend just creating a new Lore item and copy/paste the text before removing the old one.

## The Lore list
This list contains the individual pieces of Lore.  For each Lore item, you can see its text and the linked entry.  Click the linked entry (if any) to open the journal entry page.

### Moveable
New lore items are added to the bottom of the list, but you can reorder the list by dragging the handle on the left side of each row to move rows up and down.

### Lore Actions
The actions column lets you take several actions with the Lore entries:
  - **Delete** - Delete the Lore
  - **Edit** - Opens the Lore description text box for inline editing. You can also click on the description text to do the same.  Press Enter to save or Escape to cancel. Shift-Enter within the text box to insert a new line.
  - **Move to campaign** - This moves the Lore up to the [Campaign Lore](/reference/campaign-mgt/content/campaign/lore) list.  You can do this for lore that you've decided to handle in a future Arc.
  - **Move to next session** - This moves the Lore to the next Session.  You would typically do this after a Session for Lore that you didn't deliver but still want to.  If a next Session doesn't exist, it will create one.

  > [!NOTE]
  > Move/copy to next session buttons on the various Arc tabs push to the latest Session in the Campaign - *even if it's in a different arc*


### Related Entry Tracking
This table supports [Related Entry Tracking](/reference/navigation/editors#related-entry-tracking). When you add or remove references to Characters, Organizations, or Locations in lore descriptions, you'll be prompted to update the Arc's Participants and Locations tables accordingly. 