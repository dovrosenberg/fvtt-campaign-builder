---
layout: default
title: Foundry World & Campaign Builder
---
# Foundry Campaign Builder (a world & campaign builder for Foundry VTT)

## Introduction
The goal of this package is to facilitate creating, planning, and running campaigns in Foundry.  It combines the world-building and lore creation of tools like WorldAnvil, Kanka, Fantasia Archive, LegendKeeper, etc. with a framework for organizing your campaigns and sessions (built off of the Lazy DM approach, but able to use used with any style of prep).

The module has three primary components: (TODO: link each of these to a summary page that then links to the parts of the UI that are relevant)
- **World Building**: Create and manage your settings' lore, characters, locations, and more
- **Campaign Planning**: Plan and organize your next session using the Lazy DM method; wrap up the prior one.
- **Playing a Session**: Tools to run your game session more easily, while seamlessly collecting notes to be able to capture what happened and begin your prep for the next session

See the [official description](https://github.com/dovrosenberg/fvtt-campaign-builder) for a longer summary of features and functionality.

## Advanced features
You'll see features throughout this documentation labeled "[Advanced]".  These features require the setup and configuration described under [Backend and Advanced Features](backend/index.html) to make them available.

## GM-only, for now
The module currently only works for the GM.  Players may see some settings available, but they won't do anything and there is no way to open the main window without having GM permission.

I intend to change that at some point - in particular creating ways for everyone to contribute to the worldbuilding and for the GM to selectively share pieces of setting information/lore with players.  But for now, GM only.

## Terminology
This documentation uses several specific terms related to the World & Campaign Builder (though many are commonly used in TTRPG, as well):

- Setting: The fictional setting where your Campaigns take place (ex. The Forgotten Realms, Eberron, etc.)
- Entry: A document containing information about a specific element of your Setting (ex. a Character or Location)
- Topic: A category that organizes related Entries. There are three Topics: *Characters*, *Locations*, and *Organizations*
- Type: A user-defined categorization of Entries to assist in finding Entries within a Topic. For example, Characters might have Types such as NPC, PC, Monster, etc.; Locations could have Types such as City, Town, Dungeon, Ruin, etc.
- Campaign: A collection of Sessions played by the same (or generally the same) group of players.  It is primarily just for grouping Sessions together.
- Session: A single play session.  When running in "Play Mode" [TODO:Link], the most recent Session is enabled with additional functionality.

## Support

If you encounter issues or have feature requests:
1. Visit the [GitHub repository](https://github.com/dovrosenberg/fvtt-campaign-builder/issues)
2. [Open a new issue](https://github.com/dovrosenberg/fvtt-campaign-builder/issues/new/choose)

If you'd like to support the developer, you can [buy me a root beer](https://ko-fi.com/phloro).