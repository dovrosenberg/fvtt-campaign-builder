import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import DragDropService from '@/utils/dragDrop';

export const registerDragDropTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('dragDrop utilities', () => {
    let sandbox: sinon.SinonSandbox;
    let mockDataTransfer;
    let mockDragEvent;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      mockDataTransfer = {
        setData: sandbox.stub(),
        getData: sandbox.stub(),
        types: ['text/plain'],
        dropEffect: '',
        effectAllowed: '',
        setDragImage: sandbox.stub(),
      };
      
      mockDragEvent = {
        dataTransfer: mockDataTransfer,
        preventDefault: sandbox.stub(),
        stopPropagation: sandbox.stub(),
      };
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

        DragDropService.setCombinedDragData(mockDragEvent, uuid, fcbData);

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
        DragDropService.setCombinedDragData(eventWithoutDataTransfer, 'test-uuid', {} as any);
        expect(mockDataTransfer.setData.called).to.be.false;
      });
    });

    describe('getValidatedData', () => {
      it('should return parsed JSON data for valid input', () => {
        const testData = { type: 'JournalEntry', uuid: 'test-uuid' };
        mockDataTransfer.getData.returns(JSON.stringify(testData));
        
        const result = DragDropService.getValidatedData(mockDragEvent);
        
        expect(result).to.deep.equal(testData);
      });

      it('should return undefined if text/plain not in types', () => {
        mockDataTransfer.types = [];
        
        const result = DragDropService.getValidatedData(mockDragEvent);
        
        expect(result).to.be.undefined;
      });

      it('should return undefined for invalid JSON', () => {
        mockDataTransfer.getData.returns('invalid json');
        
        const result = DragDropService.getValidatedData(mockDragEvent);
        
        expect(result).to.be.undefined;
      });

      it('should return undefined if getData returns null/undefined', () => {
        mockDataTransfer.getData.returns(null);
        
        const result = DragDropService.getValidatedData(mockDragEvent);
        
        expect(result).to.be.undefined;
      });
    });

    describe('getType', () => {
      it('should return type from fcbData if present', () => {
        const data = {
          type: 'JournalEntry',
          fcbData: { type: 'Entry' }
        };
        
        const result = DragDropService.getType(data);
        
        expect(result).to.equal('Entry');
      });

      it('should return root type if no fcbData', () => {
        const data = {
          type: 'JournalEntry'
        };
        
        const result = DragDropService.getType(data);
        
        expect(result).to.equal('JournalEntry');
      });

      it('should return root type if fcbData has no type', () => {
        const data = {
          type: 'JournalEntry',
          fcbData: {}
        };
        
        const result = DragDropService.getType(data);
        
        expect(result).to.equal('JournalEntry');
      });
    });

    describe('standardDragover', () => {
      it('should prevent default and stop propagation', () => {
        DragDropService.standardDragover(mockDragEvent);
        
        expect(mockDragEvent.preventDefault.calledOnce).to.be.true;
        expect(mockDragEvent.stopPropagation.calledOnce).to.be.true;
      });

      it('should set dropEffect to none if text/plain not in types', () => {
        mockDataTransfer.types = [];
        DragDropService.standardDragover(mockDragEvent);
        
        expect(mockDataTransfer.dropEffect).to.equal('none');
      });
    });

    describe('actorDragStart', () => {
      let mockActor: any;
      let mockPrototypeToken: any;

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

        sandbox.stub(window, 'fromUuid').resolves(mockActor);
      });

      it('should set drag data for actor', async () => {
        await DragDropService.actorDragStart(mockDragEvent, 'actor-uuid');
        
        expect(mockDataTransfer.setData.calledWith('text/plain', JSON.stringify({
          type: 'Actor',
          uuid: 'actor-uuid'
        }))).to.be.true;
      });

      it('should set drag image if actor has image', async () => {
        await DragDropService.actorDragStart(mockDragEvent, 'actor-uuid');
        
        // Get the actual canvas dimensions and scale from the real instance
        const expectedWidth = mockPrototypeToken.width * canvas.dimensions.size * Math.abs(mockPrototypeToken.texture.scaleX) * canvas.stage.scale.x;
        const expectedHeight = mockPrototypeToken.height * canvas.dimensions.size * Math.abs(mockPrototypeToken.texture.scaleY) * canvas.stage.scale.y;
        
        expect(mockDataTransfer.setDragImage.calledWith(sinon.match.any, expectedWidth / 2, expectedHeight / 2)).to.be.true;
      });

      it('should set effectAllowed to copy', async () => {
        await DragDropService.actorDragStart(mockDragEvent, 'actor-uuid');
        
        expect(mockDataTransfer.effectAllowed).to.equal('copy');
      });

      it('should return early if no dataTransfer or canvas', async () => {
        const eventWithoutDataTransfer = { ...mockDragEvent, dataTransfer: null } as any;
        await DragDropService.actorDragStart(eventWithoutDataTransfer, 'actor-uuid');
        
        expect(mockDataTransfer.setData.called).to.be.false;
      });

      it('should handle missing texture properties', async () => {
        mockPrototypeToken.texture = null;
        
        await DragDropService.actorDragStart(mockDragEvent, 'actor-uuid');
        
        // Get the actual canvas dimensions and scale from the real instance
        const expectedSize = canvas.dimensions!.size * canvas.stage!.scale.x;
        
        expect(mockDataTransfer.setDragImage.calledWith(sinon.match.any, expectedSize / 2, expectedSize / 2)).to.be.true;
      });
    });

    describe('itemDragStart', () => {
      let mockItem: any;

      beforeEach(() => {
        mockItem = {
          img: 'test-item.png',
          toDragData: sandbox.stub().returns({ type: 'Item', uuid: 'item-uuid' }),
        };

        sandbox.stub(window, 'fromUuid').resolves(mockItem);
        
        // Mock existing preview removal
        document.getElementById = sandbox.stub().returns(null);
      });

      it('should set drag data for item', async () => {
        await DragDropService.itemDragStart(mockDragEvent, 'item-uuid');
        
        expect(mockDataTransfer.setData.calledWith('text/plain', JSON.stringify({
          type: 'Item',
          uuid: 'item-uuid'
        }))).to.be.true;
      });

      it('should set drag image if item has image', async () => {
        await DragDropService.itemDragStart(mockDragEvent, 'item-uuid');
        
        // Get the actual canvas dimensions and scale from the real instance
        const expectedSize = canvas.dimensions!.size * canvas.stage!.scale.x;
        
        expect(mockDataTransfer.setDragImage.calledWith(sinon.match.any, expectedSize / 2, expectedSize / 2)).to.be.true;
      });

      it('should remove existing preview if present', async () => {
        const mockExistingPreview = { remove: sandbox.stub() };
        document.getElementById = sandbox.stub().returns(mockExistingPreview);
        
        await DragDropService.itemDragStart(mockDragEvent, 'item-uuid');
        
        expect(mockExistingPreview.remove.calledOnce).to.be.true;
      });
    });

    describe('foundryDragStart', () => {
      let mockDoc: any;

      beforeEach(() => {
        mockDoc = {
          toDragData: sandbox.stub().returns({ type: 'JournalEntry', uuid: 'doc-uuid' }),
        };
        
        sandbox.stub(window, 'fromUuid').resolves(mockDoc);
      });

      it('should set drag data using document toDragData', async () => {
        await DragDropService.foundryDragStart(mockDragEvent, 'actor-uuid');
        
        expect(mockDataTransfer.setData.calledWith('text/plain', JSON.stringify({
          type: 'JournalEntry',
          uuid: 'doc-uuid'
        }))).to.be.true;
      });

      it('should handle error gracefully', async () => {
        const consoleSpy = sandbox.spy(console, 'error');
        // Restore any existing fromUuid stub before creating a new one
        if ((window.fromUuid as any).restore) {
          (window.fromUuid as any).restore();
        }
        sandbox.stub(window, 'fromUuid').rejects(new Error('Test error'));
        
        await DragDropService.foundryDragStart(mockDragEvent, 'actor-uuid');
        
        expect(consoleSpy.calledWith('Error setting up drag data:')).to.be.true;
      });
    });
  });
};
