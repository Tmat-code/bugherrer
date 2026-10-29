import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SprogHint from '@/components/SprogHint';
import UnderOpbygning from '@/components/UnderOpbygning';
import { SITE } from '@/lib/config';

const BESKRIVELSE =
  'Fællesskabsdrevet, uafhængigt fejl-board hvor Zeekr 7GT-ejere kan samle og stemme på softwarefejl ("bugherrer") og sende dem videre til producenten.';
const STD_TITEL = `${SITE.name} – Uafhængigt fejl-board for Zeekr 7GT-ejere`;

export const metadata: Metadata = {
  metadataBase: new URL(`https://${SITE.domain}`),
  title: {
    default: STD_TITEL,
    // Undersider sætter kun deres eget navn; dette suffiks tilføjes automatisk.
    template: `%s – ${SITE.name}`,
  },
  description: BESKRIVELSE,
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'da_DK',
    siteName: SITE.name,
    url: '/',
    title: STD_TITEL,
    description: BESKRIVELSE,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: STD_TITEL,
    description: BESKRIVELSE,
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // "Under opbygning"-bjaelken er taendt som standard; slaa fra med UNDER_OPBYGNING=0.
  const visUnderOpbygning = process.env.UNDER_OPBYGNING !== '0';

  return (
    <html lang="da">
      <body className="flex min-h-screen flex-col">
        <SprogHint />
        <Header />
        {visUnderOpbygning && <UnderOpbygning />}
        <main className="flex-1">{children}</main>
        <Footer />
        {/* Cloudflare Turnstile — loades kun hvis værnet er sat op (site-key findes). */}
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
