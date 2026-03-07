---
title: Arc Timeline Tab
prev: 
  text: 'Arc Story Webs Tab'
  link: './storywebs'
next: 
  text: 'Arc Manager'
  link: './manager'
---
# Arc Timeline Tab
![Arc Timeline Tab](/assets/images/arc-timeline-tab.webp)

The Timeline tab shows calendar events from Calendaria relevant to this [^Arc]. This helps you track events that occur during this specific story phase.

::: info
Timelines require the Calendaria module to be installed and active. See the main [Timelines] documentation for more details on this, as well as general usage of Timelines.
:::

## Filtering Events

You can set filters, as well as the viewable window to control what the timeline view for this Arc should be. Those settings are content-specific (i.e. this Arc) are are saved.

### Reference This Arc

By default, this option is enabled and filters the timeline to show only events that reference this Arc in their content (using `@UUID` links). This shows events specifically tagged as relevant to this story arc.

Disable this option to see all calendar events instead (subject to other filers).

### Include Nested Content

When enabled (requires "Reference This Arc" be on), the timeline also shows events that reference:

- Any [^Session] within this arc's session range (from start session to end session)