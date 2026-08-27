import { TICKET_PRICE_PER_PERSON_CENTS, type TicketType } from "@/lib/booking/pricing";
import styles from "./book.module.css";

function formatMoney(cents: number): string {
  return `HKD ${(cents / 100).toFixed(0)}`;
}

const TICKET_OPTIONS: { type: TicketType; title: string; body: string }[] = [
  { type: "standard", title: "Standard", body: "One 30-minute run across all 5 stations, plus 1 drink." },
  { type: "unlimited", title: "Unlimited", body: "Keep playing for the full hour, re-entry included, plus bottomless drinks." },
];

export function TicketTypeStep({
  selected,
  onSelect,
}: {
  selected: TicketType | null;
  onSelect: (ticketType: TicketType) => void;
}) {
  return (
    <div className={`${styles.partyGrid} ${styles.modeGrid}`}>
      {TICKET_OPTIONS.map((option) => (
        <button
          key={option.type}
          type="button"
          className={`${styles.partyOption} ${selected === option.type ? styles.on : ""}`}
          onClick={() => onSelect(option.type)}
        >
          <h4>{option.title}</h4>
          <p>{option.body}</p>
          <p style={{ marginTop: 10, fontWeight: 700, color: "var(--ink)" }}>
            {formatMoney(TICKET_PRICE_PER_PERSON_CENTS[option.type])} / person
          </p>
        </button>
      ))}
    </div>
  );
}
