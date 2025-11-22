---
title: User Interface Guide
prev: 
  text: 'Overview'
  link: '/'
next: 
  text: 'Navigation & Interface'
  link: '/reference/navigation'
---

# Reference overview

This guide provides detailed instructions for using all features of the Campaign Builder interface. Whether you're new to the module or looking for specific functionality, these guides will help you navigate and use the Campaign Builder effectively.

This guide covers the "how" of using the Campaign Builder. For the "why" and "when" of campaign management, see our [User Guide](/guide/). 

## [Navigation & Interface](navigation/)
Learn the basics of navigating the Campaign Builder interface.

- [Main Content Display](navigation/main-display)
- [Directory Sidebar](navigation/sidebar)
- [Tabs](navigation/tabs)
- [Bookmarks](navigation/bookmarks)
- [Search](navigation/search)
- [Prep/Play Toggle](navigation/prep-play)
- [Keybindings](navigation/keybindings)


## World-building ([^Settings])
Create and manage your campaign world content.

- [Overview](world-building/)
- [Settings Directory](navigation/sidebar#setting-directory)
- [Setting Details](world-building/content/setting/)
- [Basic structure of Characters, Locations, and Organizations](world-building/content/entry/)
- [Character Specifics](world-building/content/character/)
- [Location Specifics](world-building/content/location/)
- [Organization Specifics](world-building/content/organization/)

## Playing (Campaign management)
Structure and organize your campaigns and sessions.

- [Overview](campaign-mgt/)
- [Campaign Directory](navigation/sidebar#campaign-directory)
- [Campaign Details](campaign-mgt/content/campaign/)
- [Arc Details](campaign-mgt/content/arc/)
- [Session Details](campaign-mgt/content/session/)
- [Front Details](campaign-mgt/content/front/)
- [To-do List](campaign-mgt/content/campaign/todos)
- [Play Mode Navigation](play-mode/session-links)
- [Session Notes Popup](play-mode/session-notes-popup)

## Configuration

There are a variety of [module settings](configuration/) you can manage in the Foundry Settings window.  

## The Backend and Advanced Features
Details on how to install the backend capabilities to enable [^Advanced Features] are [here](/reference/backend/).

## Where's all this stored?
For the curious, each Setting has its own compendium (inside a top-level folder called 'Campaign Builder').  All of the module's data is stored in Journal Entries inside this compendium.  

You can move this compendium outside the folder structure if you want, *but otherwise, don't mess with it if you want everything to keep working.*  Version 2.0 plans to open this restriction up somewhat.

The compendium is hidden from players.

> [!WARNING]
> Foundry does not allow renaming of compendia.  So, changing the name of your setting after creating it will not update the name of the compendium.  This doesn't really impact anything other than possibly causing confusion.  As a result, though, I strongly suggest never deleting a compendium unless you're sure what's in it.  Campaign Builder compendia (starting with those created in v1.5) have "FCB" as a prefix in the name to help with identification.  Delete your Settings inside the module and the correct compendium will be removed from your world.
