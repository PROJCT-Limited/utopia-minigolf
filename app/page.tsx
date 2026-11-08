import Image from "next/image";
import Link from "next/link";
import { FoundNotifySignup } from "./components/FoundNotifySignup";
import { FoundFooter } from "./components/found/FoundFooter";
import { FloorPlan, FloorPlanLegend } from "./components/found/FloorPlan";
import { PhotoStrip, type StripPhoto } from "./components/found/PhotoStrip";
import { PrebookingCountdown } from "./components/found/PrebookingCountdown";
import {
  FAMILY_TICKET_NOTE,
  PREBOOKING_NOTICE,
  RESCHEDULE_CUTOFF_DAYS,
  SOFT_OPENING_NOTICE,
} from "@/lib/booking/copy";
import { PEOPLE_PER_START_TIME } from "@/lib/booking/capacityConfig";
import {
  FAMILY_ADULTS,
  FAMILY_BASE_PRICE_CENTS,
  FAMILY_MAX_CHILDREN,
  MAX_HEADCOUNT,
  PREBOOKING_DEADLINE_LABEL,
  PREBOOKING_ENDS_AT,
  LIST_PRICE_PER_PERSON_CENTS,
  PUBLIC_LAUNCH_LABEL,
  SOFT_OPENING_LABEL,
  SOFT_OPENING_PRICE_PER_PERSON_CENTS,
  SOFT_OPENING_FIRST_DATE,
  ticketTypesForDate,
  VENUE_TIME_ZONE,
  isPrebookingActive,
  isSoftOpeningOn,
  priceTableFor,
  type PerPersonTicketType,
} from "@/lib/booking/pricing";
import styles from "./page.module.css";

// The price rows switch on the clock (pre-booking, soft opening) — revalidate
// periodically rather than making the whole marketing page dynamic.
export const revalidate = 60;

const MAP_QUERY = "189 Queen's Road West, Sai Ying Pun, Hong Kong";
const MAP_URL = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(MAP_QUERY);
const DIRECTIONS_URL = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(MAP_QUERY);
// Google's keyless embed: a pinned map, no API key or billing account needed.
const MAP_EMBED_URL = `https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&z=17&output=embed`;

// The photo strip, in order: the room, a player, the bar, two stations. Wide
// and tall shots alternate so the strip reads as a sequence, not a grid.
const GALLERY: StripPhoto[] = [
  { src: "/found/gallery-1-venue.jpg", alt: "The FOUND floor at night: a putter at a hole in the foreground, people talking by the bar behind", width: 1920, height: 1080 },
  { src: "/found/gallery-2-putting.jpg", alt: "A player in a cap lining up a putt on a ramp station, the street visible through the glass", width: 1031, height: 1080 },
  { src: "/found/gallery-3-drinks.jpg", alt: "Glasses with golf balls set into them on a steel bar table, beside a scoring tablet", width: 858, height: 1080 },
  { src: "/found/gallery-4-mirror-station.jpg", alt: "A putt on a station with a curved mirrored wall, lit blue", width: 1922, height: 1080 },
  { src: "/found/gallery-5-ramp.jpg", alt: "A ball rolling up a white ramp toward the hole, a putter just behind it", width: 858, height: 1267 },
];

// Occasions, not descriptions of occasions. Anyone reading this already knows
// what a birthday is; what they don't know is whether their group fits, which
// is what the line underneath answers — in range terms rather than mechanics,
// since a 30-person social is arranged with us rather than self-served (a
// booking holds 5, a start time holds 10).
const COMMUNITY_OCCASIONS = [
  "Birthdays",
  "Social nights",
  "Celebrations",
  "Get-togethers",
  "Business socials",
  "Fun days",
];

