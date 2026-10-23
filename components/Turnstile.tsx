'use client';

import { useEffect, useRef } from 'react';

// Offentlig site-key (maa gerne staa i frontend). Tom hvis værnet ikke er sat op endnu.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

/**
 * Usynlig Cloudflare Turnstile-captcha.
 * - Er SITE_KEY ikke sat, renderes intet og onToken kaldes aldrig (formularen
 *   fungerer som før — værnet er simpelthen "slukket" indtil nøglen kobles paa).
 * - Er den sat, vises widgetten (oftest helt usynligt) og giver et token via onToken.
 */
export default function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const boksRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return; // ikke konfigureret -> gør intet

    let afbrudt = false;
    function render() {
      if (afbrudt || !window.turnstile || !boksRef.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(boksRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onToken(token),
        'error-callback': () => onToken(''),
        'expired-callback': () => onToken(''),
        theme: 'light',
      });
    }

    if (window.turnstile) {
      render();
    } else {
      // Vent paa at Cloudflare-scriptet er loadet.
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          render();
        }
      }, 150);
      return () => {
        afbrudt = true;
        clearInterval(interval);
      };
    }
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div ref={boksRef} className="mt-1" />;
}
