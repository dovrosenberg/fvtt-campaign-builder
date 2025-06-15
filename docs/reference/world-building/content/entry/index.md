---
title: Entry Details
prev: 
  text: 'Reference overview'
  link: '/reference'
next: 
  text: 'Entry description tab'
  link: './description'
---
# Basic structure of Characters, Locations, and Organizations
![Entry Window](/assets/images/entry-content.webp)

Regardless of Topic, each Entry has a similar layout in the main window.  At the bottom of this description, we'll outline the things that are different.

## Entry header
The Entry header has these main components:
  1. Name - This is where you edit the Entry's name.
  
  2. Push to Session Button (for Characters and Locations) [[Advanced Feature]] - This allows you to add the Character or Location to the [^Current Session] (as an NPC or Location, respectively). If you have more than one campaign with valid sessions, you'll be prompted to select the campaign to push to.
  
  ![Push to session button](/assets/images/push-to-session.webp)
  
  3. [Generate Button](generate) [[Advanced Feature]] - This gives you the option to generate a description or image for the current entry.

  ![Generate button](/assets/images/generate-button.webp)

  4. [Tags] - An easy way to categorize entries. Particularly helpful for [searching](/reference/navigation/search). 

## Type
Among other fields, every Entry has a [^Type], which is used to categorize it. 

The Type is used in [search] results, and it can be used to group Entries in the [Setting Directory](/reference/navigation/sidebar#group-by-type).  

The Type field is an autocomplete, and as you start typing it will prompt you with matching Types (specific to the category of Entry you are working with). So, for example, if you are in a Location and another Location has been tagged "Region", then you will see "Region" available as an auto-complete.  If you are in an Organization, you won't see that tag available. 

To add a new Type to the list, just type it in the box and hit Enter (or leave the box).


You cannot currently delete Types.

## Tabs
There are several tabs on the Entry details screen:
  - [Description tab](./description) - overview information about the Entry
  - [Relationship tabs](./relationships) - show the connections between this entry and others
  - Foundry document tabs: After the Entry relationship tabs, you'll find an [Actors tab](/reference/world-building/content/character#actors) when looking at a Character and a [Scenes tab](/reference/world-building/content/location#scenes) when looking at a Location.  
  - [Sessions tab](./sessions) - a quick way to find game session notes that mention this entry