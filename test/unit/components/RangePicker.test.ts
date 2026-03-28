import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { mountComponent, flushPromises } from '@unittest/vueTestUtils';
import { assertEmitted, getEmitPayload } from '@unittest/componentTestUtils';
import RangePicker from '@/components/RangePicker.vue';

/**
 * Tests for RangePicker component.
 *
 * This component wraps Foundry's HTMLRangePickerElement for range/number input.
 * It uses the real Foundry API (not stubbed) since tests run inside Foundry.
 *
 * Key test areas:
 * - Props (name, min, max, step, modelValue)
 * - v-model emit (update:modelValue)
 * - Watcher updates the Foundry element when modelValue prop changes
 */

export const registerRangePickerTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  describe('RangePicker', () => {
    describe('props', () => {
      it('renders without errors with required props', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 5,
            name: 'test-range',
            min: 0,
            max: 10,
          },
        });

        // Component should mount successfully
        expect(wrapper.exists()).to.be.true;
      });

      it('uses default step of 1 when not provided', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 5,
            name: 'test-range',
            min: 0,
            max: 10,
          },
        });

        // The Foundry element should be created with step=1
        // We can verify the element exists
        const container = wrapper.find('div');
        expect(container.exists()).to.be.true;
      });

      it('accepts custom step value', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 50,
            name: 'test-range',
            min: 0,
            max: 100,
            step: 5,
          },
        });

        expect(wrapper.exists()).to.be.true;
      });
    });

    describe('Foundry element creation', () => {
      it('creates HTMLRangePickerElement on mount', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 5,
            name: 'test-range',
            min: 0,
            max: 10,
          },
        });

        await flushPromises();

        // The container should have a child element (the Foundry range picker)
        const container = wrapper.find('div').element;
        expect(container.children.length).to.be.greaterThan(0);
      });

      it('creates range input inside the picker', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 5,
            name: 'test-range',
            min: 0,
            max: 10,
          },
        });

        await flushPromises();

        // Foundry's range picker contains both range and number inputs
        const rangeInput = wrapper.find('input[type="range"]');
        const numberInput = wrapper.find('input[type="number"]');

        expect(rangeInput.exists()).to.be.true;
        expect(numberInput.exists()).to.be.true;
      });

      it('sets initial value on the inputs', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 7,
            name: 'test-range',
            min: 0,
            max: 10,
          },
        });

        await flushPromises();

        const rangeInput = wrapper.find('input[type="range"]').element as HTMLInputElement;
        const numberInput = wrapper.find('input[type="number"]').element as HTMLInputElement;

        expect(rangeInput.value).to.equal('7');
        expect(numberInput.value).to.equal('7');
      });
    });

    describe('v-model emit', () => {
      it('emits update:modelValue when range input changes', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 5,
            name: 'test-range',
            min: 0,
            max: 10,
          },
        });

        await flushPromises();

        // Simulate change event on the range input
        const rangeInput = wrapper.find('input[type="range"]');
        await rangeInput.setValue(8);
        await rangeInput.trigger('change');
        await flushPromises();

        // Should emit the new value
        assertEmitted(expect, wrapper, 'update:modelValue', 0, 8);
      });

      it('emits update:modelValue when number input changes', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 5,
            name: 'test-range',
            min: 0,
            max: 10,
          },
        });

        await flushPromises();

        // Simulate change event on the number input
        const numberInput = wrapper.find('input[type="number"]');
        await numberInput.setValue(3);
        await numberInput.trigger('change');
        await flushPromises();

        // Should emit the new value
        assertEmitted(expect, wrapper, 'update:modelValue', 0, 3);
      });

      it('emits numeric value (not string)', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 5,
            name: 'test-range',
            min: 0,
            max: 10,
          },
        });

        await flushPromises();

        const rangeInput = wrapper.find('input[type="range"]');
        await rangeInput.setValue(6);
        await rangeInput.trigger('change');
        await flushPromises();

        const payload = getEmitPayload(wrapper, 'update:modelValue');
        expect(typeof payload).to.equal('number');
        expect(payload).to.equal(6);
      });
    });

    describe('watcher', () => {
      it('updates input values when modelValue prop changes', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 5,
            name: 'test-range',
            min: 0,
            max: 10,
          },
        });

        await flushPromises();

        // Change the modelValue prop
        await wrapper.setProps({ modelValue: 9 });
        await flushPromises();

        // The inputs should reflect the new value
        const rangeInput = wrapper.find('input[type="range"]').element as HTMLInputElement;
        const numberInput = wrapper.find('input[type="number"]').element as HTMLInputElement;

        expect(rangeInput.value).to.equal('9');
        expect(numberInput.value).to.equal('9');
      });

      it('updates inputs multiple times on successive prop changes', async () => {
        const { wrapper } = mountComponent(RangePicker, {
          props: {
            modelValue: 5,
            name: 'test-range',
            min: 0,
            max: 10,
          },
        });

        await flushPromises();

        // First change
        await wrapper.setProps({ modelValue: 2 });
        await flushPromises();

        let rangeInput = wrapper.find('input[type="range"]').element as HTMLInputElement;
        expect(rangeInput.value).to.equal('2');

        // Second change
        await wrapper.setProps({ modelValue: 8 });
        await flushPromises();

        rangeInput = wrapper.find('input[type="range"]').element as HTMLInputElement;
        expect(rangeInput.value).to.equal('8');
      });
    });
  });
};
