import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="sitefoot">
      <div className="wrap">
        <div className="in">
          <div className="big">
            Play the <em>trail.</em>
          </div>
          <div className="fr">
            <span>Minigolf Social Club by PROJCT</span>
            <span>189 Queen&rsquo;s Road West, Sai Ying Pun, Hong Kong, Opening Sep 2026</span>
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
