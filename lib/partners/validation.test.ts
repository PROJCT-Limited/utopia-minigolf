// validation.test.ts
import { describe, it, expect } from "vitest";
import { isValidRefCode, parseCommissionRatePercent, computeCommissionOwedCents } from "./validation";

describe("isValidRefCode", () => {
  it("accepts lowercase letters, numbers, and hyphens", () => {
    expect(isValidRefCode("hoka")).toBe(true);
    expect(isValidRefCode("marta")).toBe(true);
    expect(isValidRefCode("partner-2")).toBe(true);
    expect(isValidRefCode("a1")).toBe(true);
  });

  it("accepts a single character", () => {
    expect(isValidRefCode("a")).toBe(true);
    expect(isValidRefCode("9")).toBe(true);
  });

  it("rejects uppercase, spaces, and other punctuation", () => {
    expect(isValidRefCode("HOKA")).toBe(false);
    expect(isValidRefCode("hoka partner")).toBe(false);
    expect(isValidRefCode("hoka_partner")).toBe(false);
    expect(isValidRefCode("hoka.com")).toBe(false);
  });

  it("rejects leading/trailing hyphens and empty strings", () => {
    expect(isValidRefCode("-hoka")).toBe(false);
    expect(isValidRefCode("hoka-")).toBe(false);
    expect(isValidRefCode("")).toBe(false);
  });
});

describe("parseCommissionRatePercent", () => {
  it("converts a percent number to a fraction", () => {
    expect(parseCommissionRatePercent("5")).toBe(0.05);
    expect(parseCommissionRatePercent("12.5")).toBe(0.125);
    expect(parseCommissionRatePercent("0")).toBe(0);
    expect(parseCommissionRatePercent("100")).toBe(1);
  });

  it("rejects out-of-range or non-numeric input", () => {
    expect(parseCommissionRatePercent("-1")).toBeNull();
    expect(parseCommissionRatePercent("101")).toBeNull();
    expect(parseCommissionRatePercent("abc")).toBeNull();
    expect(parseCommissionRatePercent("")).toBeNull();
  });
});

describe("computeCommissionOwedCents", () => {
  it("multiplies sales by the commission rate", () => {
    expect(computeCommissionOwedCents(100_00, 0.05)).toBe(5_00);
    expect(computeCommissionOwedCents(22000, 0.1)).toBe(2200);
  });

  it("rounds to the nearest cent", () => {
    expect(computeCommissionOwedCents(15000, 0.075)).toBe(1125); // exact
    expect(computeCommissionOwedCents(15001, 0.075)).toBe(1125); // rounds down
  });

  it("is zero when there's nothing referred", () => {
    expect(computeCommissionOwedCents(0, 0.05)).toBe(0);
  });
});
