import Link from "next/link";
import { JOURNEY_STATIONS } from "./content/journey";
import { NotifyMeForm } from "./components/NotifyMeForm";
import { DATE_TBC_NOTICE } from "@/lib/booking/copy";
import styles from "./page.module.css";

const MAP_POINTS = [
  { x: 80, y: 190 },
  { x: 340, y: 150 },
  { x: 600, y: 110 },
  { x: 860, y: 40 },
  { x: 1120, y: 165 },
];

function mapPathD(): string {
  return MAP_POINTS.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

const ADDITIONAL_ELEMENTS = [
  {
    k: "Scoring",
    title: "Automatic scoring",
    body: "Every stroke counts itself as you play. No pencils, no arguing about the number at the end.",
  },
  {
    k: "Onboarding",
    title: "Digital onboarding",
    body: "Tap in at Trailhead and the course explains itself, station by station, as you go.",
  },
  {
    k: "Fit",
    title: "Shoe matching",
    body: "We'll get you into the right pair before you play a single station.",
  },
  {
    k: "Boards",
    title: "Leaderboards",
    body: "Daily, monthly and all-time boards — see who made it round fastest.",
  },
  {
    k: "Partners",
    title: "Partner integration",
    body: "Built-in moments along the trail for brand and drink partners to show up in the game itself.",
  },
  {
    k: "Solo",
    title: "Solo pairing",
    body: "Come alone and we'll put you on a team before Trailhead — no waiting around.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <header className={styles.hero}>
        <div className="wrap">
          <div className={styles.frame}>
            <svg className={styles.contours} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              {[80, 160, 240, 320, 400, 480].map((r, i) => (
                <ellipse
                  key={r}
                  cx="600"
                  cy="120"
                  rx={r * 1.3}
                  ry={r}
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="1.5"
                  opacity={0.5 - i * 0.06}
                />
              ))}
            </svg>
            <div className={styles.topbar}>
              <span className={styles.heroBrand}>UTOPIA</span>
              <nav className={styles.heroNav}>
                <a href="#journey">The Journey</a>
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
                A 30-minute, five-station indoor mini-golf journey — Trailhead, Stream, Rockfall, The Summit, The
                Descent. Come as a group, or come alone and we&rsquo;ll pair you up.
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
              A social mini-golf club built around one trail, five stations, and a drink at the end.{" "}
              <b className={styles.c}>Come with your people, or come alone — we&rsquo;ll pair you with new ones.</b>
            </h2>
          </div>
        </div>
      </section>

      {/* THE JOURNEY */}
      <section className="sec" id="journey">
        <div className="wrap">
          <div className="sechead">
            <div>
              <span className="lbl">The journey</span>
              <h2>
                Five stations. <em>One trail.</em>
              </h2>
            </div>
            <p className="r">
              Each station plays differently — a putt, a crossing, a wheel, a climb, a drop. Follow the trail from
              Trailhead to The Descent.
            </p>
          </div>
          <div className="tilegrid">
            {JOURNEY_STATIONS.map((s) => (
              <div className="tilecard" key={s.number}>
                <div className="ph">
                  <span className="no">{String(s.number).padStart(2, "0")}</span>
                </div>
                <div className="bd">
                  <span className="k">Station {s.number}</span>
                  <h3 className="nm">{s.name}</h3>
                  <p className="d">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="sec">
        <div className="wrap">
          <div className="sechead">
            <div>
              <span className="lbl">The course</span>
              <h2>
                Follow the <em>trail.</em>
              </h2>
            </div>
          </div>
          <div className={styles.mapcard}>
            <svg className={styles.mapPath} viewBox="0 0 1200 230" role="img" aria-label="Map of the five UTOPIA stations in order">
              <path d={mapPathD()} fill="none" stroke="var(--line)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
              <path d={mapPathD()} fill="none" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
              {MAP_POINTS.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="22" fill="var(--ink)" />
                  <text x={p.x} y={p.y + 6} textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">
                    {i + 1}
                  </text>
                </g>
              ))}
            </svg>
            <ul className={styles.mapLegend}>
              {JOURNEY_STATIONS.map((s) => (
                <li key={s.number}>
                  <b>{s.name}</b>
                  Station {s.number}
                </li>
              ))}
            </ul>
          </div>
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
              <div className="small">30 minutes · 5 stations + 1 drink</div>
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

      {/* FOOTER */}
      <footer className="sitefoot">
        <div className="wrap">
          <div className="in">
            <div className="big">
              Play the <em>trail.</em>
            </div>
            <div className="fr">
              <span>UTOPIA — a Minigolf Social Club by PROJCT</span>
              <span>189 Queen&rsquo;s Road West · Sai Ying Pun, Hong Kong · Opening Sep 2026</span>
              <span>
                <Link href="/about">About PROJCT</Link> · <Link href="/terms">Terms</Link> ·{" "}
                <Link href="/privacy">Privacy</Link>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
