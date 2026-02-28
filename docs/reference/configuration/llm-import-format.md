---
title: LLM Import Format Specification
---

# LLM Import Format Specification

This document provides a complete specification of the Campaign Builder JSON import format. It is intended for LLMs to generate valid import files from adventure module content.

## Overview

Campaign Builder imports a JSON file containing all settings, entries, campaigns, and related content. The import will:
- **Delete matching settings** by UUID (settings with the same UUID in the import will be replaced)
- Create all new documents with fresh UUIDs
- Remap all internal UUID references to the new IDs

::: danger Important
All UUIDs in the import file are temporary identifiers. During import, Campaign Builder creates new documents and remaps all references. You must use consistent placeholder UUIDs to represent a given object throughout the file so relationships are preserved after remapping.
:::

## UUID Format

Use placeholder UUIDs in this format:
```
JournalEntry.<ID>.JournalEntryPage.<PAGE_ID>
```

Example: `JournalEntry.abc123.JournalEntryPage.xyz789`

The exact format doesn't matter as long as:
1. UUIDs are unique across all documents
2. UUIDs are consistent when referencing the same document
3. The format looks like a valid Foundry UUID (contains `.` separators)

If you wish to refer to a specific Foundry document (ex. an Actor) that you know exists in the world the import will be applied to, you can use its Foundry UUID (ex. `Actor.dzpf0yqoUVeF4tSgabc123`).

## Top-Level Structure

