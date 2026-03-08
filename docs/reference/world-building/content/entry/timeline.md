---
title: Entry Timeline Tab
prev: 
  text: 'Generic Foundry Document Tab'
  link: './generic-foundry'
next: 
  text: 'Character Details'
  link: '/reference/world-building/content/character/'
---
# Entry Timeline Tab
![Entry Timeline Tab](/assets/images/entry-timeline-tab.webp)

The Timeline tab shows calendar events from Calendaria that reference this Entry. This lets you see at a glance when this character, location, or organization appears in your world's timeline.

::: info
Timelines require the Calendaria module to be installed and active. See the main [Timelines] documentation for more details on this, as well as general usage of Timelines.
:::

## Filtering Events

You can set filters, as well as the viewable window to control what the timeline view for this Entry should be. Those settings are content-specific (i.e. this Entry) and are saved.

### Reference This Entry

By default, this option is enabled and filters the timeline to show only events that reference this Entry in their content (using `@UUID` links). This makes it easy to see exactly when this character, location, or organization is mentioned in your calendar.

Disable this option to see all calendar events instead.

### Include Nested Content

When enabled (only for [^Locations] and [^Organizations], and requires "Reference This Entry" be on), the timeline also shows events that reference and descendants of this Entry in the [Setting Directory] tree.
