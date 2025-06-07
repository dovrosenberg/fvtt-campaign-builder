import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { DirectoryTopicTreeNode } from '@/classes/Directory/DirectoryTopicTreeNode';
import { DirectoryEntryNode } from '@/classes/Directory/DirectoryEntryNode';
import { CollapsibleNode } from '@/classes/Directory/CollapsibleNode';
import { Entry } from '@/classes/Entry';
import { TopicFolder } from '@/classes/TopicFolder';
import { Setting } from '@/classes/Setting';
import { Topics } from '@/types';
import * as sinon from 'sinon';

// Create a concrete implementation of DirectoryTopicTreeNode for testing
class TestTopicTreeNode extends DirectoryTopicTreeNode {
  name: string;

  constructor(id: string, topicFolder: TopicFolder, name: string, expanded: boolean = false, parentId: string | null = null,
    children: string[] = [], loadedChildren: DirectoryEntryNode[] = [], ancestors: string[] = []) {
    super(id, topicFolder, expanded, parentId, children, loadedChildren, ancestors);
    this.name = name;
  }

  async _loadNodeList(ids: string[], updateIds: string[]): Promise<void> {
    // Implementation for testing
    for (const id of ids) {
      if (!CollapsibleNode._loadedNodes[id] || updateIds.includes(id)) {
        const mockEntry = {
          uuid: id,
          name: `Test Entry ${id}`,
          type: 'Character',
          topicFolder: this.topicFolder
        } as unknown as Entry;
        
        const newNode = DirectoryEntryNode.fromEntry(mockEntry);
        CollapsibleNode._loadedNodes[id] = newNode;
      }
    }
  }
}

export const registerDirectoryTopicTreeNodeTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Directory.DirectoryTopicTreeNode',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('DirectoryTopicTreeNode', () => {
        let mockWorld: Setting;
        let mockTopicFolder: TopicFolder;
        let topicTreeNode: TestTopicTreeNode;

        beforeEach(() => {
          // Create a mock world
          mockWorld = {
            uuid: 'world-uuid',
            expandNode: sinon.stub().resolves(),
            collapseNode: sinon.stub().resolves(),
            expandedIds: {
              'topic-tree-node-id': true,
              'child1': true
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
            topic: Topics.Character
          } as unknown as TopicFolder;

          // Set the current world
          CollapsibleNode.currentSetting = mockWorld;

          // Create a topic tree node
          topicTreeNode = new TestTopicTreeNode(
            'topic-tree-node-id',
            mockTopicFolder,
            'Test Topic Tree Node',
            true,
            null,
            ['child1', 'child2'],
            [],
            []
          );
        });

        afterEach(() => {
          sinon.restore();
          CollapsibleNode.currentSetting = null;
        });

        describe('constructor', () => {
          it('should initialize with the provided values', () => {
            expect(topicTreeNode.id).to.equal('topic-tree-node-id');
            expect(topicTreeNode.topicFolder).to.equal(mockTopicFolder);
            expect(topicTreeNode.expanded).to.be.true;
            expect(topicTreeNode.parentId).to.be.null;
            expect(topicTreeNode.children).to.deep.equal(['child1', 'child2']);
            expect(topicTreeNode.loadedChildren).to.deep.equal([]);
            expect(topicTreeNode.ancestors).to.deep.equal([]);
            expect(topicTreeNode.name).to.equal('Test Topic Tree Node');
          });
        });

        describe('recursivelyLoadNode', () => {
          it('should load child nodes and set their expanded state', async () => {
            // Call recursivelyLoadNode
            await topicTreeNode.recursivelyLoadNode(mockWorld.expandedIds);
            
            // Verify children were loaded
            expect(topicTreeNode.loadedChildren.length).to.equal(2);
            expect(topicTreeNode.loadedChildren[0].id).to.equal('child1');
            expect(topicTreeNode.loadedChildren[1].id).to.equal('child2');
            
            // Verify expanded state was set correctly
            expect(topicTreeNode.loadedChildren[0].expanded).to.be.true;
            expect(topicTreeNode.loadedChildren[1].expanded).to.be.false;
          });

          it('should recursively load expanded children', async () => {
            // Setup a child with its own children
            const childNode = new TestTopicTreeNode(
              'child1',
              mockTopicFolder,
              'Child 1',
              true,
              'topic-tree-node-id',
              ['grandchild1'],
              [],
              ['topic-tree-node-id']
            );
            
            // Add it to loaded nodes
            CollapsibleNode._loadedNodes['child1'] = childNode as any;
            
            // Spy on recursivelyLoadNode for the child
            const loadSpy = sinon.spy(childNode, 'recursivelyLoadNode');
            
            // Call recursivelyLoadNode
            await topicTreeNode.recursivelyLoadNode({
              'topic-tree-node-id': true,
              'child1': true,
              'grandchild1': true
            });
            
            // Verify child's recursivelyLoadNode was called
            expect(loadSpy.calledOnce).to.be.true;
          });

          it('should update nodes in updateEntryIds', async () => {
            // Add a loaded child
            const childNode = new TestTopicTreeNode(
              'child1',
              mockTopicFolder,
              'Child 1',
              true,
              'topic-tree-node-id',
              [],
              [],
              ['topic-tree-node-id']
            );
            
            topicTreeNode.loadedChildren = [childNode as any];
            CollapsibleNode._loadedNodes['child1'] = childNode as any;
            
            // Spy on _loadNodeList
            const loadSpy = sinon.spy(topicTreeNode, '_loadNodeList');
            
            // Call recursivelyLoadNode with updateEntryIds
            await topicTreeNode.recursivelyLoadNode({}, ['child1']);
            
            // Verify _loadNodeList was called with the child to update
            expect(loadSpy.calledOnce).to.be.true;
            expect(loadSpy.calledWith(['child1', 'child2'], ['child1'])).to.be.true;
          });
        });
      });
    }
  );
};