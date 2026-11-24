import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Public_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body" });
const tape = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-tape" });

const title = "SIM Desk — send SMS from the phone on your desk";
const description = "Queue a text on this computer. The paired Android phone sends it through its own SIM, and the tape shows what the line did.";

const url = "https://github.com/mafzalkalwardev/sim-desk";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(url),
  alternates: { canonical: url },
  openGraph: {
    title,
    description,
    type: "website",
    url,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SIM Desk handset mark" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${tape.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "SIM Desk",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Windows, Android",
              description,
              url,
              author: { "@type": "Person", name: "Muhammad Afzal Kalwar", url: "https://github.com/mafzalkalwardev" },
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
