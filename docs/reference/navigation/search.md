---
title: Search
prev: 
  text: 'Bookmarks'
  link: './bookmarks'
next: 
  text: 'Tags'
  link: './tags'
---
# Search
The top right corner of the window's title bar has the search box.

![search](/assets/images/search.webp)

Clicking a search result opens it in a new tab.

::: info TIP
Search terms are not case sensitive.
:::

## Searching Individual Entities

### Searching Entries
This box searches all [^Entries], looking across these fields:
* Name
* [Tags](/reference/navigation/tags)
* Description
* [^Topic]
* Type 
* Species for Characters 
* [Parents](/reference/navigation/sidebar#hierarchies) (and grandparents) and children for Locations/Organizations
* Names and roles/relationships of [related Entries](/reference/world-building/content/entry/relationships)

So, searching for "Sally sibling" would return an entry with a relationship of "sibling" to a Character named Sally.  That result would be lower on the list, though, than Sally herself.

### Searching PCs
The search box also searches across [^PCs].  It looks across:
* Name
* Background
* Plot Points

### Searching Fronts
The search box also searches across [^Fronts].  It looks across:
* Name
* [Tags](/reference/navigation/tags)
* Description
* Details of all of the dangers
  * Name
  * Description
  * Impending Doom
  * Motivation
  * Grim Portents
  * Participants (the name of the entity)

### Searching Arcs
The search box also searches across [^Arcs].  It looks across:
* Name
* [Tags](/reference/navigation/tags)
* Description
* Locations, participants, and monsters (the name of the entity)
* Lore (text of the lore)
* Vignettes (text of the vignette)

### Searching Sessions
Finally, the search box also searches across Sessions - but in a subtlely different way.  It looks across:
* Session Notes and the Session Start text
* Session items - **BUT ONLY IF THEY'RE MARKED AS [^DELIVERED]**
  * Lore, Vignettes (text of the lore/Vignette)
  * Locations, NPCs, Items, Monsters (the name of the entity)

Only delivered items are searched because this provides a really easy way to answer things like "what session was that when we fought the Goblin King?"  If you had attached the Goblin King to multiple sessions, but he ended up not appearing in all of them, this will find where he actually appeared.

::: warning
A side effect of this is that things in the [^Current Session] likely won't be found (since they aren't delivered yet).  But you should have a pretty good idea of what's being used in the Current Session, and you can easily pull it up in any case.
:::

## Searching Tags
If your search text matches one or more tags, the matching tags will appear at the top of the search results, along with the number of entities with that tag.  Clicking this "tag" result will open the corresponding [tag list](/reference/navigation/tags#tag-list)
