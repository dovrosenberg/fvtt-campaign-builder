import { test } from '@playwright/test';
import { sharedContext } from './setup.test';
import { runSettingsTests } from '@e2etest/settings';

test.describe.serial('Settings Tests', () => {
	test.beforeEach(async () => {
		// Optional: cleanup or reset state before each test batch
	});

	test.afterEach(async () => {
		// Optional: cleanup after each test batch
	});

	runSettingsTests(sharedContext);
});
