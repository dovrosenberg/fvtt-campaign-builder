import { BrowserContext, Page } from "playwright";

export type TestContext = {
  page?: Page,
  context?: BrowserContext
}