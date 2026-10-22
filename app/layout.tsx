import type { Metadata } from 'next';
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
      </body>
    </html>
  );
}
