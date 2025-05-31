---
title: World Building Interface (Settings)
TODO: true
---
# World Building Interface (Settings)

The Settings Directory is your primary workspace for creating and managing world building content. This section covers all aspects of the world building interface, from the directory structure to specific content types.

## Settings Directory Overview

### What is the Settings Directory?
The Settings Directory (also called the Entry Directory) is the top half of the directory sidebar that contains all your world building content:

- **Characters**: NPCs and important figures
- **Locations**: Places, buildings, and geographic features  
- **Organizations**: Factions, guilds, governments, and groups
- **Hierarchical organization** with parent-child relationships
- **Topic-based organization** for logical grouping
- **Context menus** for creation and management

### Directory Structure
Content in the Settings Directory is organized in several ways:

**By Topic** (Default view):
```
Setting Name
├── Topic: Government
│   ├── King Aldric
│   └── Royal Council
├── Topic: Locations
│   ├── Capital City
│   │   ├── Royal Palace
│   │   └── Market District
│   └── Frontier Towns
└── Topic: Organizations
    ├── Royal Guard
    └── Merchant's Guild
```

**By Type** (Alternative view):
```
Setting Name
├── Characters
│   ├── King Aldric
│   └── Council Members
├── Locations
│   ├── Capital City
│   └── Frontier Towns
└── Organizations
    ├── Royal Guard
    └── Merchant's Guild
```

## Core World Building Interface Elements

### [Entry Content and Relationships](Entry.md)
Understanding the common elements shared by all world building content types.

- Content structure and fields
- Relationship system
- Reference images
- Tagging and organization
- Cross-references and links

### [Character Content Interface](characters.md)
Specific interface elements for creating and managing character entries.

- Character-specific fields and options
- Portrait and image management
- Relationship tracking
- Actor integration with Foundry VTT

### [Location Content Interface](locations.md)
Location-specific interface features and functionality.

- Location hierarchy and parent-child relationships
- Scene integration and pushing to Foundry
- Map and image references
- Geographic organization

### [Organization Content Interface](organizations.md)
Organization and faction management interface elements.

- Membership and hierarchy tracking
- Relationship webs between organizations
- Resource and territory management
- Conflict and alliance tracking

### [Reference Images Management](images.md)
How images work across all content types in the world building interface.

- Image upload and management
- Display options and galleries
- Integration with Foundry VTT assets
- Performance and organization

## Settings Directory Features

### Context Menus
Right-clicking in the Settings Directory provides different options based on location:

**On Setting/World Name**:
- Create new Campaign
- Delete Setting (with confirmation)
- Setting properties and preferences

**On Topic Folders**:
- Create new entry in that topic
- Generate new entry (if AI features enabled)
- Organize topic contents
- Rename or delete topic

**On Individual Entries**:
- Edit entry properties
- Duplicate entry
- Move to different topic
- Delete entry (with confirmation)
- Export entry data

### Directory Management

**Creating New Content**:
1. **Right-click** on appropriate topic or location
2. **Select creation option** (New Character, New Location, etc.)
3. **Choose entry type** and basic properties
4. **Begin editing** in main content area

**Organizing Content**:
- **Drag and drop** entries to reorganize
- **Create parent-child relationships** by dragging onto other entries
- **Use topic folders** for logical grouping
- **Filter and search** to find specific content

**Hierarchy Management**:
- **Parent-child relationships** for locations and organizations
- **Drag entries** onto others to create hierarchies
- **Edit parent field** directly in content editor
- **Visual hierarchy** displayed in directory tree

### View Options

**Group by Topic** (Default):
- Organizes content by topic/category
- Shows hierarchical relationships
- Maintains logical groupings
- Best for most campaign organization

**Group by Type**:
- Organizes content by entry type (Character, Location, Organization)
- Flattens hierarchies
- Useful for type-specific management
- Better for large campaigns with many topics

**Filtering**:
- **Text filter** to show only matching entries
- **Type filter** to show specific content types
- **Tag filter** for custom organization
- **Recently modified** and other smart filters

## Integration Features

### Search Integration
- **Global search** across all world content
- **Topic-specific search** within categories
- **Relationship search** to find connected content
- **Tag and metadata search** for advanced filtering

### Foundry VTT Integration
- **Actor creation** from character entries
- **Scene pushing** from location entries  
- **Handout generation** for sharing with players
- **Token and portrait synchronization**

### Campaign Integration
- **Link world content** to campaign elements
- **Reference in sessions** without duplication
- **Track usage** across campaigns
- **Maintain consistency** between world and campaign content

## Workflow Integration

### Content Creation Workflow
1. **Start with core concept** (character, location, organization)
2. **Create basic entry** with essential information
3. **Build relationships** with existing content
4. **Add reference materials** and images
5. **Test integration** with campaign content

### Content Development Workflow
1. **Create placeholder entries** for related content
2. **Develop detailed descriptions** and background
3. **Establish relationship webs** between elements
4. **Add visual references** and maps
5. **Connect to campaign storylines**

### Content Management Workflow
1. **Regular review** and update of existing content
2. **Relationship maintenance** as campaigns evolve
3. **Archive or reorganize** outdated content
4. **Backup and export** important world data

## Best Practices

### Organization Strategies
- **Start simple** with basic topic organization
- **Build hierarchies gradually** as content grows
- **Use consistent naming** conventions throughout
- **Group related content** in logical topics
- **Regular maintenance** to keep organization clean

### Content Development
- **Create core content first** before adding details
- **Build relationship webs** to create living world
- **Use reference images** to enhance descriptions
- **Plan for campaign integration** from the beginning
- **Document sources** and inspiration for consistency

### Performance Optimization
- **Organize large campaigns** into manageable topics
- **Use filtering** to focus on relevant content
- **Regular cleanup** of unused or outdated entries
- **Optimize images** for performance
- **Consider content archiving** for completed campaigns

## Troubleshooting

### Common Issues
- **Content not appearing**: Check filters and view settings
- **Hierarchy problems**: Verify parent-child relationships
- **Performance issues**: Consider content organization and cleanup
- **Integration problems**: Check Foundry VTT connection and permissions

### Maintenance Tasks
- **Regular backups** of world content
- **Periodic organization** review and cleanup
- **Relationship verification** and maintenance
- **Image management** and optimization
- **Export important content** for safekeeping

The Settings Directory and world building interface provide powerful tools for creating rich, interconnected campaign worlds. Master these features to build compelling settings that enhance your storytelling and provide rich resources for campaign development. 

## Where's all this stored?
For the curious, each Setting has its own folder in your compendia (inside a top-level folder called 'Campaign Builder').  Inside the Setting folder is a compendium for the Setting.  All of the module's data is stored in Journal Entries inside this compendium.  *Don't mess with it if you want everything to keep working.*
