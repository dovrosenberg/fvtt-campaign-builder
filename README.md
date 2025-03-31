# World & Campaign Builder

[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/dovrosenberg/fvtt-campaign-builder/raw/master/static/module.json)](https://github.com/dovrosenberg/fvtt-campaign-builder)

The goal of this package is to facilitate creating, planning, and running campaigns in Foundry.  It combines the world-building and lore creation of tools like WorldAnvil, Kanka, Fantasia Archive, LengendKeeper, etc. with a framework for organizing your campaigns and sessions (built off of the Lazy DM approach, but able to use used with any style of prep) 

You may find this better than the commercial world builders for a few reasons, even though many of those platforms have integration solutions with Foundry: 
- It's free (without ads)
- It supports low-cost AI generation of descriptions and images (that works surprisingly well)
- It may be easier than managing the integration
- Most importantly, you can **continue to build out lore as you play**.  

You can use the module just to plan/run sessions or just to do world building.  But it will be most useful when used in combination, because it's designed to be easy to pull defined elements from the world into your planning, as well as to easily add to the world during and after sessions.

While I'm seeking to make this module strong enough that it's a reasonable substitute for the primary commercial solutions, it will likely always be missing features that those provide.  Instead, the advantage of FVTT World Builder is that it is easy/fast enough to use that you can refer to it in real-time while running an adventure, while still  also quickly adding notes to supplement your world encyclopedia later.  

I plan to use the module to support a live game where only combat is being done in Foundry.  I hope to make the tool useful enough that DM's could use it on a laptop even in a game that isn't using Foundry for play at all.

### Play style notes
The campaign planning component is modeled after [The Lazy Dungeon Master](https://slyflourish.com/lazydm/), which I highly recommend.  There is a [freely available copy of the original book](https://slyflourish.com/the_lazy_dungeon_master_cc.html) and I also recommend the newer [Return of the Lazy Dungeon Master](https://www.amazon.com/Flourishs-Return-Lazy-Dungeon-Master/dp/B0B8F1G5G7) (though you have to buy that version).


## Important note
This module is VERY early in development.  It's really an alpha.  The UX is not great.  That said, I'm actively working to improve it, and would LOVE if other people think such a thing would be useful to have you try it out and provide feedback on how to improve it - both functionality and usability.

[Feature requests?](https://github.com/dovrosenberg/fvtt-campaign-builder/issues/new/choose)

## Features

## MVP features
- Create characters, locations, organizations, and events with detailed descriptions and images
- Easily see (and click through) the relationships between them
- Create geographical hierarchies (world-continents-countries-regions-towns-etc.)
- Create organizational hierarchies (ex. for religions, governing bodies, large familes, criminal organizations, companies, etc.)
- Define your world's species for assigning to characters (and using for AI prompts)
- Directory view of all of your world entries
- AI-driven generation of characters, locations, and organizations (descriptions and images) - it's hard to overstate how well the image generation in particular works... you need to try it to believe it
- Maintain connections to relevant Foundry documents (ex. Scenes and Actors) for quick reference

## How it works
The general flow of using the module to prep and play games:

1. **(Optional) Build your world.** My preferred approach is to world build in real time while playing the game, but if you prefer to build every little detail out ahead of time, you can do that.

2. **Prep for a session.** Go through the full Lazy DM method and prepare for your session.  Use AI to flesh out
your characters, locations, etc. (and even create images) or do it all yourself.

3. **Play your game.** Reference your prep, create new PCs, locations, etc. on the fly (including AI generation) and record important details of things that were improv-ed during the session.

4. **Record the results.** Capture the things that did (or didn't) happen - fleshing out the world for easy reference in the future and giving you a headstart on the next session prep.

### Build the world
* Create characters, locations, organizations, and events
* Easily see (and click through) the relationships between them
* Locations and organizations exist in hierarchies
* Use AI to generate detailed descriptions and images
  - The image generation in particular works best with detailed descriptions of the entry you're trying to create an image for.  The AI will take into account the campaign genre and world feeling, the hierarchy (i.e. it understands if a city falls inside the broader context of a country it knows about), and your definitions of your species (for characters).  The more details it has, the better it works.
* (Future) make specicic entries (and parts of entries) availabile to players for a common lore understanding you don't have to maintain separately.

### Prep for a session - layout the key elements for the upcoming session
* PCs - maintain your list of PCs and associated info - back stories, goals, links to character sheets
* "Strong start" - outline the action
* Scenes - keep a list of potential scenes
* Define Lore (what Lazy DM calls "secrets and clues") - flesh out headlines and link to journal entries 
for more detail/images/handouts
* Locations - keep a list of locations built in the world that you might use during the session, giving you one-click access to the description, image, association to other world entries, along with links to Foundry Actors and Scenes
* NPCs - like locations, keep an easy list of the character world entries (including links to Actors) that might 
come up
* Monsters - create a list of the monsters likely to be around with easy links to the actors
* Magic items - a list of Foundry Items that might come up 

### Play the game
* Keep notes of what's happening while bringing in the elements you've defined
* Scenes, lore, locations, etc. - with a single click you can mark off that they came up in the session for
easy reference later
* Locations and NPCs
  - Quickly bring up the full world-building details of your fantastic locations - use the hierarchy (quick - what's the name of that store they came to in this town last time?) and related items (what was the Mayor's sister's name?) to have easy access to the mostly likely topics to come up in that location
  - 1-click access to activate relevant Foundry Scenes and Actors to drag in
* Monsters - drag into the scene from your pre-assembled list
* Magic items - open them, grant players, access, etc.from your pre-assembled list


### Record the results
* Go through scenes, lore and see which were used; delete or move unused scenes to the next session with a click
* Add any new locations, NPCs, etc. to the world - you can do this while playing but it may be easier to just take quick notes and do it afterwards 
* Add anything that's top of mind to the next session to get started for next time


## Advanced features
- There are some advanced features (and more planned) that require you to setup a backend server.  In particular the AI features.  This approach has the advantages of:
  - You don't need to store sensitive credentials (i.e. OpenAI tokens) in Foundry (which would then be visible by whoever is hosting the session), and 
  - Activities that take some time (particularly image generation) can be done much more effectively
  - Future-proof for more complex features in the future
- Setting up these features is not particularly complicated, but does require:
  - Some basic comfort with running command-line scripts
  - Account creation (currently Google Cloud and OpenAPI).  The backend is designed to stay within the Google Cloud free tier (assuming you're not running anything else) and the OpenAPI costs are minimal (ex. you can create ~5000 AI-generated character descriptions for $0.15), but both services will require you to provide a credit card.
  - Full details on the setup are here: https://github.com/dovrosenberg/fvtt-fcb-backend

## Note on characters, actors, and PCs
- Characters (in worlds) can be PCs if you'd like, but they're really intended primarily to represent all the NPCs.  
  - Characters can be tied to multiple Actors (ex. if you want to represent a young version and an old version or track the human form 
  of a werewolf separately from the wolf form, etc.) though typically it would be 1:1
- PCs (in campaigns) represent the PCs (and to a lesser extent, the players).  They are not tied to world Characters, because I didn't see much value in doing so.  The PCs are where you track storylines, related NPCs and organizations, etc.  This makes them easier to find and review when preparing and running the game.
  - PCs are explicitly tied to a single Actor

## Planned (or at least considered) features
- Tags for tracking/searching various entries
- keyboard shortcuts
  - Quick search - popup just a search box to use fulltext search to try to find something
  - Quick create - quickly generate NPC/location and interconnect into the world
- Game notes - take notes during the game 
  - Allow players to take notes that you can see; auto merge their notes into entities or put into a review queue
- Create actor with one click from a character entry
- System plugins to specify the bounds of species, classes, etc. to use... will this actually work? Can GPT do it on it's own if you specify the system?
- Integration with https://foundryvtt.com/packages/shuggaloafs-simple-npc-generator for NPC generation (with optional actor creation... could we include token?)
- Random shop generation?
- Random town generation?
- Random dungeon generation?
- Tie events to your calendar
- After generating an NPC, shop, etc. quickly associate it with other things to make it easier to find again
- Track newly created items during session so make a "to do" log for cleaning them up and merging into the rest of the world
- Functionality to facilitate that merging
- Create events/timelines (TBD if there's value here beyond what Simple Calendar already supports... suspect it's 
-    a timeline view?)
- Integration with Simple Calendar for dates/timeline
- Integration with Simple Weather to connect locations to climates
- Automatically include autocomplete-mentions?
- Algolia integration (free tier) for complex full-text search


## Issues?

If you believe you found a bug or would like to post a feature request, head over to the module's [Github repo](https://github.com/dovrosenberg/fvtt-campaign-builder) and [open a new issue](https://github.com/dovrosenberg/fvtt-campaign-builder/issues/new/choose).

## Support

I'm happy to do this for free, as I primarily work on things I like to use myself.  But if you'd like to [buy me a root beer](https://ko-fi.com/phloro), I love knowing that people are using my projects and like them enough to make the effort. It's really appreciated!  

## Credits

World Builder is the result of the effort of many people (whether they know it or not). Please refer to [CREDITS.md](https://github.com/dovrosenberg/fvtt-campaign-builder/blob/master/CREDITS.md) for the full list.


## Copyright and usage
THIS ENTIRE REPOSITORY IS COVERED BY THIS LICENSE AND COPYRIGHT NOTICE

Copyright 2023 Dov Rosenberg

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
