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
- **Sidebar starts collapsed**: If set, the directory sidebar will be collapsed when you open the main window.  
- **Display pop-up session notes**: If set, when you enter "Play Mode", a separate session notes window will automatically popup to make it easier to take notes mid-session.
- **Default 'Add to current session'**: When you're in [^Play Mode] and are creating an [^Entry], there is a checkbox to automatically add it to the current [^Session] (vs. just adding to the [^Setting]).  This checkbox determines whether that checkbox defaults to on or off.
- **Enable To-do List**: If disabled, the To-do List won't automatically be populated based on activities during Play Mode.
- **Auto-suggest relationships**: If set, whenever you edit the description for an Entry, Campaign Builder will scan it for references to other Entries and recommend changes to the [relationships](/reference/world-building/content/entry/relationships).
- **Session display format**: By default, the list of [^Sessions] in the [Campaign Directory] shows just the number of the session.  This setting lets you display either the session date or the session name instead.

## Sub-Menus
### Advanced Settings {#advanced-settings}
This is where you configure your backend if you are using Advanced Features.
- **Backend URL**: The URL of the backend server from the [deploy script](/reference/backend/deploy)
- **API Token**: The security token that the backend deploy script gives you (also from the deploy script)
- **Default to long descriptions**: If checked, when AI descriptions are generated they will be long paragraphs (number determined by setting below).  If unchecked, they will instead be very brief bullet points more useful for quick roleplaying reference.
- **Long description paragraphs**: When using long descriptions (see above), this setting determines the number of paragraphs to generate.
- **Use Gmail for Ideas**: Turn this on to use the ["Email to Ideas List"](/reference/backend/email) feature)
- **Default Setting for email**: When using the Email to Ideas List, this setting determines which [^Setting] ideas go to (only needed if there's more than one).
- **Default Campaign for email**: When using the Email to Ideas List, this setting determines which [^Campaign] within the above Setting ideas go to (only needed if there's more than one).

### Species List {#species}
This lets you manage the list of species in your worlds.  The default species are from the D&D 5E SRD.  This list is important if you want to track what species your Characters are, but mostly it's to facilitate more accurate descriptions/images when doing AI generation [[Advanced Feature]].

### Roll Table Settings [[Advanced Feature]]
This relates to the [RollTables](/reference/play-mode/name-generation#rolltables) used to rapidly generate NPC names, etc. during play.  They are currently only made for AI generation.
- **Automatically refresh RollTables**: When clicked, the RollTables will replace any used options whenever you restart the module.  This essentially gives you an unlimited supply of unique results and ensures you already have full tables every time you play.
- **Default types**: When you choose to turn a created name into a fully-fleshed out Entry in your Session, these options determine the [^Types] that will be put into the "Type" field by default.  Really just a way to speed up creation.

Clicking the "Refresh all tables" button will regenerate all the RollTables for all Settings.  This is particularly useful if you've changed the [name styles](/reference/world-building/content/setting/namestyles) for a Setting and want to regenerate the names to only include the styles you want.

