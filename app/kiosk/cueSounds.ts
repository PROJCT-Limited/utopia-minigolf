// FILE: app/kiosk/cueSounds.ts
// -----------------------------------------------------------------------------
// The kiosk's sound cues, synthesised with the Web Audio API rather than
// shipped as audio files.
//
// Why synthesised: the tablet lives in a venue whose wifi is not promised,
// and the CSP on this site allows no external media host — an mp3 that hasn't
// loaded is a cue that silently doesn't happen. A few oscillator notes always
// play, weigh nothing, and can be retuned on site by editing numbers here.
//
// They're deliberately different *shapes*, not just different pitches,
// because a player has to tell them apart by ear alone over a room full of
// people:
//
//   arrival     two quick rising notes      the floor saw you
//   cheer       a major triad at a run      your ball's in
//   cheerRound  the same, plus the octave   your round's done
//   logged      a low two-note receipt      your score is on the board
//   tick        one blunt count             something's about to happen
//   fanfare     the long one                the winner
//
// SOUND IS ALWAYS ON. There's no mute: this is a scoring screen in a bar, and
// the cues are half of how it works. The only thing that can silence it is
// the browser's own autoplay policy, which needs one gesture on the page
// before any audio may play — handled below, and surfaced in the UI rather
// than hidden, so nobody is left wondering why the room is quiet.
// -----------------------------------------------------------------------------

type Note = { hz: number; at: number; ms: number };

export type CueSound = "arrival" | "cheer" | "cheerRound" | "logged" | "tick" | "fanfare";

// Levels are set for a tablet speaker across an occupied room, which is
// louder than they look written down. Every cue still finishes inside a
// second and a half, so the screen is never talking over anybody.
const VOICES: Record<CueSound, { notes: Note[]; gain: number }> = {
  arrival: {
    gain: 0.3,
    notes: [
      { hz: 660, at: 0, ms: 150 },
      { hz: 990, at: 0.1, ms: 320 },
    ],
  },
  cheer: {
    gain: 0.34,
    notes: [
      { hz: 659, at: 0, ms: 150 },
      { hz: 831, at: 0.1, ms: 150 },
      { hz: 988, at: 0.2, ms: 480 },
    ],
  },
  cheerRound: {
    gain: 0.36,
    notes: [
      { hz: 659, at: 0, ms: 140 },
      { hz: 831, at: 0.1, ms: 140 },
      { hz: 988, at: 0.2, ms: 140 },
      { hz: 1319, at: 0.31, ms: 620 },
    ],
  },
  logged: {
    gain: 0.26,
    notes: [
      { hz: 523, at: 0, ms: 120 },
      { hz: 784, at: 0.09, ms: 320 },
    ],
  },
  tick: {
    gain: 0.28,
    notes: [{ hz: 440, at: 0, ms: 110 }],
  },
  fanfare: {
    gain: 0.4,
    notes: [
      { hz: 523, at: 0, ms: 140 },
      { hz: 659, at: 0.11, ms: 140 },
      { hz: 784, at: 0.22, ms: 140 },
      { hz: 1047, at: 0.33, ms: 240 },
      { hz: 784, at: 0.55, ms: 160 },
      { hz: 1047, at: 0.68, ms: 780 },
    ],
  },
};

let context: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    // Constructed lazily and kept: iOS counts AudioContexts against a hard
    // cap, and a kiosk that runs all day would exhaust it if each cue made
    // its own.
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    return context;
  } catch {
    return null; // audio blocked or unavailable — the cues stay visual
  }
}

/**
 * Safari's rule is stricter than Chrome's: resuming a context inside a
 * gesture isn't always enough — something has to actually be *played* during
 * that gesture before the context is considered unlocked. One sample of
 * silence satisfies it, costs nothing, and is inaudible everywhere else.
 */
function playSilence(ctx: AudioContext): void {
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    /* nothing to do — the real cue will try again on its own */
  }
}

// ---------------------------------------------------------------------------
// Whether audio can play at all
// ---------------------------------------------------------------------------
// Browsers start every context `suspended` and only a real gesture may resume
// it. On a mounted tablet that gesture might not come for an hour, so this is
// subscribed to rather than assumed: the screen shows a small "tap for sound"
// note until the first touch, and never again afterwards.

const readyListeners = new Set<() => void>();
let ready = false;

function announceReady() {
  if (ready) return;
  ready = true;
  for (const listener of readyListeners) listener();
}

export function subscribeAudioReady(onChange: () => void): () => void {
  readyListeners.add(onChange);
  return () => readyListeners.delete(onChange);
}

export function audioReadySnapshot(): boolean {
  return ready;
}

/** The server has no audio context, and claiming otherwise would hydrate one
 *  state and render another. */
export function audioReadyServerSnapshot(): boolean {
  return true;
}

export function unlockCueSounds(): void {
  const ctx = ensureContext();
  if (!ctx) return;

  // Both halves, every time, because which one matters depends on the
  // browser: Chrome wants the resume, Safari wants something played.
  playSilence(ctx);

  if (ctx.state === "running") {
    announceReady();
    return;
  }
  void ctx
    .resume()
    .then(() => {
      playSilence(ctx);
      announceReady();
    })
    .catch(() => {
      /* still no gesture the browser is willing to count */
    });
}

/**
 * Listens once, anywhere on the page, for the interaction that lets audio
 * play. Anything counts — a tap on a player's name, a staff member waking the
 * screen — and it unhooks itself the moment it succeeds.
 */
export function installUnlockListeners(): () => void {
  if (typeof window === "undefined") return () => {};
  // Every kind of first contact a kiosk can get. `pointerup` as well as
  // `pointerdown`: Safari counts the end of a tap, not the start.
  const events: (keyof DocumentEventMap)[] = [
    "pointerdown",
    "pointerup",
    "touchstart",
    "touchend",
    "keydown",
    "click",
  ];
  const onAny = () => unlockCueSounds();
  for (const name of events) document.addEventListener(name, onAny, { passive: true });

  // Nothing is created before the first gesture on purpose. A context built
  // at page load starts suspended, and on some browsers stays that way no
  // matter what happens afterwards — building it inside the gesture avoids
  // the whole question.

  return () => {
    for (const name of events) document.removeEventListener(name, onAny);
  };
}

/** Plays a cue and reports what happened, for checking the tablet's own
 *  speakers without waiting for a ball to cross a gate. */
export function testCueSound(): string {
  const ctx = ensureContext();
  if (!ctx) return "This browser has no Web Audio at all.";
  playCueSound("cheer");
  return ctx.state === "running"
    ? "Played — if you heard nothing, it's the volume or the output device."
    : `Audio is ${ctx.state}. Tap the screen once, then try again.`;
}

export function playCueSound(kind: CueSound): void {
  const ctx = ensureContext();
  if (!ctx) return;

  if (ctx.state !== "running") {
    // Don't drop it. A cue fired milliseconds after the tap that unlocked
    // audio would otherwise vanish, because resume() hasn't resolved yet —
    // which is exactly the first cue anybody hears.
    void ctx
      .resume()
      .then(() => {
        announceReady();
        schedule(ctx, kind);
      })
      .catch(() => {});
    return;
  }
  schedule(ctx, kind);
}

function schedule(ctx: AudioContext, kind: CueSound): void {
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
