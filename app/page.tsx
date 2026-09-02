import Image from "next/image";
import Link from "next/link";
import { FoundLeaderboard } from "./components/FoundLeaderboard";
import { FoundNotifySignup } from "./components/FoundNotifySignup";
import { FoundFooter } from "./components/found/FoundFooter";
import { TICKET_PRICE_PER_PERSON_CENTS } from "@/lib/booking/pricing";
import { fetchLeaderboard } from "@/lib/scoring/leaderboardRepo";
import styles from "./page.module.css";

// Leaderboard data changes as rounds get scored — revalidate periodically
// rather than making the whole marketing page dynamic on every request.
export const revalidate = 60;

const BEYOND_THE_TRAIL = [
  ["Automatic scoring", "Drinks & Snacks"],
  ["Digital onboarding", "Leaderboards"],
  ["Prizes for wins", null],
] as const;

const COMMUNITY_ROWS = [
  {
    title: "Birthdays",
    body: "Round up your crew for a birthday that isn't just dinner and drinks.",
  },
  {
    title: "Work socials & team nights",
    body: "Swap the usual bar night for something everyone actually talks about after.",
  },
  {
    title: "Celebrations & get-togethers",
    body: "Any excuse to gather — we'll help you make it one to remember.",
  },
];

const TIERS = [
  {
    label: "Standard, per person",
    name: "One 30-minute run",
    body: "All 5 stations + 1 drink",
    priceCents: TICKET_PRICE_PER_PERSON_CENTS.standard,
  },
  {
    label: "Unlimited, per person",
    name: "The full hour",
    body: "Re entry included + bottomless drinks",
    priceCents: TICKET_PRICE_PER_PERSON_CENTS.unlimited,
  },
];

function priceFigure(cents: number): string {
  return (cents / 100).toFixed(0);
}

export default async function HomePage() {
  const [dayRows, monthRows, allRows] = await Promise.all([
    fetchLeaderboard("day"),
    fetchLeaderboard("month"),
    fetchLeaderboard("all"),
  ]);

  return (
    <div className={styles.found}>
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
          <nav className={styles.nav}>
            <Link href="/" className={styles.navLogo}>
              <Image src="/found/logo-found.svg" alt="FOUND" width={90} height={18} className={styles.navLogoImg} />
            </Link>
            <div className={styles.navLinks}>
              <a href="#leaderboard">Leaderboard</a>
              <a href="#pricing">Pricing</a>
              <Link href="/book">Reserve</Link>
            </div>
          </nav>

          <div className={styles.heroContent}>
            <span className={styles.pill}>Minigolf Social Club</span>
            <p className={styles.heroBody}>
              This is an investigation into rediscovering day to day objects and materials under a new light,
              uncovering hidden narratives within the material properties of reclaimed objects.
            </p>
            <Link href="/book" className={styles.heroCta}>
              Reserve your place <span aria-hidden>→</span>
            </Link>
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

      {/* FIVE STATIONS */}
      <section className={`${styles.twoCol} ${styles.alignEnd}`}>
        <div className={styles.stationsHeading}>
          <h2 className={styles.h48}>
            Five stations.
            <br />
            <span className={styles.stone}>Five material investigations.</span>
          </h2>
        </div>
        <div className={styles.stationsImageWrap}>
          <Image
            src="/found/image-2.png"
            alt="A wooden box of golf balls"
            width={498}
            height={325}
            className={styles.stationsImage}
          />
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
        </div>
      </section>

      {/* BEYOND THE TRAIL */}
      <section className={styles.twoCol}>
        <div>
          <h2 className={styles.h48}>Beyond the trail</h2>
          <p className={styles.subhead}>Everything that turns a round into a night.</p>
        </div>
        <div>
          <div className={styles.trailRule} />
          {BEYOND_THE_TRAIL.map((pair, i) => (
            <div key={i}>
              <div className={styles.trailRow}>
                <span className={styles.trailItem}>
                  <span className={styles.dot} />
                  {pair[0]}
                </span>
                {pair[1] && (
                  <span className={styles.trailItem}>
                    <span className={styles.dot} />
                    {pair[1]}
                  </span>
                )}
              </div>
              <div className={styles.trailRule} />
            </div>
          ))}
        </div>
      </section>

      {/* SEE WHO SCORED */}
      <section className={styles.twoCol} id="leaderboard">
        <div>
          <h2 className={styles.h48}>See who scored</h2>
        </div>
        <div>
          <FoundLeaderboard day={dayRows} month={monthRows} all={allRows} />
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
          {COMMUNITY_ROWS.map((row) => (
            <div key={row.title}>
              <div className={styles.communityRow}>
                <h3 className={styles.communityTitle}>{row.title}</h3>
                <p className={styles.communityBody}>{row.body}</p>
              </div>
              <div className={styles.communityRule} />
            </div>
          ))}
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
            <div className={styles.paceIncluded}>
              WHAT&rsquo;S INCLUDED
              <br />/ AUTOMATIC SCORING
              <br />/ LIVE LEADERBOARD
              <br />/ DRINKS
            </div>
          </div>
          <div>
            <div className={styles.tierRule} />
            {TIERS.map((tier) => (
              <div key={tier.name}>
                <div className={styles.tierRow}>
                  <div>
                    <span className={styles.monoLabel}>{tier.label}</span>
                    <div className={styles.tierName}>{tier.name}</div>
                    <div className={styles.tierBody}>{tier.body}</div>
                  </div>
                  <div className={styles.tierRight}>
                    <div className={styles.tierPrice}>
                      {priceFigure(tier.priceCents)} <span className={styles.tierCurrency}>HKD</span>
                    </div>
                    <Link href="/book" className={styles.tierReserve}>
                      Reserve →
                    </Link>
                  </div>
                </div>
                <div className={styles.tierRule} />
              </div>
            ))}
          </div>
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
        </div>
        <div className={styles.readyRight}>
          <span className={styles.monoLabel}>Not ready yet?</span>
          <FoundNotifySignup />
        </div>
      </section>

      <FoundFooter />
    </div>
  );
}
