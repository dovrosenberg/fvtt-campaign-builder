---
title: Entry relationship tabs
prev: 
  text: 'Generate Button'
  link: './generate'
next: 
  text: 'Entry sessions tab'
  link: './sessions'
---
# Entry relationship tabs
![Relationship tab](/assets/images/related-items-tabs.webp)

After the Description tab, every Entry has three "relationship" tabs that are used to show the relationships between them.  For example, two characters might be siblings or an organization might be based in a particular location.

Each tab shows one type of related Entry - [^Characters], [^Locations], and [^Organizations] - but they all work the same way.

## Adding related entries
Click "Add Location/Organization/Character" to create a new relationship.  You can also create a new [^Entry] at the same time from that dialog by pressing "Create"

![Add relationship dialog](/assets/images/add-relationship-dialog.webp)

You can also drag and drop any Entry from the [^Setting Directory] onto the box at the top instead.

## Extra fields
Some connectionships have additional fields to capture info about the relationship itself.

### Role
For the relationship between a Character and either a Location or Organization, there is an extra field available - "Role".  This lets you describe how the Character is related.  For example, Joe might be the "Mayor" of Mainville.  This role is bi-directional (i.e. if you edit it on the Joe side, you'll see that reflected on the Mainville side).  

### Relationship
When you connect two characters, two locations, or two organizations, there is an extra field available - "Relationship".  This lets you describe how the two are related.  For example, two kingdoms might be allies or two people might be friends.  This relationship is bi-directional (i.e. the same text shows on both sides).  This generally isn't a problem other than things like parent-child relationships where there isn't a good common word.  In these cases, I recommend just saying "mother/son" or whatever, which generally sufficient.

## The related entry list
This list shows each of the related Entries.  You can click on the name to open that Entry (hold 'Control' to do it in a new tab).  You can click the Edit button or the role field text to modify the "Role" that describes the relationship (hit Enter to save).

Relationships are bi-directional, so creating a relationship, updating the role, and deleting a relationship on one side all automatically impact the Entry on the other side (i.e. if Joe is related to Mainville, then Mainville will be related to Joe).
