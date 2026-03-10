---
title: Character Details
prev: 
  text: 'Entries'
  link: '/reference/world-building/content/entry'
next: 
  text: 'Locations'
  link: '/reference/world-building/content/location'
---
# Character Details
![Character Content](/assets/images/character-content.webp)

Characters bring your campaign world to life. The Character details  interface is where you craft your NPCs and manage the relationships between the Characters and the world.

## Overall structure
The overall structure of the Character Details interface is the common [Entry interface](../entry/).

## Character-specific differences
There are a few Character-specific details.

### Species
Each Character can have an optional species.  This can be helpful for you to see at a glance.  It is also used by:
* [Search] (ex. "elf mayor of Illseek")
* Generating Character descriptions in the [Create](/reference/world-building/create-entry) or [Update](/reference/world-building/update-entry) dialogs, particularly in cases where you provide little detail.

You can manage the list of species for your Settings in the [Module Settings](/reference/configuration/#species)

### Actors {#actors}
![Actors Tab](/assets/images/actors-tab.webp)

On the Actors tab, you can associate your Character with one or more actors from Foundry.  Having more than one may be helpful if you have different character sheets for this Character at different points in time, or perhaps a transformed/polymorphed version, etc. Since your key Characters will be tied to the [^Current Session], you can access any of them with just a couple clicks.

::: info
While you can attach as many Actors as you want for a Character, the top-most one in the list is special.  When you drag the Character into Foundry (ex. from [a Session NPC list](/reference/campaign-mgt-content/session/npcs#drag-to-scene)), it is the first Actor in this list that will be dropped.
:::

::: info
Deleting an actor in Foundry that is attached to a Character will automatically and safely remove it from the Character.
:::

#### Adding actors
Click "Add actor" to select a Foundry actor and connect it to the Character.

You can also drag and drop Foundry actors from Foundry VTT onto the box at the top to make the connection.  

#### The actor list
For each actor, you can see it's name and whether it is in the current Foundry world or inside a compendium.  You can click the actor name to open its character sheet.  

![Hamburger icon](/assets/images/hamburger.webp)

You can also grab and drag the hamburger icon to drag the default token for this actor right onto the canvas, just like dragging from the Foundry sidebar.

### Voice Recording {#voice-recording}

The voice recording feature allows you to record a short voice sample for each Character. This helps you remember what voice or accent you used for each NPC during your games.

::: info
Voice recording is an optional feature that can be disabled in [Module Settings](/reference/configuration/#voice-recording).
:::

#### Recording a Voice Sample

1. Click the microphone button on a Character entry
2. Select "Record Voice" from the menu
3. If a recording already exists, you'll be asked to confirm overwriting it
4. Your browser will request microphone access (if not already granted)
5. A dialog will appear showing the recording timer
6. Click "Stop" when you're finished recording
7. The recording will be automatically saved and linked to the Character

#### Playing a Recording

1. Click the microphone button on a Character entry
2. Select "Play Voice" from the menu (only available if a recording exists)
3. The audio will play through your default audio output

#### Deleting a Recording

1. Click the microphone button on a Character entry
2. Select "Delete Recording" from the menu (only available if a recording exists)

::: warning
Deleting a recording only removes the link from the Character. The audio file remains on the server, as Foundry does not permit file deletion. You will need to manually remove unneeded files if you want to clean up.
:::