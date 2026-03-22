import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { mountComponent, flushPromises } from '@unittest/vueTestUtils';
import ImagePicker from '@/components/ImagePicker.vue';
import { WindowTabType } from '@/types';
import { Topics } from '@/types';
import * as GameUtils from '@/utils/game';
import ContextMenu from '@imengyu/vue3-context-menu';

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
 * - External function calls (localize, FilePicker, ImagePopout, ChatMessage, notifications)
 */

export const registerImagePickerTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

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

    describe('external function calls', () => {
      let localizeStub: sinon.SinonStub;
      let contextMenuStub: sinon.SinonStub;

      beforeEach(() => {
        localizeStub = sinon.stub(GameUtils, 'localize').callsFake((key: string) => key);
        contextMenuStub = sinon.stub(ContextMenu, 'showContextMenu');
      });

      afterEach(() => {
        localizeStub.restore();
        contextMenuStub.restore();
      });

      it('calls localize for context menu items', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: '',
          },
        });

        const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 100 });
        await wrapper.find('[data-testid="image-picker"]').trigger('contextmenu', event);
        await flushPromises();

        // localize should be called for menu item labels
        expect(localizeStub.called).to.be.true;
      });

      it('calls ContextMenu.showContextMenu with correct structure for default image', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: '',
          },
        });

        const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 100 });
        await wrapper.find('[data-testid="image-picker"]').trigger('contextmenu', event);
        await flushPromises();

        expect(contextMenuStub.calledOnce).to.be.true;
        const menuConfig = contextMenuStub.firstCall.args[0];
        expect(menuConfig.x).to.equal(100);
        expect(menuConfig.y).to.equal(100);
        expect(menuConfig.customClass).to.equal('fcb');
        expect(menuConfig.items).to.exist;
        // Default image should have "Add Image" option
        expect(menuConfig.items.some((item: any) => item.icon === 'fa-edit')).to.be.true;
      });

      it('shows context menu with full options for custom image', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: 'modules/test/image.webp',
          },
        });

        const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 100 });
        await wrapper.find('[data-testid="image-picker"]').trigger('contextmenu', event);
        await flushPromises();

        const menuConfig = contextMenuStub.firstCall.args[0];
        // Custom image should have more options like "Show to Players", "Copy", "Remove"
        const icons = menuConfig.items.map((item: any) => item.icon);
        expect(icons).to.include('fa-eye');
        expect(icons).to.include('fa-copy');
        expect(icons).to.include('fa-trash');
        expect(icons).to.include('fa-comment');
      });

      it('includes create-scene option for Location topic', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Entry,
            topic: Topics.Location,
            modelValue: 'modules/test/location.webp',
          },
        });

        const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 100 });
        await wrapper.find('[data-testid="image-picker"]').trigger('contextmenu', event);
        await flushPromises();

        const menuConfig = contextMenuStub.firstCall.args[0];
        const icons = menuConfig.items.map((item: any) => item.icon);
        expect(icons).to.include('fa-image');
      });

      it('emits update:modelValue when removeImage is clicked', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Setting,
            modelValue: 'modules/test/image.webp',
          },
        });

        const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 100 });
        await wrapper.find('[data-testid="image-picker"]').trigger('contextmenu', event);
        await flushPromises();

        const menuConfig = contextMenuStub.firstCall.args[0];
        const removeItem = menuConfig.items.find((item: any) => item.icon === 'fa-trash');
        
        // Call the onClick handler directly
        removeItem.onClick();
        await flushPromises();

        expect(wrapper.emitted('update:modelValue')?.[0]).to.deep.equal(['']);
      });

      it('emits generate-image when generateImage is clicked', async () => {
        const { wrapper } = mountComponent(ImagePicker, {
          props: {
            windowType: WindowTabType.Entry,
            topic: Topics.Character,
            modelValue: '', // Default image - generate option available
          },
          stores: {
            backend: { available: true },
          },
        });

        const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 100 });
        await wrapper.find('[data-testid="image-picker"]').trigger('contextmenu', event);
        await flushPromises();

        const menuConfig = contextMenuStub.firstCall.args[0];
        const generateItem = menuConfig.items.find((item: any) => item.icon === 'fa-head-side-virus');
        
        // Call the onClick handler directly
        generateItem.onClick();
        await flushPromises();

        expect(wrapper.emitted('generate-image')).to.exist;
      });
    });

  });
};
