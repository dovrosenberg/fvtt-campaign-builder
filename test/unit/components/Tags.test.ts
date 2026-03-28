import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { mountComponent } from '@unittest/vueTestUtils';
import Tags from '@/components/Tags.vue';
import { createMockSetting } from '@unittest/componentTestUtils';

/**
 * Tests for Tags component.
 *
 * Tag input component using Tagify library with mainStore integration.
 * Uses currentSetting for tag color lookup and management.
 *
 * Key test areas:
 * - Props (modelValue, whitelistSupplement)
 * - Conditional rendering (uninitialized class)
 *
 * Note: Tagify is a third-party ES module library that cannot be easily stubbed.
 * Event handler tests (onTagAdded, onTagRemoved, onTagClick) are covered by
 * E2E tests instead.
 */

export const registerTagsTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  describe('Tags', () => {
    describe('props', () => {
      it('renders without errors with required modelValue prop', async () => {
        const mockSetting = createMockSetting();
        const { wrapper } = mountComponent(Tags, {
          props: {
            modelValue: ['tag1', 'tag2'],
          },
          stores: {
            main: { currentSetting: mockSetting },
          },
        });

        expect(wrapper.exists()).to.be.true;
        expect(wrapper.find('[data-testid="tags-input"]').exists()).to.be.true;
      });

      it('accepts empty modelValue array', async () => {
        const mockSetting = createMockSetting();
        const { wrapper } = mountComponent(Tags, {
          props: {
            modelValue: [],
          },
          stores: {
            main: { currentSetting: mockSetting },
          },
        });

        expect(wrapper.exists()).to.be.true;
      });

      it('accepts whitelistSupplement prop', async () => {
        const mockSetting = createMockSetting();
        const { wrapper } = mountComponent(Tags, {
          props: {
            modelValue: [],
            whitelistSupplement: ['extra1', 'extra2'],
          },
          stores: {
            main: { currentSetting: mockSetting },
          },
        });

        expect(wrapper.exists()).to.be.true;
      });

      it('uses default empty whitelistSupplement when not provided', async () => {
        const mockSetting = createMockSetting();
        const { wrapper } = mountComponent(Tags, {
          props: {
            modelValue: [],
          },
          stores: {
            main: { currentSetting: mockSetting },
          },
        });

        // Should not error - default is empty array
        expect(wrapper.exists()).to.be.true;
      });
    });


    describe('uninitialized class', () => {
      it('applies uninitialized class before Tagify is ready', async () => {
        const mockSetting = createMockSetting();
        const { wrapper } = mountComponent(Tags, {
          props: {
            modelValue: [],
          },
          stores: {
            main: { currentSetting: mockSetting },
          },
        });

        expect(wrapper.find('.tags-wrapper').classes()).to.include('uninitialized');
      });
    });

  });
};
