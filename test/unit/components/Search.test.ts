import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { mountComponent, flushPromises } from '@unittest/vueTestUtils';
import Search from '@/components/Search.vue';
import { createMockSetting } from '@unittest/componentTestUtils';
import * as SearchUtils from '@/utils/search';

/**
 * Tests for Search component.
 *
 * Search input with autocomplete and tag search functionality.
 * Uses mainStore (currentSetting) and navigationStore for opening results.
 *
 * Key test areas:
 * - Props (maxResults)
 * - Computed (showResults, allResults)
 * - Methods (getTag, performSearch, selectResult, initializeSearch)
 * - Event handlers (onSearchInput, onEnterPress, onArrowDown, onArrowUp)
 * - External function calls (searchService, navigationStore)
 */

export const registerSearchTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('Search', () => {
    describe('props', () => {
      it('renders without errors with default props', async () => {
        const mockSetting = createMockSetting();
        const { wrapper } = mountComponent(Search, {
          stores: {
            main: { currentSetting: mockSetting },
          },
        });

        expect(wrapper.exists()).to.be.true;
        expect(wrapper.find('[data-testid="search-input"]').exists()).to.be.true;
      });

      it('accepts maxResults prop', async () => {
        const mockSetting = createMockSetting();
        const { wrapper } = mountComponent(Search, {
          props: {
            maxResults: 10,
          },
          stores: {
            main: { currentSetting: mockSetting },
          },
        });

        expect(wrapper.exists()).to.be.true;
      });
    });

    describe('external function calls', () => {
      let buildIndexStub: sinon.SinonStub;

      beforeEach(() => {
        buildIndexStub = sinon.stub(SearchUtils.searchService, 'buildIndex').resolves();
      });

      afterEach(() => {
        sinon.restore();
      });

    });
  });
};
