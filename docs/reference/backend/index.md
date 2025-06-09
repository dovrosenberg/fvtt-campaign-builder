---
title: The Backend and Advanced Features
TODO: true
---
# Advanced Features (aka the Backend, aka the "AI Stuff")

You'll see features throughout this documentation labeled "[Advanced]".  These features require the setup and configuration described here to make them available.

## AI Integration

The module includes optional AI-powered features for generating descriptions and images. These features require setting up a backend server, which is much easier than it sounds (see below).

[TODO - link these to the relevant sections of the docs]
With AI integration, you can:
- Generate detailed descriptions for Characters, locations, and organizations
- Create images based on your descriptions
- Generate names for NPCs, towns, shops, and taverns -- infinitely renewed RollTables

To use AI generation:
1. Set up the backend server (see below)
2. In the module settings, enter your API URL and token
3. When creating or editing a Setting element, click the "Generate" button

## Backend Setup

Setting up the backend server requires:
1. Basic comfort with command-line scripts
2. Accounts with Google Cloud, OpenAI, and Replicate.com (for images)
3. Full instructions are at: https://github.com/dovrosenberg/fvtt-fcb-backend

The backend is designed to stay within the Google Cloud free tier, and OpenAI costs are minimal (approximately $0.15 for 5000 AI-generated character descriptions).  Image generation is approximately $0.01 per image.

## A note on image generation

In order to save costs, the backend uses Replicate.com for image generation, using a model that spins down between uses.  This means that the first time you generate an image in a given period, it may take significantly longer than subsequent runs because the model has to start.  After that, you'll see more rapid creation (still ~30 seconds) until the model times out again (~15 minutes of not being used).

TODO: talk about autocomplete {#autocomplete}