---
title: Generate Button
prev: 
  text: 'Entry description tab'
  link: './description'
next: 
  text: 'Entry relationship tabs'
  link: './relationships'
---
# Generate Button

![Generate button](/assets/images/generate-button.webp)

Clicking the generate button gives you the option to generate either: 
- A [description](#description) for the entry (which includes a name and species, if you don't want to specify)
- An [image](#image) for the entry

## Generate Description {#description}
Selecting to generate a description will open the generate dialog.

![Generate dialog](/assets/images/generate-dialog.webp)

### Description fields
The box prompts you for:
* Name
* Type
* Species
* Description

These will all populate from any existing information on the Entry.  Name, species, and description can all be generated if you leave them blank (or make them blank if they were pulled from the Entry).  Type won't be generated.

The description can be a very brief description or just a list of characteristics.  Any information contained in the description will be included in the generated version (if it fits).

Once you fill the information in the fields, hit "Generate" and the AI will create a name, species, and description (depending on what you filled in).  You can hit "Generate" as many times as you want, if you don't like the results.  Note that if you want to regenerate the name or species, you'll have the clear those values before rerunning.

When you have what you want, hit "Use" and the resulting values will be updated on the Entry.

### Generate long descriptions
When checked, the description generated will be two full paragraphs with lots of details:

![Example long description](/assets/images/generate-long-description.webp)

When off, it will simply create a quick description useful for roleplaying the character, including a brief description of their personality and appearance, and some suggested role-playing approaches:

![Example short description](/assets/images/generate-short-description.webp)

The default value for this checkbox can be managed in the [Module Settings].

### Add to current session
This checkbox will only show if you are in [^Play Mode] and only for Characters or Locations.  Selecting it will add the Character/Location as an NPC/Location in the current session when you finalize and hit "Use".

### Generate image
When checked, after you finalize and hit "Use", the AI will generate an image for the entry - just as if you'd picked to [generate an image](#image) from the Generate Button.

## Generate Image {#image}
[TODO: put this in a common place because it needs to be referenced here and from the image picker info]
Selecting to generate an image will start image generation in the background.  When image generation is complete, you'll get a notification and the image will automatically be attached to the entry.

You don't need to stay on the entry (or even keep the tab open) while you're waiting - it will all happen in the background.

> [!INFO]
> Image generation works best with detailed descriptions of the Entry you're trying to create an image for.  The AI will also take into account the Setting [genre and world feeling](/reference/world-building/content/setting), the hierarchy (i.e. it understands if a city falls inside the broader context of a country it knows about), and your definitions of your species (for characters).  The more details it has, the better it works.

### Image generation time {#image-time}

In order to save costs, the backend uses Replicate.com for image generation, using a model that spins down between uses.  This means that the first time you generate an image in a given period, it may take significantly longer than subsequent runs because the model has to start.  After that, you'll see more rapid creation (still ~30 seconds) until the model times out again (~15 minutes of not being used).