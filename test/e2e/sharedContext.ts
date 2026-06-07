import { Page, Browser } from 'puppeteer';

export let sharedContext: {
	page?: Page,
	context?: Browser
} = {}
	