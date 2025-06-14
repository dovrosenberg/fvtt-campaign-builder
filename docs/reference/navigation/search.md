---
title: Search
prev: 
  text: 'Bookmarks'
  link: './bookmarks'
next: 
  text: 'Prep/Play Toggle'
  link: './prep-play'
---
# Search
The top right corner of the window's title bar has the search box.

![search](/assets/images/search.webp)

Clicking a search result opens it in a new tab.

> [!NOTE]
> Search terms are not case sensitive.  

### Searching Entries
This box searches all [^Entries], looking across these fields:
* Name
* [Tags](/reference/world-building/content/entry/tags)
* Description
* [^Topic]
* Type 
* Species for Characters 
* [Parents](/reference/navigation/sidebar#hierarchies) (and grandparents) and children for Locations/Organizations
* Names and roles of [relationships](/reference/content/entry/relationships)

So, searching for "Sally sibling" would return an entry with a relationship of "sibling" to a Character named Sally.  That result would be lower on the list, though, than Sally herself.

### Searching PCs
The search box also searches across [^PCs].  It looks across:
* Name
* Background
* Plot Points

### Searching Sessions
Finally, the search box also searches across Sessions - but in a subtlely different way.  It looks across:
* Session Notes and the Session Start text
* Session items - **BUT ONLY IF THEY'RE MARKED AS [DELIVERED](TODO: link)**
  * Lore, Vignettes (text of the lore/Vignette)
  * Locations, NPCs, Items, Monsters (the name of the entity)

Only delivered items are searched because this provides a really easy way to answer things like "what session was that when we fought the Goblin King?"  If you had attached the Goblin King to multiple sessions, but he ended up not appearing in all of them, this will find where he actually appeared.

> [!NOTE]
> A side effect of this is that things in the [^Current Session] likely won't be found (since they aren't delivered yet).  But you should have a pretty good idea of what's in the current session, and you can easily pull it up in any case.
