import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { DirectorySessionNode } from '@/classes/Directory/DirectorySessionNode';
import { CollapsibleNode } from '@/classes/Directory/CollapsibleNode';
import { Session } from '@/classes/Session';
import { Setting } from '@/classes/Setting';
import * as sinon from 'sinon';

export const registerDirectorySessionNodeTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Directory.DirectorySessionNode',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('DirectorySessionNode', () => {
        let mockWorld: Setting;
        let mockSession: Session;
        let sessionNode: DirectorySessionNode;

        beforeEach(() => {
          // Create a mock world
          mockWorld = {
            uuid: 'world-uuid',
            expandNode: sinon.stub().resolves(),
            collapseNode: sinon.stub().resolves(),
            expandedIds: {
              'session-uuid': true
            }
          } as unknown as Setting;

          // Create a mock session
          mockSession = {
            uuid: 'session-uuid',
            name: 'Test Session',
            number: 1,
            date: new Date('2023-01-01')
          } as unknown as Session;

          // Set the current world
          CollapsibleNode.currentSetting = mockWorld;

          // Create a session node
          sessionNode = new DirectorySessionNode(
            'session-uuid',
            'Test Session',
            1,
            new Date('2023-01-01'),
            'campaign-uuid'
          );
        });

        afterEach(() => {
          sinon.restore();
          CollapsibleNode.currentSetting = null;
        });

        describe('constructor', () => {
          it('should initialize with the provided values', () => {
            expect(sessionNode.id).to.equal('session-uuid');
            expect(sessionNode.name).to.equal('Test Session');
            expect(sessionNode.sessionNumber).to.equal(1);
            expect(sessionNode._date).to.be.instanceOf(Date);
            expect(sessionNode._date?.toISOString().split('T')[0]).to.equal('2023-01-01');
            expect(sessionNode.parentId).to.equal('campaign-uuid');
            expect(sessionNode.expanded).to.be.false;
            expect(sessionNode.children).to.deep.equal([]);
            expect(sessionNode.loadedChildren).to.deep.equal([]);
            expect(sessionNode.ancestors).to.deep.equal([]);
          });
        });

        describe('fromSession', () => {
          it('should create a DirectorySessionNode from a Session', () => {
            // Call fromSession
            const result = DirectorySessionNode.fromSession(mockSession, 'campaign-uuid');
            
            // Verify the result
            expect(result.id).to.equal('session-uuid');
            expect(result.name).to.equal('Test Session');
            expect(result.sessionNumber).to.equal(1);
            expect(result._date).to.be.instanceOf(Date);
            expect(result._date?.toISOString().split('T')[0]).to.equal('2023-01-01');
            expect(result.parentId).to.equal('campaign-uuid');
          });
        });

        describe('_loadNodeList', () => {
          it('should do nothing since sessions have no children', async () => {
            // Call _loadNodeList
            await sessionNode._loadNodeList(['some-id'], []);
            
            // Since sessions don't have children, this should do nothing
            // We're just testing that it doesn't throw an error
          });
        });
      });
    }
  );
};