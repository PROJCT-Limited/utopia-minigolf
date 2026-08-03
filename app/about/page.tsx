import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import styles from "../staticpage.module.css";

export const metadata = { title: "About PROJCT — UTOPIA" };

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className={`wrap ${styles.page}`}>
        <div className={styles.card}>
          <span className="lbl">A venture built by PROJCT</span>
          <h1 className={styles.title}>
            About <em style={{ color: "var(--blue)", fontStyle: "normal" }}>PROJCT</em>
          </h1>

          <p>
            PROJCT is an innovation company unleashing the creative potential of pioneers. We enable people,
            projects, and society to grow. We believe the future doesn&rsquo;t simply happen to us — it&rsquo;s
            something we actively shape through research, experimentation, and purpose.
          </p>
          <p>
            We create value by integrating a multidisciplinary network of people, skills, tools, and financial
            models, and we&rsquo;re devoted to sustainable growth through purpose and quality.
          </p>

          <h2>UTOPIA is one of our projects</h2>
          <p>
            QUALITY OUTPUT is what we care about — but we also care about the long term strategic value for
            ourselves and brand partners. The Minigolf Social Club is a fun and engaging activation, at the
            highest level of taste and custom brand elevation, and it is a research project.
          </p>
          <p>
            While rolling out the social club, we ask ourselves and visitors &ldquo;what is connecting in the
            world today? How do we create more opportunities to bring people together around what matters to
            us?&rdquo; We will deliver actionable strategies to answer these questions as an output to build on
            for years to come.
          </p>

          <h2>PROJCT Lab</h2>
          <p>
            PROJCT Lab is available to hire as a versatile venue for a wide range of events, from intimate
            gatherings and workshops to launches, screenings, and creative showcases. Natural light, a light
            interior, and an open layout create an atmosphere that feels both refined and welcoming.
          </p>
          <p>
            We&rsquo;re always open to meaningful collaborations and partnerships. To discuss availability or arrange
            a viewing, get in touch at{" "}
            <a href="mailto:hi@projct.co" style={{ color: "var(--blue)" }}>
              hi@projct.co
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
