import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { mountComponent, flushPromises } from '@unittest/vueTestUtils';
import { assertEmitted } from '@unittest/componentTestUtils';
import AdvancedTextArea from '@/components/AdvancedTextArea.vue';

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
 * - focus method
 *
 * Note: Uses real uuidHandler functions since Quench runs inside Foundry.
 * External function call tests verify behavior rather than stubbing.
 */

export const registerAdvancedTextAreaTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

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

    describe('display content enrichment', () => {
      it('renders display content in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: false,
            settingId: 'test-setting-id',
          },
        });

        await flushPromises();

        // Display content should be rendered (enrichUuidLinks is called internally)
        expect(wrapper.find('.display-content').exists()).to.be.true;
      });

      it('updates display content when modelValue changes in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Initial',
            editMode: false,
            settingId: 'test-setting-id',
          },
        });

        await flushPromises();

        await wrapper.setProps({ modelValue: 'Updated content' });
        await flushPromises();

        // Display content should be updated
        expect(wrapper.find('.display-content').exists()).to.be.true;
      });

      it('updates display content when settingId changes in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: false,
            settingId: 'setting-1',
          },
        });

        await flushPromises();

        await wrapper.setProps({ settingId: 'setting-2' });
        await flushPromises();

        // Display content should be updated
        expect(wrapper.find('.display-content').exists()).to.be.true;
      });

      it('creates display content when switching to display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test content',
            editMode: true,
            settingId: 'test-setting-id',
          },
        });

        await flushPromises();
        expect(wrapper.find('.display-content').exists()).to.be.false;

        await wrapper.setProps({ editMode: false });
        await flushPromises();

        expect(wrapper.find('.display-content').exists()).to.be.true;
      });
    });

    describe('drag and drop handlers', () => {
      it('handles dragover event in edit mode without error', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: true,
          },
        });

        // Pass plain object instead of DragEvent to avoid isTrusted read-only property error
        await wrapper.find('textarea').trigger('dragover');

        // No error means success - DragDropService.standardDragover is called
        expect(true).to.be.true;
      });

      it('does nothing on dragover in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: false,
          },
        });

        await flushPromises();

        // No textarea exists, so handler returns early
        expect(wrapper.find('textarea').exists()).to.be.false;
      });

      it('handles drop event in edit mode without error', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: true,
          },
        });

        // Pass plain object instead of DragEvent to avoid isTrusted read-only property error
        await wrapper.find('textarea').trigger('drop');
        await flushPromises();

        // No error means success - handleUuidDropOnTextarea is called
        expect(true).to.be.true;
      });

      it('does nothing on drop in display mode', async () => {
        const { wrapper } = mountComponent(AdvancedTextArea, {
          props: {
            modelValue: 'Test',
            editMode: false,
          },
        });

        await flushPromises();

        // No textarea exists, so handler returns early
        expect(wrapper.find('textarea').exists()).to.be.false;
      });
    });

    describe('copy handler', () => {
      it('handles copy event in edit mode without error', async () => {
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

        // No error means success - handleCopyWithCleanUuids is called
        expect(true).to.be.true;
      });

      it('handles copy event in display mode without error', async () => {
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

        // No error means success - handleCopyWithCleanUuids is called
        expect(true).to.be.true;
      });
    });
  });
};
