import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { WindowTabType } from '@/types';
import { Entry } from '@/classes';

export const registerDragDropTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('dragdrop utilities', () => {
    let dragdrop: typeof import('@/utils/dragdrop');
    let sandbox: sinon.SinonSandbox;
    let mockDataTransfer: DataTransfer;
    let mockDragEvent: DragEvent;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();
      dragdrop = await import('@/utils/dragdrop');
      mockDataTransfer = {
        setData: sandbox.stub(),
        getData: sandbox.stub(),
        types: ['text/plain'],
        dropEffect: '',
        effectAllowed: '',
        setDragImage: sandbox.stub(),
      } as any;
      
      mockDragEvent = {
        dataTransfer: mockDataTransfer,
        preventDefault: sandbox.stub(),
        stopPropagation: sandbox.stub(),
      } as any;
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('setCombinedDragData', () => {
      it('should set combined drag data with Foundry and FCB data', () => {
        const uuid = 'test-uuid';
        const fcbData: any = {
          type: 'Entry',
          uuid: uuid,
        };

        dragdrop.setCombinedDragData(mockDragEvent, uuid, fcbData);

        expect(mockDataTransfer.setData.calledTwice).to.be.true;
        expect(mockDataTransfer.setData.firstCall.args).to.deep.equal(['text/plain', JSON.stringify({
          type: 'JournalEntry',
          uuid: uuid,
          fcbData: fcbData
        })]);
        expect(mockDataTransfer.setData.secondCall.args).to.deep.equal(['application/json', JSON.stringify({
          type: 'JournalEntry',
          uuid: uuid,
          fcbData: fcbData
        })]);
      });

      it('should return early if no dataTransfer', () => {
        const eventWithoutDataTransfer = { ...mockDragEvent, dataTransfer: null } as any;
        dragdrop.setCombinedDragData(eventWithoutDataTransfer, 'test-uuid', {} as any);
        expect(mockDataTransfer.setData.called).to.be.false;
      });
    });

    describe('getValidatedData', () => {
      it('should return parsed JSON data for valid input', () => {
        const testData = { type: 'JournalEntry', uuid: 'test-uuid' };
        mockDataTransfer.getData.returns(JSON.stringify(testData));
        
        const result = dragdrop.getValidatedData(mockDragEvent);
        
        expect(result).to.deep.equal(testData);
      });

      it('should return undefined if text/plain not in types', () => {
        mockDataTransfer.types = [];
        
        const result = dragdrop.getValidatedData(mockDragEvent);
        
        expect(result).to.be.undefined;
      });

      it('should return undefined for invalid JSON', () => {
        mockDataTransfer.getData.returns('invalid json');
        
        const result = dragdrop.getValidatedData(mockDragEvent);
        
        expect(result).to.be.undefined;
      });

      it('should return undefined if getData returns null/undefined', () => {
        mockDataTransfer.getData.returns(null);
        
        const result = dragdrop.getValidatedData(mockDragEvent);
        
        expect(result).to.be.undefined;
      });
    });

    describe('getType', () => {
      it('should return type from fcbData if present', () => {
        const data = {
          type: 'JournalEntry',
          fcbData: { type: 'Entry' }
        };
        
        const result = dragdrop.getType(data);
        
        expect(result).to.equal('Entry');
      });

      it('should return root type if no fcbData', () => {
        const data = {
          type: 'JournalEntry'
        };
        
        const result = dragdrop.getType(data);
        
        expect(result).to.equal('JournalEntry');
      });

      it('should return root type if fcbData has no type', () => {
        const data = {
          type: 'JournalEntry',
          fcbData: {}
        };
        
        const result = dragdrop.getType(data);
        
        expect(result).to.equal('JournalEntry');
      });
    });

    describe('standardDragover', () => {
      it('should prevent default and stop propagation', () => {
        dragdrop.standardDragover(mockDragEvent);
        
        expect(mockDragEvent.preventDefault.calledOnce).to.be.true;
        expect(mockDragEvent.stopPropagation.calledOnce).to.be.true;
      });

      it('should set dropEffect to none if text/plain not in types', () => {
        mockDataTransfer.types = [];
        dragdrop.standardDragover(mockDragEvent);
        
        expect(mockDataTransfer.dropEffect).to.equal('none');
      });
    });

    describe('actorDragStart', () => {
      let mockActor: any;
      let mockPrototypeToken: any;
      let mockCanvas: any;

      beforeEach(() => {
        mockPrototypeToken = {
          texture: {
            scaleX: 1,
            scaleY: 1,
          },
          width: 100,
          height: 100,
        };
        
        mockActor = {
          img: 'test-image.png',
          prototypeToken: mockPrototypeToken,
          toDragData: sandbox.stub().returns({ type: 'Actor', uuid: 'actor-uuid' }),
        };

        mockCanvas = {
          ready: true,
          dimensions: { size: 50 },
          stage: { scale: { x: 2 } },
        };

        (global as any).canvas = mockCanvas;
        (global as any).foundry = {
          applications: {
            ux: {
              DragDrop: {
                implementation: {
                  createDragImage: sandbox.stub().returns('drag-preview'),
                },
              },
            },
          },
        };
        sandbox.stub(global, 'fromUuid').resolves(mockActor);
      });

      afterEach(() => {
        delete (global as any).canvas;
        delete (global as any).foundry;
      });

      it('should set drag data for actor', async () => {
        await dragdrop.actorDragStart(mockDragEvent, 'actor-uuid');
        
        expect(mockDataTransfer.setData.calledWith('text/plain', JSON.stringify({
          type: 'Actor',
          uuid: 'actor-uuid'
        }))).to.be.true;
      });

      it('should set drag image if actor has image', async () => {
        await dragdrop.actorDragStart(mockDragEvent, 'actor-uuid');
        
        expect(mockDataTransfer.setDragImage.calledWith('drag-preview', 100, 100)).to.be.true;
      });

      it('should set effectAllowed to copy', async () => {
        await dragdrop.actorDragStart(mockDragEvent, 'actor-uuid');
        
        expect(mockDataTransfer.effectAllowed).to.equal('copy');
      });

      it('should return early if no dataTransfer or canvas', async () => {
        const eventWithoutDataTransfer = { ...mockDragEvent, dataTransfer: null } as any;
        await dragdrop.actorDragStart(eventWithoutDataTransfer, 'actor-uuid');
        
        expect(mockDataTransfer.setData.called).to.be.false;
      });

      it('should handle missing texture properties', async () => {
        mockPrototypeToken.texture = null;
        
        await dragdrop.actorDragStart(mockDragEvent, 'actor-uuid');
        
        expect(mockDataTransfer.setDragImage.calledWith('drag-preview', 100, 100)).to.be.true;
      });
    });

    describe('itemDragStart', () => {
      let mockItem: any;
      let mockCanvas: any;

      beforeEach(() => {
        mockItem = {
          img: 'test-item.png',
          toDragData: sandbox.stub().returns({ type: 'Item', uuid: 'item-uuid' }),
        };

        mockCanvas = {
          ready: true,
          dimensions: { size: 50 },
          stage: { scale: { x: 2 } },
        };

        (global as any).canvas = mockCanvas;
        (global as any).foundry = {
          applications: {
            ux: {
              DragDrop: {
                implementation: {
                  createDragImage: sandbox.stub().returns('drag-preview'),
                },
              },
            },
          },
        };
        sandbox.stub(global, 'fromUuid').resolves(mockItem);
        
        // Mock existing preview removal
        document.getElementById = sandbox.stub().returns(null);
      });

      afterEach(() => {
        delete (global as any).canvas;
        delete (global as any).foundry;
      });

      it('should set drag data for item', async () => {
        await dragdrop.itemDragStart(mockDragEvent, 'item-uuid');
        
        expect(mockDataTransfer.setData.calledWith('text/plain', JSON.stringify({
          type: 'Item',
          uuid: 'item-uuid'
        }))).to.be.true;
      });

      it('should set drag image if item has image', async () => {
        await dragdrop.itemDragStart(mockDragEvent, 'item-uuid');
        
        expect(mockDataTransfer.setDragImage.calledWith('drag-preview', 50, 50)).to.be.true;
      });

      it('should remove existing preview if present', async () => {
        const mockExistingPreview = { remove: sandbox.stub() };
        document.getElementById = sandbox.stub().returns(mockExistingPreview);
        
        await dragdrop.itemDragStart(mockDragEvent, 'item-uuid');
        
        expect(mockExistingPreview.remove.calledOnce).to.be.true;
      });
    });

    describe('foundryDragStart', () => {
      let mockDoc: any;

      beforeEach(() => {
        mockDoc = {
          toDragData: sandbox.stub().returns({ type: 'JournalEntry', uuid: 'doc-uuid' }),
        };
        
        sandbox.stub(global, 'fromUuid').resolves(mockDoc);
      });

      it('should set drag data using document toDragData', async () => {
        await dragdrop.foundryDragStart(mockDragEvent, 'test-type', { test: 'data' });
        
        expect(mockDataTransfer.setData.calledWith('text/plain', JSON.stringify({
          type: 'JournalEntry',
          uuid: 'doc-uuid'
        }))).to.be.true;
      });

      it('should handle error gracefully', async () => {
        const consoleSpy = sandbox.spy(console, 'error');
        sandbox.stub(global, 'fromUuid').rejects(new Error('Test error'));
        
        await dragdrop.foundryDragStart(mockDragEvent, 'test-type', { test: 'data' });
        
        expect(consoleSpy.calledWith('Error setting up drag data:')).to.be.true;
      });
    });
  });
};
