---
title: Campaign
---
# Campaign Window

[TODO: screenshot of campaign window overview showing main interface]

The Campaign window provides tools for organizing and managing your campaigns within a Setting. Campaigns allow you to group related sessions together, track player characters, maintain campaign-wide lore, capture ideas, and manage tasks. You can define multiple campaigns within a single Setting, which is useful if you use the same Setting across multiple groups who play at different times.

## Campaign Header

You can click the campaign's name to edit it.

## Campaign Tabs

The Campaign window is organized into several tabs, each serving a specific purpose in campaign management:

### Description Tab

[TODO: screenshot of description tab]

The Description tab is the main overview area for your campaign and contains:

#### Campaign Image
[TODO: description of how to set/change campaign image]

#### Campaign Description
A place where you can enter the main description of your campaign. This might include:
- Campaign premise and themes
- Major story arcs
- Important background information
- Current campaign status


#### House Rules
A separate field specifically for documenting any house rules or modifications you're using in this campaign. This keeps rule variations clearly separated from the main campaign description.  

### PCs Tab

[TODO: screenshot of PCs tab]

The PCs (Player Characters) tab allows you to track and manage information about the player characters in your campaign. This tab provides:

#### Adding PCs
- Click the "Add PC" button to create a new PC entry
- You can also drag and drop an Actor from Foundry VTT directly onto the PCs list to automatically create a PC entry linked to that Actor
- PC names are tied directly to the linked Actors and should be changed from the Actor side.

#### PC Information
Each PC entry displays:
- **Name** - The character's name (click to open the PC character sheet)
- **Player Name** - The name of the player who controls this character

#### PC Management
- Click on a PC name to open their detailed information window  [See TODO for PC page]
- Delete PCs using the action buttons when they're no longer part of the campaign **(Note: PCs do not exist outside of a campaign, so deleting from this list permenantly deletes all associated info)**

### Lore Tab

[TODO: screenshot of lore tab]

The Lore tab (equivalent to "secrets and clues" in the Lazy DM method) allows you to manage campaign-wide knowledge that players might discover. 

The typical flow for lore is to create ideas at either the session level (when preparing for the next session and creating secrets and clues) or to create them at the campaign level (things that are important but aren't necessarily right for the current session).  In the latter case, you can easily move them to the current session when preparing vs. having to retype them (see below).

This tab provides:

#### Adding Lore
- Click "Add Lore" to create a new lore entry
- You can drag and drop Journal Entry Pages (not whole journals) from Foundry VTT onto the box at the top to create a linked lore item or onto an existing lore item to link it to the journal entry page.  
- You cannot currently remove a linked entry - I recommend just creating a new lore item and copy/paste the text before removing the old one.

#### The lore list
- For each lore item, you can see the text of it, which session it was delivered in (if any), and the linked entry.  Click the linked entry to open the journal entry page.
- When lore is delivered in a session you can see the session number (and click the link to go to that session).  These items are also locked down and always sort to the top of the lore list (sorted by session) so you can easily see what players already know.  To edit them, do it from the session side.

#### Lore Actions
The actions column lets you take several actions with the lore entries:
- **Delete** - Delete the lore
- **Edit** - Opens the lore description text box for inline editing
- **Mark as delivered** - Marks the lore as having been delivered to the players.  This isn't recommended generally from the campaign tab, because it allows for better tracking if you move it to the session and deliver it there.  This icon will change to indicate you can click it again to remove the "delivered" marker.
- **Move to next session** - This moves the lore to the next 
- **Delivery Tracking** - Mark lore as "delivered" when players have discovered it
- **Session Movement** - Move unused lore to the next session (i.e. the one with the highest number) for easy session prep.

### Ideas Tab

[TODO: screenshot of ideas tab]

The Ideas tab provides a simple way to capture and organize ideas for your campaign as they come to you.  Perfect for plot hooks you want to explore later, NPCs or locations you want to develo, story complications or twists, player suggestions or interests, and anything else you'd otherwise keep in your email inbox, scraps of paper, or your beautifully illustrated notebook, dpending on your organization style.

#### Managing Ideas
- Click "Add Idea" to create a new idea entry
- Click on any idea text (or the edit button) to edit it inline; hit enter to save 
- Delete ideas when they're no longer relevant or have been used

#### Email to the list (advanced feature)
- TODO - need to link to the  backend docs??
- In addition to working on the list here, with the use of the backend, you can setup an email box that you can send emails to and have them show up in the ideas list.  A great way for capturing ideas you have at work, while driving (pull over before sending email or use a hands-free assistant), or in the shower (unplug your phone before using in the shower).

### To Do Tab

[TODO: screenshot of to do tab]
The To Do list is designed to be a temporary place to store notes of things that you want to better document in your world or campaign.

The To Do tab can be used in two ways:
- It is a place that tracks things that happened during your sessions as a reminder.  Any session item (lore, vignettes, NPCs, locations, etc.) that is delivered in a session is added to the to do list.  Additionally, any world entry (location, character, organization) that you edit while you are in Play Mode (TODO: link that) is added to the list.  The idea is that after each session, you can go through the list and each item will remind you of things that happened and you can decide if you need to: 

  - Add some description to the session notes ("oh right, they saw this cool thing... I forgot to note that")
  - Add a detail to an entry in the world ("oh right, they met this NPC, let me note that I gave her a Scottish accent and then add a new entry for her brother Max that I mentioned she had")

- You can also just add to the list manually fr things you want to remember to do while you're cleaning up the rest of the list.

If an entry is edited during more than one session, you can see the most recent time in the "last modified" field.

The intent is to clean up the list after each session, before preparing for the next, but feel free to use it however you want.  The tab also notes in its header how many items are currently open on the list.

#### Task Types
The system automatically creates to-do items from various sources:
- **Manual** - Tasks you create directly
- **Entry** - Tasks related to specific campaign entries
- **Lore** - Lore that needs to be delivered
- **Vignette** - Session vignettes to address
- **Monster** - Monster encounters to run
- **Item** - Magic items to introduce

#### Task Management
- Click "Add To Do" to create manual tasks
- The delete button on each row marks a to do as done (which removes it altogether)
- The edit button opens the "to do item" for editing (or just click on the text); hit enter to save
- Tasks show when they were last touched for easy prioritization
- Click the "reference" to go to the item