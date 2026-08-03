import type { WaveView } from "@/lib/booking/waves";
import { formatWaveDate } from "../utils/formatWave";
import styles from "./book.module.css";

export function WaveRow({
  wave,
  selected,
  onSelect,
  showDate = true,
  taken = false,
}: {
  wave: WaveView;
  selected: boolean;
  onSelect: (waveId: string) => void;
  showDate?: boolean;
  /** This wave already has a public session — can't start another one on it. */
  taken?: boolean;
}) {
  const disabled = wave.isFull || taken;

  return (
    <div className={styles.waveRow}>
      {showDate && <span className={styles.waveDate}>{formatWaveDate(wave.date)}</span>}
      <button
        type="button"
        className={`bwave ${selected ? "on" : ""}`}
        disabled={disabled}
        onClick={() => onSelect(wave.id)}
        style={{ flex: 1 }}
      >
        <span className={`dot ${disabled ? "out" : wave.isLowAvailability ? "low" : ""}`} />
        <div>
          <div className="tm">{wave.timeLabel}</div>
        </div>
        <span className={`st ${wave.isLowAvailability ? "low" : ""}`}>
          {taken ? "Taken" : wave.isFull ? "Full" : `${wave.spotsLeft} spot${wave.spotsLeft === 1 ? "" : "s"} left`}
        </span>
      </button>
    </div>
  );
}
