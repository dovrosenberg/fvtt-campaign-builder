---
title: Getting Started
---
# Getting Started

After installation and activation, you'll find a new button with a globe icon to the left of your scene selection dropdown in the top left corner of your Foundry screen. Clicking this button opens the main interface.
![Launch button](/assets/images/launch-button.webp)

### Choose your own adventure
The quick-start guide is split into two parts, depending on what you want to focus on - world building or running a campaign.  These work best together, but you can use the module for either alone (more or less).  These guides are not intended to cover all the functionality available (or you would't need the rest of this documentation).  Instead they cover just enough to get you started and far enough along that you can then explore on your own.

## Your first Setting
When you first open the module, you'll be prompted to create your first [^Setting]. Almost everything that happens in Campaign Builder is inside of a Setting. These Settings represent the world/universe that your campaigns happen in.  You can have multiple Settings in the module inside one Foundry world, but all your [^Characters], [^Locations], and [^Organizations] reside within a single Setting and can't cross over or reference entries in a different Setting.  

You can have more than one [^Campaign] in a given Setting, and they share all of the same Characters, Locations, etc. (but also cannot reference into a Setting other than the one they are in).

> [!NOTE]
> There's currently no way to move a Setting between Foundry worlds.  If you have a use case for that, let's talk.*


## World Building
World building primarily takes place in the [^Setting Directory], found in the upper part of the Directory Sidebar.  The key steps to get you started are:

1. Create a Setting (this will happen automatically when you first open the Campaign Builder window)
1. Right click on the topic folders ('Characters', 'Locations', 'Organizations') to create new entries and begin defining your Setting

That's basically it - everything else is optional.  Some other things you'll likely want to do, though, include:
* Provide the Setting details (this is particularly important if using [Advanced Features])
  * Click the Setting name in the directory to get to the Setting details tab, where you can provide background on the Setting
* Give your [^Entries] more details
  * Open an entry by clicking on it in the directory.  (Holding Control while clicking will open it in a new tab)
  * Give it a type - just enter your new type in the Type box
  * Click on the image box to assign an image
  * Add relationships to other entries on the other tabs 

Check out the [World Building Guide](/guide/world-building) for more information.

## Running a Campaign
Running a campaign primarily takes place in the lower part of the Directory Sidebar - the [Campaign Directory](/reference/navigation/directory-sidebar/#campaign-directory).  Campaigns are comprised of multiple sessions.  

A [^Session] is intended to represent a single game session - played in one stretch of time.  Sessions have numbers that determine their order in the campaign.  The session with the highest number is the "active" session, which is important for some features.

Get started:
1. Pick the Setting the campaign is in from the [^Setting Directory]
1. Right click on the header in the Campaign Directory to create a new campaign (the one that reads "[Your setting name] Campaigns")
1. Right click on the Campaign name to create a new session

For campaigns, there are two modes you need to know about: [^Prep mode] and [^Play mode].  You change between these modes with the [toggle](/reference/navigation/prep-play) in the Campaign Builder window title bar.  If you have more than one campaign with at least one session, you'll see a drop-down where you can pick which campaign you are playing.  

![prep/play toggle and dropdown](/assets/images/prep-play-with-campaign.webp)

### Prep mode:
In prep mode, you're wrapping up a session that just ended and/or setting up for the next one.  This is where you'll flesh out a session with settings, NPCs, etc.

Prep mode is designed to follow the Lazy DM philosophy.  Each tab on the Session screen (click the Session in the directory to open it) represents one of the steps:
* Write your [^Strong start]
* Define any [^Lore] that might come up
* Describe possible scenes (called [^Vignettes] in Campaign Builder to distinguish from Foundry scenes)
* Connect any [^Fantastic Locations] from the Setting - this then gives you quick access to both your detailed Location info and the associated Foundry scenes
* Connect any Characters from the Setting for your [^NPCs]
* Add any Foundry actors as [^Relevant Monsters] - this gives you easy access to their actor sheets and to drag them onto the scene
* Add any Foundry items for [^Magic items] as that might come up

Then - [switch to play mode and run your session](#campaign-play-mode) 

Post-session, there are two key things to look at:
* Review the to-do list on the [^Campaign] for anything that needs attention - this automatically tracks things that happen during your session so you can be reminded and decide if you need to flesh out your notes or add to your Setting.
* Look through all the tabs for the completed session at things that did not get used during the session. Typically, you'll either want to delete them or move them to the next session (by clicking the trash can or arrow on the left side of the table).
  * For lore, you can also move them back to the campaign lore list if you want to keep it but the next session isn't going to be the right time to use it.

### Play mode: {#campaign-play-mode}
In play mode, you're actively playing a session.  When you enter play mode, you'll get a session notes popup box where you can record notes as you go.  Every time you hit save, these notes get saved to the notes tabs on the active session, as well (and vice versa).  If you don't like the popup, just close it.

When you enter play mode, you'll see a new toolbar at the top of the window
![session nav toolbar](/assets/images/session-nav-toolbar.webp)

This toolbar lets you immediately open the corresponding tab in the active session.  This makes it easy to get right back where you need to in your session notes after opening up a character or location to get some extra details.

If using [Advanced Features], you'll also see a second toolbar - the generation toolbar:

![generate toolbar](/assets/images/generate-toolbar.webp)

These buttons allow you to quickly get suggested names for NPCs, taverns, etc. on the fly and then, if desired, rapidly flesh out the background and add them to your Setting.  

In play mode, you'll mostly be just playing your game.  Beyond the toolbars, the primary other thing you'll want to do while playing is mark off on the various Session tabs any NPCs, lore, Locations, etc. that get used during the session.  You do this by clicking the checkmark on the left side of the table to mark it as "delivered".

Everything you deliver in the current session and anything you edit in the Setting while in play mode gets tracked in the to-do list, so that after the session you can easily see what came up that you might need to then note or flesh out further.
