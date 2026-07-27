import type { Metadata } from "next";
import { Manrope, Archivo } from "next/font/google";
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
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "UTOPIA — Minigolf Social Club",
  description:
    "A 30-minute five-station indoor mini-golf journey by PROJCT. Opening September 2026 in Sai Ying Pun, Hong Kong. Reserve your place now.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${archivo.variable}`}>
      <body>
        {children}
        <PersistentProjctTab />
      </body>
    </html>
  );
}
