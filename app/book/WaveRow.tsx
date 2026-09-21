import { hasRoomFor, type WaveView } from "@/lib/booking/waves";
import styles from "./book.module.css";

/**
 * Level 2 of the picker: one bookable quarter-hour cell inside its hour's
 * 4-column grid. Label is the quarter offset (":15" etc.) derived from the
 * real start time — except for a still-provisional wave, where we keep
 * showing "TBC" rather than the real minute, matching what this wave's
 * `timeLabel` already hid pre-restyle (see PROVISIONAL_LABEL in
 * lib/booking/waves.ts): the hour is shown either way, but the exact quarter
 * within it stays undisclosed until the date is confirmed.
 */
function cellLabel(wave: WaveView): string {
  if (wave.status === "provisional") return "TBC";
  return `:${wave.startTime.slice(3, 5)}`;
}

export function WaveRow({
  wave,
  headcount,
  selected,
  onSelect,
}: {
  wave: WaveView;
  /** Party size — a start time with 3 spaces left is closed to a four. */
  headcount: number;
  selected: boolean;
  onSelect: (waveId: string) => void;
  showDate?: boolean;
}) {
  const fits = hasRoomFor(wave, headcount);

  return (
    <button
      type="button"
      className={`${styles.quarterCell} ${selected ? styles.on : ""}`}
      disabled={!fits}
      onClick={() => onSelect(wave.id)}
      title={fits ? undefined : wave.isFull ? "Sold out" : `Not enough room for ${headcount}`}
    >
      {cellLabel(wave)}
    </button>
  );
}
