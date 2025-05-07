import * as sinon from 'sinon';
import { QuenchBatchContext } from '@ethaks/fvtt-quench';

import { Entry } from '@/classes/Entry';
import { DOCUMENT_TYPES, EntryDoc } from '@/documents';

import { Topics } from '@/types';

export const registerEntryTests = () => {
  quench.registerBatch(
    'campaign-builder.classes.Entry',
    (context: QuenchBatchContext) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe('Entry', () => {
        let mockEntryDoc: EntryDoc;
        let mockTopicFolder: any;
        let entry: Entry;
        let fromUuidStub;

        beforeEach(() => {
          // Stub fromUuid since we don't want to actually look up documents
          fromUuidStub = sinon.stub(globalThis, 'fromUuid');

          // Stub JournalEntryPage.createDocuments to avoid creating actual documents
          sinon.stub(JournalEntryPage, 'createDocuments');

          // Create a mock EntryDoc
          mockEntryDoc = {
            type: DOCUMENT_TYPES.Entry,
            uuid: 'test-uuid',
            name: 'Test Entry',
            parent: {
              uuid: 'parent-uuid',
            },
            text: {
              content: 'Test description',
            },
            system: {
              type: 'test-type',
              topic: Topics.Character,
              img: 'test-image.jpg',
              speciesId: 'test-species',
              relationships: {
                [Topics.Character]: {},
                [Topics.Event]: {},
                [Topics.Location]: {},
                [Topics.Organization]: {},
              },
              actors: ['actor1', 'actor2'],
              scenes: ['scene1', 'scene2'],
            },
            update: sinon.stub().resolves(null),
            delete: sinon.stub().resolves(undefined),
          } as unknown as EntryDoc;

          // Create a mock TopicFolder
          mockTopicFolder = {
            topic: Topics.Character,
            raw: { id: 'folder-id' },
            getWorld: sinon.stub().resolves({
              unlock: sinon.stub().resolves(undefined),
              lock: sinon.stub().resolves(undefined),
              deleteEntryFromWorld: sinon.stub().resolves(undefined),
            }),
          };

          // Create an Entry instance
          entry = new Entry(mockEntryDoc, mockTopicFolder);
        });

        afterEach(() => {
          sinon.restore();
        });

        describe('constructor', () => {
          it('should throw an error if document type is invalid', () => {
            const invalidDoc = { ...mockEntryDoc, type: 'invalid-type' };
            expect(() => new Entry(invalidDoc as any)).to.throw('Invalid document type in Entry constructor');
          });

          it('should initialize with the provided document and topic folder', () => {
            expect(entry.raw).not.to.equal(mockEntryDoc); // Should be a clone
            expect(entry.uuid).to.equal('test-uuid');
            expect(entry.name).to.equal('Test Entry');
            expect(entry.topicFolder).to.equal(mockTopicFolder);
          });
        });

        describe('fromUuid', () => {
          it('should return null if document is not found', async () => {
            fromUuidStub.resolves(null);
            const result = await Entry.fromUuid('test-uuid');
            expect(result).to.be.null;
          });

          it('should return null if document type is invalid', async () => {
            fromUuidStub.resolves({ type: 'invalid-type' });
            const result = await Entry.fromUuid('test-uuid');
            expect(result).to.be.null;
          });

          it('should return a new Entry instance if document is valid', async () => {
            fromUuidStub.resolves(mockEntryDoc);
            const result = await Entry.fromUuid('test-uuid', mockTopicFolder);
            expect(result).to.be.instanceOf(Entry);
            expect(result?.uuid).to.equal('test-uuid');
            expect(result?.topicFolder).to.equal(mockTopicFolder);
          });
        });

        describe('getters and setters', () => {
          it('should get and set name correctly', () => {
            expect(entry.name).to.equal('Test Entry');
            entry.name = 'New Name';
            expect(entry.name).to.equal('New Name');
            expect(entry.raw.name).to.equal('New Name');
          });

          it('should get and set type correctly', () => {
            expect(entry.type).to.equal('test-type');
            entry.type = 'new-type';
            expect(entry.type).to.equal('new-type');
            expect(entry.raw.system.type).to.equal('new-type');
          });

          it('should get and set description correctly', () => {
            expect(entry.description).to.equal('Test description');
            entry.description = 'New description';
            expect(entry.description).to.equal('New description');
            expect(entry.raw.text.content).to.equal('New description');
          });

          it('should get and set img correctly', () => {
            expect(entry.img).to.equal('test-image.jpg');
            entry.img = 'new-image.jpg';
            expect(entry.img).to.equal('new-image.jpg');
            expect(entry.raw.system.img).to.equal('new-image.jpg');
          });

          it('should get and set speciesId correctly', () => {
            expect(entry.speciesId).to.equal('test-species');
            entry.speciesId = 'new-species';
            expect(entry.speciesId).to.equal('new-species');
            expect(entry.raw.system.speciesId).to.equal('new-species');
          });

          it('should throw an error when setting speciesId on non-character entry', () => {
            // Change the topic to something other than Character
            entry.raw.system.topic = Topics.Location;
            expect(() => { entry.speciesId = 'new-species'; }).to.throw('Attempt to set species on non-character');
          });

          it('should get topic correctly (read-only)', () => {
            expect(entry.topic).to.equal(Topics.Character);
          });

          it('should get and set relationships correctly', () => {
            const newRelationships = {
              [Topics.Character]: { 'char-id': { name: 'Related Character' } },
              [Topics.Event]: {},
              [Topics.Location]: {},
              [Topics.Organization]: {},
            } as any;

            entry.relationships = newRelationships;
            expect(entry.relationships).to.deep.equal(newRelationships);
            expect(entry.raw.system.relationships).to.deep.equal(newRelationships);
          });

          it('should get and set scenes correctly', () => {
            expect(entry.scenes).to.deep.equal(['scene1', 'scene2']);
            entry.scenes = ['scene3', 'scene4'];
            expect(entry.scenes).to.deep.equal(['scene3', 'scene4']);
            expect(entry.raw.system.scenes).to.deep.equal(['scene3', 'scene4']);
          });

          it('should get and set actors correctly', () => {
            expect(entry.actors).to.deep.equal(['actor1', 'actor2']);
            entry.actors = ['actor3', 'actor4'];
            expect(entry.actors).to.deep.equal(['actor3', 'actor4']);
            expect(entry.raw.system.actors).to.deep.equal(['actor3', 'actor4']);
          });
        });

        describe('save', () => {
          it('should update the entry document with accumulated changes', async () => {
            // Make some changes
            entry.name = 'New Name';
            entry.type = 'new-type';
            entry.description = 'New description';

            // Mock successful update
            (entry.raw.update as sinon.SinonStub).resolves(mockEntryDoc);

            // Call save
            const result = await entry.save();

            // Verify world was unlocked and locked
            expect(mockTopicFolder.getWorld.called).to.equal(true);
            const world = await mockTopicFolder.getWorld();
            expect(world.unlock.called).to.equal(true);
            expect(world.lock.called).to.equal(true);

            // Verify update was called with correct data
            expect((entry.raw.update as sinon.SinonStub).calledWith(sinon.match({
              name: 'New Name',
              system: sinon.match({
                type: 'new-type',
              }),
              text: {
                content: 'New description',
              },
            }))).to.equal(true);

            // Verify result
            expect(result).to.equal(entry);
          });

          it('should return null if update fails', async () => {
            // Make a change
            entry.name = 'New Name';

            // Mock failed update
            (entry.raw.update as sinon.SinonStub).resolves(null);

            // Call save
            const result = await entry.save();

            // Verify result
            expect(result).to.be.null;
          });
        });

        describe('delete', () => {
          it('should delete the entry and update the world', async () => {
            // Call delete
            await entry.delete();

            // Verify world was unlocked and locked
            expect(mockTopicFolder.getWorld.called).to.equal(true);
            const world = await mockTopicFolder.getWorld();
            expect(world.unlock.called).to.equal(true);
            expect(world.lock.called).to.equal(true);

            // Verify delete was called
            expect((entry.raw.delete as sinon.SinonStub).called).to.equal(true);

            // Verify world was updated
            expect(world.deleteEntryFromWorld.calledWith(mockTopicFolder, 'test-uuid')).to.equal(true);
          });

          it('should throw an error if topicFolder is null', async () => {
            // Create an entry without a topic folder
            entry.topicFolder = null;

            // Call delete and expect error
            try {
              await entry.delete();
              // If we get here, the test should fail
              expect.fail('Expected an error to be thrown');
            } catch (error) {
              expect(error.message).to.equal('Attempting to delete entry without parent TopicFolder in Entry.delete()');
            }
          });
        });

        describe('getAllRelatedEntries', () => {
          it('should return all related entries for a topic', () => {
            // Set up relationships
            entry.relationships = {
              [Topics.Character]: { 'char1': { name: 'Character 1' } as any, 'char2': { name: 'Character 2' } as any },
              [Topics.Event]: {},
              [Topics.Location]: { 'loc1': { name: 'Location 1' } as any },
              [Topics.Organization]: {},
            };

            // Get related characters
            const characterFolder = { topic: Topics.Character };
            const relatedCharacters = entry.getAllRelatedEntries(characterFolder as any);
            expect(relatedCharacters).to.deep.equal(['char1', 'char2']);

            // Get related locations
            const locationFolder = { topic: Topics.Location };
            const relatedLocations = entry.getAllRelatedEntries(locationFolder as any);
            expect(relatedLocations).to.deep.equal(['loc1']);

            // Get related events (empty)
            const eventFolder = { topic: Topics.Event };
            const relatedEvents = entry.getAllRelatedEntries(eventFolder as any);
            expect(relatedEvents).to.deep.equal([]);
          });
        });
      });
    }
  );
};