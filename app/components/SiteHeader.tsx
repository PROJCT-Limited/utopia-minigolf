import Link from "next/link";

export function SiteHeader() {
  return (
    <div className="topnav">
      <div className="wrap in">
        <Link href="/" className="brand">
          UTOPIA
        </Link>
        <nav>
          <Link href="/#leaderboard">Leaderboard</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/book" className="solid">
            Reserve
          </Link>
        </nav>
      </div>
    </div>
  );
}
