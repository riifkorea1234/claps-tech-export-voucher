import { expect, it } from "vitest";
import { errorMessages, errorStatus } from "../../lib/contracts/errors";
it("ships matching nonempty ko/en keys for all new API errors", () => {
  expect(Object.keys(errorMessages.ko).sort()).toEqual(Object.keys(errorMessages.en).sort());
  for (const code of Object.keys(errorStatus) as (keyof typeof errorStatus)[]) {
    expect(errorMessages.ko[code].trim()).not.toBe(""); expect(errorMessages.en[code].trim()).not.toBe("");
    expect(errorMessages.ko[code].match(/\{\w+\}/g) || []).toEqual(errorMessages.en[code].match(/\{\w+\}/g) || []);
  }
});
