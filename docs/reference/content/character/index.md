---
title: Character Details
prev: 
  text: 'Entries'
  link: '/reference/content/entry'
next: 
  text: 'Locations'
  link: '/reference/content/location'
---
# Character Details
![Entry Window](/assets/images/character-content.webp)

Characters bring your campaign world to life. The Character details  interface is where you craft your NPCs and manage the relationships between the Characters and the world.

## Overall structure
The overall structure of the Character Details interface is the common [Entry interface](../entry).

## Character-specific differences
There are a few Character-specific details.

### Species
Each Character can have an optional species.  This can be helpful to you to see at a glance.  It's also used by the [TODO insert link to description generator] to influence the generated text - particularly in cases where you provide little detail.

You can manage the list of species for your Settings in the [Module Settings](/reference/configuration#species)

### Actors {#actors}
![Actors Tab](/assets/images/actors-tab.webp)

On the Actors tab, you can associate your Character with one or more actors from Foundry.  Having more than one may be helpful if you have different character sheets for this Character at different points in time, or perhaps a transformed/polymorphed version, etc. Since your key Characters will be tied to the current [Session](/reference/content/session), you can access any of them with just a couple clicks.

> [!NOTE]
> Deleting an actor in Foundry that is attached to a Character will automatically and safely remove it from the Character.

#### Adding actors
Click "Add actor" to select a Foundry actor and connect it to the Character.

You can also drag and drop Foundry actors from Foundry VTT onto the box at the top to make the connection.  

#### The actor list
For each actor, you can see it's name and whether it is in the current Foundry world or inside a compendium.  You can click the actor name to open its character sheet.  

![Hamburger icon](/assets/images/hamburger.webp)

You can also grab and drag the hamburger icon to drag the default token for this actor right onto the canvas, just like dragging from the Foundry sidebar.
