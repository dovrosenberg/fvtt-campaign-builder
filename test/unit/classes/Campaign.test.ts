import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Campaign, Session, Arc, FCBSetting } from '@/classes';
import { getTestSetting } from '@unittest/testUtils';

/**
 * Unit tests for the Campaign class
 */
export const registerCampaignTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach } = context;

  describe('Campaign', () => {
    let testCampaign: Campaign;
    let testSetting: FCBSetting;

    beforeEach(async () => {
      testSetting = getTestSetting();
      testCampaign = (await Campaign.create(testSetting, 'Test Campaign'))!;
    });

    describe('create', () => {
      it('should create a campaign and add to setting campaignIndex', async () => {
        const setting = getTestSetting();
        const campaign = (await Campaign.create(setting, 'New Campaign'))!;

        expect(campaign).to.not.be.null;
        expect(campaign.name).to.equal('New Campaign');

        // Verify it was added to setting's campaignIndex
        const indexEntry = setting.campaignIndex.find(c => c.uuid === campaign.uuid);
        expect(indexEntry).to.not.be.undefined;
        expect(indexEntry!.name).to.equal('New Campaign');
      });
    });

    describe('addSession', () => {
      it('should add session to sessionIndex', async () => {
        const session = (await Session.create(testCampaign, 'Session 1'))!;

        expect(testCampaign.sessionIndex.length).to.be.at.least(1);
        const sessionEntry = testCampaign.sessionIndex.find(s => s.uuid === session.uuid);
        expect(sessionEntry).to.not.be.undefined;
        expect(sessionEntry!.number).to.equal(0); // First session is number 0
      });

      it('should update currentSessionNumber when adding higher numbered session', async () => {
        await Session.create(testCampaign, 'Session 1');
        expect(testCampaign.currentSessionNumber).to.equal(0);

        await Session.create(testCampaign, 'Session 2');
        expect(testCampaign.currentSessionNumber).to.equal(1);
      });

      it('should create default arc when no arcs exist', async () => {
        expect(testCampaign.arcIndex.length).to.equal(0);

        await Session.create(testCampaign, 'Session 1');

        // Should have created a default arc
        expect(testCampaign.arcIndex.length).to.equal(1);
        expect(testCampaign.arcIndex[0].startSessionNumber).to.equal(0);
        expect(testCampaign.arcIndex[0].endSessionNumber).to.equal(0);
      });

      it('should extend existing arc when adding session', async () => {
        await Session.create(testCampaign, 'Session 1');
        await Session.create(testCampaign, 'Session 2');

        // Should have extended the arc
        expect(testCampaign.arcIndex.length).to.equal(1);
        expect(testCampaign.arcIndex[0].endSessionNumber).to.equal(1);
      });
    });

    describe('deleteSession', () => {
      it('should remove session from sessionIndex', async () => {
        const session = (await Session.create(testCampaign, 'Session 1'))!;
        const sessionId = session.uuid;

        await testCampaign.deleteSession(session);

        const sessionEntry = testCampaign.sessionIndex.find(s => s.uuid === sessionId);
        expect(sessionEntry).to.be.undefined;
      });

      it('should reset currentSession when deleting current session', async () => {
        await Session.create(testCampaign, 'Session 1');
        const session2 = (await Session.create(testCampaign, 'Session 2'))!;

        expect(testCampaign.currentSessionNumber).to.equal(1);

        await testCampaign.deleteSession(session2);

        // Should reset to session 0
        expect(testCampaign.currentSessionNumber).to.equal(0);
      });

      it('should adjust arc boundaries when deleting first session', async () => {
        const session1 = (await Session.create(testCampaign, 'Session 1'))!;
        await Session.create(testCampaign, 'Session 2');

        expect(testCampaign.arcIndex[0].startSessionNumber).to.equal(0);

        await testCampaign.deleteSession(session1);

        // Arc should start at session 1 now
        expect(testCampaign.arcIndex[0].startSessionNumber).to.equal(1);
      });

      it('should adjust arc boundaries when deleting last session', async () => {
        await Session.create(testCampaign, 'Session 1');
        const session2 = (await Session.create(testCampaign, 'Session 2'))!;

        expect(testCampaign.arcIndex[0].endSessionNumber).to.equal(1);

        await testCampaign.deleteSession(session2);

        // Arc should end at session 0 now
        expect(testCampaign.arcIndex[0].endSessionNumber).to.equal(0);
      });

      it('should empty arc when deleting only session in arc', async () => {
        const session = (await Session.create(testCampaign, 'Session 1'))!;

        expect(testCampaign.arcIndex[0].startSessionNumber).to.equal(0);
        expect(testCampaign.arcIndex[0].endSessionNumber).to.equal(0);

        await testCampaign.deleteSession(session);

        // Arc should be emptied
        expect(testCampaign.arcIndex[0].startSessionNumber).to.equal(-1);
        expect(testCampaign.arcIndex[0].endSessionNumber).to.equal(-1);
      });
    });

    describe('save', () => {
      it('should sync campaign index to setting', async () => {
        testCampaign.name = 'Updated Campaign Name';
        await testCampaign.save();

        const setting = await testCampaign.getSetting();
        const indexEntry = setting.campaignIndex.find(c => c.uuid === testCampaign.uuid);
        expect(indexEntry!.name).to.equal('Updated Campaign Name');
      });

      it('should sync arc index to setting', async () => {
        await Session.create(testCampaign, 'Session 1');

        const setting = await testCampaign.getSetting();
        const indexEntry = setting.campaignIndex.find(c => c.uuid === testCampaign.uuid);
        expect(indexEntry!.arcs.length).to.equal(1);
      });
    });

    describe('addArc', () => {
      it('should add arc to arcIndex', async () => {
        const arc = (await Arc.create(testCampaign, 'Test Arc'))!;

        expect(testCampaign.arcIndex.length).to.equal(1);
        expect(testCampaign.arcIndex[0].uuid).to.equal(arc.uuid);
      });
    });

    describe('deleteArc', () => {
      it('should remove arc from arcIndex', async () => {
        const arc = (await Arc.create(testCampaign, 'Test Arc'))!;
        expect(testCampaign.arcIndex.length).to.equal(1);

        await testCampaign.deleteArc(arc);

        expect(testCampaign.arcIndex.length).to.equal(0);
      });
    });
  });
};
