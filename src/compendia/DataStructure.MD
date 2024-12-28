# Overall structure

* A single root folder for the module overall
  * A folder for each world (just to give us some flexibility if we ever want to add more compendiums per world for some reason)
    * A compendium for each world
      * A JournalEntry for each topic
      * A JournalEntry for each campaign
        * The pages are sessions

# Data stored on the world root folder (flags)

We store a bunch of indexing data in flags the world folder to make it faster to look things up.  We store it here so that it gets deleted when the world gets deleted.

* `worldCompendium: string` - the uuid for the world compendium 
* `campaignNames: Record<string, string>` - the name of each campaign, keyed by the JournalEntry uuid for the campaign
* `topicIds: Record <Topics, string>` - the JournalEntry uuid for each topic
* `types: Record<Topics, string[]>` - list of valid types in use for each topic 
* `expandedIds: Record<string, boolean>`- tracks which entry uuids are currently expanded in the tree 
* `topNodes: Record <Topics, string[]>` - the top node uuids in the tree for each topic
* `hierarchies: Record<Topics, Record<string, Hierarchy>>` - a `Hierarchy` object for each entry uuid, in master object keyed by topic

# Topic entries

* `interface Entry extends JournalEntryPage`
  * system variable inclues:
    * topic
    * type
    * relationships

## Interacting with topic Entries

* Get a list of all the entries under a given topic
  * Get the JournalEntry from the compendium
  * It's just the `je.pages` collection (sort it)
* Do a search on all entries for a topic
  * Get the JournalEntry from the compendium 
  * Can use `je.pages.search()`
* Do a global search
  * Have to search each topic separately (see above)


# Data stored on the campaign journal entry

* `name: string` - the name of the campaign

## Sessions

* `interface Session extends JournalEntryPage`
  * system variable inclues:
    * number
    * name

### Interacting with Sessions

* Get a list of all the indvidual sessions
  * Get the JournalEntry from the compendium
  * It's just the `je.pages` collection (sort it)
* Do a search on all entries for a topic
  * Get the JournalEntry from the compendium 
  * Can use `je.pages.search()`

-------------------------

Session (subtype of JournalEntryPage)
  - Number
  - Name
  - Date
  - General text block for description of what happened
  - Link to Scenes (locations)
  - Link to NPCs (characters)
  - Link to PCs for review (actors for character sheets... maybe characters too?)
  - Summary of prior session - text block (ChatGPT auto gen as starting point)
  - Strong start - text block
  - Secrets & Clues - NEED TO MAKE THIS A NEW TOPIC AND LINK TO THEM... note need ability to make these journal entries that can be shared with players... (have a flag for whether it's been shared to be able to filter out when adding to a session)
  - Monsters - link to actors... when you hook up a location, automatically pull any of its actors into the list? 
  - Magic items - text to start; maybe integrate to a rolltable at some point?

Sessions should go on the directory bar, nested under campaigns (campaigns - indiv. campaign - session)... maybe a separatebar with a splitter? otherwise will require a lot of rework of the current directory

Drag and drop from bar to bar (topic to session) or from a relationship table to a session to add to the proper place on the session.  For characters... consider using the isPC flag to separate them out?

Drag and drop from main sidebar to link scenes/actors to a character/location

Maybe color code or two sets of tabs or something to separate the topic tabs on an entry from the scenes/actors/sessions tabs

Items - consider making a topic for these to track possible magic items, etc.?

Location - use these for "scenes" in lazy DM language
  - Short description of what it is
  - Link to Foundry scenes that might work (want >1 in case there's a light/dark version, etc.)
  - Link to Foundry actors for NPCs/monsters likely to be there

Characters = 
  - Define a boolean on character for "isPC" so we can filter them out when linking a NPC to a session



