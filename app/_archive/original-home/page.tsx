// Archived copy of the pre-"FOUND" redesign homepage, kept for reference/rollback.
// Not routed — this directory is prefixed with "_" so Next.js excludes it from
// the app router. Original file lived at app/page.tsx.
import Image from "next/image";
import Link from "next/link";
import { Leaderboard } from "@/app/components/Leaderboard";
import { NotifyMeForm } from "@/app/components/NotifyMeForm";
import { SiteFooter } from "@/app/components/SiteFooter";
import { Reveal, StaggerGroup, StaggerItem } from "@/app/components/ScrollReveal";
import { LIST_PRICE_PER_PERSON_CENTS } from "@/lib/booking/pricing";
import { fetchLeaderboard } from "@/lib/scoring/leaderboardRepo";
import styles from "./page.module.css";

// Leaderboard data changes as rounds get scored — revalidate periodically
// rather than making the whole marketing page dynamic on every request.
export const revalidate = 60;

function formatMoney(cents: number): string {
  return `HKD ${(cents / 100).toFixed(0)}`;
}

const ADDITIONAL_ELEMENTS = [
  {
    k: "Scoring",
    title: "Automatic scoring",
    body: "Shots are tracked and displayed on screen as you play.",
  },
  {
    k: "Onboarding",
    title: "Partner integration",
    body: "Sponsors are built into the stations through randomised ball drops, keeping brand presence playful.",
  },
  {
    k: "Fit",
    title: "Solo pairing",
    body: "Anyone arriving alone is matched into a team, so the course works as a way to meet people.",
  },
  {
    k: "Boards",
    title: "Leaderboards",
    body: "Daily and monthly boards let players track results and challenge the best scores by invite.",
  },
  {
    k: "Partners",
    title: "Shoe matching",
    body: "Every player is fitted with a HOKA to suit them, so the shoe becomes part of how they play the trail.",
  },
  {
    k: "Solo",
    title: "Digital onboarding",
    body: "A registration screen signs your team in and dispenses your ball in one step.",
  },
];

const EVENT_OCCASIONS = [
  {
    icon: "/icons/event-birthday.svg",
    title: "Birthdays",
    body: "Round up your crew for a birthday that isn't just dinner and drinks.",
  },
  {
    icon: "/icons/event-group.svg",
    title: "Work socials & team nights",
    body: "Swap the usual bar night for something everyone actually talks about after.",
  },
  {
    icon: "/icons/event-celebrate.svg",
    title: "Celebrations & get-togethers",
    body: "Any excuse to gather — we'll help you make it one to remember.",
  },
];

