---
title: Main Display
prev: 
  text: 'Editors'
  link: './editors'
next: 
  text: 'Main Tabs'
  link: './tabs'
---
# Main Content Display

The bulk of the main window is the content display.  This is where you can see whatever Entry, etc. you have selected in the sidebar.

## Types of content
There are 4 types of content you can see, and each has its own set of functionality:
- [Settings](/reference/world-building/content/setting/)
- [Entries](/reference/world-building/content/entry/)
- [Campaigns](/reference/campaign-mgt/content/campaign/)
- [Sessions](/reference/campaign-mgt/content/session/)


## Editors
Throughout the application, there are fields that are displayed as a large Foundry editor box.  In addition to Foundry capabilities (ex. formatting), Campaign Builder editors have additional capabilities. See [Editors] for more information.

## Images {#images}

All the main content types support images, and you can see the associated image on their description tabs ("Notes" for Sessions).

![images](/assets/images/images.webp)

Each Entry/Setting/etc. can have a single image associated with it.  If there is no associated image, you'll see a large placeholder icon (like on the left side of the picture above).  Once an image is associated, you will see it (see right side above), along with a small magnifying glass option.

The image display is a 3:4 ratio portrait.  Choosing a different aspect ratio image will result it in being cropped to fit.

### Adding an image
You can add a new image by:
1. Clicking on the placeholder image.  This will open the Foundry image selector, where you can choose any image file.

2. Right-clicking on the existing image and choosing "Change Image" from the context menu.

3. Right-clicking on the image/placeholder and choosing "Generate Image" [[Advanced Feature]]

4. From the [Generate button](/reference/world-building/content/entry/generate) button on Entries

5.  Choosing to generate an image when closing the [Create](/reference/world-building/create-entry) or [Update](/reference/world-building/update-entry) dialogs.

### Image options
Once you have an image, selected, clicking it will open a larger view, so you can see more details.  In the top-right corner, there is an option to "Show to Players" (which will make the image available to players).

Right-clicking on the image will open a context menu with the following options:
- "View Image" - Open the zoomed-in view of the image (same as clicking the image).
- "Change Image" - Open the Foundry image selector to choose a new image.
- "Remove Image" - Remove the image from the Entry (restoring the placeholder).
- "Generate Image" (Entries only) - Generate a new image for the Entry, based on the current description. [[Advanced Feature]]
- "Post to Chat" - Post the image in the Foundry chat for everyone to see.
- "Create Scene" ([^Locations] only) - Create a new Foundry scene with the image as the background.  Helpful for Theater of the Mind scenes.
