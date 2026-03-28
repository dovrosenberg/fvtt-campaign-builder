---
layout: home

hero:
  name: "Foundry World & Campaign Builder"
  tagline: "Create, plan, and run campaigns with integrated world-building and campaign management tools"
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/dovrosenberg/fvtt-campaign-builder

features:
  - title: World Building
    details: Create and manage your settings' lore, characters, locations, and organizations
  - title: Campaign Planning
    details: Plan and organize your next session using the Lazy DM method
  - title: Session Tools
    details: Tools to run your game session while seamlessly collecting notes
---

<script setup>
  import { computed, inject, ref } from 'vue'

  const version = inject('version')
  const baseUrl = import.meta.env.BASE_URL ?? '/'
  const labels = [
    'Build out your world',
    'Easily maintain connections between elements',
    'Prep sessions in "Lazy DM" style (or however you choose)',
    'Use Fronts to track \'off-camera\' action by the bad guys',
    'Story arcs let you track your plot and store ideas for the future', 
    'AI generation of text and images (optional)',
    'Relationship graphs let you see connections between elements',
    'Multiple panels let you work more efficiently',
    'Track timelines tied to Calendaria notes'
  ];
  const screenshots = Array.from({ length: labels.length }, (_, i) =>
    `${baseUrl}screenshots/screenshot${i + 1}.webp`
  )
  const currentIndex = ref(0);
  const currentScreenshot = computed(() => screenshots[currentIndex.value]);
  const slideLabel = computed(() => labels[currentIndex.value]);

  const showNext = () => {
    if (!screenshots.length) return
    currentIndex.value = (currentIndex.value + 1) % screenshots.length
  };

  const showPrevious = () => {
    if (!screenshots.length) return
    currentIndex.value =
      (currentIndex.value - 1 + screenshots.length) % screenshots.length
  };
</script>

<style>
.hero .name {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.hero .version {
  font-size: 1.2rem;
  color: var(--vp-c-text-2);
}

.screenshot-carousel {
  margin: 2rem auto;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.screenshot-carousel__image {
  border-radius: 0.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  max-width: 100%;
  height: 480px;
}

.screenshot-carousel__controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.screenshot-carousel__button-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.screenshot-carousel__button {
  background: var(--vp-c-brand-1);
  border: none;
  border-radius: 999px;
  color: var(--vp-c-bg);
  cursor: pointer;
  font-weight: 600;
  padding: 0.35rem 0.9rem;
  transition: transform 0.2s ease, background 0.2s ease;
}

.screenshot-carousel__button:hover,
.screenshot-carousel__button:focus-visible {
  background: var(--vp-c-brand-2);
  transform: translateY(-2px);
}

.screenshot-carousel__label {
  font-weight: 500;
  color: var(--vp-c-text-2);
}
</style>

# &nbsp;

# Documents for Foundry Campaign Builder v{{version}} 
&nbsp;

# Quick start

Do you learn by doing?  Just check out the [Getting Started](/getting-started/) guide. 

# Preview

<div class="screenshot-carousel" v-if="screenshots.length">
  <img
    class="screenshot-carousel__image"
    :src="currentScreenshot"
    :alt="slideLabel"
    loading="lazy"
  />
  <div class="screenshot-carousel__controls" role="group" aria-label="Screenshots">
    <span class="screenshot-carousel__label">{{ slideLabel }}</span>
    <div class="screenshot-carousel__button-row">
      <button
        type="button"
        class="screenshot-carousel__button"
        @click="showPrevious"
        aria-label="Show previous screenshot"
      >
        Previous
      </button>
      <button
        type="button"
        class="screenshot-carousel__button"
        @click="showNext"
        aria-label="Show next screenshot"
      >
        Next
      </button>
    </div>
  </div>
</div>

# Introduction

The goal of this package is to facilitate creating, planning, and running campaigns in Foundry. It combines the world-building and lore creation of tools like WorldAnvil, Kanka, Fantasia Archive, LegendKeeper, etc. with a framework for organizing your campaigns and sessions (built off of the [Lazy DM] approach, but able to be used with any style of prep).

You may find this better than the commercial world builders for a few reasons, even though many of those platforms have integration solutions with Foundry: 
- It's free (without ads)
- It supports low-cost AI generation of descriptions and images (that works surprisingly well)
- It may be easier than managing the integration
- Most importantly, you can **continue to build out lore as you play**.  

You can use the module just to plan/run sessions or just to do world building.  But it will be most useful when used for both in combination, because it's designed to be easy to pull defined elements from the world into your planning, as well as to easily add to the world during and after sessions.

While I'm seeking to make this module strong enough that it's a reasonable substitute for the primary commercial solutions, it will likely always be missing features that those provide.  Instead, the advantage of FVTT Campaign Builder is that it is easy/fast enough to use that you can refer to it in real-time while running an adventure, while also quickly adding notes to supplement your world encyclopedia later.  

It can be used within Foundry during your prep and mid-session (it has capabilities for both).  It could also be used to run a live TTRPG session as a DM tool, if you just wanted to run Foundry and pull it up on your laptop (for example).

The module has four primary components:
- [**World Building**](/guide/world-building/): Create and manage your settings' lore, characters, locations, and more
- [**Campaign/Session Planning**](/guide/session-prep/): Plan and organize your next session using the [Lazy DM] method; wrap up the prior one.
- [**Playing a Session**](/guide/session-play/): Tools to run your game session more easily, while seamlessly collecting notes to be able to capture what happened and begin your prep for the next session
- [**Recording Play Results**](/guide/record-results/): This blends with preparing for next session, but there are tools to record what happened in your session and use it to update your world and prepare for the next session

See the [official description](https://github.com/dovrosenberg/fvtt-campaign-builder) for a longer summary of features and functionality.

# Advanced features

You'll see features throughout this documentation labeled "[Advanced Feature]". These features require the setup and configuration described under [Backend and Advanced Features](/reference/backend/) to make them available.

# GM-only, for now

The module currently only works for the GM. Players may see some settings available, but they won't do anything and there is no way to open the main window without having GM permission.

I intend to change that at some point - in particular creating ways for everyone to contribute to the world-building and for the GM to selectively share pieces of setting information/lore with players. But for now, GM only.

# Terminology

This documentation uses several specific terms related to the World & Campaign Builder (though many are commonly used in TTRPG, as well):

- **Setting**: The fictional setting where your Campaigns take place (i.e. the equivalent of The Forgotten Realms, Eberron, etc.)
- **Entry**: A document containing information about a specific element of your Setting (ex. a Character or Location)
- **Topic**: A category that organizes related Entries. There are three Topics: *Characters*, *Locations*, and *Organizations*
- **Type**: A user-defined categorization of Entries to assist in finding Entries within a Topic. For example, Characters might have Types such as NPC, PC, Monster, etc.; Locations could have Types such as City, Town, Dungeon, Ruin, etc.
- **Campaign**: A collection of Sessions played by the same (or generally the same) group of players. 
- **Session**: A single play session. When running in "Play Mode" (/guide/session-play), the most recent Session is enabled with additional functionality that you can use during your play session.

# Support

If you encounter issues or have feature requests:
1. Visit the [GitHub repository](https://github.com/dovrosenberg/fvtt-campaign-builder/issues)

2. [Open a new issue](https://github.com/dovrosenberg/fvtt-campaign-builder/issues/new/choose)

If you'd like to support the developer, you can [buy me a root beer](https://ko-fi.com/phloro).