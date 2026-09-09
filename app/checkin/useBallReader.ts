// FILE: app/checkin/useBallReader.ts
// -----------------------------------------------------------------------------
// Reads a ball's RFID tag at the door.
//
// The pad readers used here present as HID keyboards: resting a ball on one
// "types" its tag and presses Enter. That's deliberately the integration this
// hook assumes, because it's the only one that needs no driver, no pairing and
// no browser permission on a locked-down tablet — and it means a tag can also
// be typed in by hand when a reader sulks (Screen 3's manual override), through
// the same code path.
//
// Two things separate a scan from a person typing: the burst arrives far
// faster than fingers can move, and it ends with Enter. Anything slower is
// ignored, so a stray keyboard press never registers a ball.
// -----------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { isValidBallTag, normalizeBallTag } from "@/lib/checkin/checkin";

/** A scan's keystrokes arrive within this window; fingers don't. */
const MAX_SCAN_DURATION_MS = 700;
const MIN_TAG_LENGTH = 2;
/** A ball left sitting on the pad re-reads every second or so. Ignore the
 *  same tag until this passes, or it would race ahead through the roster. */
const REPEAT_COOLDOWN_MS = 4000;

export function useBallReader(onScan: (tag: string) => void, enabled: boolean) {
  // Kept in refs, not state: a scan is a burst of ~10 keydowns and re-rendering
  // between them would drop characters.
  const buffer = useRef("");
  const startedAt = useRef(0);
  const lastScan = useRef<{ tag: string; at: number }>({ tag: "", at: 0 });
  const handler = useRef(onScan);
  // Kept current in an effect rather than during render: the listener below
  // is registered once, but must always call the latest handler.
  useEffect(() => {
    handler.current = onScan;
  });

  useEffect(() => {
    if (!enabled) {
      buffer.current = "";
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      // A focused field (manual entry, a name) owns the keyboard — the reader
      // listener must not shadow it.
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const now = Date.now();
      if (event.key === "Enter") {
        const raw = buffer.current;
        buffer.current = "";
        const withinBurst = now - startedAt.current <= MAX_SCAN_DURATION_MS;
        if (raw.length < MIN_TAG_LENGTH || !withinBurst || !isValidBallTag(raw)) return;

        const tag = normalizeBallTag(raw);
        if (tag === lastScan.current.tag && now - lastScan.current.at < REPEAT_COOLDOWN_MS) return;
        lastScan.current = { tag, at: now };
        handler.current(tag);
        return;
      }

      if (event.key.length !== 1) return; // modifiers, arrows, tab
      if (buffer.current.length === 0 || now - startedAt.current > MAX_SCAN_DURATION_MS) {
        startedAt.current = now;
        buffer.current = event.key;
        return;
      }
      buffer.current += event.key;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
