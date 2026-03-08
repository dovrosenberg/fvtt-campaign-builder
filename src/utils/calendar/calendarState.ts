/**
 * Reactive calendar state for tracking Calendaria availability and active calendar.
 * This state is session-scoped and does not persist between sessions.
 */

import { ref, readonly } from 'vue';

import { CalendariaAPI } from '@/types';

// Reactive state
export const calendariaAvailable = ref(false);
export const calendarActive = ref(false);

/**
 * Initialize the calendar state by checking Calendaria availability and active calendar.
 * Should be called once during module initialization.
 */
export function initializeCalendarState(): void {
  const calendariaModule = game.modules.get('calendaria');
  const isAvailable = calendariaModule?.active ?? false;
  
  calendariaAvailable.value = isAvailable;
  
  if (isAvailable) {
    const calendaria = CALENDARIA as { api: CalendariaAPI } | undefined;
    
    // Check for active calendar
    calendarActive.value = calendaria?.api?.getActiveCalendar() != null;
    
    if (!calendarActive.value) {
      // Register for calendar switch hook to update state reactively
      // @ts-ignore
      Hooks.on(calendaria.api.hooks.CALENDAR_SWITCHED, () => {
        calendarActive.value = !!calendaria?.api?.getActiveCalendar();
      });
    }
  }
}
