# Change Log
## v1.6.0 - Better campaign planning
![](https://img.shields.io/badge/release%20date-October%2023%2C%202025-blue)
![GitHub release](https://img.shields.io/github/downloads/dovrosenberg/fvtt-campaign-builder/v1.6.0/module.zip)

- You can now use fronts.  They can be disabled in the module settings.
- Sessions are now grouped into "arcs" (chapters).  These can be used to track lore and story lines across multiple sessions without having to keep all those pieces in the campaign indefinitely.
- You can now properly open sessions from the search results.
- Type groups now expand if needed to highlight the current entry in the tree when a character is opened in a tab.
- When PCs are related to character entries, there is now a "relationship" field.
- You can now "undeliver" lore on the campaign lore list that was delivered in a session.  It returns it back to that session as undelivered.
- Fixed bug when trying to move lore to the next session when that session wasn't yet created.
- Fixed bug where changes to referenced document names wasn't always updating the names referenced in campaign builder.
- Fixed a bug where some entries with no type were missing from the 'grouped by type' tree.

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

