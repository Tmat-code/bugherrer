import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { SITE } from '@/lib/config';

export const metadata: Metadata = {
  title: `${SITE.name} – Uafhængigt fejl-board for Zeekr 7GT-ejere`,
  description:
    'Fællesskabsdrevet, uafhængigt fejl-board hvor Zeekr 7GT-ejere kan samle og stemme på softwarefejl ("bugherrer") og sende dem videre til producenten.',
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body className="flex min-h-screen flex-col">
        <Header />
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
