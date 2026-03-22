import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { mountComponent, flushPromises } from '@unittest/vueTestUtils';
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
 * - Event handlers (onTagAdded, onTagRemoved, onTagClick)
 * - External function calls (currentSetting.addTag/removeTag/save)
 *
 * Note: Tagify is a third-party library, so we test our integration with it
 * by simulating the custom events it dispatches.
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

    describe('event handlers', () => {
      it('emits update:modelValue and tagAdded when tag is added', async () => {
        const mockSetting = createMockSetting({
          tags: {},
          addTag: sinon.stub().resolves(),
          save: sinon.stub().resolves(),
        } as any);
        
        const { wrapper } = mountComponent(Tags, {
          props: {
            modelValue: [],
          },
          stores: {
            main: { currentSetting: mockSetting },
          },
        });

        // Wait for Tagify to initialize
        await flushPromises();
        
        // Simulate Tagify 'add' event by dispatching custom event on the input
        const input = wrapper.find('input').element;
        const addEvent = new CustomEvent('add', {
          detail: {
            data: { value: 'newTag', __isValid: true },
          },
        });
        input.dispatchEvent(addEvent);
        await flushPromises();

        expect(wrapper.emitted('update:modelValue')).to.exist;
        expect(wrapper.emitted('tagAdded')).to.exist;
      });

      it('emits tagClick when tag is clicked', async () => {
        const mockSetting = createMockSetting();
        
        const { wrapper } = mountComponent(Tags, {
          props: {
            modelValue: ['existingTag'],
          },
          stores: {
            main: { currentSetting: mockSetting },
          },
        });

        // Wait for Tagify to initialize
        await flushPromises();
        
        // Simulate Tagify 'click' event
        const input = wrapper.find('input').element;
        const clickEvent = new CustomEvent('click', {
          detail: {
            data: { value: 'existingTag' },
          },
        });
        input.dispatchEvent(clickEvent);
        await flushPromises();

        expect(wrapper.emitted('tagClick')).to.exist;
        expect(wrapper.emitted('tagClick')?.[0]).to.deep.equal(['existingTag']);
      });
    });

  });
};
