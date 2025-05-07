import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { DirectoryEntryNode } from '@/classes/Directory/DirectoryEntryNode';
import { CollapsibleNode } from '@/classes/Directory/CollapsibleNode';
import { Entry } from '@/classes/Entry';
import { TopicFolder } from '@/classes/TopicFolder';
import { WBWorld } from '@/classes/WBWorld';
import { Hierarchy } from '@/types';
import { NO_NAME_STRING, NO_TYPE_STRING } from '@/utils/hierarchy';
import * as sinon from 'sinon';

export const registerDirectoryEntryNodeTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Directory.DirectoryEntryNode',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('DirectoryEntryNode', () => {
        let mockWorld: WBWorld;
        let mockTopicFolder: TopicFolder;
        let mockEntry: Entry;
        let entryNode: DirectoryEntryNode;
        let mockHierarchy: Hierarchy;

        beforeEach(() => {
          // Create a mock hierarchy
          mockHierarchy = {
            parentId: 'parent-uuid',
            children: ['child1-uuid', 'child2-uuid'],
            ancestors: ['ancestor-uuid'],
            type: 'Character'
          };

          // Create a mock world
          mockWorld = {
            uuid: 'world-uuid',
            expandNode: sinon.stub().resolves(),
            collapseNode: sinon.stub().resolves(),
            expandedIds: {
              'entry-uuid': true
            },
            getEntryHierarchy: sinon.stub().returns(mockHierarchy)
          } as unknown as WBWorld;

          // Create a mock topic folder
          mockTopicFolder = {
            uuid: 'topic-folder-uuid',
            topic: 1 // Character
          } as unknown as TopicFolder;

          // Create a mock entry
          mockEntry = {
            uuid: 'entry-uuid',
            name: 'Test Entry',
            type: 'Character',
            topicFolder: mockTopicFolder
          } as unknown as Entry;

          // Set the current world
          CollapsibleNode.currentWorld = mockWorld;

          // Create an entry node
          entryNode = new DirectoryEntryNode(
            'entry-uuid',
            'Test Entry',
            'Character',
            mockTopicFolder,
            'parent-uuid',
            ['child1-uuid', 'child2-uuid'],
            [],
            ['ancestor-uuid'],
            true
          );
        });

        afterEach(() => {
          sinon.restore();
          CollapsibleNode.currentWorld = null;
        });

        describe('constructor', () => {
          it('should initialize with the provided values', () => {
            expect(entryNode.id).to.equal('entry-uuid');
            expect(entryNode.name).to.equal('Test Entry');
            expect(entryNode.type).to.equal('Character');
            expect(entryNode.topicFolder).to.equal(mockTopicFolder);
            expect(entryNode.parentId).to.equal('parent-uuid');
            expect(entryNode.children).to.deep.equal(['child1-uuid', 'child2-uuid']);
            expect(entryNode.loadedChildren).to.deep.equal([]);
            expect(entryNode.ancestors).to.deep.equal(['ancestor-uuid']);
            expect(entryNode.expanded).to.be.true;
          });
        });

        describe('fromEntry', () => {
          it('should throw an error if no current world', () => {
            // Set current world to null
            CollapsibleNode.currentWorld = null;
            
            // Call fromEntry and expect an error
            expect(() => DirectoryEntryNode.fromEntry(mockEntry)).to.throw('No currentWorld');
          });

          it('should throw an error if entry has no topic folder', () => {
            // Create an entry with no topic folder
            const entryWithoutTopic = { ...mockEntry, topicFolder: null };
            
            // Call fromEntry and expect an error
            expect(() => DirectoryEntryNode.fromEntry(entryWithoutTopic as any)).to.throw('No topicFolder');
          });

          it('should create a DirectoryEntryNode from an Entry', () => {
            // Call fromEntry
            const result = DirectoryEntryNode.fromEntry(mockEntry);
            
            // Verify the result
            expect(result.id).to.equal('entry-uuid');
            expect(result.name).to.equal('Test Entry');
            expect(result.type).to.equal('Character');
            expect(result.topicFolder).to.equal(mockTopicFolder);
            expect(result.parentId).to.equal('parent-uuid');
            expect(result.children).to.deep.equal(['child1-uuid', 'child2-uuid']);
            expect(result.ancestors).to.deep.equal(['ancestor-uuid']);
            expect(result.expanded).to.be.true;
          });

          it('should use default values for missing properties', () => {
            // Create an entry with missing properties
            const entryWithMissing = {
              uuid: 'entry-uuid',
              name: '',
              type: '',
              topicFolder: mockTopicFolder
            } as unknown as Entry;
            
            // Mock getEntryHierarchy to return null
            (mockWorld.getEntryHierarchy as sinon.SinonStub).returns(null);
            
            // Call fromEntry
            const result = DirectoryEntryNode.fromEntry(entryWithMissing);
            
            // Verify the result
            expect(result.name).to.equal(NO_NAME_STRING);
            expect(result.type).to.equal(NO_TYPE_STRING);
            expect(result.parentId).to.be.null;
            expect(result.children).to.deep.equal([]);
            expect(result.ancestors).to.deep.equal([]);
          });
        });

        describe('convertToHierarchy', () => {
          it('should convert the node to a Hierarchy object', () => {
            // Call convertToHierarchy
            const result = entryNode.convertToHierarchy();
            
            // Verify the result
            expect(result.parentId).to.equal('parent-uuid');
            expect(result.children).to.deep.equal(['child1-uuid', 'child2-uuid']);
            expect(result.ancestors).to.deep.equal(['ancestor-uuid']);
            expect(result.type).to.equal('Character');
          });
        });
      });
    }
  );
};