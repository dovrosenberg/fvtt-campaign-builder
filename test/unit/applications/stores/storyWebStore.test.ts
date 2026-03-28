import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { setActivePinia, createPinia } from 'pinia';
import { useStoryWebStore, useNavigationStore } from '@/applications/stores';

/** Mock graph state with properly typed sinon stubs */
interface MockGraphState {
  regenerate: sinon.SinonStub<[contentUuid?: string], Promise<void>>;
  addEntry: sinon.SinonStub<[uuid: string, position?: { x: number; y: number } | null, withRelationships?: boolean], Promise<void>>;
}

export const registerStoryWebStoreTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('useStoryWebStore', () => {
    let storyWebStore: ReturnType<typeof useStoryWebStore>;
    let navigationStore: ReturnType<typeof useNavigationStore>;
    let sandbox: sinon.SinonSandbox;

    beforeEach(async () => {
      sandbox = sinon.createSandbox();

      // Create a fresh pinia instance for each test
      setActivePinia(createPinia());

      // Create the stores after pinia is set
      storyWebStore = useStoryWebStore();
      navigationStore = useNavigationStore();
    });

    afterEach(() => {
      sandbox.restore();
    });

    /** Creates a mock graph state with sinon stubs */
    const createMockState = (): MockGraphState => ({
      regenerate: sandbox.stub().resolves(),
      addEntry: sandbox.stub().resolves(),
    });

    describe('registerGraphState', () => {
      it('should register a graph state for a panel', () => {
        const mockState = createMockState();

        storyWebStore.registerGraphState(0, mockState as unknown as import('@/composables/useStoryWebGraphState').StoryWebGraphState);

        // Verify it was registered by testing regenerateAllGraphs
        void storyWebStore.regenerateAllGraphs();
        expect(mockState.regenerate.calledOnce).to.be.true;
      });

      it('should overwrite existing graph state for same panel', () => {
        const mockState1 = createMockState();
        const mockState2 = createMockState();

        storyWebStore.registerGraphState(0, mockState1 as unknown as import('@/composables/useStoryWebGraphState').StoryWebGraphState);
        storyWebStore.registerGraphState(0, mockState2 as unknown as import('@/composables/useStoryWebGraphState').StoryWebGraphState);

        void storyWebStore.regenerateAllGraphs();

        // Only mockState2 should be called
        expect(mockState1.regenerate.called).to.be.false;
        expect(mockState2.regenerate.calledOnce).to.be.true;
      });
    });

    describe('unregisterGraphState', () => {
      it('should unregister a graph state', () => {
        const mockState = createMockState();

        storyWebStore.registerGraphState(0, mockState as unknown as import('@/composables/useStoryWebGraphState').StoryWebGraphState);
        storyWebStore.unregisterGraphState(0);

        void storyWebStore.regenerateAllGraphs();

        expect(mockState.regenerate.called).to.be.false;
      });

      it('should not throw when unregistering non-existent panel', () => {
        expect(() => storyWebStore.unregisterGraphState(999)).to.not.throw();
      });
    });

    describe('regenerateAllGraphs', () => {
      it('should regenerate all registered graph states', async () => {
        const mockState1 = createMockState();
        const mockState2 = createMockState();

        storyWebStore.registerGraphState(0, mockState1 as unknown as import('@/composables/useStoryWebGraphState').StoryWebGraphState);
        storyWebStore.registerGraphState(1, mockState2 as unknown as import('@/composables/useStoryWebGraphState').StoryWebGraphState);

        await storyWebStore.regenerateAllGraphs();

        expect(mockState1.regenerate.calledOnce).to.be.true;
        expect(mockState2.regenerate.calledOnce).to.be.true;
      });

      it('should pass contentUuid to regenerate when provided', async () => {
        const mockState = createMockState();

        storyWebStore.registerGraphState(0, mockState as unknown as import('@/composables/useStoryWebGraphState').StoryWebGraphState);

        const testUuid = 'test-uuid-123';
        await storyWebStore.regenerateAllGraphs(testUuid);

        expect(mockState.regenerate.calledWith(testUuid)).to.be.true;
      });

      it('should handle empty registry gracefully', async () => {
        await expect(storyWebStore.regenerateAllGraphs()).to.be.fulfilled;
      });
    });

    describe('addEntry', () => {
      it('should add entry to focused panel graph state', async () => {
        const mockState = createMockState();

        storyWebStore.registerGraphState(0, mockState as unknown as import('@/composables/useStoryWebGraphState').StoryWebGraphState);

        // Stub the focused panel index
        Object.defineProperty(navigationStore, 'focusedPanelIndex', {
          get: () => 0,
          configurable: true,
        });

        const testUuid = 'test-entry-uuid';
        await storyWebStore.addEntry(testUuid, true);

        expect(mockState.addEntry.calledWith(testUuid, null, true)).to.be.true;
      });

      it('should do nothing when no graph state for focused panel', async () => {
        // No graph state registered for panel 0
        Object.defineProperty(navigationStore, 'focusedPanelIndex', {
          get: () => 0,
          configurable: true,
        });

        // Should not throw
        await expect(storyWebStore.addEntry('test-uuid', false)).to.be.fulfilled;
      });
    });
  });
};