```json
{
  "version": "1.0.0",
  "exportedAt": "2025-01-15T12:00:00.000Z",
  "exportMode": "all",
  "moduleSettings": { ... },
  "settings": [ ... ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Always `"1.0.0"` |
| `exportedAt` | string | Yes | ISO 8601 timestamp |
| `exportMode` | string | Yes | One of: `"all"`, `"settings_only"`, `"configuration_only"` |
| `moduleSettings` | object/null | Yes | Module configuration (see below) |
| `settings` | array/null | Yes | Array of Setting objects |

## Module Settings Structure

The `moduleSettings` object contains global configuration. Most can be omitted or left as defaults.

```json
{
  "moduleSettings": {
    "defaultSettingId": null,
    "storyWebColors": [
      { "id": "default", "name": "Default", "color": "#3b82f6" }
    ],
    "storyWebEdgeStyles": [
      { "id": "solid", "name": "Solid" }
    ],
    "storyWebColorSchemes": [
      { "id": "blue", "name": "Blue", "background": "#dbeafe", "border": "#3b82f6", "text": "#1e40af" }
    ],
    "customFields": {
      "character": [],
      "location": [],
      "organization": [],
      "pc": [],
      "setting": [],
      "campaign": [],
      "session": [],
      "arc": [],
      "front": []
    },
    "species": [],
    "nameStyles": []
  }
}
```

**ModuleSettings type:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `defaultSettingId` | `string \| null` | No | `null` | UUID of the default setting to open |
| `storyWebColors` | `StoryWebColor[]` | No | `[]` | Color options for story web edges |
| `storyWebEdgeStyles` | `StoryWebEdgeStyle[]` | No | `[]` | Line style options for story web edges |
| `storyWebColorSchemes` | `StoryWebColorScheme[]` | No | `[]` | Color scheme options for story web nodes |
| `customFields` | `CustomFieldsConfig` | No | `{}` | Custom field definitions per content type |
| `species` | `Species[]` | No | `[]` | Species definitions for character generation |
| `nameStyles` | `NameStyle[]` | No | `[]` | Name generation style definitions |

**StoryWebColor type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for this color |
| `name` | `string` | Yes | Display name |
| `color` | `string` | Yes | Hex color code (e.g., `"#3b82f6"`) |

**StoryWebEdgeStyle type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for this style |
| `name` | `string` | Yes | Display name |

**StoryWebColorScheme type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for this scheme |
| `name` | `string` | Yes | Display name |
| `background` | `string` | Yes | Hex color for node background |
| `border` | `string` | Yes | Hex color for node border |
| `text` | `string` | Yes | Hex color for node text |

**CustomFieldsConfig type:**
```
Record<"character" | "location" | "organization" | "pc" | "setting" | "campaign" | "session" | "arc" | "front", CustomFieldDefinition[]>
```

**CustomFieldDefinition type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Field name/label |
| `type` | `string` | Yes | Field type (e.g., "text", "textarea") |
| `default` | `string` | No | Default value |

**Species type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique species identifier |
| `name` | `string` | Yes | Display name (e.g., "Elf", "Dwarf") |
| `nameStyleIds` | `string[]` | Yes | IDs of name styles for this species |

**NameStyle type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique style identifier |
| `name` | `string` | Yes | Display name (e.g., "Elven Female") |
| `examples` | `string[]` | Yes | Example names for this style |

## Setting Structure

A **Setting** is the top-level container representing a distinct world, genre, or campaign universe. Think of it as a "world bible" that contains all the NPCs, locations, organizations, and campaigns for a particular game setting. Each setting is self-contained and can be imported/exported independently.

**Purpose**: Settings allow you to organize different game worlds separately. For example, you might have one setting for your Forgotten Realms campaign and another for your Sci-Fi game. Each setting has its own directory of entries and list of campaigns.

**Key Concepts**:
- **Topics**: The four topic types (Characters, Locations, Organizations, PCs) organize entries by category
- **Campaigns**: Story arcs played within this setting
- **Hierarchies**: Parent-child relationships between entries (primarily for nested locations)

```json
{
  "uuid": "JournalEntry.setting1.JournalEntryPage.page1",
  "name": "My Adventure Setting",
  "description": "<p>Setting description with HTML content...</p>",
  "system": {
    "topics": { ... },
    "campaignIndex": [ ... ],
    "hierarchies": { ... },
    "expandedIds": {},
    "genre": "Fantasy",
    "settingFeeling": "Dark and mysterious",
    "img": "",
    "nameStyles": [],
    "rollTableConfig": null,
    "nameStyleExamples": { "genre": "", "settingFeeling": "", "examples": [] },
    "journals": [],
    "customFields": {},
    "customFieldHeights": {},
    "tags": {}
  },
  "documents": {
    "entries": [ ... ],
    "campaigns": [ ... ],
    "sessions": [ ... ],
    "arcs": [ ... ],
    "fronts": [ ... ],
    "storyWebs": [ ... ]
  }
}
```

### Setting System Fields - Complete Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `topics` | `Record<"1" \| "2" \| "3" \| "4", TopicBasicIndex>` | Yes | `{}` | Index of entries by topic (see below) |
| `campaignIndex` | `CampaignBasicIndex[]` | Yes | `[]` | List of campaigns in this setting |
| `hierarchies` | `Record<string, Hierarchy>` | Yes | `{}` | Parent/child relationships for entries |
| `expandedIds` | `Record<string, boolean>` | Yes | `{}` | UI state - leave empty `{}` |
| `genre` | `string` | Yes | `""` | Genre of the setting (e.g., "Fantasy", "Sci-Fi") |
| `settingFeeling` | `string` | Yes | `""` | Tone/atmosphere description (e.g., "Dark and gritty") |
| `img` | `string` | Yes | `""` | Image path/URL for setting banner |
| `nameStyles` | `number[]` | Yes | `[]` | Name generation style IDs |
| `rollTableConfig` | `RollTableConfig \| null` | No | `null` | Roll table configuration for generators |
| `nameStyleExamples` | `NameStyleExamples` | Yes | `{}` | Stored name examples for generation |
| `journals` | `RelatedJournal[]` | Yes | `[]` | Related journal entries (cleared on import) |
| `customFields` | `Record<string, string>` | Yes | `{}` | Custom field name → value mappings |
| `customFieldHeights` | `Record<string, number>` | Yes | `{}` | UI heights for custom fields (in rem) |
| `tags` | `Record<string, { count: number; color: string \| null }>` | Yes | `{}` | Tag definitions with counts |

**Field Purposes**:
- **`topics`**: The master index organizing all entries by their topic category. This is built from the entries array and used for the directory tree display.
- **`campaignIndex`**: A lightweight list of all campaigns for quick lookup without loading full campaign documents.
- **`hierarchies`**: Defines tree structures for entries, primarily used for nested locations (e.g., Kingdom → City → District → Building).
- **`expandedIds`**: Tracks which nodes are expanded in the directory tree UI. Reset on import.
- **`genre`**: The genre classification, used for name generation and organization.
- **`settingFeeling`**: The tone/mood description, also used for name generation context.
- **`nameStyles`**: References to name generation style configurations for creating NPCs.
- **`tags`**: Aggregates all tags used across entries with counts for filtering and display.

### Setting Tags Structure

Tags track usage across the setting:

```json
{
  "tags": {
    "wizard": { "count": 5, "color": "#3b82f6" },
    "important": { "count": 3, "color": null }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `count` | number | Number of entries using this tag |
| `color` | string/null | Hex color for tag display |

### Name Style Examples

```json
{
  "nameStyleExamples": {
    "genre": "Fantasy",
    "settingFeeling": "Medieval",
    "examples": [
      { "name": "Aldric", "gender": "male" },
      { "name": "Elena", "gender": "female" }
    ]
  }
}
```

### Topics Index Structure

The `topics` object organizes entries by topic type for the directory tree:

```json
{
  "topics": {
    "1": {
      "topic": 1,
      "types": ["NPC", "Monster", "Deity"],
      "topNodes": ["JournalEntry.entry1.JournalEntryPage.page1"],
      "entries": {
        "JournalEntry.entry1.JournalEntryPage.page1": {
          "uuid": "JournalEntry.entry1.JournalEntryPage.page1",
          "name": "Gandalf",
          "type": "NPC"
        }
      }
    },
    "2": { ... },  // Locations
    "3": { ... },  // Organizations
    "4": { ... }   // PCs
  }
}
```

**TopicBasicIndex type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | `1 \| 2 \| 3 \| 4` | Yes | Topic ID (matches the key) |
| `types` | `string[]` | Yes | List of entry subtypes used in this topic |
| `topNodes` | `string[]` | Yes | UUIDs of root-level entries (no parent in hierarchy) |
| `entries` | `Record<string, EntryBasicIndex>` | Yes | Map of entry UUID → basic info |

**EntryBasicIndex type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Entry UUID |
| `name` | `string` | Yes | Entry name |
| `type` | `string` | Yes | Entry subtype |

**Topic IDs**:
- `1` = **Character**: NPCs, monsters, deities, villains, allies - any non-player character
- `2` = **Location**: Regions, cities, buildings, dungeons, wilderness areas
- `3` = **Organization**: Guilds, kingdoms, cults, religions, merchant companies, factions
- `4` = **PC**: Player characters (typically managed separately from NPCs)

### Hierarchy Structure

The `hierarchies` object defines parent-child relationships between entries, creating a tree structure. This is primarily used for **Locations** to represent geographical nesting (e.g., Kingdom → Province → City → District → Building), but can be used for any topic type.

**Purpose**: Hierarchies enable the directory tree to show nested entries. When you expand a location in the tree, its children appear indented below it.

```json
{
  "hierarchies": {
    "JournalEntry.location1.JournalEntryPage.page1": {
      "parentId": null,
      "ancestors": [],
      "children": ["JournalEntry.location2.JournalEntryPage.page2"],
      "type": "Region"
    },
    "JournalEntry.location2.JournalEntryPage.page2": {
      "parentId": "JournalEntry.location1.JournalEntryPage.page1",
      "ancestors": ["JournalEntry.location1.JournalEntryPage.page1"],
      "children": [],
      "type": "City"
    }
  }
}
```

**Hierarchy type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `parentId` | `string \| null` | Yes | UUID of parent entry (null for root entries) |
| `ancestors` | `string[]` | Yes | UUIDs of all ancestors from root to immediate parent |
| `children` | `string[]` | Yes | UUIDs of direct children of this entry |
| `type` | `string` | Yes | Entry type (matches the entry's `system.type`) |

### Campaign Index

```json
{
  "campaignIndex": [
    {
      "uuid": "JournalEntry.campaign1.JournalEntryPage.page1",
      "name": "Main Campaign",
      "completed": false,
      "arcs": [
        {
          "uuid": "JournalEntry.arc1.JournalEntryPage.page1",
          "name": "Chapter 1",
          "startSessionNumber": 1,
          "endSessionNumber": 5,
          "sortOrder": 0
        }
      ]
    }
  ]
}
```

## Entry Structure

An **Entry** is the fundamental content unit in Campaign Builder. Entries represent individual entities within your game world - characters, locations, organizations, and player characters. Each entry has a topic (category), type (subtype), rich text description, and can be linked to other entries through relationships.

**Purpose**: Entries are the building blocks of your world bible. They store all the details about NPCs, locations, factions, and PCs that you'll reference during gameplay. The `description` field contains the main content (history, appearance, secrets, etc.), while `relationships` connect entries to show how they relate to each other.

**Topic Types**:
- **Character (1)**: Any non-player character - NPCs, monsters, deities, villains, allies, quest givers
- **Location (2)**: Physical places - kingdoms, cities, buildings, dungeons, rooms, wilderness areas
- **Organization (3)**: Groups and factions - guilds, kingdoms, cults, religions, merchant companies
- **PC (4)**: Player characters - typically created and managed by players, linked to Foundry actors

```json
{
  "uuid": "JournalEntry.entry1.JournalEntryPage.page1",
  "name": "Gandalf the Grey",
  "description": "<p>Rich text content with <strong>HTML</strong>...</p>",
  "system": {
    "topic": 1,
    "type": "NPC",
    "tags": ["wizard", "important"],
    "customFields": {},
    "customFieldHeights": {},
    "relationships": {},
    "scenes": [],
    "actors": [],
    "journals": [],
    "foundryDocuments": [],
    "speciesId": "",
    "playerName": null,
    "actorId": null,
    "background": null,
    "img": "",
    "voiceRecordingPath": null
  }
}
```

### Entry System Fields - Complete Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `topic` | `1 \| 2 \| 3 \| 4` | Yes | - | Topic ID: 1=Character, 2=Location, 3=Organization, 4=PC |
| `type` | `string` | Yes | `""` | Entry subtype (e.g., "NPC", "Monster", "City", "Kingdom") |
| `tags` | `string[]` | Yes | `[]` | Array of tag strings for filtering and organization |
| `customFields` | `Record<string, string>` | Yes | `{}` | Custom field name → value mappings |
| `customFieldHeights` | `Record<string, number>` | Yes | `{}` | UI heights for custom fields (in rem) |
| `relationships` | `EntryRelationships` | Yes | `{}` | Related entries by topic (see below) |
| `scenes` | `string[]` | Yes | `[]` | Foundry scene UUIDs (cleared on import) |
| `actors` | `string[]` | Yes | `[]` | Foundry actor UUIDs (cleared on import) |
| `journals` | `RelatedJournal[]` | Yes | `[]` | Related journals (cleared on import) |
| `foundryDocuments` | `string[]` | Yes | `[]` | Generic Foundry doc UUIDs (cleared on import) |
| `speciesId` | `string` | No | `""` | Species ID for characters (used with Characters/PCs) |
| `playerName` | `string \| null` | Yes | `null` | Player name for PCs only |
| `actorId` | `string \| null` | Yes | `null` | Actor UUID for PCs only |
| `background` | `string \| null` | Yes | `null` | Background text (legacy field) |
| `img` | `string` | Yes | `""` | Image path/URL |
| `voiceRecordingPath` | `string \| null` | No | `null` | Audio file path for voice recordings |

**Field Purposes**:
- **`topic`**: Determines which directory tab the entry appears in and what fields are relevant
- **`type`**: Subcategorizes entries within a topic (e.g., NPC vs Monster vs Deity for Characters)
- **`tags`**: Free-form labels for filtering, grouping, and quick reference (e.g., "wizard", "important", "quest-giver")
- **`customFields`**: User-defined fields specific to your game (e.g., "CR", "Alignment", "Secrets")
- **`relationships`**: Connections to other entries with optional relationship-specific notes
- **`scenes`**, **`actors`**, **`journals`**, **`foundryDocuments`**: Links to Foundry documents (cleared during import since these IDs won't exist in the new world)
- **`speciesId`**: For characters, references a species definition for name generation
- **`playerName`**: For PCs, the name of the player who controls this character
- **`actorId`**: For PCs, links to the Foundry Actor sheet
- **`img`**: Portrait or location image displayed in the entry header
- **`voiceRecordingPath`**: Path to audio file for voice/note recordings

### Entry by Topic Type

Different topic types use different fields:

**Characters (topic=1):**
- Uses: `speciesId`, `img`, `voiceRecordingPath`, `relationships`
- Common types: "NPC", "Monster", "Deity", "Villain", "Ally"

**Locations (topic=2):**
- Uses: `img`, `relationships` (for parent/child location relationships)
- Common types: "Region", "City", "Building", "Dungeon", "Wilderness"

**Organizations (topic=3):**
- Uses: `img`, `relationships` (for member relationships)
- Common types: "Guild", "Kingdom", "Cult", "Religion", "Merchant Company"

**PCs (topic=4):**
- Uses: `playerName`, `actorId`, `speciesId`, `img`
- Type is typically the character class

### Relationships Structure

Relationships connect entries to other entries, creating a web of connections in your world. Each relationship can include extra fields with notes about the nature of the connection.

**Purpose**: Relationships let you document how entities relate to each other - who knows whom, which NPCs belong to which organizations, which locations contain which characters, etc. This creates a navigable web of connections.

```json
{
  "relationships": {
    "1": {
      "JournalEntry.otherChar.JournalEntryPage.page": {
        "uuid": "JournalEntry.otherChar.JournalEntryPage.page",
        "topic": 1,
        "type": "NPC",
        "name": "Saruman",
        "extraFields": [
          { "key": "relationship", "value": "Rival" }
        ]
      }
    },
    "2": {
      "JournalEntry.location1.JournalEntryPage.page": {
        "uuid": "JournalEntry.location1.JournalEntryPage.page",
        "topic": 2,
        "type": "Tower",
        "name": "Orthanc",
        "extraFields": [
          { "key": "relationship", "value": "Resides at" }
        ]
      }
    }
  }
}
```

**EntryRelationships type:**
```
Record<"1" | "2" | "3" | "4", Record<string, RelatedEntry>>
```

**RelatedEntry type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | UUID of the related entry |
| `topic` | `1 \| 2 \| 3 \| 4` | Yes | Topic ID of the related entry |
| `type` | `string` | Yes | Entry type of the related entry |
| `name` | `string` | Yes | Name of the related entry |
| `extraFields` | `ExtraField[]` | Yes | Additional key-value pairs for this relationship |

**ExtraField type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | `string` | Yes | Field name (e.g., "relationship", "notes") |
| `value` | `string` | Yes | Field value |

**Structure explanation:**
- Outer key: topic ID (as string: "1", "2", "3", "4")
- Inner key: UUID of the related entry
- Value: `RelatedEntry` object with entry details and `extraFields` array

## Campaign Structure

A **Campaign** represents a connected series of game sessions telling a cohesive story. It organizes sessions, story arcs, fronts (threats), and story webs. Campaigns track what happens during play, including lore revealed, to-do items for the GM, and ideas for future development.

**Purpose**: Campaigns are the play-focused container. While Settings hold your world bible (entries), Campaigns hold your actual play sessions and track the evolving story. Each campaign belongs to one setting and can have multiple sessions, arcs, fronts, and story webs.

**Key Concepts**:
- **Sessions**: Individual game sessions with their own notes, NPCs encountered, lore revealed
- **Arcs**: Multi-session storylines that span several sessions
- **Fronts**: Threats and dangers that advance over time (Dungeon World style)
- **Story Webs**: Visual relationship maps between entities
- **Lore**: Important world information revealed during play
- **To-Do Items**: GM prep reminders and tasks
- **Ideas**: Brainstorming notes for future development

```json
{
  "uuid": "JournalEntry.campaign1.JournalEntryPage.page1",
  "name": "The Lost Mine of Phandelver",
  "description": "<p>Campaign description...</p>",
  "system": {
    "currentSessionNumber": 5,
    "currentSessionId": null,
    "customFields": {},
    "customFieldHeights": {},
    "sessionIndex": [],
    "arcIndex": [],
    "frontIds": [],
    "storyWebIds": [],
    "storyWebs": [],
    "lore": [],
    "img": "",
    "toDoItems": [],
    "ideas": [],
    "journals": [],
    "pcs": [],
    "groups": {
      "toDoItems": [],
      "ideas": [],
      "lore": [],
      "pcs": []
    },
    "completed": false
  }
}
```

### Campaign System Fields - Complete Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `currentSessionNumber` | `number \| null` | Yes | `null` | Latest session number (null if no sessions) |
| `currentSessionId` | `string \| null` | Yes | `null` | UUID of current/most recent session |
| `customFields` | `Record<string, string>` | Yes | `{}` | Custom field name → value mappings |
| `customFieldHeights` | `Record<string, number>` | Yes | `{}` | UI heights for custom fields (in rem) |
| `sessionIndex` | `SessionBasicIndex[]` | Yes | `[]` | List of sessions (basic info for directory) |
| `arcIndex` | `ArcBasicIndex[]` | Yes | `[]` | List of arcs (basic info for directory) |
| `frontIds` | `string[]` | Yes | `[]` | UUIDs of fronts belonging to this campaign |
| `storyWebIds` | `string[]` | Yes | `[]` | UUIDs of all story webs (master list) |
| `storyWebs` | `string[]` | Yes | `[]` | Story web UUIDs directly attached to campaign |
| `lore` | `CampaignLore[]` | Yes | `[]` | Campaign lore items |
| `img` | `string` | Yes | `""` | Image path/URL for campaign |
| `toDoItems` | `CampaignToDo[]` | Yes | `[]` | To-do items for campaign prep |
| `ideas` | `CampaignIdea[]` | Yes | `[]` | Campaign ideas/notes |
| `journals` | `RelatedJournal[]` | Yes | `[]` | Related journal entries (cleared on import) |
| `pcs` | `CampaignPC[]` | Yes | `[]` | Player characters in campaign |
| `groups` | `CampaignGroups` | Yes | `{}` | Table grouping configurations |
| `completed` | `boolean` | Yes | `false` | Whether campaign is finished |

**Field Purposes**:
- **`currentSessionNumber`**: Tracks progress through the campaign; used for "continue" buttons
- **`currentSessionId`**: Quick reference to the most recent session for navigation
- **`sessionIndex`**: Lightweight list for the directory without loading full session documents
- **`arcIndex`**: Lightweight list of arcs for the directory
- **`frontIds`**: Links to Front documents that track threats and dangers
- **`storyWebIds`**: Master list of all story webs (includes those in sessions/arcs)
- **`storyWebs`**: Story webs directly attached to the campaign level
- **`lore`**: Important world information revealed during play, can be marked as delivered
- **`toDoItems`**: GM prep tasks - can be manual or auto-generated from entries/lore
- **`ideas`**: Brainstorming notes for future sessions and plot developments
- **`pcs`**: Player characters participating in this campaign
- **`groups`**: Grouping configurations for organizing tables (lore, to-dos, ideas, PCs)
- **`completed`**: Marks the campaign as finished; affects sorting and display

### Campaign Index

```json
{
  "campaignIndex": [
    {
      "uuid": "JournalEntry.campaign1.JournalEntryPage.page1",
      "name": "Main Campaign",
      "completed": false,
      "sortOrder": 0
    }
  ]
}
```

**CampaignBasicIndex type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Campaign UUID |
| `name` | `string` | Yes | Campaign name |
| `completed` | `boolean` | Yes | Whether campaign is finished |
| `sortOrder` | `number` | Yes | Sort order among campaigns |

### Campaign Index Types

**SessionBasicIndex type:**
```json
{
  "uuid": "JournalEntry.session1.JournalEntryPage.page1",
  "name": "Session 1: The Beginning",
  "number": 1,
  "date": "2025-01-15"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Session UUID |
| `name` | `string` | Yes | Session name |
| `number` | `number` | Yes | Session number (sequential) |
| `date` | `string \| null` | Yes | ISO date string or null |

**ArcBasicIndex type:**
```json
{
  "uuid": "JournalEntry.arc1.JournalEntryPage.page1",
  "name": "Chapter 1",
  "startSessionNumber": 1,
  "endSessionNumber": 5,
  "sortOrder": 0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Arc UUID |
| `name` | `string` | Yes | Arc name |
| `startSessionNumber` | `number` | Yes | First session in arc |
| `endSessionNumber` | `number` | Yes | Last session in arc |
| `sortOrder` | `number` | Yes | Sort order among arcs |

### Campaign Lore

Lore items are pieces of world information that can be revealed to players during the campaign. They help GMs track what secrets have been discovered.

```json
{
  "lore": [
    {
      "uuid": "lore-1",
      "delivered": false,
      "significant": true,
      "description": "The mine was once a prosperous operation...",
      "lockedToSessionId": null,
      "lockedToSessionName": null
    }
  ]
}
```

**CampaignLore type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this lore item |
| `delivered` | `boolean` | Yes | Whether this lore has been revealed to players |
| `significant` | `boolean` | Yes | Whether this is major/important lore |
| `description` | `string` | Yes | The lore content/description |
| `lockedToSessionId` | `string \| null` | Yes | Session UUID this lore is locked to (for prep) |
| `lockedToSessionName` | `string \| null` | Yes | Session name for display |

**Purpose**: Track world secrets and information that can be revealed. The `delivered` flag shows what players already know, helping you avoid repetition and track discovery progress.

### Campaign To-Do Items

To-do items are GM prep tasks and reminders. They can be manually created or auto-generated from entries, lore, or other content.

```json
{
  "toDoItems": [
    {
      "uuid": "todo-1",
      "lastTouched": null,
      "manuallyUpdated": false,
      "linkedUuid": null,
      "linkedText": null,
      "sessionUuid": null,
      "groupId": null,
      "text": "Resolve the NPC backstory",
      "type": "manual"
    }
  ]
}
```

**CampaignToDo type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this to-do |
| `lastTouched` | `string \| null` | Yes | ISO timestamp of last interaction |
| `manuallyUpdated` | `boolean` | Yes | Whether manually edited by user |
| `linkedUuid` | `string \| null` | Yes | UUID of linked document (if auto-generated) |
| `linkedText` | `string \| null` | Yes | Text from linked document |
| `sessionUuid` | `string \| null` | Yes | Session this to-do is associated with |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |
| `text` | `string` | Yes | The to-do text |
| `type` | `"manual" \| "entry" \| "lore" \| "vignette" \| "monster" \| "item" \| "generatedName"` | Yes | Source type of the to-do |

**Purpose**: GM prep tracking. Manual to-dos are user-created; other types are auto-generated from content (e.g., an entry marked as "needs development" generates an entry-type to-do).

### Campaign Ideas

Ideas are brainstorming notes for future development - plot hooks, character arcs, encounter ideas, etc.

```json
{
  "ideas": [
    {
      "uuid": "idea-1",
      "text": "Add a rival adventuring party",
      "groupId": null
    }
  ]
}
```

**CampaignIdea type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this idea |
| `text` | `string` | Yes | The idea text |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

**Purpose**: Capture brainstorming and future development notes. Unlike to-dos, ideas don't have completion states - they're just notes to inspire future content.

### Campaign PCs

PCs (Player Characters) tracks which player characters are participating in this campaign. Each PC references an entry in the setting's PC topic.

```json
{
  "pcs": [
    {
      "uuid": "JournalEntry.pc1.JournalEntryPage.page",
      "type": "Fighter",
      "actorId": null,
      "groupId": null
    }
  ]
}
```

**CampaignPC type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | UUID of the PC entry (topic=4) |
| `type` | `string` | Yes | Character class/type |
| `actorId` | `string \| null` | Yes | Foundry Actor UUID (cleared on import) |
| `groupId` | `string \| null` | Yes | Group ID for table grouping (e.g., party groups) |

**Purpose**: Links player characters to the campaign. The `type` is typically the character class. Multiple PCs can be grouped together (e.g., "Party A", "Party B" for West Marches style games).

### Campaign Groups

Groups organize items into visual categories in tables. The `groups` object maps table names to arrays of group definitions.

```json
{
  "groups": {
    "toDoItems": [
      { "groupId": "prep", "name": "Prep Tasks" },
      { "groupId": "followup", "name": "Follow-up" }
    ],
    "ideas": [
      { "groupId": "main", "name": "Main Plot" }
    ],
    "lore": [],
    "pcs": [
      { "groupId": "party-a", "name": "Party A" }
    ]
  }
}
```

**CampaignGroups type:**
```
Record<"toDoItems" | "ideas" | "lore" | "pcs", TableGroup[]>
```

**Each key corresponds to a table in the campaign:**
| Key | Table | Description |
|-----|-------|-------------|
| `toDoItems` | To-Do Items | Groups for prep tasks |
| `ideas` | Ideas | Groups for brainstorming notes |
| `lore` | Lore | Groups for world information |
| `pcs` | PCs | Groups for player characters (e.g., different parties) |

**TableGroup type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `groupId` | `string` | Yes | Unique identifier for this group (used in items' `groupId` field) |
| `name` | `string` | Yes | Display name shown in the group header |

**How it works**: Items in the table (e.g., to-do items) have a `groupId` field. If `groupId` matches a group's `groupId`, the item appears under that group's header. Items with `groupId: null` appear outside any group.

## Session Structure

A **Session** represents a single game session - one sitting of play. Sessions document what happened during that session: which locations were visited, which NPCs appeared, what lore was revealed, memorable moments (vignettes), and monsters encountered.

**Purpose**: Sessions are your play log. They capture the events of each game night, making it easy to recall what happened, track what information was revealed, and prepare for future sessions. Sessions are numbered sequentially within a campaign.

**Key Concepts**:
- **Locations**: Places visited or relevant during this session
- **NPCs**: Characters who appeared or were mentioned
- **Monsters**: Creatures encountered in combat or social situations
- **Items**: Magic items or treasures found
- **Vignettes**: Memorable moments, quotes, or events
- **Lore**: World information revealed to players
- **Story Webs**: Relationship maps relevant to this session

```json
{
  "uuid": "JournalEntry.session1.JournalEntryPage.page1",
  "name": "Session 1: The Beginning",
  "description": "<p>Session summary...</p>",
  "system": {
    "campaignId": "JournalEntry.campaign1.JournalEntryPage.page1",
    "number": 1,
    "date": "2025-01-15",
    "customFields": {},
    "customFieldHeights": {},
    "locations": [],
    "items": [],
    "npcs": [],
    "monsters": [],
    "vignettes": [],
    "lore": [],
    "img": "",
    "tags": [],
    "storyWebs": [],
    "groups": {
      "1": [],
      "2": [],
      "3": [],
      "4": [],
      "5": [],
      "6": []
    }
  }
}
```

### Session System Fields - Complete Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `campaignId` | `string` | Yes | - | UUID of parent campaign |
| `number` | `number` | Yes | - | Session number (sequential within campaign) |
| `date` | `string \| null` | Yes | `null` | ISO date string or null |
| `customFields` | `Record<string, string>` | Yes | `{}` | Custom field name → value mappings |
| `customFieldHeights` | `Record<string, number>` | Yes | `{}` | UI heights for custom fields (in rem) |
| `locations` | `SessionLocation[]` | Yes | `[]` | Locations appearing in session |
| `items` | `SessionItem[]` | Yes | `[]` | Magic items in session |
| `npcs` | `SessionNPC[]` | Yes | `[]` | NPCs appearing |
| `monsters` | `SessionMonster[]` | Yes | `[]` | Monsters encountered |
| `vignettes` | `SessionVignette[]` | Yes | `[]` | Memorable moments |
| `lore` | `SessionLore[]` | Yes | `[]` | Lore revealed |
| `img` | `string` | Yes | `""` | Image path/URL for session |
| `tags` | `string[]` | Yes | `[]` | Tag strings |
| `storyWebs` | `string[]` | Yes | `[]` | Story web UUIDs |
| `groups` | `SessionGroups` | Yes | `{}` | Table grouping configurations |

**Field Purposes**:
- **`campaignId`**: Links this session to its parent campaign
- **`number`**: Sequential session number for ordering and reference
- **`date`**: Real-world date when the session was played
- **`locations`**: Places visited or relevant - tracks exploration and location-based content
- **`items`**: Magic items, treasures, or significant objects found or used
- **`npcs`**: Characters who appeared - links to Character entries with session-specific notes
- **`monsters`**: Creatures encountered - can include quantity and encounter notes
- **`vignettes`**: Memorable moments, quotes, or events - captures the "story" of the session
- **`lore`**: World information revealed to players - tracks discovery progress
- **`tags`**: Session tags for filtering and organization
- **`storyWebs`**: Relationship maps relevant to this session's events

### Session Location

Links a location entry to a session with notes about its use.

```json
{
  "uuid": "JournalEntry.location1.JournalEntryPage.page1",
  "delivered": false,
  "notes": "The party explored the eastern wing",
  "groupId": null
}
```

**SessionLocation type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | UUID of the location entry |
| `delivered` | `boolean` | Yes | Whether this location was visited/used |
| `notes` | `string` | Yes | Notes about the location in this session |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

### Session Item

Tracks magic items found or used in a session.

```json
{
  "uuid": "item-uuid-placeholder",
  "delivered": false,
  "notes": "Found in the dragon's hoard",
  "groupId": null
}
```

**SessionItem type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this item reference |
| `delivered` | `boolean` | Yes | Whether this item was delivered/found |
| `notes` | `string` | Yes | Notes about the item |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

### Session NPC

Links an NPC entry to a session with notes about their appearance.

```json
{
  "uuid": "JournalEntry.npc1.JournalEntryPage.page1",
  "delivered": false,
  "notes": "Met the innkeeper, suspicious behavior",
  "groupId": null
}
```

**SessionNPC type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | UUID of the character entry |
| `delivered` | `boolean` | Yes | Whether this NPC appeared |
| `notes` | `string` | Yes | Notes about the NPC in this session |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

### Session Monster

Tracks monsters encountered in a session.

```json
{
  "uuid": "monster-uuid-placeholder",
  "delivered": true,
  "number": 4,
  "notes": "Goblins ambushed the party",
  "groupId": null
}
```

**SessionMonster type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this monster reference |
| `delivered` | `boolean` | Yes | Whether these monsters were encountered |
| `number` | `number` | Yes | Number of monsters encountered |
| `notes` | `string` | Yes | Notes about the encounter |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

### Session Vignette

Memorable moments from the session.

```json
{
  "uuid": "vignette-1",
  "delivered": true,
  "description": "The rogue's critical hit decapitated the goblin leader",
  "groupId": null
}
```

**SessionVignette type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this vignette |
| `delivered` | `boolean` | Yes | Whether this moment occurred |
| `description` | `string` | Yes | Description of the memorable moment |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

### Session Lore

Lore revealed during the session.

```json
{
  "uuid": "lore-1",
  "delivered": true,
  "significant": true,
  "description": "The ancient prophecy speaks of a chosen one",
  "groupId": null,
  "journalEntryPageId": null
}
```

**SessionLore type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this lore item |
| `delivered` | `boolean` | Yes | Whether this lore was revealed |
| `significant` | `boolean` | Yes | Whether this is major/important lore |
| `description` | `string` | Yes | The lore content |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |
| `journalEntryPageId` | `string \| null` | Yes | Legacy field (leave null) |

### Session Groups

Groups organize session content into visual categories. The `groups` object uses numeric keys that map to specific content types:

```json
{
  "groups": {
    "1": [
      { "groupId": "secrets", "name": "Secrets Revealed" }
    ],
    "2": [
      { "groupId": "combat", "name": "Combat Moments" },
      { "groupId": "roleplay", "name": "Roleplay Highlights" }
    ],
    "3": [],
    "4": [],
    "5": [],
    "6": []
  }
}
```

**SessionGroups type:**
```
Record<"1" | "2" | "3" | "4" | "5" | "6", TableGroup[]>
```

**Key mapping:**
| Key | Content Type | Description |
|-----|--------------|-------------|
| `"1"` | SessionLore | Groups for lore revealed this session |
| `"2"` | SessionVignettes | Groups for memorable moments |
| `"3"` | SessionLocations | Groups for locations visited |
| `"4"` | SessionNPCs | Groups for NPCs encountered |
| `"5"` | SessionMonsters | Groups for monsters fought |
| `"6"` | SessionItems | Groups for items found |

**TableGroup type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `groupId` | `string` | Yes | Unique identifier for this group |
| `name` | `string` | Yes | Display name shown in the group header |

**How it works**: Items (e.g., a SessionNPC) have a `groupId` field. If `groupId` matches a group's `groupId`, the item appears under that group's header in the NPCs table.

## Arc Structure

An **Arc** represents a multi-session storyline that spans several game sessions. Arcs help organize campaigns into chapters or acts, tracking the key locations, participants, monsters, and lore relevant to that story segment.

**Purpose**: Arcs provide narrative structure to campaigns. Instead of a flat list of sessions, arcs let you group sessions into story chapters - "The Goblin Kingdom Arc", "The Tournament Arc", etc. Each arc tracks its own content, making it easier to prepare and review specific story segments.

**Key Concepts**:
- **Session Range**: Arcs span from `startSessionNumber` to `endSessionNumber`
- **Participants**: Key NPCs and organizations central to this arc
- **Locations**: Places where arc events occur
- **Monsters**: Recurring or significant creatures in the arc
- **Vignettes**: Key moments planned or occurred in the arc
- **Lore**: Information revealed during this arc
- **Ideas**: Development ideas specific to this arc

```json
{
  "uuid": "JournalEntry.arc1.JournalEntryPage.page1",
  "name": "The Rise of the Dragon Queen",
  "description": "<p>Arc description...</p>",
  "system": {
    "campaignId": "JournalEntry.campaign1.JournalEntryPage.page1",
    "startSessionNumber": 1,
    "endSessionNumber": 5,
    "sortOrder": 0,
    "customFields": {},
    "customFieldHeights": {},
    "img": "",
    "tags": [],
    "storyWebs": [],
    "journals": [],
    "locations": [],
    "participants": [],
    "monsters": [],
    "vignettes": [],
    "lore": [],
    "ideas": [],
    "groups": {
      "1": [],
      "2": [],
      "3": [],
      "4": [],
      "5": [],
      "6": [],
      "7": []
    }
  }
}
```

### Arc System Fields - Complete Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `campaignId` | `string` | Yes | - | UUID of parent campaign |
| `startSessionNumber` | `number` | Yes | - | First session in arc |
| `endSessionNumber` | `number` | Yes | - | Last session in arc |
| `sortOrder` | `number` | Yes | `0` | Sort order among arcs |
| `customFields` | `Record<string, string>` | Yes | `{}` | Custom field name → value mappings |
| `customFieldHeights` | `Record<string, number>` | Yes | `{}` | UI heights for custom fields (in rem) |
| `img` | `string` | Yes | `""` | Image path/URL for arc |
| `tags` | `string[]` | Yes | `[]` | Tag strings |
| `storyWebs` | `string[]` | Yes | `[]` | Story web UUIDs |
| `journals` | `RelatedJournal[]` | Yes | `[]` | Related journal entries (cleared on import) |
| `locations` | `ArcLocation[]` | Yes | `[]` | Locations relevant to this arc |
| `participants` | `ArcParticipant[]` | Yes | `[]` | NPCs/organizations in this arc |
| `monsters` | `ArcMonster[]` | Yes | `[]` | Monsters in this arc |
| `vignettes` | `ArcVignette[]` | Yes | `[]` | Key moments in this arc |
| `lore` | `ArcLore[]` | Yes | `[]` | Lore revealed in this arc |
| `ideas` | `ArcIdea[]` | Yes | `[]` | Ideas for this arc |
| `groups` | `ArcGroups` | Yes | `{}` | Table grouping configurations |

### Arc Location

Links a location entry to an arc with notes about its role.

```json
{
  "uuid": "JournalEntry.location1.JournalEntryPage.page1",
  "notes": "The final confrontation happens here",
  "groupId": null
}
```

**ArcLocation type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | UUID of the location entry |
| `notes` | `string` | Yes | Notes about the location's role in this arc |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

### Arc Participant

Links a character or organization entry to an arc with notes about their role.

```json
{
  "uuid": "JournalEntry.character1.JournalEntryPage.page1",
  "notes": "Main antagonist of this arc",
  "groupId": null
}
```

**ArcParticipant type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | UUID of the character/organization entry |
| `notes` | `string` | Yes | Notes about their role in this arc |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

### Arc Monster

Tracks monsters relevant to this arc.

```json
{
  "uuid": "monster-uuid-placeholder",
  "notes": "Recurring villain's minions",
  "groupId": null
}
```

**ArcMonster type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this monster reference |
| `notes` | `string` | Yes | Notes about the monster's role |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

### Arc Vignette

Key moments planned or occurring in this arc.

```json
{
  "uuid": "vignette-1",
  "description": "The villain's dramatic monologue",
  "groupId": null
}
```

**ArcVignette type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this vignette |
| `description` | `string` | Yes | Description of the key moment |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

### Arc Lore

Lore to be revealed during this arc.

```json
{
  "uuid": "lore-1",
  "description": "The villain's tragic backstory",
  "groupId": null,
  "journalEntryPageId": null
}
```

**ArcLore type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this lore item |
| `description` | `string` | Yes | The lore content |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |
| `journalEntryPageId` | `string \| null` | Yes | Legacy field (leave null) |

### Arc Idea

Ideas for developing this arc.

```json
{
  "uuid": "idea-1",
  "text": "Add a twist about the villain's identity",
  "groupId": null
}
```

**ArcIdea type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Unique ID for this idea |
| `text` | `string` | Yes | The idea text |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

### Arc Groups

Groups organize arc content into visual categories. The `groups` object uses numeric keys that map to specific content types:

```json
{
  "groups": {
    "1": [
      { "groupId": "backstory", "name": "Character Backstories" }
    ],
    "2": [
      { "groupId": "climactic", "name": "Climactic Moments" }
    ],
    "3": [],
    "4": [],
    "5": [],
    "6": [],
    "7": []
  }
}
```

**ArcGroups type:**
```
Record<"1" | "2" | "3" | "4" | "5" | "6" | "7", TableGroup[]>
```

**Key mapping:**
| Key | Content Type | Description |
|-----|--------------|-------------|
| `"1"` | ArcLore | Groups for lore revealed during this arc |
| `"2"` | ArcVignettes | Groups for key moments in the arc |
| `"3"` | ArcLocations | Groups for locations in the arc |
| `"4"` | ArcParticipants | Groups for NPCs/organizations in the arc |
| `"5"` | ArcMonsters | Groups for monsters in the arc |
| `"6"` | ArcIdeas | Groups for development ideas |
| `"7"` | ArcJournals | (Unused - reserved for journal links) |

**TableGroup type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `groupId` | `string` | Yes | Unique identifier for this group |
| `name` | `string` | Yes | Display name shown in the group header |

**How it works**: Items (e.g., an ArcParticipant) have a `groupId` field. If `groupId` matches a group's `groupId`, the item appears under that group's header.

## Front Structure

A **Front** represents an active threat or danger that advances over time, inspired by Dungeon World's front system. Fronts help GMs track looming threats, their progress toward doom, and what happens if the players don't intervene.

**Purpose**: Fronts are your "doom tracker" - they organize threats and show how they escalate. Each front contains dangers (specific threats), each with grim portents (warning signs) and an impending doom (what happens if unchecked). This creates dramatic tension and helps you foreshadow threats.

**Key Concepts**:
- **Dangers**: Specific threats within the front (e.g., "The Orc Warlord", "The Corrupt Priest")
- **Grim Portents**: Warning signs that show the danger progressing (check them off as they occur)
- **Impending Doom**: What happens if the danger is not stopped
- **Participants**: Characters, locations, or organizations involved in the danger

```json
{
  "uuid": "JournalEntry.front1.JournalEntryPage.page1",
  "name": "The Orc Horde",
  "description": "<p>Front description...</p>",
  "system": {
    "campaignId": "JournalEntry.campaign1.JournalEntryPage.page1",
    "dangers": [],
    "customFields": {},
    "customFieldHeights": {},
    "img": "",
    "tags": []
  }
}
```

### Front System Fields - Complete Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `campaignId` | `string` | Yes | - | UUID of parent campaign |
| `dangers` | `Danger[]` | Yes | `[]` | Array of dangers in this front |
| `customFields` | `Record<string, string>` | Yes | `{}` | Custom field name → value mappings |
| `customFieldHeights` | `Record<string, number>` | Yes | `{}` | UI heights for custom fields (in rem) |
| `img` | `string` | Yes | `""` | Image path/URL for front |
| `tags` | `string[]` | Yes | `[]` | Tag strings |

**Field Purposes**:
- **`campaignId`**: Links this front to its parent campaign
- **`dangers`**: The specific threats within this front - each is a separate danger with its own progress
- **`img`**: Visual representation of the threat (e.g., villain portrait, symbol)
- **`tags`**: For organizing and filtering fronts

### Danger Structure

A **Danger** is a specific threat within a front. Each danger has its own trajectory toward doom, represented by grim portents (warning signs) that can be checked off as they occur.

**Purpose**: Dangers break down a front into manageable threats. A "The Orc Horde" front might have dangers like "The Orc Warlord" and "The Corrupted Druid". Each tracks its own progress separately.

```json
{
  "dangers": [
    {
      "name": "The Orc Warlord",
      "description": "A ruthless leader uniting the tribes",
      "impendingDoom": "The valley burns",
      "motivation": "Conquest and glory",
      "participants": [
        {
          "uuid": "JournalEntry.character1.JournalEntryPage.page1",
          "role": "The Warlord"
        }
      ],
      "grimPortents": [
        {
          "uuid": "portent-1",
          "description": "Scouts report increased orc activity",
          "complete": true
        },
        {
          "uuid": "portent-2",
          "description": "A village is raided",
          "complete": false
        }
      ]
    }
  ]
}
```

**Danger type:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | `string` | Yes | `""` | Danger name |
| `description` | `string` | Yes | `""` | Brief description of the danger |
| `impendingDoom` | `string` | Yes | `""` | What happens if the danger is unchecked |
| `motivation` | `string` | Yes | `""` | The danger's motivation/drive |
| `participants` | `DangerParticipant[]` | Yes | `[]` | Characters/locations/orgs involved |
| `grimPortents` | `GrimPortent[]` | Yes | `[]` | Steps toward the impending doom |

**Field Purposes**:
- **`name`**: A evocative name for the danger (e.g., "The Shadow King", "The Plague of Undeath")
- **`description`**: What this danger is and why it's threatening
- **`impendingDoom`**: The catastrophic outcome if players don't intervene (e.g., "The kingdom falls to darkness")
- **`motivation`**: What drives this danger - helps you roleplay and make decisions
- **`participants`**: Links to entries (characters, locations, organizations) involved in this danger
- **`grimPortents`**: Warning signs that show the danger progressing - check them off as they occur

### Grim Portent

A **Grim Portent** is a warning sign that shows the danger progressing toward its doom. As grim portents occur (are marked complete), the danger gets closer to its impending doom.

**Purpose**: Grim portents create a visible "doom track" - a series of events that show the threat escalating. This lets you foreshadow danger and gives players opportunities to intervene before it's too late.

```json
{
  "uuid": "unique-portent-id",
  "description": "Description of the portent",
  "complete": false
}
```

**GrimPortent type:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `uuid` | `string` | Yes | - | Unique ID for this portent (not a document UUID) |
| `description` | `string` | Yes | `""` | Description of what happens |
| `complete` | `boolean` | Yes | `false` | Whether this portent has occurred |

**Example progression**:
1. "Scouts report increased orc activity" (complete)
2. "A village is raided" (complete)
3. "The orc army marches on the capital" (not complete)
4. "The valley burns" (impending doom)

### Danger Participant

Links an entry to a danger with a role:

```json
{
  "uuid": "JournalEntry.character1.JournalEntryPage.page1",
  "role": "The Mastermind"
}
```

**DangerParticipant type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | UUID of the character/location/organization entry |
| `role` | `string` | Yes | The role this entity plays in the danger |

## Story Web Structure

A **Story Web** is a visual relationship map that shows connections between entities. Think of it as a mind map or network diagram where nodes are characters, locations, organizations, or custom elements, and edges are the relationships between them.

**Purpose**: Story webs help visualize complex relationship networks that are hard to see in text. They're great for tracking political intrigue, family trees, faction alliances, or any interconnected web of relationships. You can create multiple story webs for different purposes (e.g., "Political Landscape", "Character Relationships", "Plot Threads").

**Key Concepts**:
- **Nodes**: Entities in the web - can be entries (characters, locations, orgs) or custom elements
- **Edges**: Connections between nodes with optional labels
- **Positions**: Where each node appears on the canvas (for layout)
- **Styles**: Visual styling (colors, etc.) for nodes and edges

```json
{
  "uuid": "JournalEntry.storyweb1.JournalEntryPage.page1",
  "name": "Main Plot Connections",
  "description": null,
  "system": {
    "campaignId": "JournalEntry.campaign1.JournalEntryPage.page1",
    "nodes": [],
    "edges": [],
    "positions": {},
    "edgeStyles": {},
    "nodeStyles": {}
  }
}
```

### Story Web System Fields - Complete Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `campaignId` | `string` | Yes | - | UUID of parent campaign |
| `nodes` | `StoryWebNode[]` | Yes | `[]` | Array of nodes in the web |
| `edges` | `StoryWebEdge[]` | Yes | `[]` | Array of edges (connections) |
| `positions` | `Record<string, { x: number; y: number }>` | Yes | `{}` | Node positions keyed by UUID |
| `edgeStyles` | `Record<string, EdgeStyle>` | Yes | `{}` | Edge styling keyed by edge UUID |
| `nodeStyles` | `Record<string, NodeStyle>` | Yes | `{}` | Node styling keyed by node UUID |

**Field Purposes**:
- **`campaignId`**: Links this story web to its parent campaign
- **`nodes`**: The entities in the web - can reference entries or be custom nodes
- **`edges`**: The connections between nodes with optional labels
- **`positions`**: Canvas coordinates for each node (set when user arranges the web)
- **`edgeStyles`**: Visual styling for edges (color, line style)
- **`nodeStyles`**: Visual styling for nodes (color scheme)

### Story Web Node

A **Node** represents an entity in the story web. Nodes can reference existing entries (characters, locations, organizations, PCs) or be custom elements (concepts, events, etc.).

**Purpose**: Nodes are the vertices in your relationship graph. Entry nodes link to actual entries in your setting, while custom nodes let you add arbitrary elements to the web.

```json
{
  "nodes": [
    {
      "uuid": "JournalEntry.character1.JournalEntryPage.page1",
      "label": null,
      "type": "character",
      "source": "explicit"
    },
    {
      "uuid": "custom-node-1",
      "label": "The Prophecy",
      "type": "custom",
      "source": "custom"
    }
  ]
}
```

**StoryWebNode type:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `uuid` | `string` | Yes | - | UUID of the node (entry UUID or custom ID) |
| `label` | `string \| null` | Yes | `null` | Custom label (null to use entry name) |
| `type` | `"character" \| "location" \| "organization" \| "pc" \| "danger" \| "custom"` | Yes | - | Node type (see below) |
| `source` | `"explicit" \| "implicit" \| "custom"` | Yes | - | How the node was created (see below) |

**Node Types:**
| Type | Description |
|------|-------------|
| `"character"` | Character entry (topic=1) |
| `"location"` | Location entry (topic=2) |
| `"organization"` | Organization entry (topic=3) |
| `"pc"` | PC entry (topic=4) |
| `"danger"` | Danger from a front |
| `"custom"` | Free-form custom node |

**Node Sources:**
| Source | Description |
|--------|-------------|
| `"explicit"` | User-added node |
| `"implicit"` | Auto-added from an edge reference |
| `"custom"` | Custom free-form node |

### Story Web Edge

An **Edge** represents a connection between two nodes. Edges show how entities relate to each other and can include a label describing the relationship.

**Purpose**: Edges are the lines connecting your nodes. They show relationships - "allies with", "enemies of", "parent of", "member of", etc. The label makes the relationship explicit.

```json
{
  "edges": [
    {
      "uuid": "uuid1:uuid2",
      "from": "JournalEntry.character1.JournalEntryPage.page1",
      "to": "JournalEntry.character2.JournalEntryPage.page1",
      "label": "Rivalry"
    }
  ]
}
```

**StoryWebEdge type:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `uuid` | `string` | Yes | - | Edge UUID (sorted `from:to` format) |
| `from` | `string` | Yes | - | UUID of the source node |
| `to` | `string` | Yes | - | UUID of the target node |
| `label` | `string` | Yes | `""` | Label for the connection |

The `uuid` field is the sorted concatenation of `from` and `to` UUIDs with a colon separator.

### Story Web Positions

**Positions** store the canvas coordinates for each node. These are set when users drag nodes to arrange the web.

**Purpose**: Positions persist the layout so the web looks the same when reopened. Without positions, nodes would need to be auto-arranged each time.

```json
{
  "positions": {
    "JournalEntry.character1.JournalEntryPage.page1": { "x": 100, "y": 200 },
    "JournalEntry.character2.JournalEntryPage.page1": { "x": 300, "y": 200 }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `x` | number | X coordinate in pixels |
| `y` | number | Y coordinate in pixels |

### Story Web Edge Styles

**Edge Styles** define visual appearance of edges (color, line style).

**Purpose**: Styling lets you visually distinguish different types of relationships - red for hostile, green for allied, dashed for tentative, etc.

```json
{
  "edgeStyles": {
    "uuid1:uuid2": { "colorId": "default", "styleId": "solid" }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `colorId` | string | Yes | Color ID from module settings |
| `styleId` | string | Yes | Style ID from module settings |

### Story Web Node Styles

**Node Styles** define visual appearance of nodes (color scheme).

**Purpose**: Styling lets you visually group or highlight certain nodes - important characters in red, locations in blue, etc.

```json
{
  "nodeStyles": {
    "JournalEntry.character1.JournalEntryPage.page1": { "colorSchemeId": "blue" }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `colorSchemeId` | string | Yes | Color scheme ID from module settings |

## Text Content

The `description` field on any document can contain rich HTML content. This is where the main body text goes - NPC backgrounds, location descriptions, session summaries, etc.

**Purpose**: The description field is the primary content area for each document. It supports full HTML formatting, allowing you to create richly formatted content with headings, lists, tables, images, and links to other documents.

```json
{
  "description": "<h2>Overview</h2><p>This is <strong>bold</strong> text.</p><ul><li>Item 1</li><li>Item 2</li></ul>"
}
```

### Linking to Other Documents

Use Foundry's UUID link format to create cross-references:

```json
{
  "description": "<p>See <a data-uuid=\"JournalEntry.entry1.JournalEntryPage.page1\">Gandalf</a> for more details.</p>"
}
```

Or the inline reference format:
```json
{
  "description": "<p>The wizard @UUID[JournalEntry.entry1.JournalEntryPage.page1]{Gandalf} appears.</p>"
}
```

## Shared Types Reference

### RelatedJournal

Used in entries, campaigns, arcs, and sessions to link to Foundry journal entries. This allows cross-referencing between Campaign Builder content and other Foundry journals.

**Purpose**: Link Campaign Builder documents to external Foundry journals for expanded content. For example, an NPC entry might link to a detailed journal page with their full backstory, or a session might link to a journal with house rules referenced.

```json
{
  "uuid": "journalUuid|pageUuid|anchor-slug",
  "journalUuid": "JournalEntry.abc123",
  "pageUuid": "JournalEntry.abc123.JournalEntryPage.xyz789",
  "anchor": { "slug": "section-name", "name": "Section Name" },
  "packId": null,
  "packName": null,
  "groupId": null
}
```

**RelatedJournal type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid` | `string` | Yes | Composite key: `journalUuid\|pageUuid\|anchor-slug` |
| `journalUuid` | `string` | Yes | UUID of the JournalEntry |
| `pageUuid` | `string \| null` | Yes | UUID of the JournalEntryPage (if any) |
| `anchor` | `Anchor \| null` | Yes | Anchor link details |
| `packId` | `string \| null` | Yes | Compendium pack ID (cleared on import) |
| `packName` | `string \| null` | Yes | Compendium pack name (cleared on import) |
| `groupId` | `string \| null` | Yes | Group ID for table grouping |

**Anchor type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | Yes | URL-safe anchor identifier |
| `name` | `string` | Yes | Display name for the anchor |

### TableGroup

Used for grouping items in tables. Groups let users organize content into logical categories.

**Purpose**: Groups provide visual organization in tables. For example, you might group lore by "Main Plot" vs "Side Quests", or NPCs by "Allies" vs "Enemies".

```json
{
  "groupId": "group-1",
  "name": "Main Plot"
}
```

**TableGroup type:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `groupId` | `string` | Yes | Unique group identifier |
| `name` | `string` | Yes | Display name for the group |

### ExtraFields (in Relationships)

Key-value pairs for relationship-specific data. These allow you to attach arbitrary information to a relationship.

**Purpose**: Store relationship-specific notes like the type of relationship ("Friend", "Enemy", "Family") and additional context. The system uses certain keys like `relationship` and `notes`, but you can add any custom fields.

```json
[
  { "key": "relationship", "value": "Friend" },
  { "key": "notes", "value": "Met in session 1" }
]
```

Common keys used by the system:
- `relationship` - The type of relationship (e.g., "Friend", "Enemy", "Family")
- `notes` - Additional notes about the relationship

## Complete Example

Here's a minimal complete example:

```json
{
  "version": "1.0.0",
  "exportedAt": "2025-01-15T12:00:00.000Z",
  "exportMode": "all",
  "moduleSettings": null,
  "settings": [
    {
      "uuid": "JournalEntry.setting1.JournalEntryPage.page1",
      "name": "My Adventure",
      "description": "<p>A fantasy adventure setting.</p>",
      "system": {
        "topics": {
          "1": {
            "topic": 1,
            "types": ["NPC"],
            "topNodes": ["JournalEntry.char1.JournalEntryPage.page1"],
            "entries": {
              "JournalEntry.char1.JournalEntryPage.page1": {
                "uuid": "JournalEntry.char1.JournalEntryPage.page1",
                "name": "Gandalf",
                "type": "NPC"
              }
            }
          },
          "2": {
            "topic": 2,
            "types": ["City"],
            "topNodes": ["JournalEntry.loc1.JournalEntryPage.page1"],
            "entries": {
              "JournalEntry.loc1.JournalEntryPage.page1": {
                "uuid": "JournalEntry.loc1.JournalEntryPage.page1",
                "name": "Minas Tirith",
                "type": "City"
              }
            }
          },
          "3": { "topic": 3, "types": [], "topNodes": [], "entries": {} },
          "4": { "topic": 4, "types": [], "topNodes": [], "entries": {} }
        },
        "campaignIndex": [
          {
            "uuid": "JournalEntry.camp1.JournalEntryPage.page1",
            "name": "Main Campaign",
            "completed": false,
            "arcs": []
          }
        ],
        "hierarchies": {},
        "expandedIds": {},
        "genre": "Fantasy",
        "settingFeeling": "Epic adventure",
        "img": "",
        "nameStyles": [],
        "rollTableConfig": null,
        "nameStyleExamples": { "genre": "", "settingFeeling": "", "examples": [] },
        "journals": [],
        "customFields": {},
        "customFieldHeights": {},
        "tags": {}
      },
      "documents": {
        "entries": [
          {
            "uuid": "JournalEntry.char1.JournalEntryPage.page1",
            "name": "Gandalf",
            "description": "<p>A wise old wizard.</p>",
            "system": {
              "topic": 1,
              "type": "NPC",
              "tags": ["wizard"],
              "customFields": {},
              "customFieldHeights": {},
              "relationships": {},
              "scenes": [],
              "actors": [],
              "journals": [],
              "foundryDocuments": [],
              "speciesId": "",
              "playerName": null,
              "actorId": null,
              "background": null,
              "img": "",
              "voiceRecordingPath": null
            }
          },
          {
            "uuid": "JournalEntry.loc1.JournalEntryPage.page1",
            "name": "Minas Tirith",
            "description": "<p>The white city.</p>",
            "system": {
              "topic": 2,
              "type": "City",
              "tags": [],
              "customFields": {},
              "customFieldHeights": {},
              "relationships": {},
              "scenes": [],
              "actors": [],
              "journals": [],
              "foundryDocuments": [],
              "speciesId": "",
              "playerName": null,
              "actorId": null,
              "background": null,
              "img": "",
              "voiceRecordingPath": null
            }
          }
        ],
        "campaigns": [
          {
            "uuid": "JournalEntry.camp1.JournalEntryPage.page1",
            "name": "Main Campaign",
            "description": "<p>The main adventure.</p>",
            "system": {
              "currentSessionNumber": 0,
              "currentSessionId": null,
              "customFields": {},
              "customFieldHeights": {},
              "sessionIndex": [],
              "arcIndex": [],
              "frontIds": [],
              "storyWebIds": [],
              "storyWebs": [],
              "lore": [],
              "img": "",
              "toDoItems": [],
              "ideas": [],
              "journals": [],
              "pcs": [],
              "groups": {
                "toDoItems": [],
                "ideas": [],
                "lore": [],
                "pcs": []
              },
              "completed": false
            }
          }
        ],
        "sessions": [],
        "arcs": [],
        "fronts": [],
        "storyWebs": []
      }
    }
  ]
}
```

## Best Practices for LLMs

1. **Consistent UUIDs**: Use the same UUID format and values throughout the file when referencing the same entity.

2. **Build Relationships Properly**:
   - Add entries to `topics[topicId].entries`
   - Add root entries to `topics[topicId].topNodes`
   - Add hierarchy entries to `hierarchies`
   - Link entries via `relationships`

3. **Hierarchies for Locations**: Use the hierarchy system to create nested locations (regions → cities → buildings).

4. **Session Numbering**: Sessions must have sequential `number` values within a campaign.

5. **Arc Session Ranges**: Arcs should have `startSessionNumber` and `endSessionNumber` that encompass relevant sessions.

6. **Story Web Nodes**: When adding edges, ensure both nodes exist in the `nodes` array.

7. **Empty Arrays**: Use `[]` for empty arrays, not `null`, to avoid type issues.

8. **HTML in Descriptions**: Use proper HTML entities for special characters in description text.

9. **Date Format**: Use ISO 8601 format for dates: `"2025-01-15"` or full timestamps `"2025-01-15T12:00:00.000Z"`.

10. **Topic IDs**: Remember: 1=Character, 2=Location, 3=Organization, 4=PC.
