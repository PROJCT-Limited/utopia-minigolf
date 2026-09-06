import { TICKET_PRICE_PER_PERSON_CENTS, type TicketType } from "@/lib/booking/pricing";
import styles from "./book.module.css";

function formatMoney(cents: number): string {
  return (cents / 100).toFixed(0);
}

const TICKET_OPTIONS: { type: TicketType; label: string; name: string; body: string }[] = [
  {
    type: "standard",
    label: "Standard, per person",
    name: "One run",
    body: "All 5 stations + 1 drink",
  },
  {
    type: "unlimited",
    label: "Unlimited, per person",
    name: "The full hour",
    body: "Re entry included + bottomless drinks",
  },
];

export function TicketTypeStep({
  selected,
  onSelect,
}: {
  selected: TicketType | null;
  onSelect: (ticketType: TicketType) => void;
}) {
  return (
    <div className={styles.tierRows}>
      {TICKET_OPTIONS.map((option) => {
        const on = selected === option.type;
        return (
          <button
            key={option.type}
            type="button"
            className={`${styles.tierRow} ${on ? styles.on : ""}`}
            aria-pressed={on}
            onClick={() => onSelect(option.type)}
          >
            <div className={styles.tierRowInner}>
              <div>
                <div className={styles.tierRowHead}>
                  <span className={styles.radioDot} />
                  <span className={styles.tierLabel}>{option.label}</span>
                </div>
                <div className={styles.tierRowText}>
                  <div className={styles.tierName}>{option.name}</div>
                  <div className={styles.tierBody}>{option.body}</div>
                </div>
              </div>
              <div className={styles.tierRight}>
                <div className={styles.tierPrice}>
                  {formatMoney(TICKET_PRICE_PER_PERSON_CENTS[option.type])} <span className={styles.tierCurrency}>HKD</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
