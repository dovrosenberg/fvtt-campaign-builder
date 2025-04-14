---
layout: default
title: AI Features
---

# AI Features

World & Campaign Builder includes optional AI-assisted features to help with content creation. These features require additional setup but can significantly speed up your worldbuilding and prep work.

## Important Notes

- All AI features are **completely optional**
- The module is fully functional without any AI features enabled
- Using AI features requires setting up a backend server and accounts with third-party services

## Setting Up AI Features

### Backend Server Setup

1. Visit the [backend repository](https://github.com/dovrosenberg/fvtt-fcb-backend) for detailed setup instructions
2. The setup requires:
   - Basic comfort with command-line scripts
   - Google Cloud account (can stay within free tier)
   - OpenAI account (minimal costs)
   - Replicate.com account (for image generation, about $0.01 per image)

### Configuring the Module

1. In Foundry VTT, go to "Game Settings" > "Module Settings" > "World & Campaign Builder"
2. Enter your backend server URL and API key
3. Test the connection to ensure it's working properly

## Using AI Features

### AI-Generated Descriptions

When creating or editing a world element (character, location, etc.):

1. Fill in basic information like name and any other details you want to include
2. Click the "Generate Description" button
3. Review the generated description
4. Edit as needed or regenerate with different parameters
5. Click "Save" when satisfied

### AI-Generated Images

When creating or editing a world element:

1. Fill in the description (more detailed descriptions lead to better images)
2. Click the "Generate Image" button
3. Wait for the image to be generated (this may take 10-30 seconds)
4. If you're not satisfied with the result, click "Regenerate" for a new version
5. Click "Save" when satisfied

### Name Generation

The module includes AI-refreshed RollTables for generating names:

1. Click the "Generate Name" button when creating a new element
2. Select the type of name to generate (NPC, town, store, tavern)
3. Click on a generated name to use it
4. The name will be automatically filled in

## Privacy and Data Usage

- All AI generation happens on the backend server, not directly in Foundry
- Your world data is only sent to the AI services when you explicitly request generation
- No data is stored by the AI services after generation is complete
- Your OpenAI and Replicate API keys are stored only on your backend server, not in Foundry