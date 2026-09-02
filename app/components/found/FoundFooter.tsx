import Image from "next/image";
import Link from "next/link";
import styles from "./FoundFooter.module.css";

/** Identical on every page, including the homepage. */
export function FoundFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerRule} />
      <div className={styles.footerGrid}>
        <Image src="/found/logo-found.svg" alt="FOUND" width={378} height={75} className={styles.footerLogo} />
        <div className={styles.footerMeta}>
          MINIGOLF SOCIAL CLUB BY PROJCT
          <br />
          189 QUEEN&rsquo;S ROAD WEST, SAI YING PUN, HONG KONG, OPENING SEP 2026
        </div>
      </div>
      <div className={styles.footerLinks}>
        <Link href="/about">About</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </div>
    </footer>
  );
}