const TIERS: { type: PerPersonTicketType; label: string; name: string; body: string }[] = [
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

// One price for the party rather than per person, so it sits outside TIERS.
const FAMILY_TIER = {
  label: "FAMILY, BEFORE 7PM",
  name: "Family round",
  body: "2 adults + 2 children, a drink each",
};

// Prices and the reschedule cutoff come from the same config the booking flow
// charges and enforces, so an answer can't drift from what actually happens.
function faqs(prices: Record<PerPersonTicketType, number>): { q: string; a: string }[] {
  return [
    {
      q: "I've never played minigolf. Is that okay?",
      a: "Yes. You get a putter and a ball, and the aim is to get the ball in with as few shots as you can.",
    },
    {
      q: "How does it work?",
      a: "Book a slot online. Check in at the door, where we take everyone's names and give each player a ball linked to them. Play the five stations, enter your shots on the tablet after each one, and see your score on the leaderboard.",
    },
    { q: "How long does it take?", a: "Standard is a 30 minute run through all five stations." },
    {
      q: "What's the difference between Standard and Unlimited?",
      a: `Standard (HKD ${priceFigure(prices.standard)}) is one 30 minute run plus a drink. Unlimited (HKD ${priceFigure(prices.unlimited)}) is the full hour, with free flow drinks.`,
    },
    {
      q: "How many people can come, and can I come alone?",
      a: `Yes, you can come alone. Solo players and small groups may share a start time with other groups. Groups are up to ${MAX_HEADCOUNT} players (a family ticket covers up to ${FAMILY_ADULTS + FAMILY_MAX_CHILDREN}), and each start time holds up to ${PEOPLE_PER_START_TIME} people, so for a bigger group, book two groups at the same time.`,
    },
    {
      q: "When should I arrive, and what if I'm late?",
      a: "Arrive 10 minutes before your slot so we can check you in and hand out balls. Your slot is when your group starts playing, and groups head out every 15 minutes. If you're late, we'll try to fit you into the next available start time, but we can't guarantee a spot and your play time may be shortened.",
    },
    {
      q: "How is my score counted?",
      a: "After each station you enter your shots on the tablet, and your score goes on the leaderboard.",
    },
    {
      q: "Can I change or cancel my booking?",
      a: `You can reschedule once, up to ${RESCHEDULE_CUTOFF_DAYS} days before your date, using the link in your confirmation email. Bookings cancelled at least 3 days before your date can be refunded: reply to your confirmation email or write to hi@projct.co.`,
    },
    {
      q: "What's included with the drinks, and can kids play?",
      a: "Standard comes with one drink. Unlimited's free flow includes alcohol and soft drinks. Kids are welcome: players under 14 need to come with a parent, and we don't serve alcohol to anyone under 18.",
    },
    { q: "When are you open?", a: "Every day from 7 November to 12 December 2026, 5pm to 10pm." },
    { q: "Where is it?", a: "PROJCT, G/F, 189 Queen's Road West, Sai Ying Pun, Hong Kong." },
    {
      q: "Can we hire it for a birthday or team night?",
      a: "Yes. Email hi@projct.co with the date, group size and what you have in mind.",
    },
  ];
}

function priceFigure(cents: number): string {
  return (cents / 100).toFixed(0);
}

/** The day the list price takes over — the morning after the deadline. */
const DAY_AFTER_PREBOOKING_LABEL = new Date(PREBOOKING_ENDS_AT.getTime() + 24 * 60 * 60_000).toLocaleDateString(
  "en-GB",
  { day: "numeric", month: "long", timeZone: VENUE_TIME_ZONE }
);

function TierRow({
  tier,
  priceCents,
  bookable,
  note,
}: {
  tier: { label: string; name: string; body: string };
  priceCents: number;
  bookable: boolean;
  /** A line under the row, for terms a name and a price can't carry. */
  note?: string;
}) {
  return (
    <>
      <div className={`${styles.tierRow} ${bookable ? "" : styles.tierRowQuiet}`}>
        <div>
          <span className={styles.monoLabel}>{tier.label}</span>
          <div className={styles.tierName}>{tier.name}</div>
          <div className={styles.tierBody}>{tier.body}</div>
          {note && <p className={styles.tierNote}>{note}</p>}
        </div>
        <div className={styles.tierRight}>
          <div className={styles.tierPrice}>
            {priceFigure(priceCents)} <span className={styles.tierCurrency}>HKD</span>
          </div>
          {bookable && (
            <Link href="/book" className={styles.tierReserve}>
              Reserve →
            </Link>
          )}
        </div>
      </div>
      <div className={styles.tierRule} />
    </>
  );
}

export default async function HomePage() {
  // Server clock decides — this page is ISR'd at 60s, so the pre-booking price
  // can read as live for up to a minute past the deadline. That's the whole cost
  // of not making the marketing page dynamic, and a minute of goodwill is cheap.
  // `now` is also what seeds the countdown strip's first paint (see
  // PrebookingCountdown): cached with the HTML, then corrected on mount.
  const now = new Date();
  const prebooking = isPrebookingActive(now);
  const prices = priceTableFor(prebooking);
  // Same ISR caveat: the soft-opening rows and hero line can linger up to a
  // minute into the 23rd. Harmless — the charge goes by the evening booked.
  const softOpening = isSoftOpeningOn(now);

  return (
    <div className={styles.found}>
      {prebooking && (
        <PrebookingCountdown
          endsAtMs={PREBOOKING_ENDS_AT.getTime()}
          serverNowMs={now.getTime()}
        />
      )}

      {/* Sticky nav: overlays the hero at the top of the page, then stays
          pinned (on an ink bar) once the photograph has scrolled away. */}
      <div className={styles.navBar}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLogo}>
            <Image src="/found/logo-found.svg" alt="FOUND" width={90} height={18} className={styles.navLogoImg} />
          </Link>
          <div className={styles.navLinks}>
            <a href="#faq">FAQ</a>
            <Link href="/book">Reserve</Link>
          </div>
        </nav>
      </div>

      {/* HERO */}
      <header className={styles.hero}>
        <Image
          src="/found/image-1.png"
          alt="A golf ball resting in a concrete hole"
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} />

        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            {/* When and where, before anything else: the two things someone
                deciding whether they can come needs first. */}
            <div className={styles.heroDates}>
              <p>
                7 Nov &mdash; 12 Dec, <span className={styles.nowrap}>daily 5&ndash;10pm</span>
              </p>
              <p>
                <a href={MAP_URL} target="_blank" rel="noopener noreferrer" className={styles.heroAddress}>
                  Sai Ying Pun <span aria-hidden>↗</span>
                </a>
              </p>
            </div>
            <Link href="/book" className={styles.heroCta}>
              Reserve your place
              <span className={styles.heroCtaArrow} aria-hidden>
                →
              </span>
            </Link>
            <p className={styles.heroBody}>
              Discover mini golf &mdash; reimagined in a game play and design you have never seen before! Five
              uniquely designed stations, themed drinks at the bar, just a fun experience for you and your
              friends. Come for the game, stay for the vibes.
            </p>
          </div>

          <Image
            src="/found/logo-found.svg"
            alt="FOUND"
            width={1372}
            height={190}
            className={styles.wordmark}
          />
        </div>
      </header>

      {/* NEW TO MINIGOLF — for anyone who doesn't know what minigolf is, or
          hasn't played: answered before the page asks them to read on. */}
      <section className={styles.newcomer}>
        <span className={styles.monoLabel}>New to minigolf?</span>
        <p className={styles.newcomerBody}>
          Never played? You&rsquo;re in good company. It&rsquo;s an easy game for everyone, and a great way to
          spend an evening with your friends trying something new. Just show up and have fun!
        </p>
      </section>

      {/* FIVE STATIONS — heading and the key on the left, the floor plan on
          the right; on a phone the plan comes before its key. */}
      <section className={`${styles.twoCol} ${styles.alignEnd}`}>
        <div className={styles.stationsText}>
          <h2 className={styles.h48}>
            Five stations.
            <br />
            <span className={styles.stone}>Five fun challenges.</span>
          </h2>
          <FloorPlanLegend className={styles.stationsLegend} />
        </div>
        <FloorPlan className={styles.stationsPlan} />
      </section>

      {/* PHOTOS — what an evening actually looks like, after the plan of
          where everything is. */}
      <PhotoStrip label="A night at FOUND" photos={GALLERY} />

      {/* SIGN UP */}
      <section className={styles.signupStrip}>
        <div className={styles.signupStripInner}>
          <p className={styles.signupStripText}>Sign up now to play with your friends.</p>
          <Link href="/book" className={styles.signupStripCta}>
            Reserve →
          </Link>
        </div>
      </section>

      {/* CONCEPT */}
      <section className={`${styles.twoCol} ${styles.alignEnd}`}>
        <div className={styles.conceptImageWrap}>
          <Image
            src="/found/image-3.png"
            alt="A plywood ramp and CRT installation"
            width={678}
            height={662}
            className={styles.conceptImage}
          />
        </div>
        <div className={styles.conceptText}>
          <span className={styles.monoLabel}>Concept</span>
          <p className={styles.conceptP}>
            We started by looking closely at everyday objects and reclaimed materials not as things to simply
            reuse, but as things with their own properties, histories and possibilities. Instead of beginning with
            a fixed form, we let the materials lead.
          </p>
          <p className={styles.conceptP}>The result is a series of minigolf stations built through this process of discovery.</p>
          <Link href="/book" className={styles.conceptCta}>
            Reserve your place →
          </Link>
        </div>
      </section>

      {/* BUILD FOR COMMUNITY */}
      <section className={styles.twoCol}>
        <div>
          <h2 className={styles.h48}>
            Build for
            <br />
            community
          </h2>
        </div>
        <div>
          <div className={styles.communityRule} />
          {COMMUNITY_OCCASIONS.map((occasion) => (
            <div key={occasion}>
              <div className={styles.communityRow}>
                <h3 className={styles.communityTitle}>{occasion}</h3>
              </div>
              <div className={styles.communityRule} />
            </div>
          ))}
          <p className={styles.communitySizes}>
            From intimate get-togethers to socials of up to 30 people.
          </p>
          <div className={styles.communityFooter}>
            <p>Planning something? We&rsquo;d love to help you host it.</p>
            <a href="mailto:hi@projct.co?subject=Hosting%20at%20FOUND" className={styles.getInTouch}>
              Get in touch →
            </a>
          </div>
        </div>
      </section>

      {/* PICK YOUR PACE (dark) */}
      <section className={styles.pace} id="pricing">
        <div className={styles.twoCol}>
          <div>
            <h2 className={`${styles.h48} ${styles.paceHeading}`}>Pick your pace</h2>
            <p className={styles.paceSub}>
              Come on your own or bring the whole group. Five stations, and the automated scoring for your
              convenience
            </p>
            {prebooking && (
              <p className={styles.prebookingNote}>{PREBOOKING_NOTICE}</p>
            )}
            {!prebooking && softOpening && <p className={styles.prebookingNote}>{SOFT_OPENING_NOTICE}</p>}
          </div>
          <div>
            {/* Four rows while the offer runs, not two with a line through
                them: the pre-booking prices on top, flagged, and the prices
                they go back to underneath. Same thing a struck-through figure
                says, without the page looking like a sale rack — and the
                lower rows carry no Reserve, because 150 isn't a price anyone
                can pay today. */}
            {prebooking && (
              <>
                <div className={styles.tierGroupHead}>
                  <span className={styles.prebookingTag}>Pre-booking</span>
                  <span className={styles.tierGroupNote}>until {PREBOOKING_DEADLINE_LABEL}</span>
                </div>
                <div className={styles.tierRule} />
                {TIERS.map((tier) => (
                  <TierRow key={`eb-${tier.name}`} tier={tier} priceCents={prices[tier.type]} bookable />
                ))}
                <div className={styles.tierGroupHead}>
                  <span className={styles.tierGroupNote}>
                    From {DAY_AFTER_PREBOOKING_LABEL}
                  </span>
                </div>
              </>
            )}
            {/* The soft opening reuses the same two-group layout, but both groups
                are on sale: the date picked decides which price applies. */}
            {!prebooking && softOpening && (
              <>
                <div className={styles.tierGroupHead}>
                  <span className={styles.prebookingTag}>Soft opening</span>
                  <span className={styles.tierGroupNote}>{SOFT_OPENING_LABEL}, 6–9pm</span>
                </div>
                <div className={styles.tierRule} />
                {/* One round only during the soft opening. */}
                {TIERS.filter((tier) => ticketTypesForDate(SOFT_OPENING_FIRST_DATE).includes(tier.type)).map((tier) => (
                  <TierRow
                    key={`soft-${tier.name}`}
                    tier={tier}
                    priceCents={SOFT_OPENING_PRICE_PER_PERSON_CENTS[tier.type]}
                    bookable
                  />
                ))}
                <div className={styles.tierGroupHead}>
                  <span className={styles.tierGroupNote}>From {PUBLIC_LAUNCH_LABEL}</span>
                </div>
              </>
            )}
            <div className={styles.tierRule} />
            {TIERS.map((tier) => (
              <TierRow
                key={`list-${tier.name}`}
                tier={tier}
                priceCents={LIST_PRICE_PER_PERSON_CENTS[tier.type]}
                bookable={!prebooking}
              />
            ))}
            <TierRow tier={FAMILY_TIER} priceCents={FAMILY_BASE_PRICE_CENTS} bookable={!prebooking} note={FAMILY_TICKET_NOTE} />
          </div>
        </div>
      </section>

      {/* QUESTIONS — same rule-separated rows as Build for community; each
          question opens in place, so the list stays scannable. */}
      <section className={styles.twoCol} id="faq">
        <div>
          <h2 className={styles.h48}>Questions</h2>
        </div>
        <div>
          <div className={styles.communityRule} />
          {faqs(prices).map(({ q, a }) => (
            <div key={q}>
              <details className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  <h3 className={styles.communityTitle}>{q}</h3>
                  <span className={styles.faqToggle} aria-hidden />
                </summary>
                <p className={styles.faqAnswer}>{a}</p>
              </details>
              <div className={styles.communityRule} />
            </div>
          ))}
        </div>
      </section>

      {/* READY TO PLAY */}
      <section className={`${styles.twoCol} ${styles.lastSection}`}>
        <div>
          <h2 className={styles.h48}>Ready to play?</h2>
          <p className={styles.readyBody}>Pick a slot and come see what happens when ordinary things are given another life.</p>
          <Link href="/book" className={styles.readyCta}>
            Reserve your place →
          </Link>
          <div className={styles.readyNotify}>
            <span className={styles.monoLabel}>Not ready yet?</span>
            <FoundNotifySignup />
          </div>
        </div>

        {/* WHERE — the map, with the address and links underneath it. */}
        <div className={styles.location}>
          <div className={styles.mapWrap}>
            <iframe
              src={MAP_EMBED_URL}
              title="Map: FOUND at 189 Queen’s Road West, Sai Ying Pun"
              className={styles.map}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <div className={styles.locationText}>
            <address className={styles.locationAddress}>
              PROJCT, G/F, 189 Queen&rsquo;s Road West, Sai Ying Pun, Hong Kong
            </address>
            <div className={styles.locationLinks}>
              <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">
                Get directions <span aria-hidden>↗</span>
              </a>
              <a href={MAP_URL} target="_blank" rel="noopener noreferrer">
                Open in Google Maps <span aria-hidden>↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <FoundFooter />
    </div>
  );
}
