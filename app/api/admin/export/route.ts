import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { queries } from '@/lib/db';
import { erLoggetInd } from '@/lib/auth';
import { DISCLAIMER, SITE } from '@/lib/config';

export const dynamic = 'force-dynamic';
// Node-runtime kraeves (pdfkit + filsystem til font-data).
export const runtime = 'nodejs';

const GUL = '#f5a623';
const ASFALT = '#1c1c1f';
const GRAA = '#61616b';

export async function GET(req: Request) {
  if (!erLoggetInd()) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const antal = Math.min(Math.max(Number(searchParams.get('top')) || 20, 1), 100);
  const fejl = queries.topFejl.all(antal);

  const pdfBytes: Buffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const sideBredde = doc.page.width - 100; // margin 50 hver side
    const dato = new Date().toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // ===== Header-banner =====
    doc.rect(0, 0, doc.page.width, 110).fill(ASFALT);
    // Advarselsstribe
    for (let x = 0; x < doc.page.width; x += 40) {
      doc.rect(x, 110, 20, 6).fill(GUL);
    }
    doc
      .fillColor(GUL)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('BYGHERRER-RAPPORT', 50, 35);
    doc
      .fillColor('#ffffff')
      .fontSize(11)
      .font('Helvetica')
      .text(`Uafhængigt fejl-board for Zeekr-ejere — ${SITE.domain}`, 50, 66);
    doc
      .fillColor('#a3a3ac')
      .fontSize(9)
      .text(`Genereret ${dato} · Top ${fejl.length} mest bekræftede fejl`, 50, 84);

    doc.y = 140;
    doc.x = 50;

    // ===== Intro =====
    doc
      .fillColor(ASFALT)
      .fontSize(10)
      .font('Helvetica')
      .text(
        'Denne rapport samler de softwarefejl ("bygherrer"), som flest ejere i fællesskabet ' +
          'har bekræftet at opleve. Hver post viser antal bekræftelser (stemmer), berørt model, ' +
          'softwareversion samt beskrivelse af, hvordan fejlen genskabes.',
        { width: sideBredde, align: 'left' }
      );
    doc.moveDown(1);

    // ===== Fejl-liste =====
    fejl.forEach((f, i) => {
      // Sideskift hvis for lidt plads tilbage.
      if (doc.y > doc.page.height - 160) {
        doc.addPage();
        doc.y = 50;
      }

      const startY = doc.y;

      // Nummer-badge + stemmer
      doc.rect(50, startY, sideBredde, 26).fill('#f6f6f7');
      doc
        .fillColor(ASFALT)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`#${i + 1}`, 58, startY + 7, { continued: false });
      doc
        .fillColor(GRAA)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`${f.stemmer} ${f.stemmer === 1 ? 'stemme' : 'stemmer'}`, doc.page.width - 150, startY + 8, {
          width: 92,
          align: 'right',
        });

      // Titel
      doc
        .fillColor(ASFALT)
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(f.titel, 90, startY + 4, { width: doc.page.width - 260 });

      doc.y = Math.max(doc.y, startY + 30);

      // Meta-linje
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(GRAA)
        .text(
          `Model: ${f.bilmodel}    |    Software: ${f.softwareversion}    |    Status: ${f.status}`,
          58,
          doc.y + 2,
          { width: sideBredde }
        );
      doc.moveDown(0.5);

      // Beskrivelse
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#2a2a2e')
        .text(f.beskrivelse, 58, doc.y, { width: sideBredde, align: 'left' });

      // Skillelinje
      doc.moveDown(0.6);
      doc
        .strokeColor('#e3e3e6')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();
      doc.moveDown(0.8);
    });

    // ===== Footer paa alle sider =====
    // Vigtigt: deaktiver auto-sideskift midlertidigt, saa footer-tekst der er lang
    // ALDRIG skaber nye tomme sider (ellers vokser dokumentet ukontrolleret).
    const range = doc.bufferedPageRange();
    const antalSider = range.count;
    for (let i = 0; i < antalSider; i++) {
      const p = range.start + i;
      doc.switchToPage(p);

      // Slaa automatisk sideskift fra mens vi skriver i bunden.
      const gemtBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const bundY = doc.page.height - 56;
      doc
        .strokeColor(GUL)
        .lineWidth(2)
        .moveTo(50, bundY)
        .lineTo(doc.page.width - 50, bundY)
        .stroke();

      // Sidetal (hoejre) — skrives foerst, paa én linje.
      doc
        .fontSize(8)
        .fillColor(ASFALT)
        .font('Helvetica-Bold')
        .text(`Side ${i + 1} af ${antalSider}`, doc.page.width - 150, bundY + 6, {
          width: 100,
          align: 'right',
          lineBreak: false,
        });

      // Disclaimer (venstre) — fast bredde, maa gerne bryde til 2 linjer men ikke ny side.
      doc
        .fillColor(GRAA)
        .fontSize(7)
        .font('Helvetica')
        .text(DISCLAIMER, 50, bundY + 6, {
          width: sideBredde - 110,
          align: 'left',
          height: 44,
        });

      doc.page.margins.bottom = gemtBottom;
    }

    doc.end();
  });

  const datoFil = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bygherrer-rapport-${datoFil}.pdf"`,
    },
  });
}
