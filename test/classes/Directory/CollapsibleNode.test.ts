import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { CollapsibleNode } from '@/classes/Directory/CollapsibleNode';
import { Setting } from '@/classes/Setting';
import * as sinon from 'sinon';

// Create a concrete implementation of CollapsibleNode for testing
class TestNode extends CollapsibleNode<TestNode> {
  name: string;

  constructor(id: string, name: string, expanded: boolean = false, parentId: string | null = null,
    children: string[] = [], loadedChildren: TestNode[] = [], ancestors: string[] = []) {
    super(id, expanded, parentId, children, loadedChildren, ancestors);
    this.name = name;
  }

  async _loadNodeList(ids: string[], updateIds: string[]): Promise<void> {
    // Implementation for testing
    for (const id of ids) {
      if (!CollapsibleNode._loadedNodes[id] || updateIds.includes(id)) {
        const newNode = new TestNode(id, `Test Node ${id}`);
        CollapsibleNode._loadedNodes[id] = newNode;
      }
    }
  }
}

export const registerCollapsibleNodeTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Directory.CollapsibleNode',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('CollapsibleNode', () => {
        let mockWorld: Setting;
        let node: TestNode;

        beforeEach(() => {
          // Create a mock world
          mockWorld = {
            uuid: 'world-uuid',
            expandNode: sinon.stub().resolves(),
            collapseNode: sinon.stub().resolves(),
            expandedIds: {
              'node1': true,
              'node2': true
            }
          } as unknown as Setting;

          // Set the current world
          CollapsibleNode.currentWorld = mockWorld;

          // Create a test node
          node = new TestNode(
            'test-node',
            'Test Node',
            false,
            null,
            ['child1', 'child2'],
            [],
            []
          );
        });

        afterEach(() => {
          sinon.restore();
          CollapsibleNode.currentWorld = null;
        });

        describe('constructor', () => {
          it('should initialize with the provided values', () => {
            expect(node.id).to.equal('test-node');
            expect(node.expanded).to.equal(false);
            expect(node.parentId).to.be.null;
            expect(node.children).to.deep.equal(['child1', 'child2']);
            expect(node.loadedChildren).to.deep.equal([]);
            expect(node.ancestors).to.deep.equal([]);
          });
        });

        describe('currentWorld', () => {
          it('should set the current world and clear loaded nodes', () => {
            // Add a node to the loaded nodes
            CollapsibleNode._loadedNodes = { 'test-node': node as any };
            
            // Set a new world
            const newWorld = { uuid: 'new-world-uuid' } as Setting;
            CollapsibleNode.currentWorld = newWorld;
            
            // Check that the world was set and loaded nodes were cleared
            expect(CollapsibleNode._currentWorld).to.equal(newWorld);
            expect(CollapsibleNode._loadedNodes).to.deep.equal({});
          });
        });

        describe('toggle', () => {
          it('should call collapse when expanded is true', async () => {
            // Set node to expanded
            node.expanded = true;
            
            // Spy on collapse method
            const collapseSpy = sinon.spy(node, 'collapse');
            
            // Call toggle
            await node.toggle();
            
            // Verify collapse was called
            expect(collapseSpy.calledOnce).to.be.true;
          });

          it('should call expand when expanded is false', async () => {
            // Set node to not expanded
            node.expanded = false;
            
            // Spy on expand method
            const expandSpy = sinon.spy(node, 'expand');
            
            // Call toggle
            await node.toggle();
            
            // Verify expand was called
            expect(expandSpy.calledOnce).to.be.true;
          });
        });

        describe('collapse', () => {
          it('should do nothing if no current world', async () => {
            // Set current world to null
            CollapsibleNode.currentWorld = null;
            
            // Call collapse
            await node.collapse();
            
            // Verify collapseNode was not called
            expect((mockWorld.collapseNode as sinon.SinonStub).called).to.be.false;
          });

          it('should call collapseNode on the current world', async () => {
            // Call collapse
            await node.collapse();
            
            // Verify collapseNode was called with the node id
            expect((mockWorld.collapseNode as sinon.SinonStub).calledWith('test-node')).to.be.true;
          });
        });

        describe('expand', () => {
          it('should do nothing if no current world', async () => {
            // Set current world to null
            CollapsibleNode.currentWorld = null;
            
            // Call expand
            await node.expand();
            
            // Verify expandNode was not called
            expect((mockWorld.expandNode as sinon.SinonStub).called).to.be.false;
          });

          it('should call expandNode on the current world', async () => {
            // Call expand
            await node.expand();
            
            // Verify expandNode was called with the node id
            expect((mockWorld.expandNode as sinon.SinonStub).calledWith('test-node')).to.be.true;
          });
        });

        describe('toggleWithLoad', () => {
          it('should return the node if expanded state is already correct', async () => {
            // Set node to not expanded
            node.expanded = false;
            
            // Call toggleWithLoad with false
            const result = await node.toggleWithLoad(false);
            
            // Verify toggle was not called and the same node was returned
            expect(result).to.equal(node);
          });

          it('should return the node if no current world', async () => {
            // Set current world to null
            CollapsibleNode.currentWorld = null;
            
            // Call toggleWithLoad
            const result = await node.toggleWithLoad(true);
            
            // Verify the same node was returned
            expect(result).to.equal(node);
          });

          it('should toggle the node and update expanded state', async () => {
            // Spy on toggle method
            const toggleSpy = sinon.spy(node, 'toggle');
            
            // Call toggleWithLoad
            const result = await node.toggleWithLoad(true);
            
            // Verify toggle was called and expanded state was updated
            expect(toggleSpy.calledOnce).to.be.true;
            expect(result.expanded).to.be.true;
          });

          it('should load children when expanding', async () => {
            // Spy on recursivelyLoadNode method
            const loadSpy = sinon.spy(node, 'recursivelyLoadNode');
            
            // Call toggleWithLoad to expand
            await node.toggleWithLoad(true);
            
            // Verify recursivelyLoadNode was called
            expect(loadSpy.calledOnce).to.be.true;
            expect(loadSpy.calledWith(mockWorld.expandedIds)).to.be.true;
          });
        });

        describe('recursivelyLoadNode', () => {
          it('should load nodes that are not already loaded', async () => {
            // Spy on _loadNodeList method
            const loadSpy = sinon.spy(node, '_loadNodeList');
            
            // Call recursivelyLoadNode
            await node.recursivelyLoadNode({});
            
            // Verify _loadNodeList was called with the children
            expect(loadSpy.calledOnce).to.be.true;
            expect(loadSpy.calledWith(['child1', 'child2'], [])).to.be.true;
          });

          it('should load nodes that are in updateEntryIds', async () => {
            // Add a loaded child
            const child = new TestNode('child1', 'Child 1');
            node.loadedChildren = [child];
            CollapsibleNode._loadedNodes['child1'] = child as any;
            
            // Spy on _loadNodeList method
            const loadSpy = sinon.spy(node, '_loadNodeList');
            
            // Call recursivelyLoadNode with updateEntryIds
            await node.recursivelyLoadNode({}, ['child1']);
            
            // Verify _loadNodeList was called with the child to update
            expect(loadSpy.calledOnce).to.be.true;
            expect(loadSpy.calledWith(['child1', 'child2'], ['child1'])).to.be.true;
          });

          it('should recursively load expanded children', async () => {
            // Create expanded children
            const child1 = new TestNode('child1', 'Child 1', true);
            const child2 = new TestNode('child2', 'Child 2', false);
            
            // Add them to loaded nodes
            CollapsibleNode._loadedNodes['child1'] = child1 as any;
            CollapsibleNode._loadedNodes['child2'] = child2 as any;
            
            // Spy on recursivelyLoadNode for child1
            const loadSpy = sinon.spy(child1, 'recursivelyLoadNode');
            
            // Call recursivelyLoadNode with child1 expanded
            await node.recursivelyLoadNode({ 'child1': true });
            
            // Verify child1's recursivelyLoadNode was called
            expect(loadSpy.calledOnce).to.be.true;
            
            // Verify children were added to loadedChildren
            expect(node.loadedChildren.length).to.equal(2);
            expect(node.loadedChildren[0].id).to.equal('child1');
            expect(node.loadedChildren[1].id).to.equal('child2');
            
            // Verify expanded state was set correctly
            expect(node.loadedChildren[0].expanded).to.be.true;
            expect(node.loadedChildren[1].expanded).to.be.false;
          });

          it('should throw an error if a child fails to load', async () => {
            // Setup _loadNodeList to not add a node
            sinon.stub(node, '_loadNodeList').resolves();
            
            // Call recursivelyLoadNode and expect an error
            try {
              await node.recursivelyLoadNode({});
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.include('Entry failed to load properly');
            }
          });
        });
      });
    }
  );
};