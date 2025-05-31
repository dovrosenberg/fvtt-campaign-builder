---
title: Location Content Interface
---

# Location Content Interface

Locations are the physical spaces where your adventures take place. The location content interface provides specialized tools for creating detailed settings, managing geographic hierarchies, and integrating with Foundry VTT scenes.

## Location Content Structure

### Basic Location Information

**Name and Description**
- **Entry name**: The location's primary identifier
- **Alternative names**: Nicknames, historical names, or local variants
- **Brief description**: One-line summary for quick reference
- **Detailed description**: Full description with atmospheric details
- **Type classification**: Settlement, building, natural feature, etc.

**Geographic Information**
- **Parent location**: Geographic container (city contains districts)
- **Child locations**: Sub-locations within this area
- **Adjacent locations**: Neighboring or connected areas
- **Scale indicator**: Room, building, district, city, region
- **Coordinates**: If using mapping systems

### Location-Specific Fields

**Physical Characteristics**
- **Size**: Dimensions or general scale
- **Population**: If applicable for settlements
- **Climate**: Weather patterns and seasonal variations
- **Terrain**: Geographic features and landscape
- **Resources**: Natural or manufactured resources available

**Functional Information**
- **Purpose**: Primary function or use
- **Services**: What services are available here
- **Governance**: Who controls or manages the location
- **Economy**: Economic activity and trade
- **Defense**: Security measures and fortifications

**Access and Travel**
- **Entrances**: How to enter the location
- **Transportation**: Available transport methods
- **Travel times**: To other locations
- **Restrictions**: Access limitations or requirements
- **Hidden areas**: Secret or concealed spaces

## Hierarchy Management

### Parent-Child Relationships

**Creating Hierarchies**
1. **Drag and drop**: Drag location onto another to make it a child
2. **Parent field**: Select parent from dropdown in editor
3. **Visual indicators**: Indentation shows hierarchy in directory
4. **Multiple levels**: Support for deep hierarchical structures

**Hierarchy Examples**
```
Kingdom of Aldoria
├── Capital City of Goldenhaven
│   ├── Royal District
│   │   ├── Royal Palace
│   │   │   ├── Throne Room
│   │   │   └── Royal Library
│   │   └── Noble Quarter
│   ├── Merchant District
│   │   ├── Grand Bazaar
│   │   └── Guildhall Square
│   └── Harbor District
├── Town of Millbrook
└── The Ancient Forest
    ├── Druid Grove
    └── Ruins of Kar'thul
```

**Hierarchy Benefits**
- **Logical organization**: Intuitive geographic structure
- **Quick navigation**: Easy to find related locations
- **Context awareness**: Understanding location relationships
- **Campaign coherence**: Consistent world geography

### Relationship Types

**Geographic Containment**
- Parent location physically contains child location
- Automatic relationship establishment
- Navigation and reference assistance
- Logical organization structure

**Adjacent Locations**
- Locations that border or neighbor each other
- Travel and distance calculations
- Regional organization and planning
- Geographic consistency checking

**Connected Locations**
- Locations linked by specific routes or passages
- Transportation and travel planning
- Adventure path development
- World continuity maintenance

## Scene Integration

### Foundry VTT Scene Linking

**Linking Process**
1. **Create or select scene** in Foundry VTT
2. **Open location** in Campaign Builder
3. **Click "Link Scene" button** in location interface
4. **Select scene** from dropdown list of available scenes
5. **Confirm linking** and save location

**Scene Push Feature**
- **Right-click on location** in directory sidebar
- **Select "Push to Scene"** from context menu
- **Automatically activates** the linked scene in Foundry
- **Players see scene immediately** without manual activation
- **GM control over scene transitions**

**Benefits of Scene Linking**
- **Seamless transitions** between narrative and tactical play
- **Consistent scene management** throughout campaign
- **Quick scene activation** during sessions
- **Player immersion** through smooth transitions

### Scene Management

**Scene Preparation**
- **Link scenes during preparation** phase
- **Test scene pushing** before sessions
- **Organize scenes** by campaign arc or session
- **Prepare multiple scenes** for player choice scenarios

**During Session Use**
1. **Navigate to location** in Campaign Builder
2. **Right-click for scene push** when players arrive
3. **Scene activates immediately** for all players
4. **Continue narrative** with visual scene support

**Scene Organization**
- **Name scenes consistently** with location names
- **Group related scenes** in Foundry folders
- **Use scene notes** to cross-reference campaign content
- **Maintain scene-location links** as campaign evolves

## Reference Materials

### Maps and Images

**Location Maps**
- **Upload or link maps** showing location layout
- **Annotated maps** with points of interest
- **Multiple scales** (overview, detailed, room-level)
- **Player vs. GM versions** with different detail levels

**Reference Images**
- **Architectural references** for building style
- **Landscape images** for natural locations
- **Mood and atmosphere** images for description aid
- **Historical references** for ancient or ruined locations

**Image Management**
- **Primary image**: Main visual reference
- **Image gallery**: Multiple perspectives and details
- **Seasonal variations**: Different weather or time conditions
- **Before/after images**: Changes over time

### Descriptive Tools

