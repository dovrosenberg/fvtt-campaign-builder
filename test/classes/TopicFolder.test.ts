import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { TopicFolder } from '@/classes/TopicFolder';
import { WBWorld } from '@/classes/WBWorld';
import { Entry } from '@/classes/Entry';
import { TopicDoc, TopicFlagKey, EntryDoc } from '@/documents';
import { Topics } from '@/types';
import * as sinon from 'sinon';
import { moduleId } from '@/settings';

export const registerTopicFolderTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.TopicFolder',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('TopicFolder', () => {
        let mockTopicDoc: TopicDoc;
        let mockWorld: WBWorld;
        let topicFolder: TopicFolder;
        let fromUuidStub;
        let getFlag;
        let setFlag;

        beforeEach(() => {
          // Stub fromUuid since we don't want to actually look up documents
          fromUuidStub = sinon.stub(globalThis, 'fromUuid');
          
          // Stub JournalEntry.create to avoid creating actual documents
          sinon.stub(JournalEntry, 'create').resolves({
            name: 'Characters',
            uuid: 'test-topic-uuid',
            update: sinon.stub().resolves({}),
            delete: sinon.stub().resolves(undefined),
          });
          
          // Stub getFlag and setFlag
          getFlag = sinon.stub(globalThis, 'getFlag');
          getFlag.withArgs(sinon.match.any, TopicFlagKey.isTopic).returns(true);
          getFlag.withArgs(sinon.match.any, TopicFlagKey.topNodes).returns(['node1', 'node2']);
          getFlag.withArgs(sinon.match.any, TopicFlagKey.types).returns(['type1', 'type2']);
          getFlag.withArgs(sinon.match.any, TopicFlagKey.topic).returns(Topics.Character);
          
          setFlag = sinon.stub(globalThis, 'setFlag');
          
          // Create a mock TopicDoc
          mockTopicDoc = {
            documentName: 'JournalEntry',
            uuid: 'test-topic-uuid',
            name: 'Characters',
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
          } as unknown as TopicDoc;

          // Create a mock World
          mockWorld = {
            uuid: 'world-uuid',
            unlock: sinon.stub().resolves(undefined),
            lock: sinon.stub().resolves(undefined),
            save: sinon.stub().resolves({}),
            compendium: {
              metadata: {
                id: 'test-compendium'
              }
            }
          } as unknown as WBWorld;

          // Create a TopicFolder instance
          topicFolder = new TopicFolder(mockTopicDoc, mockWorld);
        });

        afterEach(() => {
          sinon.restore();
        });

        describe('constructor', () => {
          it('should throw an error if document type is invalid', () => {
            // Create an invalid document
            const invalidDoc = { ...mockTopicDoc, documentName: 'Actor' };
            getFlag.withArgs(invalidDoc, TopicFlagKey.isTopic).returns(false);
            
            expect(() => new TopicFolder(invalidDoc as any)).to.throw('Invalid document type in Campaign constructor');
          });

          it('should initialize with the provided document and world', () => {
            expect(topicFolder.raw).not.to.equal(mockTopicDoc); // Should be a clone
            expect(topicFolder.uuid).to.equal('test-topic-uuid');
            expect(topicFolder.topic).to.equal(Topics.Character);
            expect(topicFolder.world).to.equal(mockWorld);
          });
        });

        describe('fromUuid', () => {
          it('should return null if document is not found', async () => {
            fromUuidStub.resolves(null);
            const result = await TopicFolder.fromUuid('test-uuid');
            expect(result).to.be.null;
          });

          it('should return a new TopicFolder instance if document is valid', async () => {
            fromUuidStub.resolves(mockTopicDoc);
            const result = await TopicFolder.fromUuid('test-uuid');
            expect(result).to.be.instanceOf(TopicFolder);
            expect(result?.uuid).to.equal('test-topic-uuid');
          });
        });

        describe('getWorld and loadWorld', () => {
          it('should return the existing world if already set', async () => {
            const result = await topicFolder.getWorld();
            expect(result).to.equal(mockWorld);
          });

          it('should load the world if not already set', async () => {
            // Create a topic folder without a world
            const topicFolderWithoutWorld = new TopicFolder(mockTopicDoc);
            
            // Setup the fromUuid stub to return a world doc
            fromUuidStub.withArgs('world-uuid').resolves({
              uuid: 'world-uuid'
            });
            
            // Act
            const result = await topicFolderWithoutWorld.loadWorld();
            
            // Assert
            expect(result).to.be.instanceOf(WBWorld);
            expect(result.uuid).to.equal('world-uuid');
          });

          it('should throw an error if folder is missing', async () => {
            // Create a topic folder without a world and with invalid folder
            const invalidDoc = { ...mockTopicDoc, collection: { folder: null } };
            const topicFolderWithInvalidFolder = new TopicFolder(invalidDoc as any);
            
            try {
              await topicFolderWithInvalidFolder.loadWorld();
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.equal('Invalid folder id in Topics.loadWorld()');
            }
          });

          it('should throw an error if world document is not found', async () => {
            // Create a topic folder without a world
            const topicFolderWithoutWorld = new TopicFolder(mockTopicDoc);
            
            // Setup the fromUuid stub to return null
            fromUuidStub.withArgs('world-uuid').resolves(null);
            
            try {
              await topicFolderWithoutWorld.loadWorld();
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.equal('Invalid folder id in Topics.loadWorld()');
            }
          });
        });

        describe('getters and setters', () => {
          it('should get and set topNodes correctly', () => {
            expect(topicFolder.topNodes).to.deep.equal(['node1', 'node2']);
            topicFolder.topNodes = ['node3', 'node4'];
            expect(topicFolder.topNodes).to.deep.equal(['node3', 'node4']);
          });

          it('should get and set topic correctly', () => {
            expect(topicFolder.topic).to.equal(Topics.Character);
            topicFolder.topic = Topics.Location;
            expect(topicFolder.topic).to.equal(Topics.Location);
          });

          it('should get and set types correctly', () => {
            expect(topicFolder.types).to.deep.equal(['type1', 'type2']);
            topicFolder.types = ['type3', 'type4'];
            expect(topicFolder.types).to.deep.equal(['type3', 'type4']);
          });
        });

        describe('save', () => {
          it('should update the topic document with accumulated changes', async () => {
            // Make some changes
            topicFolder.topNodes = ['node3', 'node4'];
            topicFolder.types = ['type3', 'type4'];
            
            // Call save
            const result = await topicFolder.save();
            
            // Verify world was unlocked and locked
            expect(mockWorld.unlock.called).to.equal(true);
            expect(mockWorld.lock.called).to.equal(true);
            
            // Verify update was called with correct data
            expect((topicFolder.raw.update as sinon.SinonStub).calledWith(sinon.match({
              [`flags.${moduleId}`]: sinon.match.object
            }))).to.equal(true);
            
            // Verify result
            expect(result).to.equal(topicFolder);
          });

          it('should return null if update fails', async () => {
            // Make a change
            topicFolder.topNodes = ['node3', 'node4'];
            
            // Mock failed update
            (topicFolder.raw.update as sinon.SinonStub).resolves(null);
            
            // Call save
            const result = await topicFolder.save();
            
            // Verify result
            expect(result).to.be.null;
          });

          it('should load world if not already set', async () => {
            // Create a topic folder without a world
            const topicFolderWithoutWorld = new TopicFolder(mockTopicDoc);
            
            // Setup the fromUuid stub to return a world doc
            fromUuidStub.withArgs('world-uuid').resolves({
              uuid: 'world-uuid',
              unlock: sinon.stub().resolves(undefined),
              lock: sinon.stub().resolves(undefined)
            });
            
            // Make a change
            topicFolderWithoutWorld.topNodes = ['node3', 'node4'];
            
            // Mock successful update
            (mockTopicDoc.update as sinon.SinonStub).resolves({});
            
            // Call save
            await topicFolderWithoutWorld.save();
            
            // Verify world was loaded, unlocked and locked
            expect(fromUuidStub.calledWith('world-uuid')).to.equal(true);
          });
        });

        describe('delete', () => {
          it('should delete the topic folder', async () => {
            // Call delete
            await topicFolder.delete();
            
            // Verify world was unlocked and locked
            expect(mockWorld.unlock.called).to.equal(true);
            expect(mockWorld.lock.called).to.equal(true);
            
            // Verify delete was called
            expect((topicFolder.raw.delete as sinon.SinonStub).called).to.equal(true);
          });

          it('should load world if not already set', async () => {
            // Create a topic folder without a world
            const topicFolderWithoutWorld = new TopicFolder(mockTopicDoc);
            
            // Setup the fromUuid stub to return a world doc
            fromUuidStub.withArgs('world-uuid').resolves({
              uuid: 'world-uuid',
              unlock: sinon.stub().resolves(undefined),
              lock: sinon.stub().resolves(undefined)
            });
            
            // Call delete
            await topicFolderWithoutWorld.delete();
            
            // Verify world was loaded, unlocked and locked
            expect(fromUuidStub.calledWith('world-uuid')).to.equal(true);
          });
        });

        describe('create', () => {
          it('should create a new topic folder', async () => {
            // Call create
            const result = await TopicFolder.create(mockWorld, Topics.Character);
            
            // Verify world was unlocked and locked
            expect(mockWorld.unlock.called).to.equal(true);
            expect(mockWorld.lock.called).to.equal(true);
            
            // Verify JournalEntry.create was called
            expect(JournalEntry.create.called).to.equal(true);
            
            // Verify setFlag was called to set the topic
            expect(setFlag.calledWith(sinon.match.any, TopicFlagKey.topic, Topics.Character)).to.equal(true);
            
            // Verify result
            expect(result).to.be.instanceOf(TopicFolder);
          });

          it('should throw an error if journal entry creation fails', async () => {
            // Setup JournalEntry.create to return null
            (JournalEntry.create as sinon.SinonStub).resolves(null);
            
            try {
              await TopicFolder.create(mockWorld, Topics.Character);
              expect.fail('Should have thrown an error');
            } catch (error) {
              expect(error.message).to.equal('Couldn\'t create new topic');
            }
          });
        });

        describe('entry management', () => {
          it('should filter entries correctly', () => {
            // Setup mock entries
            mockTopicDoc.pages.contents = [
              { uuid: 'entry1-uuid', name: 'Entry 1' },
              { uuid: 'entry2-uuid', name: 'Entry 2' }
            ] as any[];
            
            // Stub Entry constructor
            const entryStub = sinon.stub(globalThis, 'Entry').callsFake((doc) => ({
              uuid: doc.uuid,
              name: doc.name
            }));
            
            // Act
            const result = topicFolder.filterEntries((e) => e.name === 'Entry 1');
            
            // Assert
            expect(result.length).to.equal(1);
            expect(result[0].uuid).to.equal('entry1-uuid');
          });

          it('should return all entries', () => {
            // Setup mock entries
            mockTopicDoc.pages.contents = [
              { uuid: 'entry1-uuid', name: 'Entry 1' },
              { uuid: 'entry2-uuid', name: 'Entry 2' }
            ] as any[];
            
            // Stub Entry constructor
            const entryStub = sinon.stub(globalThis, 'Entry').callsFake((doc) => ({
              uuid: doc.uuid,
              name: doc.name
            }));
            
            // Act
            const result = topicFolder.allEntries();
            
            // Assert
            expect(result.length).to.equal(2);
            expect(result[0].uuid).to.equal('entry1-uuid');
            expect(result[1].uuid).to.equal('entry2-uuid');
          });

          it('should find entry by uuid', () => {
            // Setup mock entries
            mockTopicDoc.pages.contents = [
              { uuid: 'entry1-uuid', name: 'Entry 1' },
              { uuid: 'entry2-uuid', name: 'Entry 2' }
            ] as any[];
            
            // Stub Entry constructor
            const entryStub = sinon.stub(globalThis, 'Entry').callsFake((doc) => ({
              uuid: doc.uuid,
              name: doc.name
            }));
            
            // Act
            const result = topicFolder.findEntry('entry2-uuid');
            
            // Assert
            expect(result).not.to.be.null;
            expect(result?.uuid).to.equal('entry2-uuid');
          });

          it('should return null when entry is not found', () => {
            // Setup mock entries
            mockTopicDoc.pages.contents = [
              { uuid: 'entry1-uuid', name: 'Entry 1' }
            ] as any[];
            
            // Act
            const result = topicFolder.findEntry('non-existent-uuid');
            
            // Assert
            expect(result).to.be.null;
          });
        });
      });
    }
  );
};