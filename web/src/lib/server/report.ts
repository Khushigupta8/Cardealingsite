import 'server-only';
import { PDFDocument, StandardFonts, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { env } from './env';
import { LOGO_PNG_BASE64 } from './logo-png';
import { admin } from './supabase';
import { must } from './http';
import type { VehicleRow } from './vehicles';

const INK = rgb(0.08, 0.08, 0.08);
const MUTED = rgb(0.45, 0.45, 0.45);
const LINE = rgb(0.86, 0.86, 0.86);
const PANEL = rgb(0.965, 0.965, 0.965);
const RED = rgb(0.84, 0.13, 0.11);
const GRADES: Record<number, string> = { 5: 'Excellent', 4: 'Good', 3: 'Fair', 2: 'Rough', 1: 'Poor' };

const W = 612; // US Letter
const H = 792;
const M = 48; // margin
const CONTENT = W - M * 2;
const FOOTER = 56;

const money = (n: number | null) => (n == null ? '-' : '$' + Math.round(n).toLocaleString('en-US'));
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-');

// The standard PDF fonts only cover Western characters; swap anything else for "?" rather than failing.
const safe = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF‘’“”–—•…€]/g, '?');

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  // Split into paragraphs before cleaning, so line breaks survive. Blank lines come back as ''.
  for (const raw of text.split(/\r?\n/)) {
    const para = safe(raw).trim();
    if (!para) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) lines.push(line);
        // Break words longer than the line.
        let w = word;
        while (font.widthOfTextAtSize(w, size) > width) {
          let i = w.length;
          while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > width) i--;
          lines.push(w.slice(0, i));
          w = w.slice(i);
        }
        line = w;
      }
    }
    lines.push(line);
  }
  return lines;
}

async function loadPhotos(pdf: PDFDocument, vehicleId: string, max: number) {
  const rows = must(await admin().from('vehicle_photos').select('storage_path').eq('vehicle_id', vehicleId).order('created_at').limit(12));
  const images: PDFImage[] = [];
  for (const r of rows) {
    if (images.length >= max) break;
    const { data } = await admin().storage.from(env().PHOTO_BUCKET).download(r.storage_path);
    if (!data) continue;
    const bytes = new Uint8Array(await data.arrayBuffer());
    try {
      // Only JPEG and PNG can be embedded; WebP/HEIC originals are skipped.
      if (bytes[0] === 0xff && bytes[1] === 0xd8) images.push(await pdf.embedJpg(bytes));
      else if (bytes[0] === 0x89 && bytes[1] === 0x50) images.push(await pdf.embedPng(bytes));
    } catch {
      /* unreadable image: leave it out */
    }
  }
  return images;
}

// Draw an image inside a box, cropped to fill it (centre crop), with a hairline border.
function drawCover(page: PDFPage, img: PDFImage, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  page.drawRectangle({ x, y, width: w, height: h, color: PANEL });
  // Clip to the box so the overflow of the cover crop is hidden.
  page.pushOperators(pushGraphicsState(), rectangle(x, y, w, h), clip(), endPath());
  page.drawImage(img, { x: x + (w - dw) / 2, y: y + (h - dh) / 2, width: dw, height: dh });
  page.pushOperators(popGraphicsState());
  page.drawRectangle({ x, y, width: w, height: h, borderColor: LINE, borderWidth: 0.5 });
}

