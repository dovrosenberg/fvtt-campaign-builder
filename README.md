# World & Campaign Builder

[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/dovrosenberg/fvtt-campaign-builder/raw/master/static/module.json)](https://github.com/dovrosenberg/fvtt-campaign-builder)

World & Campaign Builder is designed to streamline every part of your TTRPG prep and gameplay—from deep worldbuilding to session planning and live play tracking. Whether you're building a sprawling lore-rich universe or following the Lazy DM approach to lightweight prep, this tool lets you create interconnected characters, locations, organizations, and events with ease, all inside Foundry. It’s fast enough to use in real time during a session, and flexible enough to evolve as your world grows. Optional AI-assisted content and image generation offer powerful creative boosts, but the module is fully usable without them. 

See the [user documentation](https://dovrosenberg.github.io/fvtt-campaign-builder/) for full details.

## A note on AI and "Advanced Features"
You'll see lots of references to AI capabilities in the [documentation](https://dovrosenberg.github.io/fvtt-campaign-builder/) and feature lists.  There is no AI-generated content (or any other content) provided by the module (other than foreign language translations of UI elements). It merely has the capability to use AI to generate various things if you desire.  

So if you're in the anti-AI crowd, know that the module is *fully functional and useful without any use of AI*, and all of the AI features/functions are disabled by default.  

That said, full details on features, costs, and setup are in the [documentation](https://dovrosenberg.github.io/fvtt-campaign-builder/backend).  Any description of AI features in the documentation is clearly denoted as an "Advanced Feature".


## Play style notes
The campaign planning component is modeled after [The Lazy Dungeon Master](https://slyflourish.com/lazydm/), which I highly recommend.  There is a [freely available copy of the original book](https://slyflourish.com/the_lazy_dungeon_master_cc.html) and I also recommend the newer [Return of the Lazy Dungeon Master](https://www.amazon.com/Flourishs-Return-Lazy-Dungeon-Master/dp/B0B8F1G5G7) (though you have to buy that version).

It's totally possible to adapt your usage of the module to whatever your preferred prep style is, though.  If you have ideas for additional approaches or functionality that you'd like to see, please [let me know](https://github.com/dovrosenberg/fvtt-campaign-builder/issues/new?template=feature_request.md).


## Current features
[Feature requests?](https://github.com/dovrosenberg/fvtt-campaign-builder/issues/new?template=feature_request.md)

- Create characters, locations, organizations, and events with detailed descriptions and images
- Easily see (and click through) the relationships between them
- Create geographical hierarchies (world-continents-countries-regions-towns-etc.)
- Create organizational hierarchies (ex. for religions, governing bodies, large families, criminal organizations, companies, etc.)
- Define your world's species for assigning to characters (and using for AI prompts)
- Directory view of all of your world entries
- Powerful search based on names, descriptions, relationships, tags, etc.
- AI-driven generation of characters, locations, and organizations (descriptions and images) - it's hard to overstate how well the image generation in particular works... you need to try it to believe it
- Maintain connections to relevant Foundry documents (ex. Scenes and Actors) for quick reference
- Quick links to AI-refreshed RollTables for creating NPC, town, store, and tavern names
- Easily plan your play sessions (in Lazy DM style) and track what happens to blend it back into your world
- Lots more - see more details below and in the [user documentation](https://dovrosenberg.github.io/fvtt-campaign-builder/)

## How it works
The module is designed to support the full cycle preparation and playing your game.  While each part is optional, the general flow of using the module to prep and play games is:

1. **Build your world.** If your preferred approach is to build every little detail out ahead of time, you can do that.

2. **Prep for a session.** Go through the full Lazy DM method and prepare for your session.  Use AI to flesh out
your characters, locations, etc. (and even create images) or do it all yourself.

3. **Play your game.** Reference your prep, create new PCs, locations, etc. on the fly (including AI generation) and record important details of things that were improvised during the session.

4. **Record the results.** Capture the things that did (or didn't) happen - fleshing out the world for easy reference in the future and giving you a head-start on the next session prep.

See the [user documentation](https://dovrosenberg.github.io/fvtt-campaign-builder/guide) for more details.

## Issues?

If you believe you found a bug or would like to post a feature request, head over to the module's [Github repo](https://github.com/dovrosenberg/fvtt-campaign-builder) and [open a new issue](https://github.com/dovrosenberg/fvtt-campaign-builder/issues/new/choose).

## Languages

English, French, and German currently supported.  Let me know if you want others.  PRs also welcome for either new languages or fixes to bad translations in the current ones.  

## Support
I'm happy to do this for free, as I primarily work on things I like to use myself.  But if you'd like to [buy me a root beer](https://ko-fi.com/phloro), I love knowing that people are using my projects and like them enough to make the effort. It's really appreciated!  

## Credits
See [credits page](https://github.com/dovrosenberg/fvtt-campaign-builder/blob/dev/CREDITS.md) for all the details, but the main one is that I seriously doubt this would have been possible without the [FVTT-Types project](https://github.com/League-of-Foundry-Developers/foundry-vtt-types) from League of Foundry Developers.  Those folks have been working through a ton of typescript insanity so the rest of us don't have to.

## Copyright and usage
THIS ENTIRE REPOSITORY IS COVERED BY THIS LICENSE AND COPYRIGHT NOTICE

Copyright 2025 Dov Rosenberg

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the License for the specific language governing permissions and limitations under the License.
