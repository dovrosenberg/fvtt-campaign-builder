---
title: Module Settings/Configuration
prev: 
  text: 'Advanced Features & Backend'
  link: '/reference/backend'
next: 
  text: ''
  link: ''
---
# Module Settings/Configuration

## Basic settings

- **Hide missing backend warning**: If you're planning not to use the [Advanced Features], turn this on to avoid being warned about it every time to open the main window.  
- **Use fronts**: Turn on/off whether to use [Fronts]. Disabling them removes the "Fronts" folder from campaigns, but won't impact any Fronts you've already created.
- **Use story webs**: Turn on/off whether to use [Story Webs]. Disabling them removes the "Story Webs" folder from campaigns, but won't impact any Story Webs you've already created.
- **Show types in Setting tree**: If set, when the Setting directory isn't grouped by type, it will instead show the type of each Entry in the tree.
- **Sidebar starts collapsed**: If set, the directory sidebar will be collapsed when you open the main window.  
- **Display pop-up session notes**: If set, when you enter "Play Mode", a separate session notes window will automatically popup to make it easier to take notes mid-session.
- **Default 'Add to current session'**: When you're in [^Play Mode] and are creating an [^Entry], there is a checkbox to automatically add it to the current [^Session] (vs. just adding to the [^Setting]).  This checkbox determines whether that checkbox defaults to on or off.
- **Enable To-do List**: If disabled, the To-do List won't automatically be populated based on activities during Play Mode.
- **Auto-suggest relationships**: If set, whenever you edit the description for an Entry, Campaign Builder will scan it for references to other Entries and recommend changes to the [relationships](/reference/world-building/content/entry/relationships).
- **Sub-tabs save position**: If set, every tab will remember which interior sub-tab was open and return to it when you re-open that tab. When disabled, tabs will always revert to the first sub-tab (usually description) when re-opened.
- **Auto-arrange Story Webs**: If set, as you move items around in a story web diagram, the picture will adjust to try to keep everything clean and visible.  If disabled, you will have to manually position everything, but you can put each item exactly where you want it.
- **Session display format**: By default, the list of [^Sessions] in the [Campaign Directory] shows just the number of the session.  This setting lets you display either the session date or the session name instead.

## Sub-Menus
### Advanced Settings {#advanced-settings}
This is where you configure your backend if you are using Advanced Features.

**Backend Tab** - This is required to use any backend feature.  
![Backend Tab](/assets/images/advanced-settings-backend.webp)
  - **Backend URL**: The URL of the backend server from the [deploy script](/reference/backend/setup#deploy)
  - **API Token**: The security token that the backend deploy script gives you (also from the deploy script)


**AI Models Tab** - For selecting the AI models you want to use
![AI Models Tab](/assets/images/advanced-settings-aimodels.webp)


**Email** - Settings for the [Email to Ideas List](/reference/backend/email).  Note that this feature does not use AI and can be used independently of the others (i.e. without providing AI API Keys).
![Email Tab](/assets/images/advanced-settings-email.webp)
  - **Use Gmail for Ideas**: Turn this on to use the ["Email to Ideas List"](/reference/backend/email) feature)
  - **Default Setting for email**: When using the Email to Ideas List, this setting determines which [^Setting] ideas go to (only needed if there's more than one).
  - **Default Campaign for email**: When using the Email to Ideas List, this setting determines which [^Campaign] within the above Setting ideas go to (only needed if there's more than one).

### Species Settings [[Advanced Feature]] {#species}
![Species Settings](/assets/images/species-settings.webp)
This lets you manage the list of species in your worlds.  The default species are from the D&D 5E SRD.  This list is important if you want to track what species your Characters are, but mostly it's to facilitate more accurate descriptions/images when doing AI generation [[Advanced Feature]].

### Roll Table Settings [[Advanced Feature]]
![Rolltable Settings](/assets/images/rolltable-settings.webp)
This relates to the [RollTables](/reference/play-mode/name-generation#rolltables) used to rapidly generate NPC names, etc. during play.  They are currently only made for AI generation.
- **Automatically refresh RollTables**: When clicked, the RollTables will replace any used options whenever you restart the module.  This essentially gives you an unlimited supply of unique results and ensures you already have full tables every time you play.
- **Default types**: When you choose to turn a created name into a fully-fleshed out Entry in your Session, these options determine the [^Types] that will be put into the "Type" field by default.  Really just a way to speed up creation.

Clicking the "Refresh all tables" button will regenerate all the RollTables for all Settings.  This is particularly useful if you've changed the [name styles](/reference/world-building/content/setting/namestyles) for a Setting and want to regenerate the names to only include the styles you want.

### Configure Content Images
![Content Image Settings](/assets/images/content-image-settings.webp)
This allows you to hide the images on content pages for settings, entries, campaigns, etc.  This lets you have a bit more screen real estate for content types for which you don't use images.

