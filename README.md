# Package name

[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/dovrosenberg/fvtt-world-builder/raw/master/static/module.json)](https://github.com/dovrosenberg/fvtt-world-builder)

%%% Description here %%%

The goal of this package is to facilitate world-building and lore creation for people who'd rather just do that in Foudry, rather than using a third-party tool like WorldAnvil, Kanka, Fantasia Archive, LengendKeeper, etc.  Why would you want to do it this way, even though many of those platforms have integration solutions with Foundry?  
- It's free
- It may be easier than managing the integration
- Most importantly, you can **continue to build out lore as you play**.  

While I'm seeking to make this module strong enough that it's a reasonable substitute for the primary commercial solutions, it will likely always be missing features that those provide.  Instead, the advantage of FVTT World Builder is that it is easy/fast enough to use that you can refer to it in real-time while running an adventure, and also quickly add notes.

Players run into an NPC or location you hadn't thought of fleshing out ahead of time?  Quickly generate NPCs/locations on the fly 
- Easier than managing the integration

[Feature requests?](https://github.com/dovrosenberg/fvtt-world-builder/issues/new/choose)

## Features

## MVP features
- Create a (user-specified-name) compendium for storing everything in
- Journal entry for overall world with key details
- Create geographical hierarchies (world-continents-countries-regions-towns-etc.)
- Create organizational hierarchies (ex. for religions, governing bodies, large familes, criminal organizations, companies, etc.)
- Locations and organizations are stored as custom journal entries
  - Customizeable templates
  - Key info
  - Tree view
  - Cross-references?  This may be difficult to implement
- Create characters as journal entry - not necessarily connected to an actor
- Hierarchy "levels" are customizable
- Tags
- Attach associated scenes

## Planned features
- keyboard shortcuts
  - Quick search - popup just a search box to use fulltext search to try to find something
  - Quick create - quickly generate NPC/location and interconnect into the world
- Game notes - take notes during the game 
  - Allow players to take notes that you can see; auto merge their notes into entities or put into a review queue
- Create actor with one click from a journal entry character
- Use GPT to generate the random characters/locations
- System plugins to specify the bounds of species, classes, etc. to use... will this actually work? Can GPT do it on it's own if you specify the system?
- Integration with https://foundryvtt.com/packages/shuggaloafs-simple-npc-generator for NPC generation (with optional actor creation... could we include token?)
- Random shop generation?
- Random town generation?
- Random dungeon generation?
- After generating an NPC, shop, etc. quickly associate it withother things to make it easier to find again
- Track newly created items during session so make a "to do" log for cleaning them up and merging into the rest of the world
- Functionality to facilitate that merging
- Featured images
- Create events/timelines (TBD if there's value here beyond what Simple Calendar already supports... suspect it's 
-    a timeline view?)
- Integration with Simple Calendar for dates/timeline
- Integration with Simple Weather to connect locations to climates
- Automatically include autocomplete-mentions?
- ChatGPT and Stable Diffusion integration to quickly fleshout description text and create images 
- Algolia integration (free tier) for complex full-text search
- Autolinking pages?


## How it works
- Instructions, screenshots, etc.

## Issues?

If you believe you found a bug or would like to post a feature request, head over to the module's [Github repo](https://github.com/dovrosenberg/fvtt-world-builder) and [open a new issue](https://github.com/dovrosenberg/fvtt-world-builder/issues/new/choose).

## Support

I'm happy to do this for free, as I primarily work on things I like to use myself.  But if you'd like to [buy me a root beer](https://ko-fi.com/phloro), I love knowing that people are using my projects and like them enough to make the effort. It's really appreciated!  

## Credits

World Builder is the result of the effort of many people (whether they know it or not). Please refer to [CREDITS.md](https://github.com/dovrosenberg/fvtt-world-builder/blob/master/CREDITS.md) for the full list.


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
