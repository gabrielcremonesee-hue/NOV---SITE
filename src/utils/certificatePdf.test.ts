import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { generateCertificatePdf } from './certificatePdf';

test('generateCertificatePdf embeds the official certificate artwork and produces a valid single-page PDF', async () => {
  const bytes = await generateCertificatePdf({
    studentName: 'Maria Fernanda Oliveira Santos',
    cpfMasked: '***.456.789-**',
    courseTitle: 'Massas Italianas',
    workloadLabel: '4 horas',
    completionDate: '16/11/2026',
    issuedDate: '16/11/2026',
    certificateCode: 'FC-2026-AB12CD34',
  });

  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 50_000, 'PDF should embed the high-res official template');
  const header = Buffer.from(bytes.slice(0, 5)).toString('ascii');
  assert.equal(header, '%PDF-');

  const loaded = await PDFDocument.load(bytes);
  assert.equal(loaded.getPageCount(), 1);
  assert.ok(loaded.getTitle()?.includes('Massas Italianas'));
});

test('generateCertificatePdf supports custom courses and exact hour+minute workloads', async () => {
  const bytes = await generateCertificatePdf({
    studentName: 'Desenvolvedor FerveC',
    cpfMasked: '***.722.209-**',
    courseTitle: 'Cozinha Francesa',
    workloadLabel: '1 hora e 30 minutos',
    completionDate: '16/11/2026',
    issuedDate: '16/11/2026',
    certificateCode: 'FC-2026-FF901234',
  });

  assert.ok(bytes instanceof Uint8Array);
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString('ascii'), '%PDF-');
  const loaded = await PDFDocument.load(bytes);
  assert.equal(loaded.getPageCount(), 1);
  assert.ok(loaded.getTitle()?.includes('Cozinha Francesa'));
});
