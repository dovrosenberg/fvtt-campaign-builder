import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { mountComponent, flushPromises } from '@unittest/vueTestUtils';
import LabelWithHelp from '@/components/LabelWithHelp.vue';

/**
 * Tests for LabelWithHelp component.
 *
 * This is a simple component that:
 * - Renders a label with localized text
 * - Optionally shows a help icon with tooltip
 * - Supports a topLabel prop that changes styling
 *
 * Note: localize() is stubbed at game.i18n.localize to return the key itself.
 * The localize() function adds 'fcb.' prefix, so 'KEY' becomes 'fcb.KEY'.
 */

export const registerLabelWithHelpTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach, afterEach } = context;

  describe('LabelWithHelp', () => {
    describe('label text rendering', () => {
      it('renders the localized label key (with fcb. prefix)', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: { labelText: 'TEST_LABEL_KEY' },
        });

        // localize('TEST_LABEL_KEY') calls game.i18n.localize('fcb.TEST_LABEL_KEY')
        // which returns 'fcb.TEST_LABEL_KEY' in tests
        expect(wrapper.text()).to.include('fcb.TEST_LABEL_KEY');
      });

      it('renders different label keys correctly', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: { labelText: 'ANOTHER_KEY' },
        });

        expect(wrapper.text()).to.include('fcb.ANOTHER_KEY');
      });
    });

    describe('help icon visibility', () => {
      it('shows help icon when helpText prop is provided', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: {
            labelText: 'Label',
            helpText: 'HELP_TEXT_KEY',
          },
        });

        expect(wrapper.find('.tooltip-icon').exists()).to.be.true;
      });

      it('hides help icon when helpText prop is empty string', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: {
            labelText: 'Label',
            helpText: '',
          },
        });

        expect(wrapper.find('.tooltip-icon').exists()).to.be.false;
      });

      it('hides help icon when helpText prop is not provided', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: { labelText: 'Label' },
        });

        expect(wrapper.find('.tooltip-icon').exists()).to.be.false;
      });
    });

    describe('help icon tooltip', () => {
      it('sets data-tooltip attribute with localized helpText key', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: {
            labelText: 'Label',
            helpText: 'HELP_TOOLTIP_KEY',
          },
        });

        const icon = wrapper.find('.tooltip-icon');
        // localize('HELP_TOOLTIP_KEY') returns 'fcb.HELP_TOOLTIP_KEY'
        expect(icon.attributes('data-tooltip')).to.equal('fcb.HELP_TOOLTIP_KEY');
      });
    });

    describe('topLabel prop and styling', () => {
      it('applies side-label class by default (topLabel=false)', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: { labelText: 'Label' },
        });

        const label = wrapper.find('label');
        expect(label.classes()).to.include('side-label');
      });

      it('applies side-label class when topLabel is explicitly false', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: {
            labelText: 'Label',
            topLabel: false,
          },
        });

        const label = wrapper.find('label');
        expect(label.classes()).to.include('side-label');
      });

      it('removes side-label class when topLabel is true', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: {
            labelText: 'Label',
            topLabel: true,
          },
        });

        const label = wrapper.find('label');
        expect(label.classes()).to.not.include('side-label');
      });
    });

    describe('label element structure', () => {
      it('renders a label element', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: { labelText: 'Label' },
        });

        expect(wrapper.find('label').exists()).to.be.true;
      });

      it('uses Font Awesome icon for help tooltip', async () => {
        const { wrapper } = mountComponent(LabelWithHelp, {
          props: {
            labelText: 'Label',
            helpText: 'Help',
          },
        });

        const icon = wrapper.find('.tooltip-icon');
        expect(icon.classes()).to.include('fas');
        expect(icon.classes()).to.include('fa-info-circle');
      });
    });
  });
};
