import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface CertificatePdfPayload {
  studentName: string;
  cpfMasked: string;
  courseTitle: string;
  workloadLabel: string;
  completionDate: string;
  issuedDate: string;
  certificateCode: string;
}

const TEMPLATE_RELATIVE_PATH = path.join(
  'public',
  'assets',
  'aistudio',
  'WhatsApp_Image_2026-11-13_at_03.23.24__1__ca35213d.jpeg'
);

// WinAnsi safe normalizer so pdf-lib standard fonts never fail on unexpected unicode glyphs
function toWinAnsiSafe(input: string): string {
  return String(input || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function topPctToPdfY(topPct: number, pageHeight: number): number {
  return pageHeight * (1 - topPct / 100);
}

export async function generateCertificatePdf(
  payload: CertificatePdfPayload
): Promise<Uint8Array> {
  const templatePath = path.resolve(process.cwd(), TEMPLATE_RELATIVE_PATH);
  const templateBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Certificado FerveC Gastronomia - ${toWinAnsiSafe(payload.courseTitle)}`);
  pdfDoc.setAuthor('FerveC Gastronomia');
  pdfDoc.setSubject(`Certificado ${toWinAnsiSafe(payload.certificateCode)}`);
  pdfDoc.setCreator('FerveC Gastronomia');

  const bgImage = await pdfDoc.embedJpg(templateBytes);
  // A4 landscape matched proportionally to official 1490x1055 artwork
  const pageWidth = 841.89;
  const pageHeight = (bgImage.height / bgImage.width) * pageWidth;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  page.drawImage(bgImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  const fontSerifBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Warm parchment fill sampled directly from the official 1490x1055 artwork
  const nameParchmentColor = rgb(253 / 255, 228 / 255, 182 / 255);
  const cpfParchmentColor = rgb(251 / 255, 222 / 255, 177 / 255);
  const goldBronzeText = rgb(146 / 255, 96 / 255, 22 / 255);
  const espressoText = rgb(44 / 255, 29 / 255, 17 / 255);
  const subtleMetaText = rgb(95 / 255, 68 / 255, 40 / 255);

  // 1. Patch over placeholder "Nome do aluno" and draw real student full name
  const namePatchX = pageWidth * 0.31;
  const namePatchW = pageWidth * 0.38;
  const namePatchTopPct = 32.0;
  const namePatchBotPct = 41.0;
  page.drawRectangle({
    x: namePatchX,
    y: topPctToPdfY(namePatchBotPct, pageHeight),
    width: namePatchW,
    height: (pageHeight * (namePatchBotPct - namePatchTopPct)) / 100,
    color: nameParchmentColor,
  });

  const safeName = toWinAnsiSafe(payload.studentName) || 'Aluno FerveC';
  let nameSize = 27;
  const maxNameWidth = pageWidth * 0.44;
  while (nameSize > 14 && fontSerifBoldItalic.widthOfTextAtSize(safeName, nameSize) > maxNameWidth) {
    nameSize -= 1;
  }
  const nameWidth = fontSerifBoldItalic.widthOfTextAtSize(safeName, nameSize);
  page.drawText(safeName, {
    x: (pageWidth - nameWidth) / 2,
    y: topPctToPdfY(38.0, pageHeight),
    size: nameSize,
    font: fontSerifBoldItalic,
    color: goldBronzeText,
  });

  // 1b. If issuing a certificate for a course other than Massas Italianas, update the crimson course pill
  const safeCourseTitle = toWinAnsiSafe(payload.courseTitle) || 'Massas Italianas';
  if (safeCourseTitle.toLowerCase() !== 'massas italianas') {
    const crimsonBannerColor = rgb(164 / 255, 12 / 255, 13 / 255);
    const bannerCreamText = rgb(255 / 255, 242 / 255, 210 / 255);
    const pillPatchX = pageWidth * 0.36;
    const pillPatchW = pageWidth * 0.28;
    const pillPatchTopPct = 48.2;
    const pillPatchBotPct = 52.4;
    page.drawRectangle({
      x: pillPatchX,
      y: topPctToPdfY(pillPatchBotPct, pageHeight),
      width: pillPatchW,
      height: (pageHeight * (pillPatchBotPct - pillPatchTopPct)) / 100,
      color: crimsonBannerColor,
    });

    const displayCourse = safeCourseTitle.endsWith('.') ? safeCourseTitle : `${safeCourseTitle}.`;
    let courseSize = 18;
    const maxCourseWidth = pageWidth * 0.25;
    while (
      courseSize > 11 &&
      fontSerifBoldItalic.widthOfTextAtSize(displayCourse, courseSize) > maxCourseWidth
    ) {
      courseSize -= 0.5;
    }
    const courseWidth = fontSerifBoldItalic.widthOfTextAtSize(displayCourse, courseSize);
    page.drawText(displayCourse, {
      x: (pageWidth - courseWidth) / 2,
      y: topPctToPdfY(51.1, pageHeight),
      size: courseSize,
      font: fontSerifBoldItalic,
      color: bannerCreamText,
    });
  }

  // 2. Workload under "CARGA HORÁRIA"
  const safeWorkload = toWinAnsiSafe(payload.workloadLabel) || '4 horas';
  let workloadSize = 11.5;
  while (workloadSize > 8 && fontSerifBold.widthOfTextAtSize(safeWorkload, workloadSize) > pageWidth * 0.16) {
    workloadSize -= 0.5;
  }
  const workloadWidth = fontSerifBold.widthOfTextAtSize(safeWorkload, workloadSize);
  page.drawText(safeWorkload, {
    x: pageWidth * 0.287 - workloadWidth / 2,
    y: topPctToPdfY(71.5, pageHeight),
    size: workloadSize,
    font: fontSerifBold,
    color: espressoText,
  });

  // 3. Patch blank CPF underscores inside the pill (right of "CPF do Aluno:") and draw masked CPF
  const cpfPatchX = pageWidth * 0.494;
  const cpfPatchW = pageWidth * 0.101;
  const cpfPatchTopPct = 66.5;
  const cpfPatchBotPct = 69.5;
  page.drawRectangle({
    x: cpfPatchX,
    y: topPctToPdfY(cpfPatchBotPct, pageHeight),
    width: cpfPatchW,
    height: (pageHeight * (cpfPatchBotPct - cpfPatchTopPct)) / 100,
    color: cpfParchmentColor,
  });

  const safeCpf = toWinAnsiSafe(payload.cpfMasked) || '***.***.***-**';
  const cpfSize = 8.8;
  const cpfWidth = fontSans.widthOfTextAtSize(safeCpf, cpfSize);
  page.drawText(safeCpf, {
    x: pageWidth * 0.5445 - cpfWidth / 2,
    y: topPctToPdfY(68.6, pageHeight),
    size: cpfSize,
    font: fontSans,
    color: espressoText,
  });

  // 4. Completion date under "DATA DE CONCLUSÃO"
  const safeCompletion = toWinAnsiSafe(payload.completionDate);
  const dateSize = 11.5;
  const dateWidth = fontSerifBold.widthOfTextAtSize(safeCompletion, dateSize);
  page.drawText(safeCompletion, {
    x: pageWidth * 0.714 - dateWidth / 2,
    y: topPctToPdfY(71.5, pageHeight),
    size: dateSize,
    font: fontSerifBold,
    color: espressoText,
  });

  // 5. Discrete verification footer: Unique certificate code + official issue date
  const safeMeta = toWinAnsiSafe(
    `Codigo: ${payload.certificateCode}  |  Emitido em ${payload.issuedDate}`
  );
  const metaSize = 7.4;
  const metaWidth = fontSans.widthOfTextAtSize(safeMeta, metaSize);
  page.drawText(safeMeta, {
    x: (pageWidth - metaWidth) / 2,
    y: topPctToPdfY(96.4, pageHeight),
    size: metaSize,
    font: fontSans,
    color: subtleMetaText,
  });

  return pdfDoc.save();
}
