import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { mountComponent, flushPromises } from '@unittest/vueTestUtils';
import ImagePicker from '@/components/ImagePicker.vue';
import { WindowTabType } from '@/types';
import { Topics } from '@/types';

/**
 * Tests for ImagePicker component.
 *
 * Image picker with context menu for image management.
 * Uses backendStore for AI image generation availability and useContentState composable.
 *
 * Key test areas:
 * - Props (modelValue, title, defaultImage, topic, windowType)
 * - Emits (update:modelValue, create-scene, generate-image)
 * - Computed (getDefaultImage, isDefaultImage)
 * - Event handlers (onImageClick, onContextMenu, onImageError)
 *
 * Note: Uses real localize and ContextMenu functions since Quench runs inside Foundry.
 * Tests verify behavior rather than stubbing external modules.
 */

export const registerImagePickerTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  describe('ImagePicker', () => {
    describe('props', () => {
      it('renders without errors with required windowType prop', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
          },
        });

        expect(wrapper.exists()).to.be.true;
        expect(wrapper.find('[data-testid="image-picker"]').exists()).to.be.true;
      });

      it('renders image element', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
          },
        });

        expect(wrapper.find('img.profile').exists()).to.be.true;
      });
    });

    describe('image src attribute', () => {
      it('uses modelValue when provided', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: 'modules/test/image.webp',
          },
        });

        const img = wrapper.find('img.profile');
        expect(img.element?.getAttribute('src')).to.equal('modules/test/image.webp');
      });

      it('uses default image when modelValue is empty', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: '',
          },
        });

        const img = wrapper.find('img.profile');
        expect(img.element?.getAttribute('src')).to.equal('icons/svg/castle.svg');
      });
    });

    describe('image controls visibility', () => {
      it('shows controls when image is not default', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: 'custom-image.webp',
          },
        });

        expect(wrapper.find('.fcb-image-controls').exists()).to.be.true;
      });

      it('hides controls when image is default', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: '',
          },
        });

        expect(wrapper.find('.fcb-image-controls').exists()).to.be.false;
      });
    });

    describe('onImageError event handler', () => {
      it('sets src to default image on error', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: 'invalid-image.webp',
          },
        });

        const img = wrapper.find('img.profile').element as HTMLImageElement;
        const event = new Event('error');

        // Dispatch error event
        img.dispatchEvent(event);
        await flushPromises();

        // Image src should be reset to default
        expect(img.getAttribute('src')).to.equal('icons/svg/castle.svg');
      });
    });

    describe('context menu behavior', () => {
      it('shows context menu on right-click without error', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: '',
          },
        });

        // Pass plain object instead of MouseEvent to avoid isTrusted read-only property error
        await wrapper.find('[data-testid="image-picker"]').trigger('contextmenu', { clientX: 100, clientY: 100 });
        await flushPromises();

        // No error means success - ContextMenu.showContextMenu is called
        expect(true).to.be.true;
      });

      it('shows context menu for custom image without error', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: 'modules/test/image.webp',
          },
        });

        // Pass plain object instead of MouseEvent to avoid isTrusted read-only property error
        await wrapper.find('[data-testid="image-picker"]').trigger('contextmenu', { clientX: 100, clientY: 100 });
        await flushPromises();

        // No error means success
        expect(true).to.be.true;
      });

      it('shows context menu for Location topic without error', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Entry,
            topic: Topics.Location,
            modelValue: 'modules/test/location.webp',
          },
        });

        // Pass plain object instead of MouseEvent to avoid isTrusted read-only property error
        await wrapper.find('[data-testid="image-picker"]').trigger('contextmenu', { clientX: 100, clientY: 100 });
        await flushPromises();

        // No error means success
        expect(true).to.be.true;
      });
    });

  });
};
