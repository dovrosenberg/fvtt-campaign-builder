import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { DirectoryTypeEntryNode } from '@/classes/Directory/DirectoryTypeEntryNode';
import { DirectoryTypeNode } from '@/classes/Directory/DirectoryTypeNode';
import { CollapsibleNode } from '@/classes/Directory/CollapsibleNode';
import { Entry } from '@/classes/Entry';
import { TopicFolder } from '@/classes/TopicFolder';
import { Setting } from '@/classes/Setting';
import { Topics } from '@/types';
import { NO_NAME_STRING } from '@/utils/hierarchy';
import * as sinon from 'sinon';

export const registerDirectoryTypeEntryNodeTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Directory.DirectoryTypeEntryNode',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('DirectoryTypeEntryNode', () => {
        let mockWorld: Setting;
        let mockTopicFolder: TopicFolder;
        let mockEntry: Entry;
        let mockTypeNode: DirectoryTypeNode;
        let typeEntryNode: DirectoryTypeEntryNode;

        beforeEach(() => {
          // Create a mock world
          mockWorld = {
            uuid: 'world-uuid',
            expandNode: sinon.stub().resolves(),
            collapseNode: sinon.stub().resolves(),
            expandedIds: {
              'entry-uuid': true
            }
          } as unknown as Setting;

          // Create a mock topic folder
          mockTopicFolder = {
            uuid: 'topic-folder-uuid',
            topic: Topics.Character
          } as unknown as TopicFolder;

          // Create a mock entry
          mockEntry = {
            uuid: 'entry-uuid',
            name: 'Test Entry',
            type: 'Character',
            topicFolder: mockTopicFolder
          } as unknown as Entry;

          // Create a mock type node
          mockTypeNode = {
            id: 'topic-folder-uuid-Character',
            name: 'Character',
            topicId: 'topic-folder-uuid'
          } as unknown as DirectoryTypeNode;

          // Set the current world
          CollapsibleNode.currentSetting = mockWorld;

          // Create a type entry node
          typeEntryNode = new DirectoryTypeEntryNode(
            'entry-uuid',
            'Test Entry',
            mockTypeNode
          );
        });

        afterEach(() => {
          sinon.restore();
          CollapsibleNode.currentSetting = null;
        });

        describe('constructor', () => {
          it('should initialize with the provided values', () => {
            expect(typeEntryNode.id).to.equal('entry-uuid');
            expect(typeEntryNode.name).to.equal('Test Entry');
            expect(typeEntryNode.typeNode).to.equal(mockTypeNode);
            expect(typeEntryNode.expanded).to.be.false;
            expect(typeEntryNode.children).to.deep.equal([]);
            expect(typeEntryNode.loadedChildren).to.deep.equal([]);
          });
        });

        describe('fromEntry', () => {
          it('should create a DirectoryTypeEntryNode from an Entry', () => {
            // Call fromEntry
            const result = DirectoryTypeEntryNode.fromEntry(mockEntry, mockTypeNode);
            
            // Verify the result
            expect(result.id).to.equal('entry-uuid');
            expect(result.name).to.equal('Test Entry');
            expect(result.typeNode).to.equal(mockTypeNode);
          });

          it('should use default name if entry name is empty', () => {
            // Create an entry with empty name
            const entryWithEmptyName = {
              ...mockEntry,
              name: ''
            };
            
            // Call fromEntry
            const result = DirectoryTypeEntryNode.fromEntry(entryWithEmptyName, mockTypeNode);
            
            // Verify the result
            expect(result.name).to.equal(NO_NAME_STRING);
          });

          it('should set expanded state based on world expandedIds', () => {
            // Call fromEntry
            const result = DirectoryTypeEntryNode.fromEntry(mockEntry, mockTypeNode);
            
            // Verify the expanded state
            expect(result.expanded).to.be.true;
            
            // Change expandedIds
            mockWorld.expandedIds = {};
            
            // Call fromEntry again
            const result2 = DirectoryTypeEntryNode.fromEntry(mockEntry, mockTypeNode);
            
            // Verify the expanded state
            expect(result2.expanded).to.be.false;
          });
        });

        describe('_loadNodeList', () => {
          it('should do nothing since type entry nodes have no children', async () => {
            // Call _loadNodeList
            await typeEntryNode._loadNodeList(['some-id'], []);
            
            // Since type entry nodes don't have children, this should do nothing
            // We're just testing that it doesn't throw an error
          });
        });
      });
    }
  );
};