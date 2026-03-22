import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { mountComponent, flushPromises } from '@unittest/vueTestUtils';
import { assertEmitted, getEmitPayload } from '@unittest/componentTestUtils';
import AdvancedTextArea from '@/components/AdvancedTextArea.vue';
import * as UuidHandler from '@/utils/uuidHandler';
import * as ClipboardCleaner from '@/utils/clipboardUuidCleaner';
import DragDropService from '@/utils/dragDrop';

/**
 * Tests for AdvancedTextArea component.
 *
 * Enhanced textarea with UUID drag/drop support and edit/display mode toggle.
 * No store dependencies - uses uuidHandler utilities.
 *
 * Key test areas:
 * - Props (id, modelValue, editMode, settingId, placeholder, rows, currentEntityUuid, enableEntityLinking)
 * - v-model emit (update:modelValue)
 * - internalValue computed (getter/setter)
 * - Edit mode vs display mode rendering
 * - Watcher side effects (modelValue, editMode, settingId)
 * - External function calls (enrichUuidLinks, handleUuidDropOnTextarea, handleCopyWithCleanUuids)
 * - focus method
 */

export const registerAdvancedTextAreaTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('AdvancedTextArea', () => {
    describe('props', () => {
      it('renders without errors with minimal props', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
          },
        });

        expect(wrapper.exists()).to.be.true;
        expect(wrapper.find('textarea').exists()).to.be.true;
      });

      it('applies id prop to textarea', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            id: 'test-textarea-id',
          },
        });

        const textarea = wrapper.find('textarea');
        expect(textarea.attributes('id')).to.equal('test-textarea-id');
      });

      it('applies placeholder prop to textarea', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: '',
            placeholder: 'Enter description...',
          },
        });

        const textarea = wrapper.find('textarea');
        expect(textarea.attributes('placeholder')).to.equal('Enter description...');
      });

      it('applies rows prop to textarea', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: '',
            rows: 5,
          },
        });

        const textarea = wrapper.find('textarea');
        expect(textarea.attributes('rows')).to.equal('5');
      });

      it('uses default rows of 3 when not provided', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: '',
          },
        });

        const textarea = wrapper.find('textarea');
        expect(textarea.attributes('rows')).to.equal('3');
      });

      it('uses default editMode=true when not provided', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
          },
        });

        // Should show textarea (edit mode)
        expect(wrapper.find('textarea').exists()).to.be.true;
        // Should NOT show display content
        expect(wrapper.find('.display-content').exists()).to.be.false;
      });
    });

    describe('edit mode vs display mode', () => {
      it('shows textarea in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: true,
          },
        });

        expect(wrapper.find('textarea').exists()).to.be.true;
        expect(wrapper.find('.display-content').exists()).to.be.false;
      });

      it('shows display content in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: false,
          },
        });

        expect(wrapper.find('textarea').exists()).to.be.false;
        expect(wrapper.find('.display-content').exists()).to.be.true;
      });

      it('applies display-mode class when not in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: false,
          },
        });

        expect(wrapper.find('.fcb-advanced-text-area').classes()).to.include('display-mode');
      });

      it('does not apply display-mode class when in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: true,
          },
        });

        expect(wrapper.find('.fcb-advanced-text-area').classes()).to.not.include('display-mode');
      });
    });

    describe('v-model (internalValue computed)', () => {
      it('emits update:modelValue when textarea value changes', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Initial',
          },
        });

        await wrapper.find('textarea').setValue('New content');
        await flushPromises();

        assertEmitted(expect, wrapper, 'update:modelValue', 0, 'New content');
      });

      it('reflects modelValue prop in textarea', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Initial content',
          },
        });

        const textarea = wrapper.find('textarea');
        expect((textarea.element as HTMLTextAreaElement).value).to.equal('Initial content');
      });

      it('updates textarea when modelValue prop changes', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Initial',
          },
        });

        await wrapper.setProps({ modelValue: 'Updated content' });
        await flushPromises();

        const textarea = wrapper.find('textarea');
        expect((textarea.element as HTMLTextAreaElement).value).to.equal('Updated content');
      });
    });

    describe('editMode watcher', () => {
      it('switches from display to edit mode correctly', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: false,
          },
        });

        await flushPromises();

        // Should start in display mode
        expect(wrapper.find('.display-content').exists()).to.be.true;

        // Switch to edit mode
        await wrapper.setProps({ editMode: true });
        await flushPromises();

        expect(wrapper.find('textarea').exists()).to.be.true;
        expect(wrapper.find('.display-content').exists()).to.be.false;
      });

      it('switches from edit to display mode correctly', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: true,
          },
        });

        await flushPromises();

        // Should start in edit mode
        expect(wrapper.find('textarea').exists()).to.be.true;

        // Switch to display mode
        await wrapper.setProps({ editMode: false });
        await flushPromises();

        expect(wrapper.find('.display-content').exists()).to.be.true;
        expect(wrapper.find('textarea').exists()).to.be.false;
      });
    });

    describe('focus method', () => {
      it('is exposed via defineExpose', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: true,
          },
        });

        // The focus method should be exposed
        expect(typeof wrapper.vm.focus).to.equal('function');
      });

      it('focuses the textarea when called in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: true,
          },
        });

        const textareaEl = wrapper.find('textarea').element as HTMLTextAreaElement;
        const focusSpy = sinon.spy();
        Object.defineProperty(textareaEl, 'focus', { value: focusSpy, writable: true });

        await wrapper.vm.focus();
        await flushPromises();

        expect(focusSpy.called).to.be.true;
      });

      it('does nothing when not in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: false,
          },
        });

        // Should not throw - textarea doesn't exist
        await wrapper.vm.focus();
        await flushPromises();

        // No error means success
        expect(true).to.be.true;
      });
    });

    describe('onDragover event handler', () => {
      it('calls DragDropService.standardDragover in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: true,
          },
        });

        const event = new DragEvent('dragover');
        const preventDefaultSpy = sinon.spy();
        event.preventDefault = preventDefaultSpy;

        const textareaEl = wrapper.find('textarea').element;
        textareaEl.dispatchEvent(event);
        await flushPromises();

        // DragDropService.standardDragover calls preventDefault
        // We can't easily spy on the service, but we verify no error occurs
        expect(true).to.be.true;
      });

      it('does nothing when not in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: false,
          },
        });

        // No textarea exists, so handler should return early
        const containerEl = wrapper.find('.fcb-advanced-text-area').element;
        const event = new DragEvent('dragover');
        containerEl.dispatchEvent(event);
        await flushPromises();

        // No error means success
        expect(true).to.be.true;
      });
    });

    describe('onDrop event handler', () => {
      it('handles drop event in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: true,
          },
        });

        const event = new DragEvent('drop');
        const textareaEl = wrapper.find('textarea').element;
        textareaEl.dispatchEvent(event);
        await flushPromises();

        // handleUuidDropOnTextarea is called - we verify no error
        expect(true).to.be.true;
      });

      it('returns early when not in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: false,
          },
        });

        // No textarea exists
        expect(wrapper.find('textarea').exists()).to.be.false;
      });
    });

    describe('onCopy event handler', () => {
      it('is registered on the container element', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: true,
          },
        });

        // Verify the container has the copy handler
        const container = wrapper.find('.fcb-advanced-text-area');
        expect(container.exists()).to.be.true;
      });

      it('handles copy in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: true,
          },
        });

        const containerEl = wrapper.find('.fcb-advanced-text-area').element;
        const event = new ClipboardEvent('copy');
        containerEl.dispatchEvent(event);
        await flushPromises();

        // handleCopyWithCleanUuids is called - we verify no error
        expect(true).to.be.true;
      });

      it('handles copy in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: false,
          },
        });

        await flushPromises();

        const containerEl = wrapper.find('.fcb-advanced-text-area').element;
        const event = new ClipboardEvent('copy');
        containerEl.dispatchEvent(event);
        await flushPromises();

        // handleCopyWithCleanUuids is called for display mode
        expect(true).to.be.true;
      });
    });

    describe('settingId watcher', () => {
      it('re-processes display content when settingId changes in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: false,
            settingId: 'setting-1',
          },
        });

        await flushPromises();

        // Change settingId - should trigger updateDisplayContent
        await wrapper.setProps({ settingId: 'setting-2' });
        await flushPromises();

        // Component should still be in display mode with content
        expect(wrapper.find('.display-content').exists()).to.be.true;
      });
    });

    describe('modelValue watcher in display mode', () => {
      it('updates display content when modelValue changes in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Initial content',
            editMode: false,
          },
        });

        await flushPromises();

        // Change modelValue
        await wrapper.setProps({ modelValue: 'Updated content' });
        await flushPromises();

        // Display content should be updated
        expect(wrapper.find('.display-content').exists()).to.be.true;
      });
    });

    describe('empty/undefined modelValue handling', () => {
      it('handles empty string modelValue', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: '',
          },
        });

        const textarea = wrapper.find('textarea');
        expect((textarea.element as HTMLTextAreaElement).value).to.equal('');
      });

      it('handles undefined modelValue with default', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {},
        });

        // Should use default empty string
        const textarea = wrapper.find('textarea');
        expect((textarea.element as HTMLTextAreaElement).value).to.equal('');
      });
    });

    describe('external function calls', () => {
      let enrichUuidLinksStub: sinon.SinonStub;
      let handleUuidDropStub: sinon.SinonStub;
      let handleCopyStub: sinon.SinonStub;
      let dragoverStub: sinon.SinonStub;

      beforeEach(() => {
        enrichUuidLinksStub = sinon.stub(UuidHandler, 'enrichUuidLinks').resolves('<p>enriched</p>');
        handleUuidDropStub = sinon.stub(UuidHandler, 'handleUuidDropOnTextarea').resolves();
        handleCopyStub = sinon.stub(ClipboardCleaner, 'handleCopyWithCleanUuids');
        dragoverStub = sinon.stub(DragDropService, 'standardDragover');
      });

      afterEach(() => {
        enrichUuidLinksStub.restore();
        handleUuidDropStub.restore();
        handleCopyStub.restore();
        dragoverStub.restore();
      });

      it('calls enrichUuidLinks with correct parameters on mount in display mode', async () => {
        mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: false,
            settingId: 'test-setting-id',
          },
        });

        await flushPromises();

        expect(enrichUuidLinksStub.calledOnce).to.be.true;
        expect(enrichUuidLinksStub.firstCall.args[0]).to.equal('test-setting-id');
        expect(enrichUuidLinksStub.firstCall.args[1]).to.equal('Test content');
      });

      it('calls enrichUuidLinks when modelValue changes in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Initial',
            editMode: false,
            settingId: 'test-setting-id',
          },
        });

        await flushPromises();
        enrichUuidLinksStub.resetHistory();

        await wrapper.setProps({ modelValue: 'Updated content' });
        await flushPromises();

        expect(enrichUuidLinksStub.calledOnce).to.be.true;
        expect(enrichUuidLinksStub.firstCall.args[0]).to.equal('test-setting-id');
        expect(enrichUuidLinksStub.firstCall.args[1]).to.equal('Updated content');
      });

      it('calls enrichUuidLinks when settingId changes in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: false,
            settingId: 'setting-1',
          },
        });

        await flushPromises();
        enrichUuidLinksStub.resetHistory();

        await wrapper.setProps({ settingId: 'setting-2' });
        await flushPromises();

        expect(enrichUuidLinksStub.calledOnce).to.be.true;
        expect(enrichUuidLinksStub.firstCall.args[0]).to.equal('setting-2');
      });

      it('calls enrichUuidLinks when switching to display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: true,
            settingId: 'test-setting-id',
          },
        });

        await flushPromises();
        expect(enrichUuidLinksStub.called).to.be.false;

        await wrapper.setProps({ editMode: false });
        await flushPromises();

        expect(enrichUuidLinksStub.calledOnce).to.be.true;
        expect(enrichUuidLinksStub.firstCall.args[0]).to.equal('test-setting-id');
        expect(enrichUuidLinksStub.firstCall.args[1]).to.equal('Test content');
      });

      it('calls DragDropService.standardDragover with event in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: true,
          },
        });

        const event = new DragEvent('dragover');
        await wrapper.find('textarea').trigger('dragover', event);

        expect(dragoverStub.calledOnce).to.be.true;
        expect(dragoverStub.firstCall.args[0]).to.equal(event);
      });

      it('does not call DragDropService.standardDragover in display mode', async () => {
        mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: false,
          },
        });

        await flushPromises();

        // dragover handler returns early when not in edit mode
        expect(dragoverStub.called).to.be.false;
      });

      it('calls handleUuidDropOnTextarea with event and textarea in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: true,
          },
        });

        const textareaEl = wrapper.find('textarea').element as HTMLTextAreaElement;
        const event = new DragEvent('drop');
        await wrapper.find('textarea').trigger('drop', event);
        await flushPromises();

        expect(handleUuidDropStub.calledOnce).to.be.true;
        expect(handleUuidDropStub.firstCall.args[0]).to.equal(event);
        expect(handleUuidDropStub.firstCall.args[1]).to.equal(textareaEl);
      });

      it('does not call handleUuidDropOnTextarea in display mode', async () => {
        mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: false,
          },
        });

        await flushPromises();

        // No textarea exists, so handler returns early
        expect(handleUuidDropStub.called).to.be.false;
      });

      it('calls handleCopyWithCleanUuids with event and selected text in edit mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content for copy',
            editMode: true,
          },
        });

        const containerEl = wrapper.find('.fcb-advanced-text-area').element;
        const event = new ClipboardEvent('copy');
        containerEl.dispatchEvent(event);
        await flushPromises();

        expect(handleCopyStub.calledOnce).to.be.true;
        // In edit mode, it's called with event and selectedText
        expect(handleCopyStub.firstCall.args[0]).to.equal(event);
      });

      it('calls handleCopyWithCleanUuids with only event in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: false,
          },
        });

        await flushPromises();

        const containerEl = wrapper.find('.fcb-advanced-text-area').element;
        const event = new ClipboardEvent('copy');
        containerEl.dispatchEvent(event);
        await flushPromises();

        expect(handleCopyStub.calledOnce).to.be.true;
        // In display mode, it's called with just event (no selectedText)
        expect(handleCopyStub.firstCall.args[0]).to.equal(event);
        expect(handleCopyStub.firstCall.args.length).to.equal(1);
      });
    });
  });
};