export default async function ArchivedOriginalHomePage() {
  const [dayRows, monthRows, allRows] = await Promise.all([
    fetchLeaderboard("day"),
    fetchLeaderboard("month"),
    fetchLeaderboard("all"),
  ]);

  return (
    <>
      {/* HERO */}
      <header className={styles.hero}>
        <div className="wrap">
          <div className={styles.frame}>
            {/* Placeholder concept render — swap for real venue photography once available */}
            <Image
              src="/hero-course.png"
              alt="UTOPIA mini-golf course concept render"
              fill
              priority
              sizes="100vw"
              className={styles.heroImage}
            />
            <div className={styles.topbar}>
              <span className={styles.heroBrand}>UTOPIA</span>
              <nav className={styles.heroNav}>
                <a href="#leaderboard">Leaderboard</a>
                <a href="#pricing">Pricing</a>
                <Link className={styles.heroNavCta} href="/book">
                  Reserve
                </Link>
              </nav>
            </div>
            <StaggerGroup className={styles.heroPanel} mode="mount">
              <StaggerItem className={styles.kick}>Minigolf Social Club by PROJCT</StaggerItem>
              <StaggerItem>
                <h1>Come as you are. Play the trail.</h1>
              </StaggerItem>
              <StaggerItem>
                <p>
                  This PROJCT social club delivers an intense mini-golf experience, pulling you inside a world of
                  motion, speed, and excitement. Another high-visibility social experience in the middle of the Sai
                  Ying Pun community.
                </p>
              </StaggerItem>
              <StaggerItem className={styles.row}>
                <Link href="/book" className="btn btn-light">
                  Reserve your place <span className="btn-icon">→</span>
                </Link>
                <div className={styles.meta}>
                  from
                  <b>{formatMoney(LIST_PRICE_PER_PERSON_CENTS.standard)}</b>
                </div>
              </StaggerItem>
            </StaggerGroup>
          </div>
        </div>
      </header>

      {/* INTRO */}
      <section className={styles.intro}>
        <div className="wrap">
          <div className={styles.introIn}>
            <span className="plus" style={{ top: 24, left: 24 }} />
            <span className="plus" style={{ top: 24, right: 24 }} />
            <Reveal>
              <div className="lbl">The idea</div>
              <h2>
                A five-station mini golf journey structured as a topographic landscape, where contour lines function
                as both visual guidance and physical terrain. Each station represents a shift in elevation and
                difficulty. The journey leads you upward to the summit, where the last putt captures that feeling of
                conquering the highest point.
              </h2>
            </Reveal>
          </div>
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="sec" id="leaderboard">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <span className="lbl">Leaderboard</span>
                <h2>
                  See who <em>scored.</em>
                </h2>
              </div>
            </div>
          </Reveal>
          <Leaderboard day={dayRows} month={monthRows} all={allRows} />
        </div>
      </section>

      {/* ADDITIONAL ELEMENTS */}
      <section className="sec">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <span className="lbl">Beyond the trail</span>
                <h2>
                  Built for a <em>social</em> night.
                </h2>
              </div>
            </div>
          </Reveal>
          <StaggerGroup className="featuregrid">
            {ADDITIONAL_ELEMENTS.map((f) => (
              <StaggerItem className="featurecard" key={f.title}>
                <span className="k">{f.k}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* EVENTS & PARTIES */}
      <section className="sec">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <span className="lbl">Host something here</span>
                <h2>
                  More than <em>a round.</em>
                </h2>
              </div>
            </div>
          </Reveal>
          <StaggerGroup className={styles.eventsgrid}>
            {EVENT_OCCASIONS.map((o) => (
              <StaggerItem className={styles.eventcard} key={o.title}>
                <Image src={o.icon} alt="" width={48} height={48} className={styles.eventicon} />
                <h3>{o.title}</h3>
                <p>{o.body}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
          <Reveal>
            <div className={styles.eventscta}>
              <p>Planning something? We&rsquo;d love to help you host it.</p>
              <a href="mailto:hi@projct.co?subject=Hosting%20at%20UTOPIA" className="btn btn-primary">
                Get in touch <span className="btn-icon">→</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PRICING */}
      <section className="sec" id="pricing">
        <div className="wrap">
          <Reveal>
            <div className="sechead">
              <div>
                <span className="lbl">Two ways to play</span>
                <h2>
                  Pick your <em>pace</em>
                </h2>
              </div>
            </div>
          </Reveal>
          <StaggerGroup className="pricegrid">
            <StaggerItem className="pcard">
              <h3>What&rsquo;s always included</h3>
              <ul>
                <li>Automatic scoring, no scorecards</li>
                <li>Shoe matching at check-in</li>
                <li>Live leaderboard</li>
                <li>Come solo — we&rsquo;ll pair you with a team</li>
              </ul>
            </StaggerItem>
            <StaggerItem className="pcard blue">
              <div className="lbl" style={{ color: "rgba(255,255,255,.75)" }}>
                Standard, per person
              </div>
              <div className="big">{formatMoney(LIST_PRICE_PER_PERSON_CENTS.standard)}</div>
              <div className="small">One 30-minute run, all 5 stations + 1 drink</div>
              <div className="cta">
                <Link href="/book" className="btn btn-light" style={{ width: "100%" }}>
                  Reserve your place <span className="btn-icon">→</span>
                </Link>
              </div>
            </StaggerItem>
            <StaggerItem className="pcard blue">
              <div className="lbl" style={{ color: "rgba(255,255,255,.75)" }}>
                Unlimited, per person
              </div>
              <div className="big">{formatMoney(LIST_PRICE_PER_PERSON_CENTS.unlimited)}</div>
              <div className="small">Play the full hour, re-entry included + bottomless drinks</div>
              <div className="cta">
                <Link href="/book" className="btn btn-light" style={{ width: "100%" }}>
                  Reserve your place <span className="btn-icon">→</span>
                </Link>
              </div>
            </StaggerItem>
          </StaggerGroup>
        </div>
      </section>

      {/* BOOKING TEASER + NOTIFY ME */}
      <section className="sec">
        <div className="wrap">
          <StaggerGroup className={styles.teaserSplit}>
            <StaggerItem className={styles.teaserCard}>
              <h2>Ready to play?</h2>
              <p>Pick a slot and reserve your place — groups head out every 15 minutes, 4pm to 10pm.</p>
              <Link href="/book" className="btn btn-light" style={{ alignSelf: "flex-start" }}>
                Reserve your place <span className="btn-icon">→</span>
              </Link>
            </StaggerItem>
            <StaggerItem className={styles.notifyCard}>
              <h3>Not ready yet?</h3>
              <p>Get launch updates the moment dates are confirmed — no payment needed.</p>
              <NotifyMeForm />
            </StaggerItem>
          </StaggerGroup>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
