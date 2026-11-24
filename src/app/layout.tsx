import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body" });
const tape = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-tape" });

const title = "SIM Desk — send SMS from the phone on your desk";
const description = "Queue a text on this computer. The paired Android phone sends it through its own SIM, and the tape shows what the line did.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://github.com/mafzalkalwardev/sim-desk"),
  alternates: { canonical: "https://github.com/mafzalkalwardev/sim-desk" },
  openGraph: { title, description, type: "website", url: "https://github.com/mafzalkalwardev/sim-desk" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${tape.variable}`}>{children}</body>
    </html>
  );
}