**Atmosphere and Mood**
- **Sensory descriptions**: Sights, sounds, smells, textures
- **Emotional tone**: How the location should feel
- **Time-based variations**: Day/night, seasonal changes
- **Weather effects**: How conditions affect the location

**Interactive Elements**
- **Points of interest**: Notable features players can examine
- **Interactive objects**: Things players can manipulate
- **Hidden elements**: Secrets requiring investigation
- **Dynamic features**: Elements that change based on events

## Location Types and Templates

### Settlement Templates

**City Features**
- **Districts and quarters**: Organized by function or class
- **Government buildings**: Administrative centers
- **Commercial areas**: Markets, shops, guildhalls
- **Residential zones**: Housing for different social classes
- **Industrial areas**: Manufacturing and crafting
- **Religious sites**: Temples, shrines, cemeteries

**Town and Village Features**
- **Central square**: Social and commercial hub
- **Key buildings**: Inn, temple, marketplace, smithy
- **Residential areas**: Housing for locals
- **Surrounding areas**: Farms, mills, pastoral lands
- **Local landmarks**: Unique features defining the settlement

### Building Templates

**Taverns and Inns**
- **Common room**: Main social area
- **Private rooms**: Guest accommodations
- **Kitchen and storage**: Service areas
- **Stable**: Animal care and equipment storage
- **Private quarters**: Owner and staff living areas

**Temples and Religious Sites**
- **Main sanctuary**: Primary worship space
- **Private chambers**: Clergy quarters and offices
- **Ritual spaces**: Special ceremony areas
- **Storage and archives**: Religious texts and artifacts
- **Community spaces**: Meeting and teaching areas

**Noble Residences**
- **Great hall**: Formal reception and entertainment
- **Private quarters**: Family living spaces
- **Service areas**: Kitchen, storage, servant quarters
- **Defensive features**: Walls, gates, guard posts
- **Grounds**: Gardens, courtyards, outbuildings

### Natural Location Templates

**Wilderness Areas**
- **Terrain features**: Hills, valleys, water features
- **Vegetation**: Forest types, plant life
- **Wildlife**: Animals and their habitats
- **Hidden features**: Caves, ruins, secret locations
- **Travel challenges**: Obstacles and hazards

**Underground Locations**
- **Cave systems**: Natural formation networks
- **Constructed areas**: Deliberately built spaces
- **Water features**: Underground rivers and pools
- **Access points**: Entrances and connections to surface
- **Hidden chambers**: Secret or concealed areas

## Advanced Location Features

### Dynamic Elements

**Time-Based Changes**
- **Daily variations**: Day/night activity differences
- **Seasonal changes**: Weather and activity patterns
- **Event-driven changes**: How story events affect location
- **Population fluctuations**: Varying numbers of inhabitants

**Player Impact Tracking**
- **Player modifications**: Changes made by player actions
- **Reputation effects**: How player actions affect reception
- **Economic impact**: Player influence on local economy
- **Political changes**: Player effect on local governance

### Campaign Integration

**Story Integration**
- **Adventure hooks**: Plot elements originating from location
- **Recurring importance**: Locations players return to
- **Campaign milestones**: Significant events at location
- **Character connections**: PC ties to location

**Cross-Location Connections**
- **Trade relationships**: Economic links between locations
- **Political alliances**: Governmental connections
- **Cultural ties**: Shared traditions or histories
- **Conflict relationships**: Tensions or wars between locations

## Interface Customization

### Display Options

**Content Organization**
- **Collapsible sections**: Hide/show different information types
- **Tab organization**: Separate tabs for different content areas
- **Priority information**: Most important details prominently displayed
- **Quick reference**: Essential information at-a-glance

**Visual Layout**
- **Image placement**: Where reference images appear
- **Text formatting**: Styling for different content types
- **Relationship display**: How connections are shown
- **Hierarchy visualization**: Parent-child relationship display

### Workflow Integration

**Preparation Mode**
- **Full editing capabilities**: All fields and options available
- **Advanced organization**: Complete hierarchy management
- **Image management**: Full upload and organization tools
- **Scene linking**: Complete Foundry integration

**Play Mode**
- **Essential information**: Key details prominently displayed
- **Quick scene pushing**: One-click scene activation
- **Simplified interface**: Reduced clutter for session focus
- **Quick reference**: Fast access to important details

## Best Practices

### Location Development
1. **Start with function**: What is this location's purpose?
2. **Add physical details**: What does it look and feel like?
3. **Establish connections**: How does it relate to other locations?
4. **Plan for players**: What will players do here?
5. **Prepare scenes**: Link appropriate Foundry scenes

### Organization Strategies
- **Use hierarchies effectively**: Logical geographic organization
- **Consistent naming**: Clear, memorable location names
- **Regular maintenance**: Keep relationships and links current
- **Player accessibility**: Ensure important locations are easy to find

### Session Integration
- **Pre-link scenes**: Connect scenes before sessions
- **Test scene pushing**: Verify functionality before play
- **Organize by session**: Group locations by when they'll be used
- **Quick reference**: Have key information easily accessible

The location interface provides powerful tools for creating immersive, well-organized geographic content that integrates seamlessly with your Foundry VTT sessions. Master these features to create compelling locations that enhance your storytelling and provide rich environments for player exploration. 