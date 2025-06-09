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

Search terms are not case sensitive.  Clicking a search result opens it in a new tab.

This box searches all entries, looking across these fields:
* Name
* [Tags](/reference/world-building/content/entry/tags)
* Description
* [^Topic]
* Type 
* Species for Characters 
* [Parents](/reference/navigation/sidebar#hierarchies) (and grandparents) and children for Locations/Organizations
* Names and roles of [relationships](/reference/content/entry/relationships)

So, searching for "Sally sibling" would return an entry with a relationship of "sibling" to a Character named Sally.  That result would be lower on the list, though, than Sally herself.

The search box also searches across campaigns - but in a subtlely different way.  It looks across:
* Notes and the Session Start text
* Related items - **BUT ONLY IF THEY'RE MARKED AS DELIVERED**
  * Lore, Vignettes (text of the lore/Vignette)
  * Locations, NPCs, Items, Monsters (the name of the entity)

Only delivered items are searched because this provides a really easy way to answer things like "what session was that when we fought the Goblin King?"  If you had attached the Goblin King to multiple sessions, but he ended up not appearing in all of them, this will find where he actually appeared.

*Note: a side-effect of this is that things in the current session won't be found (since they aren't delivered yet).  But you should have a pretty good idea of what's in the current session, and you can easily pull it up in any case.*
