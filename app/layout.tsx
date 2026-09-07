import type { Metadata } from "next";
import { Manrope, Archivo } from "next/font/google";
import localFont from "next/font/local";
import { PersistentProjctTab } from "./components/PersistentProjctTab";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

// FOUND homepage redesign — Input Mono, self-hosted from the Figma export's
// bundled font files (app/minig/input-mono-font-family/). Only the Regular
// weight is used by the design (see FOUND build brief, type scale table).
const inputMono = localFont({
  src: "./fonts/InputMono-Regular.ttf",
  variable: "--font-input-mono",
  weight: "400",
  display: "swap",
});

// Self-hosted Futura Book. Provenance: this file's own bundled readme (see
// app/fonts/futura-book-SOURCE-fontsgeek-readme.html) states it was pulled
// from fontsgeek.com, a font-piracy aggregator with no rights to redistribute
// Futura — a licensed Monotype/Bauer typeface. Kept here at the site owner's
// explicit direction, accepting that risk; swap for a properly licensed file
// before relying on this in a way that matters legally.
// Only one static weight exists in this file, so it's registered across a wide
// weight range (100–900) — every heading rule below keeps its own font-weight
// number for hierarchy, but they all resolve to this same face rather than
// falling back to Archivo the moment a heading asks for a heavier weight.
const futuraBook = localFont({
  src: "./fonts/futura-book.otf",
  variable: "--font-futura-book",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FOUND — Minigolf Social Club",
  description:
    "A five-station indoor minigolf club by PROJCT. 30 Sept — 31 Oct 2026, Sai Ying Pun, Hong Kong. Reserve your place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${archivo.variable} ${futuraBook.variable} ${inputMono.variable}`}
    >
      <body>
        {/* Scroll/mount reveal animations (app/components/ScrollReveal.tsx)
            ship opacity:0 in the server-rendered HTML and only animate back
            in via JS — with JS disabled or unavailable to a crawler, that
            content would stay invisible forever without this override. */}
        <noscript>
          <style>{".motionReveal { opacity: 1 !important; transform: none !important; }"}</style>
        </noscript>
        {/* Intro animation (app/components/Preloader.tsx) is parked, not
            deleted — the component and its CSS are still here; re-add
            <Preloader /> above {children} to bring the rolling ball back. */}
        {children}
        <PersistentProjctTab />
      </body>
    </html>
  );
}
