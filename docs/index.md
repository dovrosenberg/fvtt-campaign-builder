---
layout: home

hero:
  name: "Foundry World & Campaign Builder"
  tagline: "Create, plan, and run campaigns with integrated world-building and campaign management tools"
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/dovrosenberg/fvtt-campaign-builder

features:
  - title: World Building
    details: Create and manage your setting's lore, characters, locations, and organizations
  - title: Campaign Planning
    details: Plan and organize your next session using the Lazy DM method
  - title: Session Tools
    details: Tools to run your game session while seamlessly collecting notes
---

# &nbsp;

# Quick start

Do you learn by doing?  Just check out the [Getting Started](/getting-started) guide. 

# Introduction

The goal of this package is to facilitate creating, planning, and running campaigns in Foundry. It combines the world-building and lore creation of tools like WorldAnvil, Kanka, Fantasia Archive, LegendKeeper, etc. with a framework for organizing your campaigns and sessions (built off of the Lazy DM approach, but able to be used with any style of prep).

It can be used within Foundry during your prep and mid-session (it has capabilities for both).  It could also be used to run a live TTRPG session as a DM tool, if you just wanted to run Foundry and pull it up on your laptop (for example).

The module has three primary components:
- [**World Building**](/guide/world-building): Create and manage your setting's lore, characters, locations, and more
- [**Campaign/Session Planning**](/guide/session-prep): Plan and organize your next session using the Lazy DM method; wrap up the prior one.
- [**Playing a Session**](/guide/session-play): Tools to run your game session more easily, while seamlessly collecting notes to be able to capture what happened and begin your prep for the next session

See the [official description](https://github.com/dovrosenberg/fvtt-campaign-builder) for a longer summary of features and functionality.

# Advanced features

You'll see features throughout this documentation labeled "[Advanced Feature]". These features require the setup and configuration described under [Backend and Advanced Features](/reference/backend) to make them available.

# GM-only, for now

The module currently only works for the GM. Players may see some settings available, but they won't do anything and there is no way to open the main window without having GM permission.

I intend to change that at some point - in particular creating ways for everyone to contribute to the world-building and for the GM to selectively share pieces of setting information/lore with players. But for now, GM only.

# Terminology

This documentation uses several specific terms related to the World & Campaign Builder (though many are commonly used in TTRPG, as well):

- **Setting**: The fictional setting where your Campaigns take place (i.e. the equivalent of The Forgotten Realms, Eberron, etc.)
- **Entry**: A document containing information about a specific element of your Setting (ex. a Character or Location)
- **Topic**: A category that organizes related Entries. There are three Topics: *Characters*, *Locations*, and *Organizations*
- **Type**: A user-defined categorization of Entries to assist in finding Entries within a Topic. For example, Characters might have Types such as NPC, PC, Monster, etc.; Locations could have Types such as City, Town, Dungeon, Ruin, etc.
- **Campaign**: A collection of Sessions played by the same (or generally the same) group of players. 
- **Session**: A single play session. When running in "Play Mode" (/guide/session-play), the most recent Session is enabled with additional functionality that you can use during your play session.

# Support

If you encounter issues or have feature requests:
1. Visit the [GitHub repository](https://github.com/dovrosenberg/fvtt-campaign-builder/issues)
2. [Open a new issue](https://github.com/dovrosenberg/fvtt-campaign-builder/issues/new/choose)

If you'd like to support the developer, you can [buy me a root beer](https://ko-fi.com/phloro).