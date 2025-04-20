# Foundry Campaign Builder (a world & campaign builder for Foundry VTT) - User Documentation

## Note: The instructions are still a bit of a work in progress.  I think everything here is correct, but there
are likely things mising things may not be in the most obvious place.  Suggested edits or PRs for edits welcome.

## Table of Contents
1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [World Building](#world-building)
   - [Characters](#characters)
   - [Locations](#locations)
   - [Organizations](#organizations)
   - [Species](#species)
   - [Hierarchies](#hierarchies)
5. [Campaign Planning](#campaign-planning)
   - [Session Preparation](#session-preparation)
   - [PCs](#pcs)
   - [Strong Start](#strong-start)
   - [Vignettes](#vignettes)
   - [Lore](#lore)
   - [Locations](#campaign-locations)
   - [NPCs](#npcs)
   - [Monsters](#monsters)
   - [Magic Items](#magic-items)
6. [Running Your Game](#running-your-game)
   - [Session Management](#session-management)
   - [Quick Access](#quick-access)
   - [Note Taking](#note-taking)
7. [Post-Session](#post-session)
8. [Advanced Features](#advanced-features)
   - [AI Integration](#ai-integration)
   - [Backend Setup](#backend-setup)
9. [Settings](#settings)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)
12. [Support](#support)

## Introduction

Foundry Campaign Builder (FCB) is a Foundry VTT module designed to help Game Masters create, plan, and run campaigns directly within Foundry. It combines world-building and lore creation (similar to tools like WorldAnvil, Kanka, or LegendKeeper) with a framework for organizing campaigns and sessions based on the Lazy DM approach.

Key advantages:
- Free and ad-free
- Integrated directly into Foundry VTT
- Optional AI-powered generation of descriptions and images
- Build your world as you play
- Seamless integration with Foundry's core features

Whether you're looking to create detailed worlds, plan efficient sessions, or both, World & Campaign Builder provides the tools you need to enhance your tabletop roleplaying experience.

## Installation

1. In Foundry VTT, navigate to the "Add-on Modules" tab
2. Click "Install Module"
3. Search for the module or in the "Manifest URL" field, paste: `https://github.com/dovrosenberg/fvtt-campaign-builder/releases/latest/download/module.json`
4. Click "Install"
5. Once installed, activate the module in your world

## Getting Started

After installation and activation, you'll find a new button with a globe icon to the left of your scene selection dropdown. Clicking this button opens the main interface.

The module has three primary components:
- **World Building**: Create and manage your world's lore, characters, locations, and more
- **Campaign Planning**: Plan and organize your sessions using the Lazy DM method
- **Playing a Session**: Tools to run your game session more easily, while seamlessly collecting notes to be able to capture what happened and begin your prep for the next session

When you first open the module, you'll be prompted to create your first world. Almost everything that happens in FCB is inside of a world. You can have multiple FCB worlds inside one Foundry world/game, but all of your characters, locations, and campaign information reside within a single FCB world and can't cross over.

**Important:** Throughout the application, right-click context menus are available on most elements. These menus provide quick access to common actions like editing, deleting, creating relationships, and more. Be sure to explore these context menus as they significantly enhance your workflow.

## World Building

The World Building section allows you to create and manage all the elements of your world. Each element can have detailed descriptions, images, and relationships with other elements.

### Characters

Characters represent the people (or other sentient beings) in your world. They can be linked to Foundry Actors for easy access during gameplay.

To create a character:
1. Navigate to the World Building tab
2. Click "Characters" in the sidebar
3. Click the "+" button to create a new character
4. Fill in the character details and click "Save"

Characters can be NPCs or important historical figures. For player characters, it's recommended to use the PC section in Campaign Planning.

**Note:** You can delete a character by right-clicking on it in the directory.

### Locations

Locations are the places in your world, from continents and countries down to individual buildings or rooms. 

To create a location:
1. Navigate to the World Building tab
2. Click "Locations" in the sidebar
3. Click the "+" button to create a new location
4. Fill in the location details and click "Save"

Locations can be organized hierarchically (e.g., a city within a country within a continent) and can be linked to one or more Foundry Scenes.

**Note:** The right-click menu for Locations includes deleting the location, as well as adding a child.  If you have AI features enabled, it also includes AI generation of a new child location.

### Organizations

Organizations represent groups of characters with a common purpose, such as governments, religions, guilds, or families.

To create an organization:
1. Navigate to the World Building tab
2. Click "Organizations" in the sidebar
3. Click the "+" button to create a new organization
4. Fill in the organization details and click "Save"

Like locations, organizations can be organized hierarchically.

**Note:** The right-click menu for Organizations includes deleting the organization, as well as adding a child.  If you have AI features enabled, it also includes AI generation of a new child organization.


### Species

You can have a list of species (only one - not one per world).  This list is used to populate the species drop-down
for characters.  If you are using AI generation, the description of the species is also used there to help refine character 
suggestions and images.

To define a species:
1. Navigate to the Settings menu
2. Select "Species List"
3. Click "Add Species"
4. Fill in the species details and click "Save"

### Hierarchies

Both locations and organizations can be organized into hierarchies. This makes it easy to navigate your world and understand relationships between elements.

To create a hierarchy:
1. When creating or editing a location or organization, you can select a parent from the dropdown menu
2. The element will be placed as a child of the selected parent
3. You can view the full hierarchy in the directory

## Campaign Planning

The Campaign Planning section helps you prepare for your sessions using the Lazy DM method. It provides tools for organizing the key elements of your upcoming session.  You can define multiple campaigns inside a single FCB world, which is useful if you use the same setting across multiple groups who play at different times.  

### Campaign Preparation
To create a new campaign:
1. Right click the name of the world in the campaign directory (the bottom part of the directory on the right side) and select "Create New Campaign"
2. Provide a name for the campaign

### PCs

The PCs section allows you to track information about player characters.

To add a PC:
1. In your session, click the "PCs" tab
2. Click "Add PC"
3. Fill in the PC details and link to the appropriate Actor
4. Click "Save"

### Creating a campaign

To create a new campaign:
1. Right click on the world header in the campaign directory (bottom section of the directory and select "Create Campaign"
2. Give the campaign a name

In the settings menu, there is an option to display your sessions in the directory by name, number, or date.

### Session Preparation

To create a new session:
1. Right click on the campaign the session is part of in the campaign directory and select "Create a session"
2. Give the session a name (it can be a placeholder if you like to name your sessions after they're done)

Sessions are identified by number and by name, as well as with a date.  They are currently shown in the directory by number.

Once you've created a session, you can add the various elements described below.

### Session description

On this screen, you can change the session name, number, and date. **Each session must have a unique number within a campaign.**

Sessions are sorted in the campaign directory by number (even if you're displaying them by name or date), and the most recent
session date is used to determing the "current session" when you're in Play mode.

**Note:** Right-click a session or campaign in the campaign directory to delete it.

### Strong Start

The Strong Start is a compelling opening scene or situation that immediately draws players into the action.

To add a Strong Start:
1. In your session, click the "Strong Start" tab
2. Enter your strong start description
3. Click "Save"

### Vignettes

Vignettes are potential scenes that might occur during your session. They're called "vignettes" (vs "Scenes" in Lazy DM parlance) to avoid confusion with Foundry scenes.

To add a vignette:
1. In your session, click the "Vignettes" tab
2. Click "Add Vignette"
3. Fill in the vignette details
4. Click "Save"

During or after the session, you can mark vignettes as "used" or move unused ones to the next session.

### Lore

The Lore section (what the Lazy DM calls "secrets and clues") allows you to prepare bits of information that players might discover during the session.

To add lore:
1. In your session, click the "Lore" tab
2. Click "Add Lore"
3. Fill in the lore details
4. Click "Save"

Like vignettes, you can mark lore as "revealed" during or after the session.

### Campaign Locations

This section allows you to prepare a list of locations from your world that might be relevant to the upcoming session.

To add a location:
1. In your session, click the "Locations" tab
2. Click "Add Location"
3. Select a location from your world and add any session-specific notes
4. Click "Save"

### NPCs

Similar to locations, this section allows you to prepare a list of NPCs from your world that might appear in the upcoming session.

To add an NPC:
1. In your session, click the "NPCs" tab
2. Click "Add NPC"
3. Select a character from your world and add any session-specific notes
4. Click "Save"

### Monsters

The Monsters section allows you to prepare a list of monsters that players might encounter during the session.

To add a monster:
1. In your session, click the "Monsters" tab
2. Drag an actor from somewhere else in Foundry onto the list.
3. You can then click on the "number" to edit it.  Press enter while in the input box to save.

### Magic Items

The Magic Items section allows you to prepare a list of magic items that might appear during the session.

To add a magic item:
1. In your session, click the "Magic Items" tab
2. Drag an item from somewhere else in Foundry onto the list.

## Running Your Game

The module provides several features to help you run your game smoothly.

### Session Management

During a session:
1. Open the Campaign Planning tab
2. Select the current session
3. Use the various tabs to access your prepared content
4. Mark elements as "used" or "revealed" as appropriate

### Quick Access

The module provides quick access to:
- Foundry Scenes linked to your locations
- Foundry Actors linked to your characters
- Foundry Items linked to your magic items

Simply click the appropriate icon next to an element to access it. Context menus are also available for additional options.

### Note Taking

You can take notes during the session:
1. In your session, click the "Notes" tab
2. Enter your notes
3. Click "Save"

Entering play mode will (assuming you have the setting turned on in Module Settings) automatically open a separate window
that is tied to the notes of the current session.  This can make it easier to take quick notes without needing to change your tab, etc.
inside the main window.  

Changes in one spot will be reflected in the other when you save.

## Post-Session

After a session, you can:
1. Review which vignettes and lore were used
2. Move unused elements to the next session with a click
3. Add any new locations, NPCs, etc. to your world
4. Create a new session for next time and add any initial thoughts

## Advanced Features

### AI Integration

The module includes optional AI-powered features for generating descriptions and images. These features require setting up a backend server, which is much easier than it sounds (see below).

With AI integration, you can:
- Generate detailed descriptions for characters, locations, and organizations
- Create images based on your descriptions
- Generate names for NPCs, towns, shops, and taverns

To use AI generation:
1. Set up the backend server (see below)
2. In the module settings, enter your API URL and token
3. When creating or editing a world element, click the "Generate" button

### Backend Setup

Setting up the backend server requires:
1. Basic comfort with command-line scripts
2. Accounts with Google Cloud, OpenAI, and Replicate.com (for images)
3. Full instructions are at: https://github.com/dovrosenberg/fvtt-fcb-backend

The backend is designed to stay within the Google Cloud free tier, and OpenAI costs are minimal (approximately $0.15 for 5000 AI-generated character descriptions).
Image generation is approximately $0.01 per image.

## Settings

The module includes several settings to customize your experience:

1. **Start Collapsed**: Determines whether sections start collapsed or expanded
2. **Group Tree by Type**: Organizes the world tree by element type
3. **Advanced Settings**: Access to additional configuration options
4. **Species List**: Manage your world's species definitions
5. **Roll Table Settings**: Configure roll tables for name generation

To access these settings:
1. Click the Settings gear in the Foundry sidebar
2. Select "Module Settings"
3. Find the "World & Campaign Builder" section

## Troubleshooting

Common issues and solutions:

**Issue**: Module doesn't appear in the sidebar
**Solution**: Make sure the module is activated in your world

**Issue**: Can't create world elements
**Solution**: Check that the root folder was created correctly

**Issue**: AI generation doesn't work
**Solution**: Verify your backend setup and API credentials

## FAQ

**Q: Can I use this module without the AI features?**
A: Yes, all AI features are optional. You can manually create and edit all world elements.

**Q: Can players see my world building?**
A: By default, only the GM can see the world building. Future updates will allow you to selectively share elements with players.

**Q: Is this compatible with other modules?**
A: Yes, the module is designed to work alongside other Foundry modules.

**Q: Can I import data from other world-building tools?**
A: There is currently no direct import feature, but this may be added in future updates.

## Support

If you encounter issues or have feature requests:
1. Visit the [GitHub repository](https://github.com/dovrosenberg/fvtt-campaign-builder)
2. [Open a new issue](https://github.com/dovrosenberg/fvtt-campaign-builder/issues/new/choose)

If you'd like to support the developer, you can [buy them a root beer](https://ko-fi.com/phloro).