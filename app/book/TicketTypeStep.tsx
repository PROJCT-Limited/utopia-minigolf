import {
  LIST_PRICE_PER_PERSON_CENTS,
  PUBLIC_LAUNCH_LABEL,
  SOFT_OPENING_LABEL,
  SOFT_OPENING_PRICE_PER_PERSON_CENTS,
  priceTableFor,
  ticketTypesForDate,
  SOFT_OPENING_FIRST_DATE,
  type TicketType,
} from "@/lib/booking/pricing";
import styles from "./book.module.css";

function formatMoney(cents: number): string {
  return (cents / 100).toFixed(0);
}

/** Is the soft-opening price on offer in this wizard: not at all, alongside
 * the regular one, or as the only one (a private link to a soft-opening night). */
export type SoftOpeningOffer = "none" | "some" | "only";

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
  prebooking,
  softOpening,
}: {
  selected: TicketType | null;
  onSelect: (ticketType: TicketType) => void;
  prebooking: boolean;
  softOpening: SoftOpeningOffer;
}) {
  const prices = softOpening === "only" ? SOFT_OPENING_PRICE_PER_PERSON_CENTS : priceTableFor(prebooking);
  // Only one round is sold during the soft opening: a private link to a
  // soft-opening evening offers nothing else, and in the public calendar
  // Unlimited is still offered but only for dates from the launch on.
  const softTypes = ticketTypesForDate(SOFT_OPENING_FIRST_DATE);
  const options =
    softOpening === "only" ? TICKET_OPTIONS.filter((o) => softTypes.includes(o.type)) : TICKET_OPTIONS;

  return (
    <div className={styles.tierRows}>
      {options.map((option) => {
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
                {prebooking && (
                  <span className={styles.tierAfter}>
                    {formatMoney(LIST_PRICE_PER_PERSON_CENTS[option.type])} from 21 Sept
                  </span>
                )}
                {/* The date isn't picked yet, so the price above is the regular one
                    and the soft-opening evenings are flagged under it; the total
                    at step 4 is worked out from the evening actually chosen. */}
                {softOpening === "some" && (
                  <span className={styles.tierAfter}>
                    {softTypes.includes(option.type)
                      ? `${formatMoney(SOFT_OPENING_PRICE_PER_PERSON_CENTS[option.type])} for soft opening, ${SOFT_OPENING_LABEL}`
                      : `From ${PUBLIC_LAUNCH_LABEL}`}
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
