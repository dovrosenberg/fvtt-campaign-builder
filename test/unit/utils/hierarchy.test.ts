import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import {
  hasHierarchy,
  getParentId,
  validParentItems,
  cleanTrees,
  NO_TYPE_STRING,
  NO_NAME_STRING
} from '@/utils/hierarchy';
import { Topics } from '@/types';
import * as sinon from 'sinon';

export const registerHierarchyTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, afterEach } = context;

  afterEach(() => {
    // sinon.restore() is now handled at the batch level
  });

  describe('constants', () => {
    it('should define NO_TYPE_STRING', () => {
      expect(NO_TYPE_STRING).to.equal('(none)');
    });

    it('should define NO_NAME_STRING', () => {
      expect(NO_NAME_STRING).to.equal('<Blank>');
    });
  });

  describe('hasHierarchy', () => {
    it('should return true for Organization topic', () => {
      expect(hasHierarchy(Topics.Organization)).to.equal(true);
    });

    it('should return true for Location topic', () => {
      expect(hasHierarchy(Topics.Location)).to.equal(true);
    });

    it('should return false for Character topic', () => {
      expect(hasHierarchy(Topics.Character)).to.equal(false);
    });
  });

  describe('getParentId', () => {
    it('should return null for topics without hierarchy', () => {
      const mockSetting = {} as any;
      const mockEntry = { topic: Topics.Character } as any;

      expect(getParentId(mockSetting, mockEntry)).to.be.null;
    });

    it('should return parentId from hierarchy if available', () => {
      const mockSetting = {
        hierarchies: {
          'entry-uuid': {
            parentId: 'parent-uuid',
            children: [],
            ancestors: []
          }
        }
      } as any;

      const mockEntry = {
        topic: Topics.Organization,
        uuid: 'entry-uuid'
      } as any;

      expect(getParentId(mockSetting, mockEntry)).to.equal('parent-uuid');
    });

    it('should return null if hierarchy exists but no parentId', () => {
      const mockSetting = {
        hierarchies: {
          'entry-uuid': {
            children: [],
            ancestors: []
          }
        }
      } as any;

      const mockEntry = {
        topic: Topics.Organization,
        uuid: 'entry-uuid'
      } as any;

      expect(getParentId(mockSetting, mockEntry)).to.be.null;
    });

    it('should return null if hierarchy does not exist for entry', () => {
      const mockSetting = {
        hierarchies: {}
      } as any;

      const mockEntry = {
        topic: Topics.Organization,
        uuid: 'entry-uuid'
      } as any;

      expect(getParentId(mockSetting, mockEntry)).to.be.null;
    });
  });

  describe('validParentItems', () => {
    it('should return empty array for topics without hierarchy', () => {
      const mockSetting = {} as any;
      const mockEntry = { topic: Topics.Character } as any;

      expect(validParentItems(mockSetting, mockEntry)).to.deep.equal([]);
    });

    it('should return empty array if entry has no uuid', () => {
      const mockSetting = {} as any;
      const mockEntry = { topic: Topics.Organization, uuid: '' } as any;

      expect(validParentItems(mockSetting, mockEntry)).to.deep.equal([]);
    });

    it('should return empty array if topicFolder is not found', () => {
      const mockSetting = {
        topicFolders: {}
      } as any;

      const mockEntry = {
        topic: Topics.Organization,
        uuid: 'entry-uuid'
      } as any;

      expect(validParentItems(mockSetting, mockEntry)).to.deep.equal([]);
    });

    it('should filter out the entry itself and entries that have it as an ancestor', () => {
      const mockEntries = [
        { uuid: 'entry-uuid', name: 'Current Entry' },
        { uuid: 'other-entry', name: 'Other Entry' },
        { uuid: 'descendant-entry', name: 'Descendant Entry' }
      ];

      const mockTopicFolder = {
        entryIndex: mockEntries
      };

      const mockSetting = {
        topicFolders: {
          [Topics.Organization]: mockTopicFolder
        },
        hierarchies: {
          'entry-uuid': {},
          'other-entry': {},
          'descendant-entry': {
            ancestors: ['entry-uuid']
          }
        }
      } as any;

      const mockEntry = {
        topic: Topics.Organization,
        uuid: 'entry-uuid'
      } as any;

      const result = validParentItems(mockSetting, mockEntry);

      expect(mockSetting.topicFolders[Topics.Organization].entryIndex).to.equal(mockEntries);
      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal('other-entry');
      expect(result[0].name).to.equal('Other Entry');
    });
  });

  describe('cleanTrees', () => {
    it('should update hierarchies and save changes', async () => {
      // Create mock data
      const mockHierarchies = {
        'deleted-id': {
          parentId: 'grandparent-id',
          children: ['child1-id', 'child2-id'],
          ancestors: [],
          type: 'City'
        },
        'grandparent-id': {
          children: ['deleted-id'],
          ancestors: [],
          type: 'Country'
        },
        'child1-id': {
          parentId: 'deleted-id',
          children: [],
          ancestors: ['deleted-id'],
          type: 'Building'
        },
        'child2-id': {
          parentId: 'deleted-id',
          children: [],
          ancestors: ['deleted-id'],
          type: 'Building'
        },
        'descendant-id': {
          parentId: 'child1-id',
          children: [],
          ancestors: ['deleted-id', 'child1-id'],
          type: 'Room'
        }
      };

      const mockSetting = {
        hierarchies: mockHierarchies,
        save: sinon.stub().resolves(undefined)
      } as any;

      const mockTopicFolder = {
        topNodes: ['top-node-id', 'deleted-id'],
        save: sinon.stub().resolves(undefined)
      } as any;

      // Call the function
      await cleanTrees(
        mockSetting,
        mockTopicFolder,
        'deleted-id',
        mockHierarchies['deleted-id']
      );

      // Verify hierarchies were updated correctly
      expect('deleted-id' in mockSetting.hierarchies).to.equal(false);

      // Children should now point to grandparent
      expect(mockSetting.hierarchies['child1-id'].parentId).to.equal('grandparent-id');
      expect(mockSetting.hierarchies['child2-id'].parentId).to.equal('grandparent-id');

      // Grandparent should have children directly
      expect(mockSetting.hierarchies['grandparent-id'].children.includes('child1-id')).to.equal(true);
      expect(mockSetting.hierarchies['grandparent-id'].children.includes('child2-id')).to.equal(true);
      expect(mockSetting.hierarchies['grandparent-id'].children.includes('deleted-id')).to.equal(false);

      // Ancestors should be updated
      expect(mockSetting.hierarchies['child1-id'].ancestors.includes('deleted-id')).to.equal(false);
      expect(mockSetting.hierarchies['child2-id'].ancestors.includes('deleted-id')).to.equal(false);
      expect(mockSetting.hierarchies['descendant-id'].ancestors.includes('deleted-id')).to.equal(false);

      // Setting and topic folder should be saved
      expect(mockSetting.save.called).to.equal(true);
      expect(mockTopicFolder.save.called).to.equal(true);

      // TopNodes should be updated
      expect(mockTopicFolder.topNodes.includes('deleted-id')).to.equal(false);
      expect(mockTopicFolder.topNodes.includes('top-node-id')).to.equal(true);
    });

    it('should handle case where deleted item has no parent', async () => {
      // Create mock data with no parent for deleted item
      const mockHierarchies = {
        'deleted-id': {
          parentId: null,
          children: ['child1-id'],
          ancestors: [],
          type: 'City'
        },
        'child1-id': {
          parentId: 'deleted-id',
          children: [],
          ancestors: ['deleted-id'],
          type: 'Building'
        }
      };

      const mockSetting = {
        hierarchies: mockHierarchies,
        save: sinon.stub().resolves(undefined)
      } as any;

      const mockTopicFolder = {
        topNodes: ['deleted-id'],
        save: sinon.stub().resolves(undefined)
      } as any;

      // Call the function
      await cleanTrees(
        mockSetting,
        mockTopicFolder,
        'deleted-id',
        mockHierarchies['deleted-id']
      );

      // Child should become a top node with no parent
      expect(mockSetting.hierarchies['child1-id'].parentId).to.be.null;
      expect(mockSetting.hierarchies['child1-id'].ancestors.length).to.equal(0);

      // TopNodes should include the child now
      expect(mockTopicFolder.topNodes.includes('child1-id')).to.equal(true);
    });
  });
};