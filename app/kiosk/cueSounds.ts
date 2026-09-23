// FILE: app/kiosk/cueSounds.ts
// -----------------------------------------------------------------------------
// The kiosk's three sound cues, synthesised with the Web Audio API rather
// than shipped as audio files.
//
// Why synthesised: the tablet lives in a venue whose wifi is not promised,
// and the CSP on this site allows no external media host — an mp3 that hasn't
// loaded is a cue that silently doesn't happen. A few oscillator notes always
// play, weigh nothing, and can be retuned on site by editing numbers here.
//
// The three are deliberately different *shapes*, not just different pitches,
// because the brief's requirement is that a player can tell them apart by ear
// alone over ambient noise:
//
//   arrival        two quick rising notes      "the floor saw you"
//   station-finish a falling pair that settles "that's a station done"
//   round-finish   three rising notes          "that's the round"
//
// Every cue is under 700ms, sits in the 500-1400Hz band that carries over
// chatter without being shrill, and opens/closes on a ramp — a square-edged
// gate is what makes a short tone sound like a beep from a microwave.
// -----------------------------------------------------------------------------

type Note = { hz: number; at: number; ms: number };

/** The four moments that make a sound. Named after the moment, not the
 *  shape, so a retune can't drift out of step with what's on screen. */
export type CueSound = "arrival" | "cheer" | "cheerRound" | "logged" | "tick" | "fanfare";

// All four are major intervals and all four rise, because every one of them
// is good news: the floor saw you, your ball's in, your round's done, your
// score is on the card. The differences are length and weight, which is what
// makes them tellable apart across a noisy room.
const VOICES: Record<CueSound, { notes: Note[]; gain: number }> = {
  // Two quick rising notes — a nudge, not an announcement.
  arrival: {
    gain: 0.16,
    notes: [
      { hz: 660, at: 0, ms: 90 },
      { hz: 990, at: 0.075, ms: 140 },
    ],
  },
  // A major triad taken at a run: the cheerful one.
  cheer: {
    gain: 0.2,
    notes: [
      { hz: 659, at: 0, ms: 110 },
      { hz: 831, at: 0.085, ms: 110 },
      { hz: 988, at: 0.17, ms: 260 },
    ],
  },
  // The same triad with the octave on top — the end of a whole round earns
  // one more note than the end of a station.
  cheerRound: {
    gain: 0.22,
    notes: [
      { hz: 659, at: 0, ms: 110 },
      { hz: 831, at: 0.085, ms: 110 },
      { hz: 988, at: 0.17, ms: 110 },
      { hz: 1319, at: 0.27, ms: 420 },
    ],
  },
  // Quiet and low: a receipt, not a fanfare. It fires on every stroke count
  // saved, which is the most frequent sound in the building.
  logged: {
    gain: 0.13,
    notes: [
      { hz: 523, at: 0, ms: 80 },
      { hz: 784, at: 0.07, ms: 170 },
    ],
  },
  // One blunt count. Deliberately the least musical thing here — a clock,
  // not a tune, so the ear reads it as "something is about to happen".
  tick: {
    gain: 0.15,
    notes: [{ hz: 440, at: 0, ms: 70 }],
  },
  // The only sound in the building that gets to be long: the winner. A rising
  // major arpeggio with the octave held at the top, under a second and a
  // half all in.
  fanfare: {
    gain: 0.24,
    notes: [
      { hz: 523, at: 0, ms: 120 },
      { hz: 659, at: 0.1, ms: 120 },
      { hz: 784, at: 0.2, ms: 120 },
      { hz: 1047, at: 0.3, ms: 200 },
      { hz: 784, at: 0.5, ms: 140 },
      { hz: 1047, at: 0.62, ms: 620 },
    ],
  },
};

const MUTE_KEY = "found.kiosk.muted";

let context: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    // Constructed lazily and kept: iOS counts AudioContexts against a hard
    // cap, and a kiosk that runs all day would exhaust it if each cue made
    // its own.
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    return context;
  } catch {
    return null; // audio blocked or unavailable — cues stay visual
  }
}

/**
 * Wakes the audio context from a real user gesture.
 *
 * Safari starts every context `suspended` and only a gesture may resume it,
 * so the first tap anywhere on the kiosk pays for every cue afterwards —
 * including the ones fired later by an antenna, which is not a gesture and
 * could never unlock audio on its own.
 */
export function unlockCueSounds(): void {
  const ctx = ensureContext();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

// Subscribed to rather than mirrored into component state: the preference
// lives in localStorage, which the server can't see, and a lazily-read
// initial value would hydrate as one thing and render as another. The server
// snapshot is always "not muted".
const mutedListeners = new Set<() => void>();

export function subscribeMuted(onChange: () => void): () => void {
  mutedListeners.add(onChange);
  return () => mutedListeners.delete(onChange);
}

export function mutedSnapshot(): boolean {
  return isMuted();
}

export function mutedServerSnapshot(): boolean {
  return false;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* a tablet with storage blocked just forgets the preference */
  }
  for (const listener of mutedListeners) listener();
}

export function playCueSound(kind: CueSound): void {
  if (isMuted()) return;
  const ctx = ensureContext();
  if (!ctx || ctx.state !== "running") return;

  const voice = VOICES[kind];
  const now = ctx.currentTime;

  for (const note of voice.notes) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    // Triangle, not sine: a little more harmonic content carries further
    // across an open room, without the edge a square or saw would add.
    osc.type = "triangle";
    osc.frequency.value = note.hz;

    const start = now + note.at;
    const end = start + note.ms / 1000;
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(voice.gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}
