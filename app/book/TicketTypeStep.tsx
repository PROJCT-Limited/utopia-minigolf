import { LIST_PRICE_PER_PERSON_CENTS, priceTableFor, type TicketType } from "@/lib/booking/pricing";
import styles from "./book.module.css";

function formatMoney(cents: number): string {
  return (cents / 100).toFixed(0);
}

const TICKET_OPTIONS: { type: TicketType; label: string; name: string; body: string }[] = [
  {
    type: "standard",
    label: "ONE ROUND, PER PERSON",
    name: "One round",
    body: "All 5 stations + a drink",
  },
  {
    type: "unlimited",
    label: "UNLIMITED PLAY, PER PERSON",
    name: "A full hour",
    body: "Keep playing + free flow drinks",
  },
];

export function TicketTypeStep({
  selected,
  onSelect,
  earlyBird,
}: {
  selected: TicketType | null;
  onSelect: (ticketType: TicketType) => void;
  earlyBird: boolean;
}) {
  const prices = priceTableFor(earlyBird);

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
                  {formatMoney(prices[option.type])} <span className={styles.tierCurrency}>HKD</span>
                </div>
                {/* The homepage puts the later prices in rows of their own,
                    which works on a price list. This is a chooser — a row
                    nobody can select would be a dead option — so the same
                    fact goes under the price instead. */}
                {earlyBird && (
                  <span className={styles.tierAfter}>
                    {formatMoney(LIST_PRICE_PER_PERSON_CENTS[option.type])} from 21 Sept
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
