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

import type { CueKind } from "@/lib/scoring/ballFeedback";

type Note = { hz: number; at: number; ms: number };

const VOICES: Record<CueKind, { notes: Note[]; gain: number }> = {
  arrival: {
    gain: 0.16,
    notes: [
      { hz: 660, at: 0, ms: 90 },
      { hz: 990, at: 0.075, ms: 130 },
    ],
  },
  "station-finish": {
    gain: 0.2,
    notes: [
      { hz: 880, at: 0, ms: 130 },
      { hz: 587, at: 0.11, ms: 300 },
    ],
  },
  "round-finish": {
    gain: 0.22,
    notes: [
      { hz: 660, at: 0, ms: 130 },
      { hz: 880, at: 0.12, ms: 130 },
      { hz: 1320, at: 0.24, ms: 380 },
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

export function playCueSound(kind: CueKind): void {
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
