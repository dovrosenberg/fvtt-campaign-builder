---
title: The Backend and Advanced Features
prev: 
  text: 'Campaigns (Playing)'
  link: '/reference/campaign-mgt'
next: 
  text: 'Backend Installation and Setup'
  link: '/reference/backend/setup'
---
# The Backend and Advanced Features

You'll see features throughout this documentation labeled "Advanced Feature".  These features require some [setup and configuration](./setup) to make them available.

## Why do I have to do all this work to set it up?
This approach of setting up your own backend has the advantages of:
  - The backend is completely under your control - no one else has access to it or can use it.
  - You don't need to store sensitive credentials (i.e. OpenAI tokens) in Foundry (which would then be visible by whoever is hosting the session), and 
  - Activities that take some time (particularly image generation) can be done much more effectively
  - Future-proof for more complex features in the future

## Features {#features}
### AI Integration

The module includes optional AI-powered features for generating descriptions and images. These features require [setting up](#setup) a backend server, which is much easier than it sounds.

With AI integration, you can:

- Generate detailed descriptions for Characters, Locations, and organizations
  - From [within an Entry](/reference/world-building/content/entry/generate#description)
  - When [creating a new Entry](/reference/misc/create)
- [Create images](/reference/world-building/image-generation) based on your descriptions
- [Generate names](/reference/play-mode/name-generation) for NPCs, towns, shops, and taverns 

### Email Ideas to Campaigns
Additionally, the backend allows you to create a [email account](./email) that can be used to receive emails with campaign ideas and have them automatically brought into your campaign.  It's perfect for when that inspiration hits you and you can't access Foundry.

## Costs {#costs}
The backend runs in the cloud.  In all cases, it uses accounts that you set up and control,and you do not need to share your passwords/tokens with anyone, or even put them in Foundry.  The various accounts were selected with the goal of being as low cost as possible:

### Google Cloud Platform
You should be able to stay within the free tier of GCP for processing.  Storage is 5GB free then ~$0.02 per GB after that.  Egress is 1GB free then $0.12/GB after that.

That's likely enough for most use cases, and pretty cheap for storage.  But if you're creating lots of images and/or running frequent games with lots of players all downloading images, you may hit the limits.  It can alternately be configured to use AWS S3 for storage.  So if you are already using AWS for Foundry, you can attach to the same bucket and avoid Google storage altogether.  This also lets Foundry work directly with the output file images, so it's much more convenient (at least given the current Campaign Builder functionality).

For heavy users, BackBlaze storage would be significantly cheaper (not free but only $0.005/GB for storage and $0.01/GB for egress), so we could add that as an option in the future.  Let me know if you're running into limits.  I haven't spent time looking into it because it would require yet another account users would have to create and manage.

### OpenAI
[Open AI](https://openai.com/api) is used to generate text (descriptions, names, rolltable results, etc.).  The cost is minimal - approximately $0.15 for 5000 AI-generated character descriptions - but at the current time, OpenAI has a minimum purchase of $5.00 and the credits expire after a year, so you should think of it as $5/year.  I'll be [looking at](https://github.com/dovrosenberg/fvtt-campaign-builder/issues/369) switching to another provider to avoid this minimum charge.

### Replicate
[Replicate](https://replicate.com/) is used to generate images.  The cost is approximately $0.01 per image, and you are only billed for actual usage.
