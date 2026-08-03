import Image from "next/image";
import Link from "next/link";
import { Leaderboard } from "./components/Leaderboard";
import { NotifyMeForm } from "./components/NotifyMeForm";
import { SiteFooter } from "./components/SiteFooter";
import { DATE_TBC_NOTICE } from "@/lib/booking/copy";
import styles from "./page.module.css";

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

export default function HomePage() {
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
            <div className={styles.heroPanel}>
              <div className={styles.kick}>Minigolf Social Club by PROJCT</div>
              <h1>Come as you are. Play the trail.</h1>
              <p>
                This PROJCT social club delivers an intense mini-golf experience, pulling you inside a world of
                motion, speed, and excitement. Another high-visibility social experience in the middle of the Sai
                Ying Pun community.
              </p>
              <div className={styles.row}>
                <Link href="/book" className="btn btn-light">
                  Reserve your place <span className="btn-icon">→</span>
                </Link>
                <div className={styles.meta}>
                  from
                  <b>HKD 160</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* INTRO */}
      <section className={styles.intro}>
        <div className="wrap">
          <div className={styles.introIn}>
            <span className="plus" style={{ top: 24, left: 24 }} />
            <span className="plus" style={{ top: 24, right: 24 }} />
            <div className="lbl">The idea</div>
            <h2>
              A five-station mini golf journey structured as a topographic landscape, where contour lines function
              as both visual guidance and physical terrain. Each station represents a shift in elevation and
              difficulty. The journey leads you upward to the summit, where the last putt captures that feeling of
              conquering the highest point.
            </h2>
          </div>
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="sec" id="leaderboard">
        <div className="wrap">
          <div className="sechead">
            <div>
              <span className="lbl">Leaderboard</span>
              <h2>
                See who <em>scored.</em>
              </h2>
            </div>
          </div>
          <Leaderboard />
        </div>
      </section>

      {/* ADDITIONAL ELEMENTS */}
      <section className="sec">
        <div className="wrap">
          <div className="sechead">
            <div>
              <span className="lbl">Beyond the trail</span>
              <h2>
                Built for a <em>social</em> night.
              </h2>
            </div>
          </div>
          <div className="featuregrid">
            {ADDITIONAL_ELEMENTS.map((f) => (
              <div className="featurecard" key={f.title}>
                <span className="k">{f.k}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="sec" id="pricing">
        <div className="wrap">
          <div className="sechead">
            <div>
              <span className="lbl">The ticket</span>
              <h2>
                Everything <em>included</em>
              </h2>
            </div>
          </div>
          <div className="pricegrid">
            <div className="pcard">
              <h3>What&rsquo;s in the round</h3>
              <ul>
                <li>All 5 stations, 30 minutes of play</li>
                <li>One drink at the bar</li>
                <li>Automatic scoring, no scorecards</li>
                <li>Shoe matching at check-in</li>
                <li>Live leaderboard</li>
                <li>Come solo — we&rsquo;ll pair you with a team</li>
              </ul>
            </div>
            <div className="pcard blue">
              <div className="lbl" style={{ color: "rgba(255,255,255,.75)" }}>
                Per person
              </div>
              <div className="big">HKD 160</div>
              <div className="small">30 minutes, 5 stations + 1 drink</div>
              <div className="cta">
                <Link href="/book" className="btn btn-light" style={{ width: "100%" }}>
                  Reserve your place <span className="btn-icon">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOOKING TEASER + NOTIFY ME */}
      <section className="sec">
        <div className="wrap">
          <div className={styles.teaserSplit}>
            <div className={styles.teaserCard}>
              <h2>Ready to play?</h2>
              <p>{DATE_TBC_NOTICE}</p>
              <Link href="/book" className="btn btn-light" style={{ alignSelf: "flex-start" }}>
                Reserve your place <span className="btn-icon">→</span>
              </Link>
            </div>
            <div className={styles.notifyCard}>
              <h3>Not ready yet?</h3>
              <p>Get launch updates the moment dates are confirmed — no payment needed.</p>
              <NotifyMeForm />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
