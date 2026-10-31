import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { SITE, DISCLAIMER } from '@/lib/config';
import { TJEKLISTE, TJEKLISTE_TITEL, TJEKLISTE_INTRO } from '@/lib/tjekliste';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GUL = '#f5a623';
const ASFALT = '#1c1c1f';
const GRAA = '#61616b';

export async function GET() {
  const pdfBytes: Buffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const bredde = doc.page.width - 100;

    // Header-banner
    doc.rect(0, 0, doc.page.width, 92).fill(ASFALT);
    for (let x = 0; x < doc.page.width; x += 40) doc.rect(x, 92, 20, 6).fill(GUL);
    doc.fillColor(GUL).fontSize(22).font('Helvetica-Bold').text(TJEKLISTE_TITEL, 50, 30);
    doc
      .fillColor('#ffffff')
      .fontSize(11)
      .font('Helvetica')
      .text('Zeekr 7GT', 50, 62);

    doc.y = 120;
    doc.x = 50;
    doc.fillColor(ASFALT).fontSize(10).font('Helvetica').text(TJEKLISTE_INTRO, { width: bredde });
    doc.moveDown(1);

    TJEKLISTE.forEach((sektion) => {
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
        doc.y = 50;
      }
      // Sektions-overskrift
      doc.fillColor(ASFALT).fontSize(13).font('Helvetica-Bold').text(sektion.titel, 50, doc.y);
      doc
        .strokeColor(GUL)
        .lineWidth(2)
        .moveTo(50, doc.y + 2)
        .lineTo(doc.page.width - 50, doc.y + 2)
        .stroke();
      doc.moveDown(0.6);

      sektion.punkter.forEach((punkt) => {
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
          doc.y = 50;
        }
        const y = doc.y;
        // Afkryds-felt (tomt — til at sætte flueben i hånden)
        doc.rect(54, y + 1, 11, 11).lineWidth(1).strokeColor(ASFALT).stroke();
        doc
          .fillColor('#2a2a2e')
          .fontSize(11)
          .font('Helvetica')
          .text(punkt, 74, y, { width: bredde - 24 });
        doc.moveDown(0.55);
      });

      doc.moveDown(0.6);
    });

    // Footer på alle sider
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const gemtBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const bundY = doc.page.height - 54;
      doc
        .strokeColor(GUL)
        .lineWidth(2)
        .moveTo(50, bundY)
        .lineTo(doc.page.width - 50, bundY)
        .stroke();
      doc
        .fillColor(GRAA)
        .fontSize(7)
        .font('Helvetica')
        .text(`${SITE.domain} · ${DISCLAIMER}`, 50, bundY + 6, {
          width: bredde,
          align: 'left',
          height: 40,
        });
      doc.page.margins.bottom = gemtBottom;
    }

    doc.end();
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="tjekliste-afhentning-zeekr-7gt.pdf"',
    },
  });
}
