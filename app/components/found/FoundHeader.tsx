import Image from "next/image";
import Link from "next/link";
import styles from "./FoundHeader.module.css";

/**
 * Nav for every FOUND-styled page except the homepage, which keeps its own
 * hero-specific white-on-image nav (built inline in app/page.tsx).
 */
export function FoundHeader() {
  return (
    <header>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <Image src="/found/logo-found.svg" alt="FOUND" width={90} height={18} className={styles.logoImg} />
        </Link>
        <nav className={styles.links}>
          <Link href="/#leaderboard">Leaderboard</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/book">Reserve</Link>
        </nav>
      </div>
    </header>
  );
}
