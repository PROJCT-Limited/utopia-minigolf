import Link from "next/link";

/**
 * Pre-FOUND footer. Only app/_archive/original-home still renders it — every
 * live page uses components/found/FoundFooter.tsx.
 */
export function SiteFooter() {
  return (
    <footer className="sitefoot">
      <div className="wrap">
        <div className="in">
          <div className="big">
            Come and <em>play.</em>
          </div>
          <div className="fr">
            <span>Minigolf Social Club by PROJCT</span>
            <span>Unit 8-10, GF, 189 Queen&rsquo;s Road West, Sai Ying Pun, Hong Kong</span>
            <span className="navLinks">
              <Link href="/about">About PROJCT</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
