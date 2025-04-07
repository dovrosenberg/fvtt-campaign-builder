import { registerBackendTests } from "./Backend.test";
import { registerEntryTests } from "./Entry.test";

export const registerClassesTests = () => {
  registerBackendTests();
  registerEntryTests();
}