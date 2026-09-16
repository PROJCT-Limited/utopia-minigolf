import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { clearWizardState, loadWizardState, saveWizardState } from "./wizardState";

// A stand-in for the browser's sessionStorage, so the restore path can be
// tested without one.
function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

const CHECKOUT = {
  step: 4,
  ticketType: "unlimited" as const,
  headcount: 4,
  selectedWaveId: "wave-1",
  partySettled: true,
  leadName: "Marin Magre",
  leadEmail: "marin@example.com",
  payment: { bookingId: "booking-1", clientSecret: "pi_1_secret_x" },
};

let store: Map<string, string>;

beforeEach(() => {
  store = installStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("wizard state", () => {
  it("brings a guest back to the payment step with their intent intact", () => {
    saveWizardState(CHECKOUT);
    const restored = loadWizardState();

    expect(restored?.step).toBe(4);
    expect(restored?.payment).toEqual({ bookingId: "booking-1", clientSecret: "pi_1_secret_x" });
    expect(restored?.headcount).toBe(4);
    expect(restored?.leadEmail).toBe("marin@example.com");
  });

  it("has nothing to restore before anything is saved", () => {
    expect(loadWizardState()).toBeNull();
  });

  it("forgets a checkout once it's finished", () => {
    saveWizardState(CHECKOUT);
    clearWizardState();
    expect(loadWizardState()).toBeNull();
  });

  it("drops a checkout left overnight rather than resuming it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T18:00:00Z"));
    saveWizardState(CHECKOUT);

    vi.setSystemTime(new Date("2026-09-15T19:59:00Z"));
    expect(loadWizardState()?.step).toBe(4);

    vi.setSystemTime(new Date("2026-09-16T09:00:00Z"));
    expect(loadWizardState()).toBeNull();
  });

  it("discards anything it can't read rather than half-applying it", () => {
    store.set("found.booking.v1", "{not json");
    expect(loadWizardState()).toBeNull();

    store.set("found.booking.v1", JSON.stringify({ savedAt: Date.now(), step: 99 }));
    expect(loadWizardState()).toBeNull();

    store.set("found.booking.v1", JSON.stringify({ step: 4 })); // no savedAt
    expect(loadWizardState()).toBeNull();
  });

  it("survives storage being unavailable", () => {
    // Private mode and locked-down browsers throw on access. Losing the
    // saved checkout is acceptable; throwing inside the wizard is not.
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });

    expect(() => saveWizardState(CHECKOUT)).not.toThrow();
    expect(() => clearWizardState()).not.toThrow();
    expect(loadWizardState()).toBeNull();
  });
});
