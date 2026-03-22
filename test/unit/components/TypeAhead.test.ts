import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import sinon from 'sinon';
import { mountComponent, flushPromises } from '@unittest/vueTestUtils';
import { assertEmitted } from '@unittest/componentTestUtils';
import TypeAhead from '@/components/TypeAhead.vue';
import * as GameUtils from '@/utils/game';

/**
 * Tests for TypeAhead component.
 *
 * A typeahead/autocomplete component that supports both string and object modes.
 * No store dependencies - uses Foundry utils for randomID and deepClone.
 *
 * Key test areas:
 * - Props (initialValue, initialList, allowNewItems)
 * - Emits (itemAdded, selectionMade)
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Tab)
 * - External function calls (localize, foundry.utils)
 */

export const registerTypeAheadTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('TypeAhead', () => {
    let localizeStub: sinon.SinonStub;

    beforeEach(() => {
      localizeStub = sinon.stub(GameUtils, 'localize').callsFake((key: string) => key);
    });

    afterEach(() => {
      localizeStub.restore();
    });

    describe('props', () => {
      it('renders without errors with required props in string mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana', 'Cherry'],
          },
        });

        expect(wrapper.exists()).to.be.true;
        expect(wrapper.find('input').exists()).to.be.true;
      });

      it('renders without errors with required props in object mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: 'id1',
            initialList: [
              { id: 'id1', label: 'Apple' },
              { id: 'id2', label: 'Banana' },
            ],
          },
        });

        expect(wrapper.exists()).to.be.true;
      });

      it('displays label for initialValue in object mode on mount', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: 'id2',
            initialList: [
              { id: 'id1', label: 'Apple' },
              { id: 'id2', label: 'Banana' },
            ],
          },
        });

        const input = wrapper.find('input').element as HTMLInputElement;
        expect(input.value).to.equal('Banana');
      });

      it('displays empty string when initialValue not found in object mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: 'unknown-id',
            initialList: [
              { id: 'id1', label: 'Apple' },
            ],
          },
        });

        const input = wrapper.find('input').element as HTMLInputElement;
        expect(input.value).to.equal('');
      });

      it('displays initialValue in string mode on mount', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: 'Apple',
            initialList: ['Apple', 'Banana'],
          },
        });

        const input = wrapper.find('input').element as HTMLInputElement;
        expect(input.value).to.equal('Apple');
      });

      it('handles empty initialList in object mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: [],
          },
        });

        expect(wrapper.exists()).to.be.true;
        const input = wrapper.find('input').element as HTMLInputElement;
        expect(input.value).to.equal('');
      });

      it('uses default allowNewItems=true when not provided', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        // Type a new value - should show add option
        await wrapper.find('input').setValue('New Item');
        await flushPromises();

        // Should show the "Add" option since allowNewItems defaults to true
        expect(wrapper.find('[data-testid="typeahead-add-option"]').exists()).to.be.true;
      });

      it('respects allowNewItems=false', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
            allowNewItems: false,
          },
        });

        // Type a new value
        await wrapper.find('input').setValue('New Item');
        await flushPromises();

        // Should NOT show the "Add" option
        expect(wrapper.find('[data-testid="typeahead-add-option"]').exists()).to.be.false;
      });
    });

    describe('showAddOption computed', () => {
      it('does not show add option when currentValue is empty', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        // Input is empty, no add option
        expect(wrapper.find('[data-testid="typeahead-add-option"]').exists()).to.be.false;
      });

      it('does not show add option when currentValue is whitespace only', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        await wrapper.find('input').setValue('   ');
        await flushPromises();

        expect(wrapper.find('[data-testid="typeahead-add-option"]').exists()).to.be.false;
      });

      it('does not show add option when item already exists in string mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana'],
          },
        });

        await wrapper.find('input').setValue('Apple');
        await flushPromises();

        // "Apple" already exists, so no add option
        expect(wrapper.find('[data-testid="typeahead-add-option"]').exists()).to.be.false;
      });

      it('does not show add option when item already exists in object mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: [{ id: 'id1', label: 'Apple' }],
          },
        });

        await wrapper.find('input').setValue('Apple');
        await flushPromises();

        // "Apple" already exists, so no add option
        expect(wrapper.find('[data-testid="typeahead-add-option"]').exists()).to.be.false;
      });

      it('shows add option for new item in string mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        expect(wrapper.find('[data-testid="typeahead-add-option"]').exists()).to.be.true;
      });

      it('shows add option for new item in object mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: [{ id: 'id1', label: 'Apple' }],
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        expect(wrapper.find('[data-testid="typeahead-add-option"]').exists()).to.be.true;
      });
    });

    describe('selectionMade emit', () => {
      it('emits selectionMade when clicking an item in string mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana'],
          },
        });

        await wrapper.find('input').setValue('Ap');
        await flushPromises();

        // Click on the filtered option
        await wrapper.find('[data-testid="typeahead-option-0"]').trigger('click');
        await flushPromises();

        assertEmitted(expect, wrapper, 'selectionMade', 0, 'Apple');
      });

      it('emits selectionMade with id and label when clicking an item in object mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: [{ id: 'id1', label: 'Apple' }],
          },
        });

        await wrapper.find('input').setValue('Ap');
        await flushPromises();

        await wrapper.find('[data-testid="typeahead-option-0"]').trigger('click');
        await flushPromises();

        const emissions = wrapper.emitted('selectionMade');
        expect(emissions).to.exist;
        expect(emissions![0][0]).to.equal('id1'); // id
        expect(emissions![0][1]).to.equal('Apple'); // label
      });
    });

    describe('itemAdded emit', () => {
      it('emits itemAdded when clicking add option', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        // Click the add option
        await wrapper.find('[data-testid="typeahead-add-option"]').trigger('click');
        await flushPromises();

        assertEmitted(expect, wrapper, 'itemAdded', 0, 'Banana');
      });

      it('calls foundry.utils.randomID when adding in object mode', async () => {
        const randomIDStub = sinon.stub(foundry.utils, 'randomID').returns('test-id-123');

        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: [{ id: 'id1', label: 'Apple' }],
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        await wrapper.find('[data-testid="typeahead-add-option"]').trigger('click');
        await flushPromises();

        expect(randomIDStub.calledOnce).to.be.true;
        expect(randomIDStub.firstCall.args[0]).to.equal(12);

        randomIDStub.restore();
      });

      it('does not emit itemAdded when allowNewItems is false', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
            allowNewItems: false,
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        // No add option should be shown
        expect(wrapper.find('[data-testid="typeahead-add-option"]').exists()).to.be.false;
        expect(wrapper.emitted('itemAdded')).to.be.undefined;
      });
    });

    describe('onInput event handler', () => {
      it('filters items correctly in string mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana', 'Cherry', 'Apricot'],
          },
        });

        await wrapper.find('input').setValue('ap');
        await flushPromises();

        // Should show Apple and Apricot (case-insensitive)
        expect(wrapper.find('[data-testid="typeahead-option-0"]').exists()).to.be.true;
        expect(wrapper.find('[data-testid="typeahead-option-1"]').exists()).to.be.true;
        expect(wrapper.find('[data-testid="typeahead-option-2"]').exists()).to.be.false;
      });

      it('filters items correctly in object mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: [
              { id: 'id1', label: 'Apple' },
              { id: 'id2', label: 'Banana' },
              { id: 'id3', label: 'Apricot' },
            ],
          },
        });

        await wrapper.find('input').setValue('ap');
        await flushPromises();

        // Should show Apple and Apricot
        expect(wrapper.find('[data-testid="typeahead-option-0"]').exists()).to.be.true;
        expect(wrapper.find('[data-testid="typeahead-option-1"]').exists()).to.be.true;
      });

      it('clears filteredItems when input is cleared', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana'],
          },
        });

        await wrapper.find('input').setValue('Ap');
        await flushPromises();
        expect(wrapper.find('[data-testid="typeahead-option-0"]').exists()).to.be.true;

        // Clear input
        await wrapper.find('input').setValue('');
        await flushPromises();

        expect(wrapper.find('[data-testid="typeahead-option-0"]').exists()).to.be.false;
      });

      it('highlights first item when filtering', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana'],
          },
        });

        await wrapper.find('input').setValue('a');
        await flushPromises();

        // First item should be highlighted
        const option = wrapper.find('[data-testid="typeahead-option-0"]');
        expect(option.classes()).to.include('highlighted');
      });

      it('highlights add option when no filtered items match', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        // Add option should be highlighted (no other matches)
        const addOption = wrapper.find('[data-testid="typeahead-add-option"]');
        expect(addOption.classes()).to.include('highlighted');
      });
    });

    describe('keyboard navigation - ArrowUp/ArrowDown', () => {
      it('ArrowDown from initial state highlights first item', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana'],
          },
        });

        await wrapper.find('input').setValue('a');
        await flushPromises();

        await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });
        await flushPromises();

        // First item should be highlighted
        const option = wrapper.find('[data-testid="typeahead-option-0"]');
        expect(option.classes()).to.include('highlighted');
      });

      it('ArrowDown cycles through items', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana', 'Cherry'],
          },
        });

        await wrapper.find('input').setValue('a');
        await flushPromises();

        // Navigate down multiple times
        await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });
        await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });
        await flushPromises();

        // Second item should be highlighted
        const option = wrapper.find('[data-testid="typeahead-option-1"]');
        expect(option.classes()).to.include('highlighted');
      });

      it('ArrowUp cycles backwards', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana', 'Cherry'],
          },
        });

        await wrapper.find('input').setValue('a');
        await flushPromises();

        // Navigate to second item, then up
        await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });
        await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });
        await wrapper.find('input').trigger('keydown', { key: 'ArrowUp' });
        await flushPromises();

        // First item should be highlighted again
        const option = wrapper.find('[data-testid="typeahead-option-0"]');
        expect(option.classes()).to.include('highlighted');
      });

      it('ArrowDown on add option highlights first filtered item', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        await wrapper.find('input').setValue('a');
        await flushPromises();

        // Add option shown first, arrow down should highlight Apple
        await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });
        await flushPromises();

        // Apple (option-0) should be highlighted
        const option = wrapper.find('[data-testid="typeahead-option-0"]');
        expect(option.classes()).to.include('highlighted');
      });
    });

    describe('keyboard navigation - Enter/Tab', () => {
      it('Enter selects first filtered item', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana'],
          },
        });

        await wrapper.find('input').setValue('a');
        await flushPromises();

        // Press Enter - should select first match
        await wrapper.find('input').trigger('keydown', { key: 'Enter' });
        await flushPromises();

        assertEmitted(expect, wrapper, 'selectionMade', 0, 'Apple');
      });

      it('Enter on add option emits itemAdded', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        // Press Enter - should add new item
        await wrapper.find('input').trigger('keydown', { key: 'Enter' });
        await flushPromises();

        assertEmitted(expect, wrapper, 'itemAdded', 0, 'Banana');
      });

      it('Tab selects first item', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana'],
          },
        });

        await wrapper.find('input').setValue('a');
        await flushPromises();

        await wrapper.find('input').trigger('keydown', { key: 'Tab' });
        await flushPromises();

        assertEmitted(expect, wrapper, 'selectionMade', 0, 'Apple');
      });

      it('Enter with empty list and no value emits selectionMade with empty string', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: [],
          },
        });

        // No input value, press Enter
        await wrapper.find('input').trigger('keydown', { key: 'Enter' });
        await flushPromises();

        assertEmitted(expect, wrapper, 'selectionMade', 0, '');
      });

      it('Enter with existing value match in list selects it', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana'],
          },
        });

        // Type an exact match
        await wrapper.find('input').setValue('Apple');
        await flushPromises();

        // Press Enter
        await wrapper.find('input').trigger('keydown', { key: 'Enter' });
        await flushPromises();

        assertEmitted(expect, wrapper, 'selectionMade', 0, 'Apple');
      });

      it('Enter with existing value match in object mode selects it', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: [{ id: 'id1', label: 'Apple' }],
          },
        });

        await wrapper.find('input').setValue('Apple');
        await flushPromises();

        await wrapper.find('input').trigger('keydown', { key: 'Enter' });
        await flushPromises();

        const emissions = wrapper.emitted('selectionMade');
        expect(emissions).to.exist;
        expect(emissions![0][0]).to.equal('id1');
        expect(emissions![0][1]).to.equal('Apple');
      });

      it('Enter with no match and allowNewItems=true adds new item', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        // Clear filtered list by typing exact non-match
        await wrapper.find('input').setValue('Cherry');
        await flushPromises();

        await wrapper.find('input').trigger('keydown', { key: 'Enter' });
        await flushPromises();

        assertEmitted(expect, wrapper, 'itemAdded', 0, 'Cherry');
      });

      it('Enter with no match and allowNewItems=false resets to initialValue in string mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: 'Apple',
            initialList: ['Apple'],
            allowNewItems: false,
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        await wrapper.find('input').trigger('keydown', { key: 'Enter' });
        await flushPromises();

        assertEmitted(expect, wrapper, 'selectionMade', 0, 'Apple');
      });

      it('Enter with no match and allowNewItems=false resets to initialValue in object mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: 'id1',
            initialList: [{ id: 'id1', label: 'Apple' }],
            allowNewItems: false,
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        await wrapper.find('input').trigger('keydown', { key: 'Enter' });
        await flushPromises();

        const emissions = wrapper.emitted('selectionMade');
        expect(emissions).to.exist;
        expect(emissions![0][0]).to.equal('id1');
        expect(emissions![0][1]).to.equal('Apple');
      });

      it('Enter with no match, allowNewItems=false, and missing initialValue resets to empty', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: 'unknown-id',
            initialList: [{ id: 'id1', label: 'Apple' }],
            allowNewItems: false,
          },
        });

        await wrapper.find('input').setValue('Banana');
        await flushPromises();

        await wrapper.find('input').trigger('keydown', { key: 'Enter' });
        await flushPromises();

        const emissions = wrapper.emitted('selectionMade');
        expect(emissions).to.exist;
        expect(emissions![0][0]).to.equal('');
        expect(emissions![0][1]).to.equal('');
      });
    });

    describe('initialValue watcher', () => {
      it('updates input value when initialValue prop changes in string mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana'],
          },
        });

        await wrapper.setProps({ initialValue: 'Apple' });
        await flushPromises();

        const input = wrapper.find('input').element as HTMLInputElement;
        expect(input.value).to.equal('Apple');
      });

      it('updates input value when initialValue prop changes in object mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: [
              { id: 'id1', label: 'Apple' },
              { id: 'id2', label: 'Banana' },
            ],
          },
        });

        await wrapper.setProps({ initialValue: 'id2' });
        await flushPromises();

        const input = wrapper.find('input').element as HTMLInputElement;
        expect(input.value).to.equal('Banana');
      });
    });

    describe('initialList watcher', () => {
      it('updates list when initialList prop changes', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        await wrapper.setProps({ initialList: ['Apple', 'Banana'] });
        await flushPromises();

        // Filter for 'a' and check both items appear
        await wrapper.find('input').setValue('a');
        await flushPromises();

        expect(wrapper.find('[data-testid="typeahead-option-0"]').exists()).to.be.true;
        expect(wrapper.find('[data-testid="typeahead-option-1"]').exists()).to.be.true;
      });

      it('updates currentValue when item label changes in object mode', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: 'id1',
            initialList: [{ id: 'id1', label: 'Apple' }],
          },
        });

        // Initial value shows Apple
        let input = wrapper.find('input').element as HTMLInputElement;
        expect(input.value).to.equal('Apple');

        // Update the label
        await wrapper.setProps({ initialList: [{ id: 'id1', label: 'Apple Pie' }] });
        await flushPromises();

        // Should update to new label
        input = wrapper.find('input').element as HTMLInputElement;
        expect(input.value).to.equal('Apple Pie');
      });
    });

    describe('external function calls', () => {
      it('calls localize with correct keys', async () => {
        const { wrapper } = mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple'],
          },
        });

        await flushPromises();

        // localize should be called for placeholder and add label
        expect(localizeStub.calledWith('placeholders.search')).to.be.true;
      });

      it('calls foundry.utils.deepClone on mount', async () => {
        const deepCloneStub = sinon.stub(foundry.utils, 'deepClone').callsFake((obj: any) => obj ? [...obj] : []);

        mountComponent(TypeAhead, {
          props: {
            initialValue: '',
            initialList: ['Apple', 'Banana'],
          },
        });

        await flushPromises();

        expect(deepCloneStub.calledOnce).to.be.true;
        expect(deepCloneStub.firstCall.args[0]).to.deep.equal(['Apple', 'Banana']);

        deepCloneStub.restore();
      });
    });
  });
};
