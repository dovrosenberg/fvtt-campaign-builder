import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { WBWorld } from '@/classes/WBWorld';
import { TopicFolder } from '@/classes/TopicFolder';
import { WorldDoc, WorldFlagKey } from '@/documents';
import { Topics, } from '@/types';
import * as sinon from 'sinon';
import { moduleId } from '@/settings';

export const registerWBWorldTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.WBWorld',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('WBWorld', () => {
        let mockWorldDoc: WorldDoc;
        let mockCompendium: any;
        let world: WBWorld;
        let fromUuidStub;
        let getFlag;
        let setFlag;
        let unsetFlag;
        let inputDialogStub;

        beforeEach(() => {
          // Stub fromUuid since we don't want to actually look up documents
          fromUuidStub = sinon.stub(globalThis, 'fromUuid');
          
          // Stub Folder.createDocuments to avoid creating actual documents
          sinon.stub(Folder, 'createDocuments').resolves([{
            name: 'Test World',
            uuid: 'test-world-uuid',
            update: sinon.stub().resolves({}),
            delete: sinon.stub().resolves(undefined),
          }]);
          
          // Stub getFlag, setFlag, and unsetFlag
          getFlag = sinon.stub(Folder.prototype, 'getFlag');
          getFlag.withArgs(sinon.match.any, WorldFlagKey.isWorld).returns(true);
          getFlag.withArgs(sinon.match.any, WorldFlagKey.campaignNames).returns({
            'campaign1-uuid': 'Campaign 1',
            'campaign2-uuid': 'Campaign 2'
          });
          getFlag.withArgs(sinon.match.any, WorldFlagKey.expandedIds).returns({
            'campaign1-uuid': true,
            'entry1-uuid': true
          });
          getFlag.withArgs(sinon.match.any, WorldFlagKey.hierarchies).returns({
            'entry1-uuid': { parentId: null, children: ['entry2-uuid'], ancestors: [] },
            'entry2-uuid': { parentId: 'entry1-uuid', children: [], ancestors: ['entry1-uuid'] }
          });
          getFlag.withArgs(sinon.match.any, WorldFlagKey.topicIds).returns({
            [Topics.Character]: 'character-topic-uuid',
            [Topics.Location]: 'location-topic-uuid',
            [Topics.Organization]: 'organization-topic-uuid'
          });
          getFlag.withArgs(sinon.match.any, WorldFlagKey.compendiumId).returns('test-compendium-id');
          getFlag.withArgs(sinon.match.any, WorldFlagKey.description).returns('Test description');
          getFlag.withArgs(sinon.match.any, WorldFlagKey.genre).returns('Fantasy');
          getFlag.withArgs(sinon.match.any, WorldFlagKey.worldFeeling).returns('Epic');
          getFlag.withArgs(sinon.match.any, WorldFlagKey.img).returns('test-image.jpg');
          
          setFlag = sinon.stub(Folder.prototype, 'setFlag');
          unsetFlag = sinon.stub(Folder.prototype, 'unsetFlag');
          
          // Stub inputDialog
          inputDialogStub = sinon.stub(globalThis, 'inputDialog').resolves('New World');
          
          // Stub CompendiumCollection
          mockCompendium = {
            metadata: {
              id: 'test-compendium-id',
              label: 'Test World'
            },
            configure: sinon.stub().resolves(undefined),
            setFolder: sinon.stub().resolves(undefined),
            deleteCompendium: sinon.stub().resolves(undefined)
          };
          
          sinon.stub(CompendiumCollection, 'createCompendium').resolves(mockCompendium);
          
          // Stub game.packs
          if (!game.packs) {
            game.packs = new Map();
          }
          sinon.stub(game.packs, 'get').returns(mockCompendium);

          // Create a mock WorldDoc
          mockWorldDoc = {
            documentName: 'Folder',
            uuid: 'test-world-uuid',
            name: 'Test World',
            getFlag: function(moduleId, key) {
              if (key === WorldFlagKey.isWorld) return true;
              return null;
            },
            update: sinon.stub().resolves({}),
            delete: sinon.stub().resolves(undefined),
          } as unknown as WorldDoc;

          // Create a WBWorld instance
          world = new WBWorld(mockWorldDoc);
        });

        afterEach(() => {
          sinon.restore();
        });

        describe('constructor', () => {
          it('should throw an error if document type is invalid', () => {
            // Create an invalid document
            const invalidDoc = { ...mockWorldDoc, documentName: 'Actor' };
            
            expect(() => new WBWorld(invalidDoc as any)).to.throw('Invalid document type in WBWorld constructor');
          });

          it('should initialize with the provided document', () => {
            expect(world.raw).not.to.equal(mockWorldDoc); // Should be a clone
            expect(world.uuid).to.equal('test-world-uuid');
            expect(world.name).to.equal('Test World');
            expect(world.compendiumId).to.equal('test-compendium-id');
          });
        });

        describe('fromUuid', () => {
          it('should return null if document is not found', async () => {
            fromUuidStub.resolves(null);
            const result = await WBWorld.fromUuid('test-uuid');
            expect(result).to.be.null;
          });

          it('should return a new WBWorld instance if document is valid', async () => {
            fromUuidStub.resolves(mockWorldDoc);
            
            // Stub validate method
            sinon.stub(WBWorld.prototype, 'validate').resolves();
            
            const result = await WBWorld.fromUuid('test-uuid');
            expect(result).to.be.instanceOf(WBWorld);
            expect(result?.uuid).to.equal('test-world-uuid');
          });
        });

        describe('loadTopics', () => {
          it('should throw an error if topicIds is not loaded', async () => {
            // Create a world with no topicIds
            getFlag.withArgs(sinon.match.any, WorldFlagKey.topicIds).returns(null);
            const worldWithoutTopicIds = new WBWorld(mockWorldDoc);
            
            try {
              await worldWithoutTopicIds.loadTopics();
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.equal('Invalid WBWorld.loadTopics() called before IDs loaded');
            }
          });

          it('should load all topic folders', async () => {
            // Stub TopicFolder.fromUuid
            const mockTopicFolder = {
              uuid: 'character-topic-uuid',
              topic: Topics.Character
            };
            
            sinon.stub(TopicFolder, 'fromUuid').resolves(mockTopicFolder as any);
            
            // Call loadTopics
            const result = await world.loadTopics();
            
            // Verify all topics were loaded
            expect(Object.keys(result).length).to.equal(4);
            expect(result[Topics.Character]).to.equal(mockTopicFolder);
            expect(result[Topics.Character].world).to.equal(world);
          });

          it('should throw an error if a topic folder cannot be loaded', async () => {
            // Stub TopicFolder.fromUuid to return null
            sinon.stub(TopicFolder, 'fromUuid').resolves(null);
            
            try {
              await world.loadTopics();
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.equal('Invalid topic uuid in WBWorld.loadTopics()');
            }
          });
        });

        describe('loadCampaigns', () => {
          it('should throw an error if campaignNames is not loaded', async () => {
            // Create a world with no campaignNames
            getFlag.withArgs(sinon.match.any, WorldFlagKey.campaignNames).returns(null);
            const worldWithoutCampaignNames = new WBWorld(mockWorldDoc);
            
            try {
              await worldWithoutCampaignNames.loadCampaigns();
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.equal('Invalid WBWorld.loadCampaigns() called before IDs loaded');
            }
          });

          it('should load all campaigns', async () => {
            // Stub Campaign.fromUuid
            const mockCampaign = {
              uuid: 'campaign1-uuid',
              name: 'Campaign 1'
            };
            
            const Campaign = sinon.stub().returns(mockCampaign);
            Campaign.fromUuid = sinon.stub().resolves(mockCampaign);
            globalThis.Campaign = Campaign;
            
            // Call loadCampaigns
            const result = await world.loadCampaigns();
            
            // Verify all campaigns were loaded
            expect(Object.keys(result).length).to.equal(2);
            expect(result['campaign1-uuid']).to.equal(mockCampaign);
            expect(result['campaign1-uuid'].world).to.equal(world);
          });

          it('should throw an error if a campaign cannot be loaded', async () => {
            // Stub Campaign.fromUuid to return null
            const Campaign = sinon.stub();
            Campaign.fromUuid = sinon.stub().resolves(null);
            globalThis.Campaign = Campaign;
            
            try {
              await world.loadCampaigns();
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.equal('Invalid campaign uuid in WBWorld.loadCampaigns()');
            }
          });
        });

        describe('getters and setters', () => {
          it('should get and set name correctly', () => {
            expect(world.name).to.equal('Test World');
            world.name = 'New World Name';
            expect(world.name).to.equal('New World Name');
          });

          it('should get and set description correctly', () => {
            expect(world.description).to.equal('Test description');
            world.description = 'New description';
            expect(world.description).to.equal('New description');
          });

          it('should get and set genre correctly', () => {
            expect(world.genre).to.equal('Fantasy');
            world.genre = 'Sci-Fi';
            expect(world.genre).to.equal('Sci-Fi');
          });

          it('should get and set worldFeeling correctly', () => {
            expect(world.worldFeeling).to.equal('Epic');
            world.worldFeeling = 'Gritty';
            expect(world.worldFeeling).to.equal('Gritty');
          });

          it('should get and set img correctly', () => {
            expect(world.img).to.equal('test-image.jpg');
            world.img = 'new-image.jpg';
            expect(world.img).to.equal('new-image.jpg');
          });

          it('should get and set campaignNames correctly', () => {
            const campaignNames = world.campaignNames;
            expect(campaignNames['campaign1-uuid']).to.equal('Campaign 1');
            
            world.campaignNames = {
              'campaign1-uuid': 'Updated Campaign 1',
              'campaign3-uuid': 'Campaign 3'
            };
            
            expect(world.campaignNames['campaign1-uuid']).to.equal('Updated Campaign 1');
            expect(world.campaignNames['campaign3-uuid']).to.equal('Campaign 3');
          });

          it('should get and set expandedIds correctly', () => {
            const expandedIds = world.expandedIds;
            expect(expandedIds['campaign1-uuid']).to.equal(true);
            
            world.expandedIds = {
              'campaign2-uuid': true,
              'entry3-uuid': true
            };
            
            expect(world.expandedIds['campaign2-uuid']).to.equal(true);
            expect(world.expandedIds['entry3-uuid']).to.equal(true);
          });

          it('should get and set hierarchies correctly', () => {
            const hierarchies = world.hierarchies;
            expect(hierarchies['entry1-uuid'].children).to.deep.equal(['entry2-uuid']);
            
            world.hierarchies = {
              'entry3-uuid': { parentId: null, children: [], ancestors: [] }
            };
            
            expect(world.hierarchies['entry3-uuid']).to.deep.equal({ parentId: null, children: [], ancestors: [] });
          });

          it('should get and set topicIds correctly', () => {
            const topicIds = world.topicIds;
            expect(topicIds?.[Topics.Character]).to.equal('character-topic-uuid');
            
            world.topicIds = {
              [Topics.Character]: 'new-character-topic-uuid',
              [Topics.Location]: 'new-location-topic-uuid',
              [Topics.Organization]: 'new-organization-topic-uuid'
            };
            
            expect(world.topicIds?.[Topics.Character]).to.equal('new-character-topic-uuid');
          });
        });

        describe('save', () => {
          it('should update the world document with accumulated changes', async () => {
            // Make some changes
            world.name = 'New World Name';
            world.description = 'New description';
            
            // Call save
            const result = await world.save();
            
            // Verify compendium was unlocked and locked
            expect(mockCompendium.configure.calledWith({ locked: false })).to.equal(true);
            expect(mockCompendium.configure.calledWith({ locked: true })).to.equal(true);
            
            // Verify update was called with correct data
            expect((world.raw.update as sinon.SinonStub).calledWith(sinon.match({
              name: 'New World Name',
              [`flags.${moduleId}`]: sinon.match.object
            }))).to.equal(true);
            
            // Verify result
            expect(result).to.equal(world);
          });

          it('should return null if update fails', async () => {
            // Make a change
            world.name = 'New World Name';
            
            // Mock failed update
            (world.raw.update as sinon.SinonStub).resolves(null);
            
            // Call save
            const result = await world.save();
            
            // Verify result
            expect(result).to.be.null;
          });
        });

        describe('create', () => {
          it('should create a new world with the provided name', async () => {
            // Stub getRootFolder
            sinon.stub(globalThis, 'getRootFolder').resolves({ id: 'root-folder-id' });
            
            // Stub validate
            sinon.stub(WBWorld.prototype, 'validate').resolves();
            
            // Call create
            const result = await WBWorld.create();
            
            // Verify Folder.createDocuments was called
            expect(Folder.createDocuments.called).to.equal(true);
            
            // Verify result
            expect(result).to.be.instanceOf(WBWorld);
          });

          it('should return null if name input is cancelled', async () => {
            // Setup inputDialog to return null (cancelled)
            inputDialogStub.resolves(null);
            
            // Call create
            const result = await WBWorld.create();
            
            // Verify result
            expect(result).to.be.null;
          });
        });

        describe('validate', () => {
          it('should throw an error if compendiumId is invalid', async () => {
            // Setup game.packs.get to return null
            (game.packs.get as sinon.SinonStub).returns(null);
            
            try {
              await world.validate();
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.equal('Invalid compendiumId in WBWorld.validate()');
            }
          });

          it('should create a new compendium if none exists', async () => {
            // Setup world with no compendium
            world._compendium = undefined as any;
            
            // Stub createCompendium
            const createCompendiumStub = sinon.stub(world, 'createCompendium').resolves();
            
            // Stub populateTopics and loadCampaigns
            sinon.stub(world, 'populateTopics').resolves();
            sinon.stub(world, 'loadCampaigns').resolves();
            
            // Call validate
            await world.validate();
            
            // Verify createCompendium was called
            expect(createCompendiumStub.called).to.equal(true);
          });
        });

        describe('node management', () => {
          it('should collapse campaign directory', async () => {
            await world.collapseCampaignDirectory();
            expect(unsetFlag.calledWith(world.raw, WorldFlagKey.expandedIds)).to.equal(true);
          });

          it('should collapse topic directory', async () => {
            await world.collapseTopicDirectory();
            expect(unsetFlag.calledWith(world.raw, WorldFlagKey.expandedIds)).to.equal(true);
          });

          it('should expand a node', async () => {
            // Stub save
            sinon.stub(world, 'save').resolves(world);
            
            await world.expandNode('test-node');
            
            expect(world.expandedIds['test-node']).to.equal(true);
          });

          it('should collapse a node', async () => {
            await world.collapseNode('campaign1-uuid');
            
            expect(unsetFlag.calledWith(world.raw, WorldFlagKey.expandedIds, 'campaign1-uuid')).to.equal(true);
          });
        });

        describe('campaign management', () => {
          it('should update campaign name', async () => {
            await world.updateCampaignName('campaign1-uuid', 'Updated Campaign 1');
            
            expect(world._campaignNames['campaign1-uuid']).to.equal('Updated Campaign 1');
            expect(setFlag.calledWith(
              world.raw, 
              WorldFlagKey.campaignNames, 
              sinon.match.object
            )).to.equal(true);
          });

          it('should delete campaign from world', async () => {
            await world.deleteCampaignFromWorld('campaign1-uuid');
            
            expect(unsetFlag.calledWith(world.raw, WorldFlagKey.campaignNames, 'campaign1-uuid')).to.equal(true);
            expect(unsetFlag.calledWith(world.raw, WorldFlagKey.expandedIds, 'campaign1-uuid')).to.equal(true);
          });
        });

        describe('entry management', () => {
          it('should delete entry from world with hierarchy', async () => {
            // Create mock topic folder
            const mockTopicFolder = {
              topic: Topics.Character,
              topNodes: ['entry1-uuid', 'entry3-uuid'],
              save: sinon.stub().resolves()
            };
            
            // Stub cleanTrees
            const cleanTreesStub = sinon.stub(globalThis, 'cleanTrees').resolves();
            
            await world.deleteEntryFromWorld(mockTopicFolder as any, 'entry1-uuid');
            
            expect(cleanTreesStub.called).to.equal(true);
            expect(unsetFlag.calledWith(world.raw, WorldFlagKey.expandedIds, 'entry1-uuid')).to.equal(true);
          });

          it('should delete entry from world without hierarchy but in top nodes', async () => {
            // Create mock topic folder
            const mockTopicFolder = {
              topic: Topics.Character,
              topNodes: ['entry3-uuid'],
              save: sinon.stub().resolves()
            };
            
            // Setup world with no hierarchy for this entry
            world._hierarchies = {};
            
            // Setup topicFolders
            world.topicFolders = {
              [Topics.Character]: mockTopicFolder
            } as any;
            
            await world.deleteEntryFromWorld(mockTopicFolder as any, 'entry3-uuid');
            
            expect(mockTopicFolder.save.called).to.equal(true);
            expect(unsetFlag.calledWith(world.raw, WorldFlagKey.expandedIds, 'entry3-uuid')).to.equal(true);
          });

          it('should delete session from world', async () => {
            await world.deleteSessionFromWorld('session1-uuid');
            
            expect(unsetFlag.calledWith(world.raw, WorldFlagKey.expandedIds, 'session1-uuid')).to.equal(true);
          });
        });

        describe('delete', () => {
          it('should delete the world and its compendium', async () => {
            await world.delete();
            
            expect(mockCompendium.configure.calledWith({ locked: false })).to.equal(true);
            expect(mockCompendium.deleteCompendium.called).to.equal(true);
          });
        });
      });
    }
  );
};