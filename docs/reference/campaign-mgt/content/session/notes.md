---
title: Session Notes Tab
prev: 
  text: 'Session Details'
  link: '/reference/campaign-mgt/content/session'
next: 
  text: 'Session Start Tab'
  link: '/reference/campaign-mgt/content/session/start'
---
# Session Notes Tab
![Session Notes Tab](/assets/images/session-content.webp)

The notes tab has four main components:
1. Image
2. Session number
3. Session date
4. Session notes area

## Image
See [Image] documentation.

## Session number
The session number is the number of the Session.  It is only used for your reference and for displaying in the [Campaign Directory] (depending on your setting for "Session display format" in the [Configuration](/reference/configuration)). 

Only one session can have any given number. If you change the number to one that already exists, it will be inserted there and the others will be renumbered.

## Session date
The session date is the date of the session.  It is only used for your reference and for displaying in the [Campaign Directory] (depending on your setting for "Session display format" in the [Configuration](/reference/configuration)).

## Session notes area
This is where you enter the Session notes. Click the orange pencil to start editing, and the save button (or Control-S) to save.

You can drag any Entry from the [Setting Directory] into the notes editor and it will insert a UUID indicator that when you save will be displayed as a clickable link that will open that Entry (hold 'Control' while clicking to open it in a new tab).

It is highly suggested that you check out the [Autocomplete Mentions](/reference/navigation/main-display#autocomplete-mentions) module, which allows you to rapidly reference Foundry documents and Campaign Builder Entries/Sessions/etc. while typing in the editor.  

When you save the notes while in [^Play Mode], it will check to see if you've added any references to Entries.  If you have, those Entries will automatically be added to the [To-do list](/reference/campaign-mgt/content/campaign/todos) for the Campaign.  

See also the [Session Notes Popup](/reference/play-mode/session-notes-popup) for more info on adding notes while in [^Play Mode].
