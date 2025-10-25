import { BrowserContext, Page } from "playwright";

export interface TestContext {
  page?: Page,
  context?: BrowserContext
}