export async function buildReportPdf(v: VehicleRow, review: { conditionGrade: number; recommendedPrice: number; notes: string | null; gradedAt: string }) {
  const pdf = await PDFDocument.create();
  const title = `${v.year} ${v.make} ${v.model}${v.trim ? ' ' + v.trim : ''}`;
  pdf.setTitle(`Vehicle review report - ${title}`);
  pdf.setAuthor('Dealer Review');
  pdf.setSubject(`VIN ${v.vin}`);
  pdf.setCreator('Dealer Review');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const photos = await loadPhotos(pdf, v.id, 4);
  const logo = await pdf.embedPng(Buffer.from(LOGO_PNG_BASE64, 'base64'));
  const dealership = v.dealership?.name ?? 'Your dealership';

  let page = pdf.addPage([W, H]);
  let y = H;

  const header = (p: PDFPage, compact: boolean) => {
    const hh = compact ? 44 : 72;
    p.drawRectangle({ x: 0, y: H - hh, width: W, height: hh, color: rgb(0.067, 0.067, 0.067) });
    const wy = H - hh / 2 - (compact ? 4 : 2);
    const lh = compact ? 30 : 50;
    const lw = (logo.width / logo.height) * lh;
    p.drawImage(logo, { x: M - 4, y: H - hh / 2 - lh / 2, width: lw, height: lh });
    const label = 'VEHICLE REVIEW REPORT';
    p.drawText(label, { x: W - M - regular.widthOfTextAtSize(label, 8), y: wy - 1, size: 8, font: regular, color: rgb(0.7, 0.7, 0.7) });
    return H - hh;
  };
  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = header(page, true) - 28;
  };
  // Make room for `h` points, continuing on a new page if needed.
  const need = (h: number) => {
    if (y - h < FOOTER + 12) newPage();
  };
  const sectionTitle = (t: string) => {
    need(40);
    page.drawText(t.toUpperCase(), { x: M, y, size: 8, font: bold, color: MUTED });
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LINE });
    y -= 16;
  };
  const paragraph = (text: string, size = 10.5) => {
    for (const line of wrap(text.replace(/(\r?\n\s*){3,}/g, '\n\n').trim(), regular, size, CONTENT)) {
      need(size + 6);
      // A blank line between paragraphs becomes a small gap.
      if (!line) {
        y -= size * 0.6;
        continue;
      }
      page.drawText(line, { x: M, y, size, font: regular, color: INK });
      y -= size + 5;
    }
    y -= 8;
  };

  // ---- Title block ----
  y = header(page, false) - 40;
  for (const line of wrap(title, bold, 22, CONTENT)) {
    page.drawText(line, { x: M, y, size: 22, font: bold, color: INK });
    y -= 27;
  }
  page.drawText(safe(`Prepared for ${dealership}  ·  Reviewed ${day(review.gradedAt)}`), { x: M, y: y + 4, size: 10, font: regular, color: MUTED });
  y -= 22;

  // ---- Main photo ----
  if (photos[0]) {
    const ph = 250;
    drawCover(page, photos[0], M, y - ph, CONTENT, ph);
    y -= ph + 20;
  }

  // ---- Result panels ----
  const panelH = 86;
  const gap = 12;
  const pw = (CONTENT - gap) / 2;
  need(panelH + 10);
  const top = y;
  const panel = (x: number, label: string, big: string, sub: string, accent: boolean) => {
    page.drawRectangle({ x, y: top - panelH, width: pw, height: panelH, color: PANEL });
    page.drawRectangle({ x, y: top - panelH, width: 3, height: panelH, color: accent ? RED : INK });
    page.drawText(label.toUpperCase(), { x: x + 18, y: top - 22, size: 8, font: bold, color: MUTED });
    page.drawText(safe(big), { x: x + 18, y: top - 52, size: 26, font: bold, color: INK });
    page.drawText(safe(sub), { x: x + 18, y: top - 70, size: 9.5, font: regular, color: MUTED });
  };
  panel(M, 'Condition rating', `${review.conditionGrade} / 5`, `${GRADES[review.conditionGrade] ?? ''}${v.condition_grade ? ' · rated by the dealership' : ''}`, true);
  const diff = v.asking_price == null ? null : review.recommendedPrice - Number(v.asking_price);
  panel(
    M + pw + gap,
    'Recommended listing',
    money(review.recommendedPrice),
    diff == null ? 'Human-reviewed recommendation' : diff === 0 ? 'Same as your asking price' : `${money(Math.abs(diff))} ${diff > 0 ? 'above' : 'below'} your asking price (${money(Number(v.asking_price))})`,
    false,
  );
  y = top - panelH - 28;

  // ---- Reviewer notes ----
  sectionTitle('Reviewer notes');
  paragraph(review.notes || 'No additional notes.');

  // ---- Vehicle details (kept together on one page) ----
  need(40 + 5 * 34);
  sectionTitle('Vehicle');
  const facts: [string, string][] = [
    ['VIN', v.vin],
    ['Year', String(v.year)],
    ['Make', v.make],
    ['Model', v.model],
    ['Trim', v.trim || '-'],
    ['Mileage', `${Number(v.mileage).toLocaleString('en-US')} mi`],
    ['Dealer asking price', money(v.asking_price == null ? null : Number(v.asking_price))],
    ['Submitted', day(v.submitted_at)],
    ['Review completed', day(v.completed_at ?? review.gradedAt)],
  ];
  const colW = CONTENT / 2;
  for (let i = 0; i < facts.length; i += 2) {
    need(30);
    for (let j = 0; j < 2 && i + j < facts.length; j++) {
      const [k, val] = facts[i + j];
      const x = M + j * colW;
      page.drawText(k, { x, y, size: 8.5, font: regular, color: MUTED });
      page.drawText(safe(val), { x, y: y - 13, size: 11, font: k === 'VIN' ? bold : regular, color: INK });
    }
    y -= 34;
  }
  y -= 4;

  // ---- Dealer notes ----
  if (v.condition_notes) {
    sectionTitle('Dealer condition notes');
    paragraph(v.condition_notes);
  }

  // ---- More photos ----
  const more = photos.slice(1);
  if (more.length) {
    sectionTitle('Photos');
    const tw = (CONTENT - gap * 2) / 3;
    const th = tw * 0.72;
    need(th + 10);
    more.forEach((img, i) => drawCover(page, img, M + i * (tw + gap), y - th, tw, th));
    y -= th + 20;
  }

  // ---- Footer on every page ----
  const pages = pdf.getPages();
  const reportId = v.id.slice(0, 8).toUpperCase();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: FOOTER - 6 }, end: { x: W - M, y: FOOTER - 6 }, thickness: 0.5, color: LINE });
    p.drawText('Dealer Review · Human-reviewed vehicle assessment. A recommendation to support a listing decision, not an appraisal or guarantee of value.', {
      x: M,
      y: FOOTER - 20,
      size: 7,
      font: regular,
      color: MUTED,
    });
    p.drawText(`Report ${reportId} · Page ${i + 1} of ${pages.length}`, { x: M, y: FOOTER - 31, size: 7, font: regular, color: MUTED });
  });

  return pdf.save();
}
