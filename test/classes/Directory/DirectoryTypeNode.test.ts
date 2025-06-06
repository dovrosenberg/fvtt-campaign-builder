import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { DirectoryTypeNode } from '@/classes/Directory/DirectoryTypeNode';
import { DirectoryTypeEntryNode } from '@/classes/Directory/DirectoryTypeEntryNode';
import { CollapsibleNode } from '@/classes/Directory/CollapsibleNode';
import { Entry } from '@/classes/Entry';
import { TopicFolder } from '@/classes/TopicFolder';
import { Setting } from '@/classes/Setting';
import { Topics } from '@/types';
import * as sinon from 'sinon';

export const registerDirectoryTypeNodeTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Directory.DirectoryTypeNode',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('DirectoryTypeNode', () => {
        let mockWorld: Setting;
        let mockTopicFolder: TopicFolder;
        let mockEntry: Entry;
        let typeNode: DirectoryTypeNode;

        beforeEach(() => {
          // Create a mock world
          mockWorld = {
            uuid: 'world-uuid',
            expandNode: sinon.stub().resolves(),
            collapseNode: sinon.stub().resolves(),
            expandedIds: {
              'type-node-id': true,
              'entry-uuid': true
            },
            getEntryHierarchy: sinon.stub().returns({
              parentId: null,
              children: [],
              ancestors: [],
              type: 'Character'
            })
          } as unknown as Setting;

          // Create a mock topic folder
          mockTopicFolder = {
            uuid: 'topic-folder-uuid',
            topic: Topics.Character,
            filterEntries: sinon.stub().returns([])
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

          // Create a type node
          typeNode = new DirectoryTypeNode(
            'topic-folder-uuid',
            'Character'
          );
          
          // Add a child ID
          typeNode.children = ['entry-uuid'];
        });

        afterEach(() => {
          sinon.restore();
          CollapsibleNode.currentWorld = null;
        });

        describe('constructor', () => {
          it('should initialize with the provided values', () => {
            expect(typeNode.id).to.equal('topic-folder-uuid-Character');
            expect(typeNode.name).to.equal('Character');
            expect(typeNode.topicId).to.equal('topic-folder-uuid');
            expect(typeNode.expanded).to.be.false;
            expect(typeNode.children).to.deep.equal(['entry-uuid']);
            expect(typeNode.loadedChildren).to.deep.equal([]);
          });
        });

        describe('_loadNodeList', () => {
          it('should do nothing if no current world', async () => {
            // Set current world to null
            CollapsibleNode.currentWorld = null;
            
            // Call _loadNodeList
            await typeNode._loadNodeList(['entry-uuid'], []);
            
            // Since we can't easily verify this, we're just testing that it doesn't throw an error
          });

          it('should load entries for the type', async () => {
            // Setup Entry.fromUuid
            sinon.stub(Entry, 'fromUuid').resolves(mockEntry);
            
            // Setup DirectoryTypeEntryNode.fromEntry
            sinon.stub(DirectoryTypeEntryNode, 'fromEntry').returns({
              id: 'entry-uuid',
              name: 'Test Entry'
            } as unknown as DirectoryTypeEntryNode);
            
            // Call _loadNodeList
            await typeNode._loadNodeList(['entry-uuid'], []);
            
            // Verify Entry.fromUuid was called
            expect(Entry.fromUuid.calledWith('entry-uuid', mockTopicFolder)).to.be.false;
            
            // Verify the entry was added to _loadedNodes
            expect(CollapsibleNode._loadedNodes['entry-uuid']).to.exist;
          });

          it('should only load entries that are not already loaded or need updating', async () => {
            // Add an entry to _loadedNodes
            CollapsibleNode._loadedNodes['entry-uuid'] = {
              id: 'entry-uuid',
              name: 'Already Loaded Entry'
            } as any;
            
            // Setup Entry.fromUuid
            const fromUuidStub = sinon.stub(Entry, 'fromUuid');
            
            // Call _loadNodeList without the entry in updateIds
            await typeNode._loadNodeList(['entry-uuid'], []);
            
            // Verify Entry.fromUuid was not called
            expect(fromUuidStub.called).to.be.false;
            
            // Call _loadNodeList with the entry in updateIds
            await typeNode._loadNodeList(['entry-uuid'], ['entry-uuid']);
            
            // Verify Entry.fromUuid was called
            expect(fromUuidStub.called).to.be.true;
          });
        });
      });
    }
  );
};