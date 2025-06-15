---
title: Image Generation 
prev:
  text: 'World-Building Overview'
  link: './world-building'
next:
  text: ''
  link: ''
---

# Image Generation [[Advanced Feature]]

Images can be generated in a number of places:
* The [Generate button](/reference/world-building/content/entry/generate) on [Entries](/reference/world-building/content/entry)
* Checking the "Generate image" checkbox in the [Create](/reference/world-building/create-entry) or [Update](/reference/world-building/update-entry) dialogs
* Right-clicking the main [Image](/reference/world-building/content/entry/image-picker) on the description tab for any content

Selecting to generate an image will start image generation in the background.  When image generation is complete, you'll get a notification and the image will automatically be attached to the entry.

Feel free to do anything in the meantime while you're waiting - it will all happen in the background.  Closing Foundry (or the browser window) before it's done will break it, however.

> [!INFO]
> Image generation works best with detailed descriptions of the Entry you're trying to create an image for.  The AI will also take into account the Setting [genre and world feeling](/reference/world-building/content/setting), the hierarchy (i.e. it understands if a city falls inside the broader context of a country it knows about), and your definitions of your species (for characters).  The more details it has, the better it works.

## Image generation time and cost {#image-time}

In order to save costs, the backend uses Replicate.com for image generation, using a model that spins down between uses.  This means that the first time you generate an image in a given period, it may take significantly longer than subsequent runs because the model has to start.  After that, you'll see more rapid creation (still ~30 seconds) until the model times out again (~15 minutes of not being used).

The current model costs $.01/image generated.