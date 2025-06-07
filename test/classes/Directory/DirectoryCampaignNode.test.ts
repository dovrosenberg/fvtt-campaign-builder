import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { DirectoryCampaignNode } from '@/classes/Directory/DirectoryCampaignNode';
import { DirectorySessionNode } from '@/classes/Directory/DirectorySessionNode';
import { CollapsibleNode } from '@/classes/Directory/CollapsibleNode';
import { Campaign } from '@/classes/Campaign';
import { Session } from '@/classes/Session';
import { Setting } from '@/classes/Setting';
import * as sinon from 'sinon';

export const registerDirectoryCampaignNodeTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Directory.DirectoryCampaignNode',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('DirectoryCampaignNode', () => {
        let mockWorld: Setting;
        let mockCampaign: Campaign;
        let mockSession: Session;
        let campaignNode: DirectoryCampaignNode;

        beforeEach(() => {
          // Create a mock world
          mockWorld = {
            uuid: 'world-uuid',
            expandNode: sinon.stub().resolves(),
            collapseNode: sinon.stub().resolves(),
            expandedIds: {
              'campaign-uuid': true,
              'session-uuid': true
            }
          } as unknown as Setting;

          // Create a mock session
          mockSession = {
            uuid: 'session-uuid',
            name: 'Test Session'
          } as unknown as Session;

          // Create a mock campaign
          mockCampaign = {
            uuid: 'campaign-uuid',
            filterSessions: sinon.stub().returns([mockSession])
          } as unknown as Campaign;

          // Stub Campaign.fromUuid
          sinon.stub(Campaign, 'fromUuid').resolves(mockCampaign);

          // Stub DirectorySessionNode.fromSession
          sinon.stub(DirectorySessionNode, 'fromSession').returns({
            id: 'session-uuid',
            name: 'Test Session'
          } as unknown as DirectorySessionNode);

          // Set the current world
          CollapsibleNode.currentSetting = mockWorld;

          // Create a campaign node
          campaignNode = new DirectoryCampaignNode(
            'campaign-uuid',
            'Test Campaign',
            ['session-uuid'],
            [],
            true
          );
        });

        afterEach(() => {
          sinon.restore();
          CollapsibleNode.currentSetting = null;
        });

        describe('constructor', () => {
          it('should initialize with the provided values', () => {
            expect(campaignNode.id).to.equal('campaign-uuid');
            expect(campaignNode.name).to.equal('Test Campaign');
            expect(campaignNode.children).to.deep.equal(['session-uuid']);
            expect(campaignNode.loadedChildren).to.deep.equal([]);
            expect(campaignNode.expanded).to.be.true;
            expect(campaignNode.parentId).to.be.null;
            expect(campaignNode.ancestors).to.deep.equal([]);
          });
        });

        describe('_loadNodeList', () => {
          it('should do nothing if no current world', async () => {
            // Set current world to null
            CollapsibleNode.currentSetting = null;
            
            // Call _loadNodeList
            await campaignNode._loadNodeList(['session-uuid'], []);
            
            // Verify Campaign.fromUuid was not called
            expect(Campaign.fromUuid.called).to.be.false;
          });

          it('should load sessions for the campaign', async () => {
            // Call _loadNodeList
            await campaignNode._loadNodeList(['session-uuid'], []);
            
            // Verify Campaign.fromUuid was called
            expect(Campaign.fromUuid.calledWith('campaign-uuid')).to.be.true;
            
            // Verify filterSessions was called
            expect(mockCampaign.filterSessions.called).to.be.true;
            
            // Verify DirectorySessionNode.fromSession was called
            expect(DirectorySessionNode.fromSession.calledWith(mockSession, 'campaign-uuid')).to.be.true;
            
            // Verify the session was added to _loadedNodes
            expect(CollapsibleNode._loadedNodes['session-uuid']).to.exist;
          });

          it('should only load sessions that are not already loaded or need updating', async () => {
            // Add a session to _loadedNodes
            CollapsibleNode._loadedNodes['session-uuid'] = {
              id: 'session-uuid',
              name: 'Already Loaded Session'
            } as unknown as DirectorySessionNode;
            
            // Call _loadNodeList without the session in updateIds
            await campaignNode._loadNodeList(['session-uuid'], []);
            
            // Verify filterSessions was not called
            expect(mockCampaign.filterSessions.called).to.be.false;
            
            // Call _loadNodeList with the session in updateIds
            await campaignNode._loadNodeList(['session-uuid'], ['session-uuid']);
            
            // Verify filterSessions was called
            expect(mockCampaign.filterSessions.called).to.be.true;
          });

          it('should throw an error if campaign cannot be loaded', async () => {
            // Setup Campaign.fromUuid to return null
            (Campaign.fromUuid as sinon.SinonStub).resolves(null);
            
            // Call _loadNodeList and expect an error
            try {
              await campaignNode._loadNodeList(['session-uuid'], []);
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.include('Bad campaign id');
            }
          });
        });
      });
    }
  );
};