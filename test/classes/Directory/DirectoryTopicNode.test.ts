import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { DirectoryTopicNode } from '@/classes/Directory/DirectoryTopicNode';
import { CollapsibleNode } from '@/classes/Directory/CollapsibleNode';
import { TopicFolder } from '@/classes/TopicFolder';
import { Entry } from '@/classes/Entry';
import { WBWorld } from '@/classes/WBWorld';
import { Topics } from '@/types';
import * as sinon from 'sinon';

export const registerDirectoryTopicNodeTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Directory.DirectoryTopicNode',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('DirectoryTopicNode', () => {
        let mockWorld: WBWorld;
        let mockTopicFolder: TopicFolder;
        let mockEntry: Entry;
        let topicNode: DirectoryTopicNode;

        beforeEach(() => {
          // Create a mock world
          mockWorld = {
            uuid: 'world-uuid',
            expandNode: sinon.stub().resolves(),
            collapseNode: sinon.stub().resolves(),
            expandedIds: {
              'topic-folder-uuid': true
            },
            getEntryHierarchy: sinon.stub().returns({
              parentId: null,
              children: [],
              ancestors: [],
              type: 'Character'
            })
          } as unknown as WBWorld;

          // Create a mock entry
          mockEntry = {
            uuid: 'entry-uuid',
            name: 'Test Entry',
            type: 'Character',
            topic: Topics.Character
          } as unknown as Entry;

          // Create a mock topic folder
          mockTopicFolder = {
            uuid: 'topic-folder-uuid',
            topic: Topics.Character,
            topNodes: ['entry-uuid'],
            allEntries: sinon.stub().returns([mockEntry]),
            filterEntries: sinon.stub().returns([mockEntry])
          } as unknown as TopicFolder;

          // Set the current world
          CollapsibleNode.currentWorld = mockWorld;

          // Create a topic node
          topicNode = new DirectoryTopicNode(
            'topic-folder-uuid',
            'topic-folder-uuid',
            mockTopicFolder,
          );
        });

        afterEach(() => {
          sinon.restore();
          CollapsibleNode.currentWorld = null;
        });

        describe('constructor', () => {
          it('should initialize with the provided values', () => {
            expect(topicNode.id).to.equal('topic-folder-uuid');
            expect(topicNode.topicFolder).to.equal(mockTopicFolder);
            expect(topicNode.expanded).to.be.true;
            expect(topicNode.name).to.equal('Characters');
            expect(topicNode.loadedTypes).to.deep.equal([]);
          });
        });

        describe('_loadNodeList', () => {
          it('should do nothing if no current world', async () => {
            // Set current world to null
            CollapsibleNode.currentWorld = null;
            
            // Call _loadNodeList
            await topicNode._loadNodeList(['entry-uuid'], []);
            
            // Verify filterEntries was not called
            expect(mockTopicFolder.filterEntries.called).to.be.false;
          });

          it('should load entries for the topic', async () => {
            // Call _loadNodeList
            await topicNode._loadNodeList(['entry-uuid'], []);
            
            // Verify filterEntries was called
            expect(mockTopicFolder.filterEntries.called).to.be.true;
            
            // Verify the entry was added to _loadedNodes
            expect(CollapsibleNode._loadedNodes['entry-uuid']).to.exist;
          });

          it('should only load entries that are not already loaded or need updating', async () => {
            // Add an entry to _loadedNodes
            CollapsibleNode._loadedNodes['entry-uuid'] = {
              id: 'entry-uuid',
              name: 'Already Loaded Entry'
            } as any;
            
            // Call _loadNodeList without the entry in updateIds
            await topicNode._loadNodeList(['entry-uuid'], []);
            
            // Verify filterEntries was not called
            expect(mockTopicFolder.filterEntries.called).to.be.false;
            
            // Call _loadNodeList with the entry in updateIds
            await topicNode._loadNodeList(['entry-uuid'], ['entry-uuid']);
            
            // Verify filterEntries was called
            expect(mockTopicFolder.filterEntries.called).to.be.true;
          });
        });

        describe('loadTypeNodes', () => {
          it('should load type nodes for the topic', async () => {
            // Call loadTypeNodes
            await topicNode.loadTypeNodes();
            
            // Verify allEntries was called
            expect(mockTopicFolder.allEntries.called).to.be.true;
            
            // Verify a type node was created
            expect(topicNode.loadedTypes.length).to.equal(1);
            expect(topicNode.loadedTypes[0].name).to.equal('Character');
            expect(topicNode.loadedTypes[0].children).to.deep.equal(['entry-uuid']);
          });

          it('should handle entries with no type', async () => {
            // Create an entry with no type
            const entryWithNoType = {
              ...mockEntry,
              type: ''
            };
            
            // Update the mock to return the entry with no type
            (mockTopicFolder.allEntries as sinon.SinonStub).returns([entryWithNoType]);
            
            // Call loadTypeNodes
            await topicNode.loadTypeNodes();
            
            // Verify a type node was created for the empty type
            expect(topicNode.loadedTypes.length).to.equal(1);
            expect(topicNode.loadedTypes[0].name).to.equal('(No Type)');
          });

          it('should group entries by type', async () => {
            // Create entries with different types
            const entry1 = { ...mockEntry, uuid: 'entry1', type: 'Type1' };
            const entry2 = { ...mockEntry, uuid: 'entry2', type: 'Type2' };
            const entry3 = { ...mockEntry, uuid: 'entry3', type: 'Type1' };
            
            // Update the mock to return entries with different types
            (mockTopicFolder.allEntries as sinon.SinonStub).returns([entry1, entry2, entry3]);
            
            // Call loadTypeNodes
            await topicNode.loadTypeNodes();
            
            // Verify type nodes were created
            expect(topicNode.loadedTypes.length).to.equal(2);
            
            // Find the Type1 node
            const type1Node = topicNode.loadedTypes.find(n => n.name === 'Type1');
            expect(type1Node).to.exist;
            expect(type1Node?.children).to.deep.equal(['entry1', 'entry3']);
            
            // Find the Type2 node
            const type2Node = topicNode.loadedTypes.find(n => n.name === 'Type2');
            expect(type2Node).to.exist;
            expect(type2Node?.children).to.deep.equal(['entry2']);
          });
        });
      });
    }
  );
};