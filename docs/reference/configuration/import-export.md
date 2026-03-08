---
title: Import/Export Module Data
prev: 
  text: 'Tab Visibility'
  link: './tab-visibility'
---
# Import/Export Module Data

The Import/Export feature allows you to backup all your FCB content and settings, or transfer them to another Foundry world. 

::: warning Caution
Any links to non-Campaign Builder Foundry content will be broken if you import into a new world.  This means all of your links to scenes, actors, items, journal entries, will not transition.
:::

::: warning Experimental
This feature is still experimental.  There are no known issues, but please backup your world before trying it.
:::



## Accessing Import/Export

You access this by clicking the **Import/Export** button in the [Module Settings] menu. 

## Exporting Data

### How to Export

1. Open the Import/Export dialog 
2. In the **Export** section, click the **Export** button
3. A progress bar will show the export status
4. Once complete, your browser will download a JSON file containing all your data

::: info
You can also export a single Setting from the right-click menu on the Setting in the Directory.
:::


### What Gets Exported

You can choose in the dropdown export:
- **Configuration**: All configuration options including custom fields, story web settings, roll table settings, species lists, etc.  This is good if you want to reproduce your environment and preferences in a new Foundry world.
- **Settings**: Each [^Setting] with all its content.  This is a great way to create a backup of your Campaign Builder content without backing up the full Foundry world.
- **Everything**: All of the above.

Any links to non-Campaign Builder Foundry documents (actors, scenes, items, etc.) will be preserved, but the actual documents will not be exported.  Direct links (ex. magical items, character actors) will be dropped to keep it tidy.  Links that are in text content will be left but become broken links.

## Importing Data

### How to Import

1. Open the Import/Export dialog from 
2. In the **Import** section, click **Select File** to choose a previously exported JSON file
3. The selected file name will appear next to the button
4. Click the **Import** button to begin the import process
5. Once complete, Foundry will automatically reload

::: danger Danger!
Importing a setting with a UUID that matches an existing one will **delete completely overwrite that setting** with the imported data. Other Settings that don't match will be preserved. This action cannot be undone.

Make sure to export your current data first or backup your world if you want to preserve it.
:::

::: info Create your own
It is possible to create your own import file to create a setting from scratch.  Some users have experimented with using an LLM to generate import files.  [This file](/reference/configuration/llm-import-format) contains detailed formatting instructions for the import file that can be useful to provde an LLM if you are asking it to do this.

No guarantees or warranties for attempting to import something you create. (Disclaimer: there aren't any for anything else in the module - but especially not for this). 
:::
