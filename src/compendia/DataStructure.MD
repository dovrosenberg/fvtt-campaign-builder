# Overall structure

* A single root folder for the module overall
  * A folder for each world (just to give us some flexibility if we ever want to add more compendiums per world for some reason)
    * A compendium for each world
      * A JournalEntry for each topic
      * A JournalEntry for sessions

# Data stored on the world root folder

We store a bunch of indexing data in flags the world folder to make it faster to look things up.  We store it here so that it gets deleted when the world gets deleted.

* `worldCompendium: string` - the uuid for the world compendium 
* `sessionEntry: string` - the JournalEntry uuid for the sessions entry
* `topicEntries: Record <Topic, string>` - the JournalEntry uuid for each topic
* `types: Record<Topic, string[]>` - list of valid types in use for each topic 
* `expandedIds: Record<string, boolean>`- tracks which entry uuids are currently expanded in the tree 
* `topNodes: Record <Topic, string[]>` - the top node uuids in the tree for each topic
* `hierarchies: Record<Topic, Record<string, Hierarchy>>` - a `Hierarchy` object for each entry uuid, in master object keyed by topic

# Topic entries

* `class Entry extends JournalEntryPage`
  * Description (or can we use a field on JournalEntryPage)

# Interacting with Entries

* Get a list of all the entries under a given topic
  * Get the JournalEntry from the compendium
  * It's just the `je.pages` collection (sort it)
* Do a search on all entries for a topic
  * Get the JournalEntry from the compendium 
  * Can use `je.pages.search()`
* Do a global search
  * Have to search each topic separately (see above)
