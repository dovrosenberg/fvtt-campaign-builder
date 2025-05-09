import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Campaign } from '@/classes/Campaign';
import { WBWorld } from '@/classes/WBWorld';
import { CampaignDoc, CampaignFlagKey, DOCUMENT_TYPES } from '@/documents';
import { SessionLore } from '@/documents/session';
import * as sinon from 'sinon';
import { moduleId } from '@/settings';
import { FCBDialog } from '@/dialogs';

export const registerCampaignTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Campaign',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('Campaign', () => {
        let mockCampaignDoc: CampaignDoc;
        let mockWorld: WBWorld;
        let campaign: Campaign;
        let fromUuidStub;
        let inputDialogStub;
        let getFlagStub;
        let setFlagStub;

        beforeEach(() => {
          // Stub fromUuid since we don't want to actually look up documents
          fromUuidStub = sinon.stub(globalThis, 'fromUuid');
          
          // Stub JournalEntry.create to avoid creating actual documents
          sinon.stub(JournalEntry, 'create').resolves({
            name: 'Test Campaign',
            uuid: 'test-campaign-uuid',
            update: sinon.stub().resolves({}),
            delete: sinon.stub().resolves(undefined),
          });
          
          // Create getFlag and setFlag stubs
          getFlagStub = sinon.stub();
          getFlagStub.withArgs(moduleId, CampaignFlagKey.isCampaign).returns(true);
          getFlagStub.withArgs(moduleId, CampaignFlagKey.description).returns('Test description');
          getFlagStub.withArgs(moduleId, CampaignFlagKey.lore).returns([]);
          getFlagStub.withArgs(moduleId, CampaignFlagKey.img).returns('test-image.jpg');
          
          setFlagStub = sinon.stub().resolves(undefined);
          
          // Stub inputDialog
          inputDialogStub = sinon.stub(FCBDialog, 'inputDialog').resolves('New Campaign');

          // Create a mock CampaignDoc
          mockCampaignDoc = {
            documentName: 'JournalEntry',
            uuid: 'test-campaign-uuid',
            name: 'Test Campaign',
            collection: {
              folder: {
                uuid: 'world-uuid'
              }
            },
            pages: {
              contents: [],
              forEach: function(callback) {
                this.contents.forEach(callback);
              },
              filter: function(callback) {
                return this.contents.filter(callback);
              }
            },
            update: sinon.stub().resolves({}),
            delete: sinon.stub().resolves(undefined),
            getFlag: getFlagStub,
            setFlag: setFlagStub,
            unsetFlag: sinon.stub().resolves(undefined)
          } as unknown as CampaignDoc;

          // Create a mock World
          mockWorld = {
            uuid: 'world-uuid',
            unlock: sinon.stub().resolves(undefined),
            lock: sinon.stub().resolves(undefined),
            save: sinon.stub().resolves({}),
            updateCampaignName: sinon.stub().resolves(undefined),
            deleteCampaignFromWorld: sinon.stub().resolves(undefined),
            compendium: {
              metadata: {
                id: 'test-compendium'
              }
            }
          } as unknown as WBWorld;

          // Create a Campaign instance
          campaign = new Campaign(mockCampaignDoc, mockWorld);
        });

        afterEach(() => {
          sinon.restore();
        });

        describe('constructor', () => {
          it('should throw an error if document type is invalid', () => {
            // Create an invalid document with its own getFlag stub
            const invalidGetFlagStub = sinon.stub();
            invalidGetFlagStub.withArgs(moduleId, CampaignFlagKey.isCampaign).returns(false);
            
            const invalidDoc = { 
              ...mockCampaignDoc, 
              documentName: 'Actor',
              getFlag: invalidGetFlagStub
            };
            
            expect(() => new Campaign(invalidDoc as any)).to.throw('Invalid document type in Campaign constructor');
          });

          it('should initialize with the provided document and world', () => {
            expect(campaign.raw).not.to.equal(mockCampaignDoc); // Should be a clone
            expect(campaign.uuid).to.equal('test-campaign-uuid');
            expect(campaign.name).to.equal('Test Campaign');
            expect(campaign.world).to.equal(mockWorld);
          });
        });

        describe('fromUuid', () => {
          it('should return null if document is not found', async () => {
            fromUuidStub.resolves(null);
            const result = await Campaign.fromUuid('test-uuid');
            expect(result).to.be.null;
          });

          it('should return a new Campaign instance if document is valid', async () => {
            fromUuidStub.resolves(mockCampaignDoc);
            const result = await Campaign.fromUuid('test-uuid');
            expect(result).to.be.instanceOf(Campaign);
            expect(result?.uuid).to.equal('test-campaign-uuid');
          });
        });

        describe('getWorld and loadWorld', () => {
          it('should return the existing world if already set', async () => {
            const result = await campaign.getWorld();
            expect(result).to.equal(mockWorld);
          });

          it('should load the world if not already set', async () => {
            // Create a campaign without a world
            const campaignWithoutWorld = new Campaign(mockCampaignDoc);
            
            // Setup the fromUuid stub to return a world doc
            fromUuidStub.resolves({
              uuid: 'world-uuid'
            });
            
            // Stub WBWorld.fromUuid
            sinon.stub(WBWorld, 'fromUuid').resolves(mockWorld);
            
            const result = await campaignWithoutWorld.getWorld();
            expect(result).to.equal(mockWorld);
          });

          it('should throw an error if folder is missing', async () => {
            // Create a campaign without a world and with invalid folder
            const invalidDoc = { ...mockCampaignDoc, collection: { folder: null } };
            const campaignWithInvalidFolder = new Campaign(invalidDoc as any);
            
            try {
              await campaignWithInvalidFolder.loadWorld();
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.equal('Invalid folder id in Campaign.loadWorld()');
            }
          });
        });

        describe('currentSession and nextSessionNumber', () => {
          it('should return null for currentSession when no sessions exist', () => {
            expect(campaign.currentSession).to.be.null;
          });

          it('should return 1 for nextSessionNumber when no sessions exist', () => {
            expect(campaign.nextSessionNumber).to.equal(1);
          });

          it('should return the session with highest number for currentSession', () => {
            // Add mock sessions to the campaign
            mockCampaignDoc.pages.contents = [
              {
                type: DOCUMENT_TYPES.Session,
                system: { number: 1 }
              },
              {
                type: DOCUMENT_TYPES.Session,
                system: { number: 3 }
              },
              {
                type: DOCUMENT_TYPES.Session,
                system: { number: 2 }
              }
            ];
            
            expect(campaign.currentSession).not.to.be.null;
            expect(campaign.currentSession?.raw.system.number).to.equal(3);
          });

          it('should return the next number after highest for nextSessionNumber', () => {
            // Add mock sessions to the campaign
            mockCampaignDoc.pages.contents = [
              {
                type: DOCUMENT_TYPES.Session,
                system: { number: 1 }
              },
              {
                type: DOCUMENT_TYPES.Session,
                system: { number: 3 }
              },
              {
                type: DOCUMENT_TYPES.Session,
                system: { number: 2 }
              }
            ];
            
            expect(campaign.nextSessionNumber).to.equal(4);
          });
        });

        describe('sessions getter', () => {
          it('should return an array of session UUIDs', () => {
            // Add mock sessions to the campaign
            mockCampaignDoc.pages.contents = [
              {
                type: DOCUMENT_TYPES.Session,
                uuid: 'session1-uuid'
              },
              {
                type: 'other-type',
                uuid: 'not-a-session'
              },
              {
                type: DOCUMENT_TYPES.Session,
                uuid: 'session2-uuid'
              }
            ];
            
            expect(campaign.sessions).to.deep.equal(['session1-uuid', 'session2-uuid']);
          });
        });

        describe('getters and setters', () => {
          it('should get and set name correctly', () => {
            expect(campaign.name).to.equal('Test Campaign');
            campaign.name = 'New Campaign Name';
            expect(campaign.name).to.equal('New Campaign Name');
          });

          it('should get and set description correctly', () => {
            expect(campaign.description).to.equal('Test description');
            campaign.description = 'New description';
            expect(campaign.description).to.equal('New description');
          });

          it('should get and set img correctly', () => {
            expect(campaign.img).to.equal('test-image.jpg');
            campaign.img = 'new-image.jpg';
            expect(campaign.img).to.equal('new-image.jpg');
          });

          it('should get lore correctly', () => {
            const testLore: SessionLore[] = [
              { uuid: 'lore1', description: 'Lore 1', delivered: false, journalEntryPageId: null }
            ];
            
            // Update the getFlag stub to return the test lore
            getFlagStub.withArgs(moduleId, CampaignFlagKey.lore).returns(testLore);
            
            // Create a new campaign to pick up the updated lore
            const campaignWithLore = new Campaign(mockCampaignDoc, mockWorld);
            
            expect(campaignWithLore.lore).to.deep.equal(testLore);
          });
        });

        describe('lore management', () => {
          it('should add lore correctly', async () => {
            // Setup
            campaign['_lore'] = [];
            sinon.stub(campaign, 'save').resolves(campaign);
            // sinon.stub(foundry.utils, 'randomID').returns('new-lore-uuid');
            
            // Act
            await campaign.addLore('New lore description');
            
            // Assert
            expect(campaign.lore.length).to.equal(1);
            // expect(campaign.lore[0].uuid).to.equal('new-lore-uuid');
            expect(campaign.lore[0].description).to.equal('New lore description');
            expect(campaign.lore[0].delivered).to.equal(false);
          });

          it('should update lore description correctly', async () => {
            // Setup
            campaign['_lore'] = [
              { uuid: 'lore1', description: 'Original description', delivered: false, journalEntryPageId: null }
            ];
            sinon.stub(campaign, 'save').resolves(campaign);
            
            // Act
            await campaign.updateLoreDescription('lore1', 'Updated description');
            
            // Assert
            expect(campaign.lore[0].description).to.equal('Updated description');
          });

          it('should update lore journal entry correctly', async () => {
            // Setup
            campaign['_lore'] = [
              { uuid: 'lore1', description: 'Lore description', delivered: false, journalEntryPageId: null }
            ];
            sinon.stub(campaign, 'save').resolves(campaign);
            
            // Act
            await campaign.updateLoreJournalEntry('lore1', 'journal-page-id');
            
            // Assert
            expect(campaign.lore[0].journalEntryPageId).to.equal('journal-page-id');
          });

          it('should delete lore correctly', async () => {
            // Setup
            campaign['_lore'] = [
              { uuid: 'lore1', description: 'Lore 1', delivered: false, journalEntryPageId: null },
              { uuid: 'lore2', description: 'Lore 2', delivered: false, journalEntryPageId: null }
            ];
            sinon.stub(campaign, 'save').resolves(campaign);
            
            // Act
            await campaign.deleteLore('lore1');
            
            // Assert
            expect(campaign.lore.length).to.equal(1);
            expect(campaign.lore[0].uuid).to.equal('lore2');
          });

          it('should mark lore as delivered correctly', async () => {
            // Setup
            campaign['_lore'] = [
              { uuid: 'lore1', description: 'Lore 1', delivered: false, journalEntryPageId: null }
            ];
            sinon.stub(campaign, 'save').resolves(campaign);
            
            // Act
            await campaign.markLoreDelivered('lore1', true);
            
            // Assert
            expect(campaign.lore[0].delivered).to.equal(true);
          });
        });

        describe('save', () => {
          it('should update the campaign document with accumulated changes', async () => {
            // Make some changes
            campaign.name = 'New Campaign Name';
            campaign.description = 'New description';
            campaign.img = 'new-image.jpg';
            
            // Call save
            const result = await campaign.save();
            
            // Verify world was unlocked and locked
            expect(mockWorld.unlock.called).to.equal(true);
            expect(mockWorld.lock.called).to.equal(true);
            
            // Verify update was called with correct data
            expect((campaign.raw.update as sinon.SinonStub).calledWith(sinon.match({
              name: 'New Campaign Name',
              [`flags.${moduleId}`]: sinon.match.object
            }))).to.equal(true);
            
            // Verify campaign name was updated in world
            expect(mockWorld.updateCampaignName.calledWith('test-campaign-uuid', 'New Campaign Name')).to.equal(true);
            
            // Verify result
            expect(result).to.equal(campaign);
          });

          it('should return null if update fails', async () => {
            // Make a change
            campaign.name = 'New Campaign Name';
            
            // Mock failed update
            (campaign.raw.update as sinon.SinonStub).resolves(null);
            
            // Call save
            const result = await campaign.save();
            
            // Verify result
            expect(result).to.be.null;
          });
        });

        describe('delete', () => {
          it('should delete the campaign and update the world', async () => {
            // Call delete
            await campaign.delete();
            
            // Verify world was unlocked and locked
            expect(mockWorld.unlock.called).to.equal(true);
            expect(mockWorld.lock.called).to.equal(true);
            
            // Verify delete was called
            expect((campaign.raw.delete as sinon.SinonStub).called).to.equal(true);
            
            // Verify world was updated
            expect(mockWorld.deleteCampaignFromWorld.calledWith('test-campaign-uuid')).to.equal(true);
          });
        });

        describe('create', () => {
          it('should create a new campaign with the provided name', async () => {
            // Call create
            const result = await Campaign.create(mockWorld);
            
            // Verify world was unlocked and locked
            expect(mockWorld.unlock.called).to.equal(true);
            expect(mockWorld.lock.called).to.equal(true);
            
            // Verify JournalEntry.create was called
            expect(JournalEntry.create.called).to.equal(true);
            
            // Verify result
            expect(result).to.be.instanceOf(Campaign);
          });

          it('should return null if name input is cancelled', async () => {
            // Setup inputDialog to return null (cancelled)
            inputDialogStub.resolves(null);
            
            // Call create
            const result = await Campaign.create(mockWorld);
            
            // Verify result
            expect(result).to.be.null;
          });
        });

        describe('getSessions', () => {
          it('should return all sessions in the campaign', async () => {
            // Setup
            sinon.stub(campaign, 'filterSessions').returns([
              { uuid: 'session1-uuid' },
              { uuid: 'session2-uuid' }
            ] as any);
            
            // Act
            const result = await campaign.getSessions();
            
            // Assert
            expect(result.length).to.equal(2);
            expect(result[0].uuid).to.equal('session1-uuid');
            expect(result[1].uuid).to.equal('session2-uuid');
          });

          it('should filter out related sessions when notRelatedTo is provided', async () => {
            // Setup
            sinon.stub(campaign, 'filterSessions').returns([
              { uuid: 'session1-uuid' },
              { uuid: 'session2-uuid' },
              { uuid: 'session3-uuid' }
            ] as any);
            
            const mockSession = {
              uuid: 'current-session-uuid',
              getAllRelatedSessions: sinon.stub().returns(['session1-uuid'])
            };
            
            // Act
            const result = await campaign.getSessions(mockSession as any);
            
            // Assert
            expect(result.length).to.equal(2);
            expect(result[0].uuid).to.equal('session2-uuid');
            expect(result[1].uuid).to.equal('session3-uuid');
          });
        });

        describe('getPCs', () => {
          it('should return all PCs in the campaign', async () => {
            // Setup
            sinon.stub(campaign, 'filterPCs').resolves([
              { uuid: 'pc1-uuid' },
              { uuid: 'pc2-uuid' }
            ] as any);
            
            // Act
            const result = await campaign.getPCs();
            
            // Assert
            expect(result.length).to.equal(2);
            expect(result[0].uuid).to.equal('pc1-uuid');
            expect(result[1].uuid).to.equal('pc2-uuid');
          });
        });
      });
    }
  );
};