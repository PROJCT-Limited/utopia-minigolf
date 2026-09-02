import Image from "next/image";
import { FoundHeader } from "../components/found/FoundHeader";
import { FoundFooter } from "../components/found/FoundFooter";
import { PageHeaderBlock } from "../components/found/PageHeaderBlock";
import sharedStyles from "../components/found/shared.module.css";
import styles from "./about.module.css";

export const metadata = { title: "About PROJCT — FOUND" };

export default function AboutPage() {
  return (
    <div className={sharedStyles.pageWrap}>
      <FoundHeader />
      <main className={sharedStyles.pageMain}>
        <PageHeaderBlock label="About" heading="A venture built by PROJCT" />

        <section className={styles.section}>
          <Image
            src="/found/image-2.png"
            alt="A wooden box of golf balls"
            width={678}
            height={678}
            className={styles.image}
          />
          <div className={styles.copy}>
            <p>
              PROJCT is an innovation company unleashing the creative potential of pioneers. We enable people,
              projects, and society to grow. We believe the future doesn&rsquo;t simply happen to us — it&rsquo;s
              something we actively shape through research, experimentation, and purpose.
            </p>
            <p>
              We create value by integrating a multidisciplinary network of people, skills, tools, and financial
              models, and we&rsquo;re devoted to sustainable growth through purpose and quality.
            </p>
          </div>
        </section>

        <section className={styles.prose}>
          <span className={sharedStyles.monoLabel}>UTOPIA is one of our projects</span>
          <div className={styles.copy} style={{ marginTop: 16 }}>
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
          </div>
        </section>

        <section className={styles.labRow}>
          <div className={styles.labRule} />
          <div className={styles.labContent}>
            <h2 className={styles.labTitle}>PROJCT Lab</h2>
            <p className={styles.labBody}>
              PROJCT Lab is available to hire as a versatile venue for a wide range of events, from intimate
              gatherings and workshops to launches, screenings, and creative showcases. Natural light, a light
              interior, and an open layout create an atmosphere that feels both refined and welcoming.
            </p>
          </div>
          <div className={styles.labRule} />
          <div className={styles.contactRow}>
            <p>We&rsquo;re always open to meaningful collaborations and partnerships. To discuss availability or arrange a viewing:</p>
            <a href="mailto:hi@projct.co" className={styles.getInTouch}>
              Get in touch →
            </a>
          </div>
        </section>
      </main>
      <FoundFooter />
    </div>
  );
}
