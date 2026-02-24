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

> [!NOTE]
> Deleting an actor in Foundry that is attached to a Character will automatically and safely remove it from the Character.

#### Adding actors
Click "Add actor" to select a Foundry actor and connect it to the Character.

You can also drag and drop Foundry actors from Foundry VTT onto the box at the top to make the connection.  

#### The actor list
For each actor, you can see it's name and whether it is in the current Foundry world or inside a compendium.  You can click the actor name to open its character sheet.  

![Hamburger icon](/assets/images/hamburger.webp)

You can also grab and drag the hamburger icon to drag the default token for this actor right onto the canvas, just like dragging from the Foundry sidebar.

### Voice Recording {#voice-recording}

> [!NOTE]
> Voice recording is an optional feature that must be enabled in [Module Settings](/reference/configuration/#voice-recording).

The voice recording feature allows you to record a short voice sample for each Character. This helps you remember what voice or accent you used for each NPC during your games.

#### Enabling Voice Recording

To enable voice recording:
1. Open Foundry's Game Settings
2. find "Campaign Builder" in the list
3. Enable the "Enable Voice Recording" setting

Once enabled, a microphone button will appear in the header of all Character entries, next to the AI generation button.

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
3. Confirm the deletion when prompted

> [!NOTE]
> Deleting a recording only removes the link from the Character. The audio file remains on the server. You can manage old recordings through your file system in the `voice-recordings` folder.

#### Recording Indicators

The microphone button changes appearance based on recording status:
- **White icon**: No recording exists for this Character
- **Green icon**: A recording exists for this Character

#### File Management

Voice recordings are stored as WebM audio files in the `voice-recordings` folder in your Foundry data directory. File names include the Character name and a timestamp (e.g., `gandalf_2024-01-15t10-30-00.webm`).

Since Foundry VTT does not provide a way to delete files through the interface, you can manage old recordings directly through your file system if needed.
