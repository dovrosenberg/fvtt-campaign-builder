---
title: Directory Sidebar
prev: 
  text: 'Images'
  link: './images'
next: 
  text: 'Tabs'
  link: './tabs'
---
# The Directory Sidebar

The directory sidebar is a panel on the right side of the Campaign Builder window that displays tree views of all your worlds, campaigns, and everything in them.

The sidebar can be dragged using the tab on the splitter bar to make it wider or narrower.  You can also click the tab to make it close/open completely.  And you can drag the horizontal splitter bar to provide more room for the [Setting Directory] or [Campaign Directory].

By default, the sidebar is open whenever you open the Campaign Builder window.  There is a [Module Setting] to change this behavior to instead start collapsed.

Anything represented as a folder can be opened/closed by clicking the folder icon.  This is true for the Setting and Campaign directories.

![Directory sidebar](/assets/images/directory-sidebar.webp)

## The Setting Directory {#setting-directory}
The top half of the directory sidebar is the Setting directory.  Also known as the Entry directory, this is where you can find all of entries (Character, Locations, and Organizations) of your worlds.

Each Setting has a header, and you click the Setting name to make it the active Setting.  In the image above, *Mallindor* has been selected as the active Setting.  Clicking the header while it's already open will open a [Setting Details tab](/reference/world-building/content/setting) tab.  The active Setting is also shown in the the main window title bar.

By default, the Setting is organized by Topic.  Each Topic is a folder, clicking the folder will expand/collapse its contents.  Clicking an [^Entry] will select it as the active [Entry](/reference/world-building/content/entry) in the main panel to the left.  The currently visible entry is bolded in the sidebar.  Within each Topic, the Entries are sorted alphabetically.

You create new worlds by clicking the "New Setting" button at the top of the sidebar: 

![New Setting button](/assets/images/new-setting-button.webp)

The button next to the "New Setting" button collapses the entire sidebar.

![Collapse Sidebar button](/assets/images/collapse-sidebar-button.webp)

### Hierarchies {#hierarchies}
You can create Hierarchies within Locations and Organizations to represent how they are related.  For example, you might put the Entries for towns inside the region they are in.  Hierarchies can have as many levels as you want. In addition to making it faster to find related things, Hierarchies are used in [Search] and to improve AI generation [[Advanced Feature]].  You can see hierarchies illustrated in the sidebar above.

You can create and adjust Hierarchies in two ways: 
1. Dragging entries within the sidebar.  By dragging an Entry onto another, the dragged Entry will become a child of the target.
2. Using the Parent field in the Entry editor.  Simply choose the parent you want (or set it to blank to make the Entry a top-level one).

### Context menus
Right clicking on items in the Entry tree provides additional options depending on the item type:
1. Settings - Delete the [^Setting], Create a new [^Campaign]
2. Topics - [Create a new Entry](/reference/world-building/create-entry) in that Topic
3. Entries - Delete the Entry

### Group by type
Using the "Group tree by type" checkbox at the top of the sidebar, you can choose to organize the entries by Type instead of Topic.  This will eliminate the Hierarchy representation and instead show all of the Entries grouped by their Types.  Entries without a Type will not be shown.

![Group by type tree](/assets/images/group-by-type.webp)

### Filtering
Typing text in the "Filter" box at the top of the sidebar filters the Entry tree to only show:
- All entries whose names contain the filter string
- All types that contain the filter string (when in "Group tree by type" mode)
- Any ancestors of those Entries (to show where they are in the Hierarchy)

## The Campaign Directory {#campaign-directory}
The bottom half of the Directory Sidebar is the Campaign Directory.  This shows all the Campaigns for the currently active Setting.  If you want to see Campaigns for a different Setting, you need to change the Setting first.

Each Campaign is shown as a folder.  Click the Campaign name to open a [Campaign Details tab](/reference/playing/content/campaign).

Within each Campaign, you'll find all of its [^Sessions].  You can click on a Session to open a [Session Details tab](/reference/playing/content/session).  

### Session sorting
By default, the Sessions are sorted by session number.  You can rearrange the Sessions (i.e. change their numbers) by editing the number in [Session Details](/reference/playing/content/session).

### Context menus
Right clicking on items in the Campaign tree provides additional options depending on the item type:
1. Campaign - Create a session, Delete the Campaign
2. Session - Delete the Session
