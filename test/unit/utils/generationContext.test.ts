import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';

import GenerationContextService from '@/utils/generationContext';
import { Entry, Campaign, Session, Front, FCBSetting } from '@/classes';
import { CustomFieldContentType, FieldType, Topics } from '@/types';
import { ModuleSettings, SettingKey } from '@/settings';
import { getTestSetting } from '@unittest/testUtils';

export const registerGenerationContextTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  /**
   * Stubs ModuleSettings.get for the AI-context settings while passing every other key through.
   * @param sessionCount - Value for aiContextSessionCount.
   * @param includeJournals - Value for aiContextIncludeJournals.
   * @param lowContext - Value for aiContextLowContext.
   */
  const stubContextSettings = (sessionCount: number, includeJournals: boolean, lowContext: boolean = false) => {
    const originalGet = ModuleSettings.get.bind(ModuleSettings);
    sinon.stub(ModuleSettings, 'get').callsFake((key: SettingKey) => {
      if (key === SettingKey.aiContextSessionCount) {
        return sessionCount;
      }
      if (key === SettingKey.aiContextIncludeJournals) {
        return includeJournals;
      }
      if (key === SettingKey.aiContextLowContext) {
        return lowContext;
      }
      return originalGet(key);
    });
  };

  describe('buildContextTree - entry primary', () => {
    let testSetting: FCBSetting;
    let grandparentLoc: Entry;
    let parentLoc: Entry;
    let childLoc: Entry;
    let char1: Entry;
    let char2: Entry;
    let char3: Entry;

    beforeEach(async () => {
      stubContextSettings(3, false);
      testSetting = getTestSetting();

      // Location hierarchy: grandparent -> parent -> child
      grandparentLoc = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'GC Region' }))!;
      parentLoc = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'GC City' }))!;
      childLoc = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'GC Tavern' }))!;
      await testSetting.setEntryHierarchy(grandparentLoc.uuid, {
        parentId: null, locationParentId: null, ancestors: [], children: [parentLoc.uuid], childBranches: [], type: ''
      });
      await testSetting.setEntryHierarchy(parentLoc.uuid, {
        parentId: grandparentLoc.uuid, locationParentId: null, ancestors: [grandparentLoc.uuid], children: [childLoc.uuid], childBranches: [], type: ''
      });
      await testSetting.setEntryHierarchy(childLoc.uuid, {
        parentId: parentLoc.uuid, locationParentId: null, ancestors: [parentLoc.uuid, grandparentLoc.uuid], children: [], childBranches: [], type: ''
      });

      // Characters: char1 related to char2; char2 related to char3 (2 degrees from char1)
      char1 = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'GC Hero' }))!;
      char2 = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'GC Friend' }))!;
      char3 = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'GC Stranger' }))!;

      char1.relationships = {
        [Topics.Character]: {
          [char2.uuid]: { uuid: char2.uuid, name: char2.name, type: '', extraFields: {} }
        }
      } as never;
      // Description references the child location via @UUID (UUID-in-field rule)
      char1.description = `<p>Often found at @UUID[${childLoc.uuid}]{GC Tavern}.</p>`;
      await char1.save();

      char2.relationships = {
        [Topics.Character]: {
          [char3.uuid]: { uuid: char3.uuid, name: char3.name, type: '', extraFields: {} }
        }
      } as never;
      await char2.save();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should flag the primary entry and include 1-degree relationships only', async () => {
      const tree = await GenerationContextService.buildContextTree(char1, CustomFieldContentType.Character, testSetting);

      const primaryNode = tree.entries.characters.find(c => c.uuid === char1.uuid);
      expect(primaryNode).to.exist;
      expect(primaryNode?.primaryEntity).to.equal(true);

      // 1 degree: char2 included (without a primary flag), char3 excluded
      const friendNode = tree.entries.characters.find(c => c.uuid === char2.uuid);
      expect(friendNode).to.exist;
      expect(friendNode?.primaryEntity).to.be.undefined;
      expect(tree.entries.characters.find(c => c.uuid === char3.uuid)).to.be.undefined;
    });

    it('should include UUID-referenced entries with their full ancestor chain', async () => {
      const tree = await GenerationContextService.buildContextTree(char1, CustomFieldContentType.Character, testSetting);

      const locationUuids = tree.entries.locations.map(l => l.uuid);
      expect(locationUuids).to.include(childLoc.uuid);
      expect(locationUuids).to.include(parentLoc.uuid);
      expect(locationUuids).to.include(grandparentLoc.uuid);
    });

    it('should not include campaign content or setting genre/feeling for an entry primary', async () => {
      const tree = await GenerationContextService.buildContextTree(char1, CustomFieldContentType.Character, testSetting);

      expect(tree.campaigns).to.have.length(0);
      expect(tree.setting.uuid).to.equal(testSetting.uuid);
      expect((tree.setting as unknown as Record<string, unknown>).genre).to.be.undefined;
      expect((tree.setting as unknown as Record<string, unknown>).feeling).to.be.undefined;
      expect((tree as unknown as Record<string, unknown>).index).to.be.undefined;
    });

    it('should omit referencedJournals by default', async () => {
      const tree = await GenerationContextService.buildContextTree(char1, CustomFieldContentType.Character, testSetting);
      expect(tree.referencedJournals).to.have.length(0);
    });
  });

  describe('buildContextTree - session primary', () => {
    let testSetting: FCBSetting;
    let campaign: Campaign;
    let session: Session;
    let npc: Entry;
    let loc: Entry;
    let locParent: Entry;

    beforeEach(async () => {
      stubContextSettings(3, false);
      testSetting = getTestSetting();

      campaign = (await Campaign.create(testSetting, 'GC Session Campaign'))!;
      session = (await Session.create(campaign, 'GC Session'))!;

      npc = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'GC NPC' }))!;
      locParent = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'GC Session Region' }))!;
      loc = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'GC Session Site' }))!;
      await testSetting.setEntryHierarchy(loc.uuid, {
        parentId: locParent.uuid, locationParentId: null, ancestors: [locParent.uuid], children: [], childBranches: [], type: ''
      });

      await session.addNPC(npc.uuid);
      await session.addLocation(loc.uuid);
      await session.save();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should nest the flagged session in its campaign and strip the date', async () => {
      const tree = await GenerationContextService.buildContextTree(session, CustomFieldContentType.Session, testSetting);

      expect(tree.campaigns).to.have.length(1);
      const campaignNode = tree.campaigns[0];
      expect(campaignNode.uuid).to.equal(campaign.uuid);

      // Session sits either under an arc shell or at the campaign level depending on arc ranges.
      const allSessions = [...campaignNode.sessions, ...campaignNode.arcs.flatMap(a => a.sessions)];
      const sessionNode = allSessions.find(s => s.uuid === session.uuid);
      expect(sessionNode).to.exist;
      expect(sessionNode?.primaryEntity).to.equal(true);
      expect((sessionNode as unknown as Record<string, unknown>).date).to.be.undefined;
    });

    it('should include the session-linked entries and their ancestors', async () => {
      const tree = await GenerationContextService.buildContextTree(session, CustomFieldContentType.Session, testSetting);

      expect(tree.entries.characters.map(c => c.uuid)).to.include(npc.uuid);
      const locationUuids = tree.entries.locations.map(l => l.uuid);
      expect(locationUuids).to.include(loc.uuid);
      expect(locationUuids).to.include(locParent.uuid);
    });
  });

  describe('buildContextTree - campaign primary', () => {
    let testSetting: FCBSetting;
    let campaign: Campaign;
    let sessions: Session[];

    beforeEach(async () => {
      stubContextSettings(2, false);
      testSetting = getTestSetting();

      campaign = (await Campaign.create(testSetting, 'GC LastN Campaign'))!;
      sessions = [];
      for (let i = 0; i < 3; i++) {
        sessions.push((await Session.create(campaign, `GC LastN Session ${i + 1}`))!);
      }
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should flag the campaign and include only the last N sessions', async () => {
      const tree = await GenerationContextService.buildContextTree(campaign, CustomFieldContentType.Campaign, testSetting);

      expect(tree.campaigns).to.have.length(1);
      const campaignNode = tree.campaigns[0];
      expect(campaignNode.primaryEntity).to.equal(true);

      const includedUuids = [...campaignNode.sessions, ...campaignNode.arcs.flatMap(a => a.sessions)].map(s => s.uuid);
      expect(includedUuids).to.have.length(2);

      // The two highest-numbered sessions survive; the oldest is dropped.
      const byNumber = sessions.slice().sort((a, b) => b.number - a.number);
      expect(includedUuids).to.include(byNumber[0].uuid);
      expect(includedUuids).to.include(byNumber[1].uuid);
      expect(includedUuids).to.not.include(byNumber[2].uuid);
    });
  });

  describe('buildContextTree - front primary', () => {
    let testSetting: FCBSetting;
    let campaign: Campaign;
    let front: Front;
    let participant: Entry;

    beforeEach(async () => {
      stubContextSettings(3, false);
      testSetting = getTestSetting();

      campaign = (await Campaign.create(testSetting, 'GC Front Campaign'))!;
      front = (await Front.create(campaign, 'GC Front'))!;
      participant = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'GC Villain' }))!;

      front.dangers = [{
        uuid: foundry.utils.randomID(),
        name: 'GC Danger',
        description: 'A looming danger',
        grimPortents: [],
        participants: [{ uuid: participant.uuid, role: 'Mastermind' }]
      }] as never;
      await front.save();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should flag the front inside its campaign and include danger participants', async () => {
      const tree = await GenerationContextService.buildContextTree(front, CustomFieldContentType.Front, testSetting);

      expect(tree.campaigns).to.have.length(1);
      const frontNode = (tree.campaigns[0].fronts || []).find(f => f.uuid === front.uuid);
      expect(frontNode).to.exist;
      expect(frontNode?.primaryEntity).to.equal(true);

      expect(tree.entries.characters.map(c => c.uuid)).to.include(participant.uuid);
    });
  });

  describe('buildContextTree - setting primary', () => {
    let testSetting: FCBSetting;
    let activeCampaign: Campaign;
    let completedCampaign: Campaign;

    beforeEach(async () => {
      stubContextSettings(3, false);
      testSetting = getTestSetting();

      activeCampaign = (await Campaign.create(testSetting, 'GC Active Campaign'))!;
      completedCampaign = (await Campaign.create(testSetting, 'GC Completed Campaign'))!;
      completedCampaign.completed = true;
      await completedCampaign.save();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should flag the setting and include only active campaigns', async () => {
      const tree = await GenerationContextService.buildContextTree(testSetting, CustomFieldContentType.Setting, testSetting);

      expect(tree.setting.primaryEntity).to.equal(true);
      const campaignUuids = tree.campaigns.map(c => c.uuid);
      expect(campaignUuids).to.include(activeCampaign.uuid);
      expect(campaignUuids).to.not.include(completedCampaign.uuid);
    });
  });

  describe('buildContextTree - journal inclusion', () => {
    let testSetting: FCBSetting;
    let entry: Entry;
    let journal: JournalEntry;

    beforeEach(async () => {
      testSetting = getTestSetting();

      journal = (await JournalEntry.create({ name: 'GC Test Journal' }))!;
      entry = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'GC Journal Referencer' }))!;
      entry.description = `<p>See @UUID[${journal.uuid}]{notes}.</p>`;
      await entry.save();
    });

    afterEach(async () => {
      sinon.restore();
      await journal.delete();
    });

    it('should include journals referenced by the primary entity when enabled', async () => {
      stubContextSettings(3, true);
      const tree = await GenerationContextService.buildContextTree(entry, CustomFieldContentType.Character, testSetting);

      expect(tree.referencedJournals.map(j => j.uuid)).to.include(journal.uuid);
    });

    it('should omit journals when disabled', async () => {
      stubContextSettings(3, false);
      const tree = await GenerationContextService.buildContextTree(entry, CustomFieldContentType.Character, testSetting);

      expect(tree.referencedJournals).to.have.length(0);
    });
  });

  describe('buildContextTree - branch primary', () => {
    let testSetting: FCBSetting;
    let parentOrg: Entry;
    let branch: Entry;
    let region: Entry;
    let city: Entry;

    beforeEach(async () => {
      stubContextSettings(3, false);
      testSetting = getTestSetting();

      parentOrg = (await Entry.create(testSetting.topicFolders[Topics.Organization]!, { name: 'GC Guild' }))!;
      branch = (await Entry.create(testSetting.topicFolders[Topics.Organization]!, { name: 'GC Guild Chapter' }))!;
      branch.isBranch = true;
      await branch.save();

      region = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'GC Branch Region' }))!;
      city = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'GC Branch City' }))!;
      await testSetting.setEntryHierarchy(city.uuid, {
        parentId: region.uuid, locationParentId: null, ancestors: [region.uuid], children: [], childBranches: [branch.uuid], type: ''
      });
      await testSetting.setEntryHierarchy(branch.uuid, {
        parentId: parentOrg.uuid, locationParentId: city.uuid, ancestors: [parentOrg.uuid], children: [], childBranches: [], type: ''
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should include the parent org, the branch location, and its ancestors', async () => {
      const tree = await GenerationContextService.buildContextTree(branch, CustomFieldContentType.Branch, testSetting);

      const branchNode = tree.entries.organizations.find(o => o.uuid === branch.uuid);
      expect(branchNode).to.exist;
      expect(branchNode?.primaryEntity).to.equal(true);
      expect(branchNode?.isBranch).to.equal(true);
      expect(branchNode?.locationParentUuid).to.equal(city.uuid);
      expect(branchNode?.locationParentName).to.equal(city.name);

      // org ancestor chain
      expect(tree.entries.organizations.map(o => o.uuid)).to.include(parentOrg.uuid);

      // branch location and its ancestors
      const locationUuids = tree.entries.locations.map(l => l.uuid);
      expect(locationUuids).to.include(city.uuid);
      expect(locationUuids).to.include(region.uuid);
    });
  });

  describe('buildContextTree - excluded field', () => {
    let testSetting: FCBSetting;
    let entry: Entry;
    let otherChar: Entry;

    beforeEach(async () => {
      testSetting = getTestSetting();

      entry = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'GC Excluded Hero' }))!;
      entry.description = '<p>Existing description text.</p>';

      otherChar = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'GC Excluded Friend' }))!;
      otherChar.description = '<p>Friend description text.</p>';
      await otherChar.save();

      entry.relationships = {
        [Topics.Character]: {
          [otherChar.uuid]: { uuid: otherChar.uuid, name: otherChar.name, type: '', extraFields: {} }
        }
      } as never;
      await entry.save();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should blank a built-in field on the primary node only', async () => {
      stubContextSettings(3, false);
      const tree = await GenerationContextService.buildContextTree(
        entry, CustomFieldContentType.Character, testSetting, { kind: 'builtIn', key: 'description' }
      );

      const primaryNode = tree.entries.characters.find(c => c.uuid === entry.uuid);
      expect(primaryNode?.description).to.equal('');

      // non-primary entries keep their descriptions
      const friendNode = tree.entries.characters.find(c => c.uuid === otherChar.uuid);
      expect(friendNode?.description).to.not.equal('');
    });

    it('should drop the custom field row being generated from the primary node', async () => {
      const fieldDef = {
        name: 'gcTestField',
        label: 'GC Test Field',
        fieldType: FieldType.Editor,
        deleted: false
      };
      const originalGet = ModuleSettings.get.bind(ModuleSettings);
      sinon.stub(ModuleSettings, 'get').callsFake((key: SettingKey) => {
        if (key === SettingKey.aiContextSessionCount) {
          return 3;
        }
        if (key === SettingKey.aiContextIncludeJournals) {
          return false;
        }
        if (key === SettingKey.customFields) {
          return { [CustomFieldContentType.Character]: [fieldDef] } as never;
        }
        return originalGet(key);
      });

      entry.setCustomField('gcTestField', '<p>Existing field value.</p>');
      await entry.save();

      // without exclusion the row is present
      const withRow = await GenerationContextService.buildContextTree(entry, CustomFieldContentType.Character, testSetting);
      const nodeWith = withRow.entries.characters.find(c => c.uuid === entry.uuid);
      expect(nodeWith?.customFields.some(f => f.label === 'GC Test Field')).to.equal(true);

      // with exclusion it is stripped
      const withoutRow = await GenerationContextService.buildContextTree(
        entry, CustomFieldContentType.Character, testSetting,
        { kind: 'custom', name: 'gcTestField', label: 'GC Test Field' }
      );
      const nodeWithout = withoutRow.entries.characters.find(c => c.uuid === entry.uuid);
      expect(nodeWithout?.customFields.some(f => f.label === 'GC Test Field')).to.equal(false);
    });
  });

  describe('buildContextSnippet', () => {
    let testSetting: FCBSetting;
    let entry: Entry;

    beforeEach(async () => {
      stubContextSettings(3, false);
      testSetting = getTestSetting();
      entry = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'GC Snippet Character' }))!;
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should encode a TOON snippet with the primary flag and without genre/feeling/index', async () => {
      const snippet = await GenerationContextService.buildContextSnippet(entry, CustomFieldContentType.Character, testSetting);

      expect(snippet).to.be.a('string');
      expect(snippet).to.include('primaryEntity');
      expect(snippet).to.include('GC Snippet Character');
      expect(snippet).to.not.include('genre:');
      expect(snippet).to.not.include('feeling:');
      expect(snippet).to.not.match(/^index/m);
    });
  });

  describe('low context mode', () => {
    let testSetting: FCBSetting;
    let greatGrandparentLoc: Entry;
    let grandparentLoc: Entry;
    let parentLoc: Entry;
    let childLoc: Entry;
    let relatedChar: Entry;

    beforeEach(async () => {
      stubContextSettings(3, true, true);
      testSetting = getTestSetting();

      // Location hierarchy: great-grandparent -> grandparent -> parent -> child
      greatGrandparentLoc = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'LC Continent' }))!;
      grandparentLoc = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'LC Region' }))!;
      parentLoc = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'LC City' }))!;
      childLoc = (await Entry.create(testSetting.topicFolders[Topics.Location]!, { name: 'LC Tavern' }))!;
      await testSetting.setEntryHierarchy(greatGrandparentLoc.uuid, {
        parentId: null, locationParentId: null, ancestors: [], children: [grandparentLoc.uuid], childBranches: [], type: ''
      });
      await testSetting.setEntryHierarchy(grandparentLoc.uuid, {
        parentId: greatGrandparentLoc.uuid, locationParentId: null, ancestors: [greatGrandparentLoc.uuid], children: [parentLoc.uuid], childBranches: [], type: ''
      });
      await testSetting.setEntryHierarchy(parentLoc.uuid, {
        parentId: grandparentLoc.uuid, locationParentId: null, ancestors: [grandparentLoc.uuid, greatGrandparentLoc.uuid], children: [childLoc.uuid], childBranches: [], type: ''
      });
      await testSetting.setEntryHierarchy(childLoc.uuid, {
        parentId: parentLoc.uuid, locationParentId: null, ancestors: [parentLoc.uuid, grandparentLoc.uuid, greatGrandparentLoc.uuid], children: [], childBranches: [], type: ''
      });

      // A related entry that must NOT be pulled in under low context
      relatedChar = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'LC Related' }))!;
      childLoc.relationships = {
        [Topics.Character]: {
          [relatedChar.uuid]: { uuid: relatedChar.uuid, name: relatedChar.name, type: '', extraFields: {} }
        }
      } as never;
      childLoc.description = '<p>LC child description</p>';
      await childLoc.save();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should include only the primary entry, parent, and grandparent with name/description only', async () => {
      const tree = await GenerationContextService.buildLowContextTree(childLoc, testSetting);

      const locationUuids = (tree.entries?.locations || []).map(l => l.uuid);
      expect(locationUuids).to.include(childLoc.uuid);
      expect(locationUuids).to.include(parentLoc.uuid);
      expect(locationUuids).to.include(grandparentLoc.uuid);
      // great-grandparent excluded (only 2 levels up), related entries and journals ignored
      expect(locationUuids).to.not.include(greatGrandparentLoc.uuid);
      expect(tree.entries?.characters).to.have.length(0);

      const primaryNode = tree.entries?.locations.find(l => l.uuid === childLoc.uuid);
      expect(primaryNode?.primaryEntity).to.equal(true);
      expect(primaryNode?.description).to.include('LC child description');
      // slim nodes carry only uuid/primaryEntity/name/description
      expect(Object.keys(primaryNode!).sort()).to.deep.equal(['description', 'name', 'primaryEntity', 'uuid']);
    });

    it('should include only the primary entity for non-entry types', async () => {
      const campaign = (await Campaign.create(testSetting, 'LC Campaign'))!;
      const session = (await Session.create(campaign, 'LC Session'))!;

      const tree = await GenerationContextService.buildLowContextTree(session, testSetting);
      expect(tree.session?.primaryEntity).to.equal(true);
      expect(tree.session?.name).to.equal(session.name);
      expect(tree.entries).to.be.undefined;
      expect((tree as unknown as Record<string, unknown>).campaigns).to.be.undefined;
    });

    it('should blank an excluded built-in description on the primary node', async () => {
      const tree = await GenerationContextService.buildLowContextTree(childLoc, testSetting, { kind: 'builtIn', key: 'description' });
      const primaryNode = tree.entries?.locations.find(l => l.uuid === childLoc.uuid);
      expect(primaryNode?.description).to.equal('');
    });

    it('should encode the low-context tree in buildContextSnippet when the setting is on', async () => {
      const snippet = await GenerationContextService.buildContextSnippet(childLoc, CustomFieldContentType.Location, testSetting);
      expect(snippet).to.include('LC Tavern');
      expect(snippet).to.include('primaryEntity');
      // no setting node, journals, or related entries in low-context mode
      expect(snippet).to.not.include(testSetting.name);
      expect(snippet).to.not.include('LC Related');
      expect(snippet).to.not.include('referencedJournals');
    });
  });
};
