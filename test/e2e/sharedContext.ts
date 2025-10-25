import { Page, BrowserContext } from '@playwright/test';

export let sharedContext: {
	page?: Page,
	context?: BrowserContext
} = {}
	