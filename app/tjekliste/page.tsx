import type { Metadata } from 'next';
import TjeklisteKlient from '@/components/TjeklisteKlient';

export const metadata: Metadata = {
  title: 'Tjekliste til afhentning',
  description:
    'Tjekliste til afhentning af din Zeekr 7GT — klik af på skærmen eller hent som PDF og tag med til forhandleren.',
  alternates: { canonical: '/tjekliste' },
};

export default function TjeklisteSide() {
  return <TjeklisteKlient />;
}
