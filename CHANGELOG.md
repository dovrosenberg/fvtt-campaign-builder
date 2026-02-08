# Change Log
## 1.9.0 - Assorted bug fixes and improvements
![](https://img.shields.io/badge/release%20date-February%20__%2C%202026-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.9.0/module.zip)

- Added the ability to split the main content area into multiple panes, so you can view multiple entries side by side.
- You can now create color schemes to apply to custom text blocks in story webs.
- Fixed issue with drag/drop of rows not working properly on very long tables.

## 1.8.6 - Assorted bug fixes and improvements
![](https://img.shields.io/badge/release%20date-February%205%2C%202026-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.8.6/module.zip)

- You can now change the style of story web connections between custom text and dangers.
- When copying text to the clipboard from a table text box or an editor, UUIDs will no longer be dropped and instead will be copied as the name of the document/entity.
- Similarly, copying text with bullet or numbered lists will now include the bullets/numbers in the copied text when you paste it.
- Connecting two entries in a storyweb now lets you add a relationship label.
- When adding a danger to a story web, now uses a dropdown instead of a typeahead, so you don't have to remember what it's named.
- Removed the journals column from the lore/entries tab to simplify the interface.  Journal references that were previously in the journals column will be added to the description field when the module is updated.

## 1.8.5 - More robust journal lists
![](https://img.shields.io/badge/release%20date-February%201%2C%202026-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.8.5/module.zip)

- Links to journal entry sections (i.e. headers inside of a page) that are put into editors now properly open to the right part of the page.
- You can now drop a link to a journal entry page section header into an editor and will properly link to the header instead of just the page.
- You can now drag a journal entry page section header into the journals tab for Entries, Campaigns, and Settings, and it will then link directly to that section. 

## 1.8.4 - Story web updates
![](https://img.shields.io/badge/release%20date-January%2029%2C%202026-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.8.4/module.zip)

- You can now right click on a story web to "duplicate" it - useful for complex webs where you might want to do variations or use a master one to then trim pieces out.
- Story webs no longer keep resetting the zoom level as you make changes

## 1.8.3 - Bug fix
![](https://img.shields.io/badge/release%20date-January%2024%2C%202026-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.8.3/module.zip)

- Connections between some combinations of content types (ex. manual text to manual text) were previously not able to be deleted.  This is now working.

## 1.8.2 - Foundry links in table text
![](https://img.shields.io/badge/release%20date-January%2017%2C%202026-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.8.2/module.zip)

- You can now properly click on links to Foundry documents (actors, items, etc.) that are in text boxes in tables (ex. Vignettes descriptions).

## 1.8.1 - Fixed session bookmark bug
![](https://img.shields.io/badge/release%20date-January%2010%2C%202026-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.8.1/module.zip)

- Added Vignettes to Arcs
- You can now manually reorder most tables, making it easier to (for example) group monster lists together by encounter
- Fixed an issue where the new "current session" bookmark wasn't refreshing when a new session is created.
- "Move to last Session" for items on Arcs now moves the item to the last Session in the Campaign, even if it's on a different Arc. This way if you have leftover items on an old Arc you can easily get them into your more recent play area. 
- The search boxes to filter results on tables now work consistently.

## 1.8.0 - Customize all your fields, fine tune your AI, and get lists of items by tag
![](https://img.shields.io/badge/release%20date-January%205%2C%202026-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.8.0/module.zip)

> **NOTE:**
> YOU MUST ALREADY BE ON AT LEAST VERSION 1.5.1 TO UPGRADE TO THIS VERSION.  IF YOU ARE ON AN EARLIER VERSION, YOU MUST UPGRADE TO 1.5.1 FIRST.  IF YOU NEED HELP WITH THIS PROCESS, COME TO THE [DISCORD SERVER](https://discord.gg/zKWCkwbnn3) FOR SUPPORT.

> **NOTE:**
> IF YOU ARE USING THE BACKEND, THIS VERSION REQUIRES YOU TO UPDATE IT TO THE MOST RECENT VERSION.

- The fields on the description tabs are now customizable!  This applies to Settings, Characters, Organizations, Locations, Campaigns, Arcs, Sessions, and Fronts.  Each one can have its own list of fields you want - text fields, full editors, drop-downs, and checkboxes.
- Every field that used to be present on these tabs (other than the base descriptions/notes) has now been converted to a custom field, so you can delete/hide them if you want. 
- AI generation has been completely reworked.  Every custom field (including in Campaigns, Sessions, Fronts, etc.) can now be generated by AI, and you can define custom prompts and other configuration. Default AI generation configuration has been setup to closely match however you had it configured in the prior version, and the [documentation](https://dovrosenberg.github.io/fvtt-campaign-builder/reference/configuration/custom-fields.html) contains more info on adjusting it.
- Similarly, you now have complete control over AI image generation - from specifying which field has the description to use to specifying framing, image styles, and more.  
- You can now click on any tag to open a list of all the entities that share that tag.  Searches will also now match against tags directly, allowing you to quickly get to this screen.
- On a related note, tags are now shared between entries, sessions, arcs, and fronts - making it easier to use a single tag to carry a thread across all of them.
- There is a new "Foundry" tab available on Entries.  You will need to turn it on in the module settings, as it is off by default.  This allows you to link ANY foundry document (Scenes, Actors, Items, RollTables, Playlists, etc.) to the entry.  This is particularly useful for users who want to drive their play sessions entirely from entries (typically Locations) without using the Campaigns/Sessions system.  
- You can now add manual notes to locations, NPC, magic items, and monsters on sessions.
- You can now generate images for settings, campaigns, arcs, sessions, and fronts.
- You can now drag Settings, Entries, Campaigns, Arcs, Sessions, Fronts and Story Webs from the directory onto a Foundry scene to create a Map Note that will then directly open the content in Campaign Builder.
- You can now drag/drop a Front onto a Story Web and it will add all of the Front's Dangers to the Story Web.  Hold control to also get all of each Danger's participants.  Similarly, you can right click on a Front in the directory to have menu options to do that.
- You can now put UUID links in any long text field in a table (ex. vignettes, the new notes on monsters/NPCs, etc.).  You can also type/paste in URLs and you can use shift-Enter to insert new lines into the text.  Links will be checked for changes and you're able to have connections automatically managed to the (ex. add a link to a character in a Vignette and you'll be prompted to automatically add it to the NPC's list on the Session).
- There is a new setting for 'Display Session bookmark'.  When enabled, there will always be a bookmark for the current Session at the front of the bookmark list.

Bug fixes:
- When creating connections in a Story Web, entities that aren't valid connections no longer light up to show they are invalid.
- Fixed styling on the various module settings submenu windows.
- Deleting a connection between a Danger and an Entry on a Story Web, now works properly.  
- You can now properly delete a Danger from a Front (right-click on the tab).
- Fixed a number of dialogs where the enter key wouldn't activate the default button (i.e. you can now press enter to say "yes" to dialogs)

## 1.7.4 - Fixed journal entry direct-open bug
![](https://img.shields.io/badge/release%20date-December%2023%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.7.4/module.zip)

- You should be able to open journal entries directly from the Campaign Builder compendium for your setting or from a journal entry that you import (ex. to put as a map note).  This as breaking sometimes if you opened/closed the Campaign Builder window in a particular order.  It should be fixed now.

## 1.7.3 - Stop moving your window around
![](https://img.shields.io/badge/release%20date-December%2021%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.7.3/module.zip)

- Your window size and position is now remembered so it will open to the same place next time.

## 1.7.2 - Just a version bump
![](https://img.shields.io/badge/release%20date-December%2021%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.7.2/module.zip)

- Version 1.7.1 was improperly reporting as version 1.7.0; bumping version to clean this up to ensure it doesn't cause migration issues at some point

## 1.7.1 - Story Web bug fix
![](https://img.shields.io/badge/release%20date-December%2019%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.7.1/module.zip)

- Story Web layouts now properly save when auto-arrange is off.

## 1.7.0 - Relationship graphs and better tab history!
![](https://img.shields.io/badge/release%20date-December%2018%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.7.0/module.zip)

- You can now create graphs tracking the relationships between your characters, locations, PCs, dangers, etc.  Right click on the new "Story webs" folder to create one and get started.
- Main tabs (ex. entries, sessions, etc.) now remember which subtab they had open when you go back to them.  I think this is a huge quality of life improvement.  If you disagree, though, you can change it back in the module settings.
- In the module settings, you can now configure to now show images on the description pages of different content types.  This lets you have a bit more room for the description boxes for places you don't use images.
- Improved loading performance when using the backend.  You can now open the main window much more quickly when first entering your Foundry world.
- Fixed a bug where deleting content in the module was still leaving stray journal entries in the setting's compendium.  It didn't really hurt anything, but it was confusing if you opened the compendium manually.  Plus they were still taking up unneeded space.
- Fixed a bug where moving lore around between sessions, arcs, and campaigns would lose the connection to any attached journal entries.
- Fixed a bug where the danger name textbox wasn't working.
- Fixed a bug where some keybindings weren't always working.

## v1.6.5 - One more migration fix
![](https://img.shields.io/badge/release%20date-December%202%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.6.5/module.zip)

- Fixed a bug that was preventing migration from v1.5.1 to v1.6.0 for worlds that had a deleted campaign in them.

## v1.6.4 - Arc deleting bug fix; Migration fix
![](https://img.shields.io/badge/release%20date-December%201%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.6.4/module.zip)

- Fixed a bug that was preventing the deletion of arcs in some cases.
- Fixed a bug that was preventing migration from v1.5.1 to v1.6.0 in some cases.

## v1.6.3 - Cairn system issue fix
![](https://img.shields.io/badge/release%20date-November%2029%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.6.3/module.zip)

- Fixed a CSS conflict with Cairn system that was causing entry and setting description boxes to disappear.

## v1.6.2 - Bug fix
![](https://img.shields.io/badge/release%20date-November%2025%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.6.2/module.zip)

- Changes to entry types are now immediately reflected in the related entry lists of other entries they are related to.

## v1.6.1 - Better campaign planning
![](https://img.shields.io/badge/release%20date-November%2025%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.6.1/module.zip)

- You can now use fronts.  They can be disabled in the module settings.
- Sessions are now grouped into "arcs" (chapters).  These can be used to track lore and story lines across multiple sessions without having to keep all those pieces in the campaign indefinitely.
- You can now properly open sessions from the search results.
- Type groups now expand if needed to highlight the current entry in the tree when a character is opened in a tab.
- When PCs are related to character entries, there is now a "relationship" field.
- You can now "undeliver" lore on the campaign lore list that was delivered in a session.  It returns it back to that session as undelivered.
- Fixed bug when trying to move lore to the next session when that session wasn't yet created.
- Fixed bug where changes to referenced document names wasn't always updating the names referenced in campaign builder.
- Fixed a bug where some entries with no type were missing from the 'grouped by type' tree.

## v1.5.5 - Bug fixes 
![](https://img.shields.io/badge/release%20date-November%2021%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.5.5/module.zip)

- You can now correctly create new types in the type selection box on the entry description tab

## v1.5.4 - Fixed migration bug 
![](https://img.shields.io/badge/release%20date-November%2015%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.5.4/module.zip)

- In certain configurations, an error was preventing migration from v1.5.0 to v1.5.1 or later.  Now fixed.

## v1.5.3 - Fixed bug adding journal entries to lore
![](https://img.shields.io/badge/release%20date-November%2011%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.5.3/module.zip)

- You can now add journal entries to lore rows (not just journal entry pages)

## v1.5.2 - Fixed bug preventing PC creation
![](https://img.shields.io/badge/release%20date-November%208%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.5.2/module.zip)

- Fixed a bug that was preventing PCs from being created.

## v1.5.2 - Fixed bug preventing PC creation
![](https://img.shields.io/badge/release%20date-November%208%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.5.2/module.zip)

- Fixed a bug that was preventing PCs from being created.

## v1.5.1 - Much faster setting tree rendering
![](https://img.shields.io/badge/release%20date-November%202%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.5.1/module.zip)

- The setting directory tree now loads much faster - especially for larger Settings
- Fixed a bug where changing the parent of a node in a deep tree could cause it to lose track of the overall hierarchy.  This resulted in a variety of odd effects, most noticeably filtering the tree didn't work properly when the matched entry was several layers down.  If you see this happening, remove the parent of the problem entry and then set it back and the new version should clean it up.

## v1.5.0 - Tons of changes, but mostly behind the scenes
![](https://img.shields.io/badge/release%20date-November%201%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.5.0/module.zip)

- **Version 1.7 prep: This version has some significant changes in how data is stored.  PLEASE BACKUP YOUR WORLD BEFORE UPDATING.  When you first enter a world using the module, it will automatically migrate your data to the new format.  If it runs into issues, DO NOT keep using it and DO NOT attempt to downgrade.  Instead, reach out via Github or Discord for assistance, and use your backup (after restoring the older module version) in the meantime.  These changes are in support of the upcoming version 1.7 (which will allow you to customize the fields on entries, sessions, etc.) and v2.0 (which will allow you to share content with players)**
- You are now able to move the compendia that hold each world, rather than being required to keep them in the created folder structure.  New compendia will still  be created in the "Campaign Builder" folder, but if you don't like that organization system, you are free to change.
- On the flip side, the compendia are no longer visible to anyone but the GM.  Note that this is just a change in visibility in the Foundry UI - anyone could programmatically access them from the console.  The purpose here is to prevent players from being able to see all of the entries via Foundry's sidebar, while still (eventually) allowing them to access specific pieces via the Campaign Builder interface.
- Settings, campaigns, sessions, and entries are now each stored in their own Journal Entry and Campaign Builder is the viewer for those entries.  This has a variety of implications, but the most important one at the moment is that you can use Campaign Builder content as map notes.  To do this, open the compendium and drag the desired entry to the scene where you want it.  I recommend leaving the 'journal entry page' field blank but it doesn't really matter.  Then double clicking the book icon on the map will open the content in Campaign Builder.

  **NOTE: Doing this makes a copy of the note from the compendium into your local world.  Opening that copy is OK - it will be handled properly and edits will be made to the global one - it effectively makes the local one a link.  Nothing I can do about needing the copy, though.  If you delete it, it will break any connected map notes because they're attached to the copy.**

- Similarly, you can COPY (not move) entries to the local world. This is useful (for example) if you want to have a shortcut to go right to an entry.  Same rules as above apply.
- The ability to link to Settings in entries was removed.  I suspect no one was using it, because it wasn't very useful, it wasn't documented, and it was hard to do.
- You can now move a campaign idea to the to-do list and vice versa with a single button click.
- If you have more bookmarks than will fit, it will now give you a dropdown with the overflow, rather than breaking.
- UX modernization (font/color updates - nothing functional for now), including complete overhaul of dark mode.
- As part of that, if your Foundry world has multiple Settings, you now choose which you want to use from a drop-down.  This allows the setting directory to be a bit cleaner visually for the vast majority of people who only have a single setting.
- Some performance improvements - particularly for large Settings
- Dragging a campaign name into an editor now properly creates a link.
- The description box in the create entry dialog can now be expanded if desired.
- You can now "complete" a campaign so your old campaigns don't clog up search results, etc.

## v1.4.2 - Bug fix
![](https://img.shields.io/badge/release%20date-October%209%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.4.2/module.zip)

- Fixed issue where players were prompted to create a session after modifying non-Campaign Builder documents in some circumstances.

## v1.4.1 - Assorted bug fixes
![](https://img.shields.io/badge/release%20date-September%2023%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.4.1/module.zip)

> NOTE: This release requires an update the the backend (to v1.4).

- Improved Russian translations (thanks Vlada!)
- You can now properly create a PC from the "New Tab" page
- Formatting (new lines in particular) is now preserved in descriptions when creating entries with user-entered text.
- Editing a description no longer suggests creating references to entries/documents that can't be related to that entry 
- Dragging an entry, session, campaign, or setting from the tree properly inserts a link to it in the editor again
- Generated images now include the entry's name to make them easier to manage (requires new backend)
- Changing between tabs when an editor is open now prompts for whether you want to save or discard any changes.
- Updated some searches and the directory filter to support unicode characters

## v1.4.0 - Now in Russian
![](https://img.shields.io/badge/release%20date-September%2022%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.4.0/module.zip)

- Added Russian translation

## v1.3.5 - Fixed issue
![](https://img.shields.io/badge/release%20date-September%2021%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.3.5/module.zip)

- Clicking an option with the mouse in the type selection box for an entry now works properly

## v1.3.4 - Hide "add" option in parent select list
![](https://img.shields.io/badge/release%20date-September%2020%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.3.4/module.zip)

- No longer shows the "Add" button when in the parent selection typeahead (which didn't do anything).
- Created a Discord server for discussion by anyone using the module.  In preparation for 2.0, it would be great to talk with anyone using the module and understand how you're using it to avoid breaking something that someone thinks is important.

## v1.3.3 - Stop hiding entries in "group by type" mode
![](https://img.shields.io/badge/release%20date-September%2014%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.3.3/module.zip)

- When the setting tree is grouped by type, there are now "(none)" groups to show your entries that don't have a type.
- PCs now show when the setting tree is grouped by type.

## v1.3.2 - Some cleanup of entry types
![](https://img.shields.io/badge/release%20date-September%208%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.3.2/module.zip)

- If you remove a type from an entry and that was the only one using it, the type will now be removed from the suggested list.  If you have stray types laying around, you'll want to attach them to an entry and then remove them (you can do that right from the entry's type input - just make sure you click outside the box each time you change it so it will save).
- Added a separate option for adding new types to the dropdown.  This allows the creation of types that are substrings of existing ones.
- You should no longer be able to delete the active session in play mode (which would then cause all sorts of problems).

## v1.3.1 - Fixed related item bug
![](https://img.shields.io/badge/release%20date-September%207%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.3.1/module.zip)

- Fixed a bug introduced in v1.2.2 that prevented the creation of new relationships between entries.

## v1.3.0 - RPG-formatted text
![](https://img.shields.io/badge/release%20date-September%206%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.3.0/module.zip)

- Can now set AI-generated long descriptions to be RPG-formatted (i.e. boxed text + notes) instead of the long narrative descriptions previously generated.  See module settings to change this.
- Got rid of the option to do long vs. short descriptions.  It's now always long (either full narrative or RPG-style based on the setting above) plus the roleplay notes if enabled.

## v1.2.2 - Bug fixes
![](https://img.shields.io/badge/release%20date-September%201%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.2.2/module.zip)

- When creating a scene from an image, it turns off token vision so everyone can actually see it.
- Fixed bug when trying to copy an image URL for an image that's stored locally on the server
- Fixed CORS error when attempting to copy image to the clipboard.
- You can now see images in editors (e.g. entry descriptions) that are closed.
- Fixed issue where strong start edit box wasn't being updated when moving between sessions.
- Links to entries in campaign to-do list now work.
- Marking lore, items, etc. as delivered now properly updates the campaign to-do list.

## v1.2.1 - Bug fixes
![](https://img.shields.io/badge/release%20date-August%208%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.2.1/module.zip)

- Fixed bug where "mark delivered" buttons weren't showing in tables on session
- Fixed some missing localization strings 
- You can now create a new entry even if description is blank
- Fixed notes buttons in the session buttons bar and added ability to open the notes popout
- Fixed issue where roll tables were unnecessarily being repopulated

## v1.2.0 - So many things I skipped a version number!  AI options, better interactions with journal entries, quality of life improvements
![](https://img.shields.io/badge/release%20date-August%203%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.2.0/module.zip)

**Note!** FOR THOSE USING THE BACKEND, THIS RELEASE REQUIRES AN UPGRADE.  SIMPLY RERUN THE SAME `curl` COMMAND YOU USED TO INSTALL THE PRIOR VERSION (FROM THE DIRECTORY WITH YOUR `.env` FILE) AND IT SHOULD JUST UPDATE IN PLACE.  YOU WILL THEN NEED TO UPDATE YOUR API KEY IN THE SETTINGS WITH THE NEW VALUE.

**Note 2!** You may need to close all your currently open tabs and reopen to avoid issues after upgrading to this version.

**Note 3!** You will see a migration window popup briefly (usually very briefly) the first time you login after upgrading.  

**Note 4!** Due to the extensive changes to PCs, you will need to reconnect your PCs (now found in the Setting tree) to your campaigns.  No PC data should have been lost (see note 2), but you do have to reconnect them.  You do not need to connect them to every session - the session and campaign lists mirror each other.

- Added ability to link Foundry journals to Entries, Settings, Campaigns, and PCs - great for attaching maps, multiple images of the same character, and various other info you want to store and/or share with your players
- Added support for Anthropic (Claude 3) for text generation (see module settings)
- Added ability to choose from multiple image generation models
- Made lore hold a fixed order (like ideas and todos)and enabled the ability to drag and drop to reorder them
- Removed pagination from all tables; it took up extra room and was a nuisance
- Added a keybinding (Ctrl-Shift-Z by default) to toggle the main window
- Added keybindings for moving forward/back across the tab bar; changed default for closing the tab
- Added module setting to show the type of each node in the Setting tree in hierarchy mode.
- Characters in setting directory now group by type regardless of whether the overall tree is grouped by type or not.  Since they don't have a hierarchy, this makes it much easier to find them when you have a long list.
- Consolidated "strong start" onto the Session notes tab; it shows at the top initially, but then once the session has been played (i.e. if there's another session after it already created), it moves below notes for convenience.
- Added PCs to the setting directory and made the ability to link PCs to entries - makes tracking backstory relationships to the world way simpler
- Added ability to copy images and image links to the clipboard
- Minor UI cleanup 
- Made it possible to highlight text throughout the Campaign Builder window (ex. so you can copy and paste text from an editor that's not currently open)
- Fixed bug where bookmarks weren't deleted when the underlying content was
- Fixed bug where campaigns created by right-clicking in the Setting directory didn't immediately show up in the Campaign directory
- Fixed bug where search index wasn't being populated if you closed and reopened the main window
- Fixed bug where an error when generating an image prevented you from trying again
- Eliminated inaccurate notifications about RollTables being repopulated
- Allowed for numbering a session 0

## v1.0.0 - Coming out of beta!

![](https://img.shields.io/badge/release%20date-June%2023%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.0.0/module.zip)

- Renamed "worlds" to "settings" to eliminate confusion with Foundry worlds 
- Added ability to create settings, campaigns, and entries from the "New Tab"
- Added tab to all entries to quickly find every session in which they were referenced 
- Added house rules section to campaign
- Reworked name generation; you can now select the "style" of names you want generated from the main Setting page 
- Added "to-do" list - tracks things you deliver or edit during a play session so that you can quickly see afterward if any of them should be mentioned in the notes or fleshed out further; can also add to it manually.
- Added campaign "ideas" list to track things you might want to use at some point in the future like quests or locations that you don't want to add to the world yet.  
- Added ability ability to setup a gmail account where you can email spontaneous ideas you have and they will be added to the ideas list (requires backend)
- Putting the name of an entry in the description of another will automatically convert it to a link.
- When saving an entry description, it now suggests changes you might want to make to the related items (and will make them for you).
- Added setting to customize the length of long descriptions (1-4 paragraphs)
- The species list dialog in the settings now works properly. 
- Made roll tables world specific (to support the world-specific name styles) and increased size to 100 rows
- Minor visual improvements
- Various bug fixes

## v0.5.0 - More quality of life improvements

![](https://img.shields.io/badge/release%20date-May%2011%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.5.0/module.zip)

- Session notes now prompt to save when leaving play mode, changing campaigns, etc. 
- Added ability to move unused lore from a session back to the campaign list
- Lore and Vignettes now immediately open in edit mode after adding a new one
- Fixed issue with move to next session buttons not always working
- Fixed issue with not opening back on the right subtab when first opening the main window
- Minor bug fixes

## v0.4.2 - Fixed text box color

![](https://img.shields.io/badge/release%20date-May%2010%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.4.2/module.zip)

- Color of text in some text boxes (specifically edit boxes in tables like lore) is now readable in light and dark mode

## v0.4.1 - Bug fix

![](https://img.shields.io/badge/release%20date-May%209%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.4.1/module.zip)

- Fixed issue with lots of operations sometimes failing because the compendium is locked

## v0.4.0 - Dark mode

![](https://img.shields.io/badge/release%20date-May%20__%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.4.0/module.zip)

- Proper dark mode support
- Minor bug fixes

## v0.3.0 - Quality of life improvements

![](https://img.shields.io/badge/release%20date-May%207%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.3.0/module.zip)

- Enabled pushing to the current session from character/location entries to avoid having to go back and forth to the session while preparing
- Cleaned up the UX of the create/generate dialog boxes
- Allow multiple image generations to be happening at once
- Ability to create new entries when adding to a relationship or a session
- Made it more clear on various tables what clicking different cells will do
- Added mode details to session location and NPC tables
- Improvements to table drag/drop interface
- Minor bug fixes

## v0.2.1 - Fixed some minor but irritating UX issues

![](https://img.shields.io/badge/release%20date-April%2030%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.2.1/module.zip)

- Made create boxes display properly when not using AI
- Other minor bug fixes

## v0.2.0 - Lots of quality of life improvements

![](https://img.shields.io/badge/release%20date-April%2029%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.2.0/module.zip)

- Simplified create/update/generate into one dialog for easier access and consistency
- Added ability to randomly generate "short descriptions" -- better for quickly understanding a generated Entry while playing
- Made location images landscape
- Ability to create a scene from the image of a location - perfect for a quick theatre of the mind
- Improved ability to search sessions
- Misc bug fixes


## v0.1.2

![](https://img.shields.io/badge/release%20date-April%2020%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.1.2/module.zip)

- Added buttons to add actors/scenes and drag indicator to scenes in Entry document relationship tabs
- Support for Autocomplete Mentions module 
- Made sessions searchable
- Lots of documentation improvements
- Various minor bug fixes

## v0.1.1 - Tags and quality of life

![](https://img.shields.io/badge/release%20date-April%2013%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.1.1/module.zip)

- Added tags for entries and sessions
- Setting to disable AI warnings
- Assorted UI improvements

## v0.1.0 - Ready for beta

![](https://img.shields.io/badge/release%20date-April%2012%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.1.0/module.zip)

- Added confirmations before deleting entries, etc.
- Added French and German translations.
- Ability to post images from entries directly to chat (right click on the image)
- Cleaned up how lore entries are handled and tie to journal entries
- Lots of bug fixes - ready to truly be considered a beta

## v0.0.5 - Initial Release

![](https://img.shields.io/badge/release%20date-April%2010%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads-pre/dovrosenberg/fvtt-campaign-builder/v0.0.5/module.zip)

The initial public release.

